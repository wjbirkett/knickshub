#!/usr/bin/env python3
"""
collect_and_train.py — Collect Knicks game data from ESPN (free) and retrain ML models.
Run from backend/ directory: python scripts/collect_and_train.py
"""
import os, sys, json, time, logging
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
import pandas as pd
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
KNICKS_ESPN_ID = "18"
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "services", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def espn_get(url, params=None, retries=3):
    for attempt in range(retries):
        try:
            r = httpx.get(url, params=params, timeout=20)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            log.warning(f"Request failed (attempt {attempt+1}): {e}")
            time.sleep(2)
    return None

def fetch_season_games(season_year):
    log.info(f"Fetching {season_year} season schedule...")
    url = f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/schedule"
    data = espn_get(url, {"season": season_year, "seasontype": 2})
    if not data:
        return []
    events = data.get("events", [])
    log.info(f"  Found {len(events)} events")
    return events

def fetch_game_data(event_id):
    url = f"{ESPN_BASE}/summary"
    data = espn_get(url, {"event": event_id})
    if not data:
        return None

    # Get scores from header
    comps = data.get("header", {}).get("competitions", [{}])[0].get("competitors", [])
    knicks_pts = opp_pts = None
    is_home = False
    for c in comps:
        team_id = str(c.get("team", {}).get("id", ""))
        score = c.get("score")
        home_away = c.get("homeAway", "")
        if team_id == KNICKS_ESPN_ID:
            knicks_pts = int(score) if score else None
            is_home = home_away == "home"
        else:
            opp_pts = int(score) if score else None

    if knicks_pts is None or opp_pts is None or knicks_pts == 0:
        return None

    # Get team stats from boxscore
    boxes = data.get("boxscore", {}).get("teams", [])
    knicks_stats = opp_stats = None
    for team_data in boxes:
        team_id = str(team_data.get("team", {}).get("id", ""))
        stats_list = team_data.get("statistics", [])
        stats = {s["name"]: s.get("displayValue", "") for s in stats_list}
        if team_id == KNICKS_ESPN_ID:
            knicks_stats = stats
        else:
            opp_stats = stats

    def pct(d, key):
        try: return float(d.get(key, 0)) / 100.0
        except: return None

    def num(d, key):
        try: return int(float(d.get(key, 0)))
        except: return 0

    result = {
        "is_home":       int(is_home),
        "knicks_pts":    knicks_pts,
        "opp_pts":       opp_pts,
    }
    if knicks_stats:
        result.update({
            "knicks_fg_pct":  pct(knicks_stats, "fieldGoalPct"),
            "knicks_fg3_pct": pct(knicks_stats, "threePointFieldGoalPct"),
            "knicks_tov":     num(knicks_stats, "totalTurnovers"),
            "knicks_ast":     num(knicks_stats, "assists"),
            "knicks_reb":     num(knicks_stats, "totalRebounds"),
        })
    if opp_stats:
        result.update({
            "opp_fg_pct":  pct(opp_stats, "fieldGoalPct"),
            "opp_tov":     num(opp_stats, "totalTurnovers"),
        })
    return result

def build_dataset(seasons=[2023, 2024, 2025]):
    rows = []
    for season in seasons:
        events = fetch_season_games(season)
        finished = 0
        for i, event in enumerate(events):
            comp = event.get("competitions", [{}])[0]
            completed = comp.get("status", {}).get("type", {}).get("completed", False)
            if not completed:
                continue
            event_id = event.get("id")
            game_date = event.get("date", "")[:10]
            result = fetch_game_data(event_id)
            if not result:
                continue
            result["game_id"] = event_id
            result["game_date"] = game_date
            result["season"] = season
            rows.append(result)
            finished += 1
            if finished % 20 == 0:
                log.info(f"  Season {season}: {finished} games collected")
            time.sleep(0.15)
        log.info(f"  Season {season} done: {finished} games")
    df = pd.DataFrame(rows)
    log.info(f"Total rows: {len(df)}")
    return df

def add_rolling_features(df):
    df = df.sort_values("game_date").reset_index(drop=True)
    df["point_diff"] = df["knicks_pts"] - df["opp_pts"]
    df["total_pts"]  = df["knicks_pts"] + df["opp_pts"]
    df["knicks_win"] = (df["knicks_pts"] > df["opp_pts"]).astype(int)
    for n in [5, 10]:
        for col in ["knicks_pts","opp_pts","point_diff","total_pts",
                    "knicks_fg_pct","knicks_fg3_pct","knicks_tov","knicks_ast","knicks_reb",
                    "opp_fg_pct","opp_tov"]:
            if col in df.columns:
                df[f"roll{n}_{col}"] = df[col].shift(1).rolling(n, min_periods=3).mean()
    df["knicks_season_win_pct"] = df["knicks_win"].shift(1).expanding().mean()
    df["game_date_dt"] = pd.to_datetime(df["game_date"])
    df["rest_days"] = df["game_date_dt"].diff().dt.days.sub(1).fillna(2).clip(0,10)
    df["back_to_back"] = (df["rest_days"] == 0).astype(int)
    df = df.dropna(subset=["roll5_knicks_pts","roll5_opp_pts"])
    log.info(f"After rolling features: {len(df)} training rows")
    return df

def train_models(df):
    KNICKS_FEATS = [f for f in [
        "is_home","rest_days","back_to_back",
        "roll5_knicks_pts","roll5_opp_pts","roll5_point_diff","roll5_total_pts",
        "roll5_knicks_fg_pct","roll5_knicks_fg3_pct","roll5_knicks_tov","roll5_knicks_ast","roll5_knicks_reb",
        "roll10_knicks_pts","roll10_opp_pts","roll10_point_diff","roll10_total_pts",
        "knicks_season_win_pct",
    ] if f in df.columns]
    OPP_FEATS = [f for f in [
        "is_home","rest_days","back_to_back",
        "roll5_opp_pts","roll5_total_pts","roll5_opp_fg_pct","roll5_opp_tov",
        "roll10_opp_pts","roll10_total_pts",
        "knicks_season_win_pct",
    ] if f in df.columns]

    X_k = df[KNICKS_FEATS].fillna(df[KNICKS_FEATS].mean())
    X_o = df[OPP_FEATS].fillna(df[OPP_FEATS].mean())
    y_k = df["knicks_pts"]
    y_o = df["opp_pts"]
    y_win  = df["knicks_win"]
    median_total = df["total_pts"].median()
    y_over = (df["total_pts"] > median_total).astype(int)

    params = dict(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.8, min_samples_leaf=3, random_state=42)

    log.info(f"Training Knicks score model ({len(X_k)} samples, {len(KNICKS_FEATS)} features)...")
    sm = GradientBoostingRegressor(**params); sm.fit(X_k, y_k)
    k_mae = round(-cross_val_score(sm, X_k, y_k, cv=5, scoring="neg_mean_absolute_error").mean(), 2)
    log.info(f"  MAE: {k_mae} pts")

    log.info(f"Training opp score model ({len(X_o)} samples)...")
    om = GradientBoostingRegressor(**params); om.fit(X_o, y_o)
    o_mae = round(-cross_val_score(om, X_o, y_o, cv=5, scoring="neg_mean_absolute_error").mean(), 2)
    log.info(f"  MAE: {o_mae} pts")

    log.info("Training spread classifier...")
    spm = GradientBoostingClassifier(n_estimators=200, max_depth=3, learning_rate=0.05, random_state=42)
    spm.fit(X_k, y_win)
    sp_acc = round(cross_val_score(spm, X_k, y_win, cv=5, scoring="accuracy").mean()*100, 1)
    log.info(f"  Win accuracy: {sp_acc}%")

    log.info("Training total classifier...")
    tm = GradientBoostingClassifier(n_estimators=200, max_depth=3, learning_rate=0.05, random_state=42)
    tm.fit(X_k, y_over)
    t_acc = round(cross_val_score(tm, X_k, y_over, cv=5, scoring="accuracy").mean()*100, 1)
    log.info(f"  Over accuracy: {t_acc}%")

    joblib.dump(sm,  os.path.join(MODELS_DIR, "score_model.pkl"))
    joblib.dump(om,  os.path.join(MODELS_DIR, "opp_score_model.pkl"))
    joblib.dump(spm, os.path.join(MODELS_DIR, "spread_model.pkl"))
    joblib.dump(tm,  os.path.join(MODELS_DIR, "total_model.pkl"))

    meta = {
        "knicks_score": {"model_type":"GradientBoosting","target":"knicks_pts","cv_mae_points":k_mae,"features":KNICKS_FEATS,"n_samples":len(df),"avg_target":round(float(y_k.mean()),1)},
        "opp_score":    {"model_type":"GradientBoosting","target":"opp_pts","cv_mae_points":o_mae,"features":OPP_FEATS,"n_samples":len(df),"avg_target":round(float(y_o.mean()),1)},
        "spread":       {"model_type":"GradientBoosting_Classifier","accuracy_pct":sp_acc,"features":KNICKS_FEATS},
        "total":        {"model_type":"GradientBoosting_Classifier","accuracy_pct":t_acc,"features":KNICKS_FEATS,"median_total":round(float(median_total),1)},
        "trained_at":   datetime.now().isoformat(),
    }
    with open(os.path.join(MODELS_DIR, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    df.to_csv(os.path.join(MODELS_DIR, "training_data.csv"), index=False)
    log.info(f"=== Done! Knicks MAE={k_mae}, Opp MAE={o_mae}, Spread={sp_acc}%, Total={t_acc}% ===")

if __name__ == "__main__":
    log.info("=== KnicksHub ML Training Pipeline (ESPN) ===")
    df = build_dataset(seasons=[2023, 2024, 2025])
    if len(df) < 10:
        log.error("Not enough data. Check ESPN API.")
        sys.exit(1)
    df = add_rolling_features(df)
    train_models(df)
