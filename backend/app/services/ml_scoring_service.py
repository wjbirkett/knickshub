"""
ml_scoring_service.py — ML-based score predictor for KnicksHub

Loads trained .pkl models and predicts Knicks/opponent scores
using pre-game rolling features. Output is injected into Claude prompts.

Falls back gracefully if models aren't available.
"""

import os
import json
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import date

logger = logging.getLogger(__name__)

# Path to models folder relative to this file
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


# ── Lazy model loading ─────────────────────────────────────────────────────────
_score_model = None
_opp_model = None
_spread_model = None
_total_model = None
_meta = None
_models_loaded = False


def _load_models():
    global _score_model, _opp_model, _spread_model, _total_model, _meta, _models_loaded
    if _models_loaded:
        return

    try:
        import joblib

        score_path  = os.path.join(MODELS_DIR, "score_model.pkl")
        opp_path    = os.path.join(MODELS_DIR, "opp_score_model.pkl")
        spread_path = os.path.join(MODELS_DIR, "spread_model.pkl")
        total_path  = os.path.join(MODELS_DIR, "total_model.pkl")
        meta_path   = os.path.join(MODELS_DIR, "model_meta.json")

        if os.path.exists(score_path):
            _score_model = joblib.load(score_path)
            logger.info("Loaded score_model.pkl")

        if os.path.exists(opp_path):
            _opp_model = joblib.load(opp_path)
            logger.info("Loaded opp_score_model.pkl")

        if os.path.exists(spread_path):
            _spread_model = joblib.load(spread_path)
            logger.info("Loaded spread_model.pkl")

        if os.path.exists(total_path):
            _total_model = joblib.load(total_path)
            logger.info("Loaded total_model.pkl")

        if os.path.exists(meta_path):
            with open(meta_path) as f:
                _meta = json.load(f)

        _models_loaded = True

    except Exception as e:
        logger.warning(f"Could not load ML models: {e}")
        _models_loaded = True  # Don't retry on every call


def models_available() -> bool:
    _load_models()
    return _score_model is not None and _opp_model is not None


# ── Feature builder ────────────────────────────────────────────────────────────
def _build_features(
    is_home: int,
    knicks_rest_days: float,
    back_to_back: int,
    recent_games: list,  # list of game dicts from fetch_schedule, sorted oldest first
) -> Optional[Dict[str, float]]:
    """
    Build feature dict from recent game history.
    Mirrors the feature engineering in collect_training_data.py.
    """
    if not recent_games or len(recent_games) < 3:
        return None

    import pandas as pd

    # Build a mini dataframe from recent games
    rows = []
    for g in recent_games:
        knicks_pts = None
        opp_pts = None

        # Handle different score formats from fetch_schedule
        score = g.get("score", {})
        if score:
            knicks_pts = score.get("NYK") or score.get("New York Knicks")
            # opp score = total - knicks (if we have both)
            all_scores = list(score.values())
            if len(all_scores) == 2 and knicks_pts is not None:
                opp_pts = sum(all_scores) - knicks_pts

        if knicks_pts is None:
            continue

        rows.append({
            "knicks_pts": float(knicks_pts),
            "opp_pts":    float(opp_pts) if opp_pts is not None else None,
        })

    if len(rows) < 3:
        return None

    df = pd.DataFrame(rows)
    df["point_diff"] = df["knicks_pts"] - df["opp_pts"]
    df["total_pts"]  = df["knicks_pts"] + df["opp_pts"]

    def roll(col, n):
        s = df[col].dropna()
        if len(s) < 3:
            return None
        return round(float(s.tail(n).mean()), 2)

    features = {
        "is_home":               is_home,
        "knicks_rest_days":      knicks_rest_days,
        "back_to_back":          back_to_back,
        "roll5_knicks_pts":      roll("knicks_pts",  5),
        "roll5_opp_pts":         roll("opp_pts",     5),
        "roll5_point_diff":      roll("point_diff",  5),
        "roll5_total":           roll("total_pts",   5),
        "roll5_total_pts":       roll("total_pts",   5),
        "roll5_fg_pct":          None,  # not available from schedule
        "roll5_tov":             None,
        "roll5_ast":             None,
        "roll10_knicks_pts":     roll("knicks_pts",  10),
        "roll10_opp_pts":        roll("opp_pts",     10),
        "roll10_point_diff":     roll("point_diff",  10),
        "roll10_total":          roll("total_pts",   10),
        "knicks_season_win_pct": None,  # filled below
    }

    # Season win pct from recent games
    wins = sum(1 for r in rows if r["knicks_pts"] is not None and
               r["opp_pts"] is not None and r["knicks_pts"] > r["opp_pts"])
    features["knicks_season_win_pct"] = round(wins / len(rows), 3)

    return features


def _features_to_df(features: Dict, feature_names: list):
    """Convert feature dict to DataFrame in the order the model expects."""
    import pandas as pd
    row = {f: features.get(f) for f in feature_names}
    return pd.DataFrame([row])


# ── Main prediction function ───────────────────────────────────────────────────
async def predict_game_score(
    home_team: str,
    away_team: str,
    recent_games: list,
    knicks_last_game_date: Optional[str] = None,
    game_date: Optional[str] = None,
    spread: Optional[str] = None,
    over_under: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Predict Knicks and opponent scores using trained ML models.

    Returns dict with predicted scores and a formatted prompt block.
    Falls back to None values if models unavailable.
    """
    _load_models()

    if not models_available():
        return {
            "available": False,
            "ml_block": "",
        }

    try:
        # Determine home/away
        is_knicks_home = "knicks" in home_team.lower() or "new york" in home_team.lower()
        is_home = 1 if is_knicks_home else 0

        # Rest days
        knicks_rest_days = 1.0
        back_to_back = 0
        if knicks_last_game_date and game_date:
            from datetime import date as dt
            try:
                last = dt.fromisoformat(str(knicks_last_game_date)[:10])
                today = dt.fromisoformat(str(game_date)[:10])
                rest = (today - last).days - 1
                knicks_rest_days = max(0.0, float(rest))
                back_to_back = 1 if rest == 0 else 0
            except Exception:
                pass

        # Build features from recent games
        features = _build_features(is_home, knicks_rest_days, back_to_back, recent_games)
        if not features:
            return {"available": False, "ml_block": ""}

        # Add odds features if available
        if spread and spread != "N/A":
            try:
                features["spread"] = float(spread.replace("+", ""))
            except Exception:
                pass
        if over_under and over_under != "N/A":
            try:
                features["over_under"] = float(over_under)
            except Exception:
                pass

        # Predict Knicks score
        score_features = _meta.get("knicks_score", {}).get("features", [])
        opp_features   = _meta.get("opp_score", {}).get("features", [])

        knicks_pred = None
        opp_pred = None
        knicks_mae = _meta.get("knicks_score", {}).get("cv_mae_points", 12)
        opp_mae    = _meta.get("opp_score", {}).get("cv_mae_points", 12)

        if score_features:
            X_k = _features_to_df(features, score_features)
            knicks_pred = round(float(_score_model.predict(X_k)[0]))

        if opp_features:
            X_o = _features_to_df(features, opp_features)
            opp_pred = round(float(_opp_model.predict(X_o)[0]))

        # Spread/total predictions if models available
        cover_prob = None
        over_prob = None

        if _spread_model and "spread" in features:
            spread_features = _meta.get("spread", {}).get("features", [])
            if spread_features:
                X_s = _features_to_df(features, spread_features)
                try:
                    cover_prob = round(float(_spread_model.predict_proba(X_s)[0][1]) * 100)
                except Exception:
                    pass

        if _total_model and "over_under" in features:
            total_features = _meta.get("total", {}).get("features", [])
            if total_features:
                X_t = _features_to_df(features, total_features)
                try:
                    over_prob = round(float(_total_model.predict_proba(X_t)[0][1]) * 100)
                except Exception:
                    pass

        # Build prompt block
        ml_block = _build_ml_block(
            knicks_pred, opp_pred, knicks_mae, opp_mae,
            cover_prob, over_prob,
            is_knicks_home, features,
        )

        return {
            "available": True,
            "knicks_predicted_score": knicks_pred,
            "opp_predicted_score": opp_pred,
            "knicks_mae": knicks_mae,
            "opp_mae": opp_mae,
            "cover_probability": cover_prob,
            "over_probability": over_prob,
            "ml_block": ml_block,
        }

    except Exception as e:
        logger.warning(f"ML prediction failed: {e}")
        return {"available": False, "ml_block": ""}


def _build_ml_block(
    knicks_pred, opp_pred, knicks_mae, opp_mae,
    cover_prob, over_prob,
    is_knicks_home, features,
) -> str:
    lines = [
        "=== ML SCORE PREDICTION (Gradient Boosting, trained on 234 games) ===",
    ]

    if knicks_pred is not None and opp_pred is not None:
        pred_total = knicks_pred + opp_pred
        pred_diff  = knicks_pred - opp_pred
        location   = "HOME" if is_knicks_home else "AWAY"
        lines += [
            f"Predicted Score: Knicks {knicks_pred} — Opponent {opp_pred} ({location})",
            f"Predicted Total: {pred_total} pts",
            f"Predicted Margin: {'Knicks +' if pred_diff > 0 else 'Opponent +'}{abs(pred_diff)}",
            f"Model MAE: ±{knicks_mae:.1f} pts (Knicks), ±{opp_mae:.1f} pts (Opponent)",
        ]

    if cover_prob is not None:
        lines.append(f"Cover Probability: {cover_prob}% (model estimate)")
    if over_prob is not None:
        lines.append(f"Over Probability:  {over_prob}% (model estimate)")

    lines += [
        "",
        "Instructions for Claude:",
        "- Your final score prediction MUST be directionally consistent with the ML prediction.",
        "- If ML predicts Knicks win by 8, your predicted score should also show a Knicks win.",
        "- If ML total is 228, your over/under lean should reflect whether the posted line is above/below that.",
        "- You may adjust the margin based on injuries and matchup context, but stay within ±10 pts.",
        "- Reference the MAE when expressing confidence: high MAE = wider range, lower confidence.",
        "=== END ML PREDICTION ===",
    ]

    return "\n".join(lines)
