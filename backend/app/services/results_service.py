import logging
import httpx
import asyncio
from datetime import date, datetime, timezone
from typing import Optional
from app.db import get_supabase

logger = logging.getLogger(__name__)
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
KNICKS_ESPN_ID = "18"

def _run_sync(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

async def fetch_game_result(game_date: str, opponent: str) -> Optional[dict]:
    """Fetch final score from ESPN for a specific game."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/schedule")
            resp.raise_for_status()
            data = resp.json()

        opp_keyword = opponent.split()[-1].lower()
        for event in data.get("events", []):
            comp = event["competitions"][0]
            if not comp.get("status", {}).get("type", {}).get("completed", False):
                continue
            event_date = event.get("date", "")[:10]
            from datetime import timedelta
            tomorrow = str(__import__("datetime").date.fromisoformat(game_date) + timedelta(days=1))
            if event_date != game_date and event_date != tomorrow:
                continue
            competitors = comp.get("competitors", [])
            team_names = " ".join([c.get("team", {}).get("displayName", "").lower() for c in competitors])
            if opp_keyword not in team_names:
                continue
            knicks = next((c for c in competitors if c.get("team", {}).get("id") == KNICKS_ESPN_ID), None)
            opp = next((c for c in competitors if c.get("team", {}).get("id") != KNICKS_ESPN_ID), None)
            if not knicks or not opp:
                continue
            return {
                "knicks_score": int(knicks.get("score", 0)),
                "opp_score": int(opp.get("score", 0)),
                "knicks_won": knicks.get("winner", False),
                "game_id": event.get("id"),
            }
        return None
    except Exception as e:
        logger.error(f"Failed to fetch game result: {e}")
        return None


async def fetch_player_stats_from_boxscore(game_id: str, player_name: str) -> Optional[dict]:
    """Fetch individual player stats from ESPN box score."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event={game_id}")
            resp.raise_for_status()
            data = resp.json()

        boxscore = data.get("boxscore", {})
        players_data = boxscore.get("players", [])

        first_name = player_name.split()[0].lower()
        last_name = player_name.split()[-1].lower()

        for team in players_data:
            for category in team.get("statistics", []):
                for athlete in category.get("athletes", []):
                    name = athlete.get("athlete", {}).get("displayName", "").lower()
                    if first_name in name and last_name in name:
                        stats = athlete.get("stats", [])
                        # ESPN box score stat order: MIN,FG,3PT,FT,OREB,DREB,REB,AST,STL,BLK,TO,PF,PTS,+/-
                        if len(stats) >= 13:
                            return {
                                "points": _safe_int(stats[12]),
                                "rebounds": _safe_int(stats[6]),
                                "assists": _safe_int(stats[7]),
                                "steals": _safe_int(stats[8]),
                                "blocks": _safe_int(stats[9]),
                                "threes": _safe_int(stats[2].split("-")[0]) if "-" in str(stats[2]) else 0,
                            }
        return None
    except Exception as e:
        logger.error(f"Failed to fetch box score for {player_name}: {e}")
        return None


def _safe_int(val) -> int:
    try:
        return int(str(val).split("-")[0])
    except:
        return 0


def _check_result(lean: str, pick_line: float, actual: float) -> str:
    if lean == "OVER":
        return "HIT" if actual > pick_line else "MISS"
    elif lean == "UNDER":
        return "HIT" if actual < pick_line else "MISS"
    return "PUSH"


async def resolve_game_predictions(game_date: str) -> dict:
    """
    After a game, fetch results and update prediction_results and prop_results tables.
    Called automatically by scheduler after game ends.
    """
    db = get_supabase()
    if not db:
        return {"error": "No database connection"}

    resolved = {"prediction_results": 0, "prop_results": 0, "errors": []}

    try:
        # Get all articles for this game date
        all_articles = db.table("articles").select("*").eq("game_date", game_date).execute().data
        articles = [a for a in all_articles if a.get("article_type") != "history"]
        if not articles:
            return {"error": f"No articles found for {game_date}"}

        # Get opponent from first non-history article
        game_article = next((a for a in articles if a["article_type"] == "prediction"), None)
        if not game_article:
            return {"error": "No prediction article found"}

        opponent = game_article["away_team"] if game_article["home_team"] == "New York Knicks" else game_article["home_team"]

        # Fetch actual game result
        result = await fetch_game_result(game_date, opponent)
        if not result:
            return {"error": f"Game result not found for {game_date} vs {opponent}"}

        knicks_score = result["knicks_score"]
        opp_score = result["opp_score"]
        actual_total = knicks_score + opp_score
        knicks_margin = knicks_score - opp_score
        game_id = result["game_id"]

        logger.info(f"Game result: Knicks {knicks_score} - {opponent} {opp_score} (margin: {knicks_margin:+d})")

        # Process prediction and best bet articles
        for article in articles:
            if article["article_type"] not in ("prediction", "best_bet"):
                continue
            if not article.get("key_picks"):
                continue

            picks = article["key_picks"]

            # Determine spread result
            spread_result = None
            if picks.get("spread_pick") and picks.get("spread_lean"):
                try:
                    spread_line = float(str(picks["spread_pick"]).replace("Knicks", "").replace(" ", "").split("(")[0])
                    if picks["spread_lean"] == "COVER":
                        spread_result = "HIT" if knicks_margin > abs(spread_line) else "MISS"
                    else:
                        spread_result = "HIT" if knicks_margin < abs(spread_line) else "MISS"
                except:
                    pass

            # Determine total result
            total_result = None
            if picks.get("total_pick") and picks.get("total_lean"):
                try:
                    total_line = float(str(picks["total_pick"]).replace("Over", "").replace("Under", "").strip())
                    total_result = _check_result(picks["total_lean"], total_line, actual_total)
                except:
                    pass

            # Determine moneyline result
            ml_result = "HIT" if result["knicks_won"] and picks.get("moneyline_lean") == "WIN" else "MISS" if picks.get("moneyline_lean") == "WIN" else None

            # Save to prediction_results
            row = {
                "slug": article["slug"],
                "game_date": game_date,
                "opponent": opponent,
                "spread_pick": picks.get("spread_pick"),
                "spread_lean": picks.get("spread_lean"),
                "spread_result": spread_result,
                "total_pick": picks.get("total_pick"),
                "total_lean": picks.get("total_lean"),
                "total_result": total_result,
                "moneyline_pick": picks.get("moneyline_pick"),
                "moneyline_lean": picks.get("moneyline_lean"),
                "moneyline_result": ml_result,
                "knicks_score": knicks_score,
                "opp_score": opp_score,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            }
            db.table("prediction_results").upsert(row, on_conflict="slug").execute()
            resolved["prediction_results"] += 1

        # Process prop articles
        for article in articles:
            if article["article_type"] != "prop":
                continue
            if not article.get("key_picks") or not article.get("player"):
                continue

            picks = article["key_picks"]
            player = article["player"]
            prop_type = article.get("prop_type", "points")

            # Fetch player box score
            player_stats = await fetch_player_stats_from_boxscore(game_id, player)
            if not player_stats:
                logger.warning(f"Could not fetch box score for {player}")
                continue

            # Map prop type to actual stat
            stat_map = {
                "points": "points",
                "rebounds": "rebounds",
                "assists": "assists",
                "steals": "steals",
                "blocks": "blocks",
                "threes": "threes",
                "pts_reb_ast": None,  # calculated below
            }

            actual_value = None
            if prop_type == "pts_reb_ast":
                actual_value = player_stats["points"] + player_stats["rebounds"] + player_stats["assists"]
            elif prop_type in stat_map:
                actual_value = player_stats.get(stat_map[prop_type])

            if actual_value is None:
                continue

            # Get the line from key_picks
            pick_str = picks.get("pick") or picks.get(f"{prop_type}_pick", "")
            lean = picks.get("lean") or picks.get(f"{prop_type}_lean", "")
            try:
                line = float(str(pick_str).replace("Over", "").replace("Under", "").strip())
            except:
                continue

            result_str = _check_result(lean, line, actual_value)

            row = {
                "slug": article["slug"],
                "game_date": game_date,
                "player": player,
                "prop_type": prop_type,
                "line": line,
                "lean": lean,
                "actual_value": actual_value,
                "result": result_str,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            }
            db.table("prop_results").upsert(row, on_conflict="slug").execute()
            resolved["prop_results"] += 1
            logger.info(f"{player} {prop_type}: {lean} {line} — actual {actual_value} — {result_str}")

        return resolved

    except Exception as e:
        logger.error(f"resolve_game_predictions failed: {e}")
        return {"error": str(e)}


def resolve_yesterday(game_date: str = None):
    """Sync wrapper — called by scheduler."""
    if not game_date:
        from datetime import timedelta
        game_date = str(date.today() - timedelta(days=1))
    return _run_sync(resolve_game_predictions(game_date))
