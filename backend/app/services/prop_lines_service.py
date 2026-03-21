"""
prop_lines_service.py — Fetches live player prop lines from BallDontLie API
Replaces hardcoded PROP_LINES in article_service.py
"""
import httpx
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

BDL_API_KEY = "a62e4663-d6dd-400b-a5b6-0fa84923545c"
BDL_BASE = "https://api.balldontlie.io/nba/v2"

# BallDontLie player IDs for Knicks players
PLAYER_IDS = {
    "Jalen Brunson": 192,
    "Karl-Anthony Towns": 140,
    "Mikal Bridges": 1642,
    "OG Anunoby": 1630,
    "Josh Hart": 1628,
    "Miles McBride": 1640,
    "Mitchell Robinson": 1641,
    "Jordan Clarkson": 475,
    "Jeremy Sochan": 1644,
}

# Map BallDontLie market names to our prop types
MARKET_MAP = {
    "player_points": "points",
    "player_rebounds": "rebounds",
    "player_assists": "assists",
    "player_threes": "threes",
    "player_steals": "steals",
    "player_blocks": "blocks",
    "player_pts_rebs_asts": "pts_reb_ast",
}


async def fetch_game_id_for_today(home_team: str, away_team: str) -> Optional[int]:
    """Find today's game ID from BallDontLie."""
    from datetime import date
    today = str(date.today())
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.balldontlie.io/v1/games",
                headers={"Authorization": BDL_API_KEY},
                params={"dates[]": today, "per_page": 30}
            )
            resp.raise_for_status()
            games = resp.json().get("data", [])

        for game in games:
            ht = game.get("home_team", {}).get("full_name", "").lower()
            at = game.get("visitor_team", {}).get("full_name", "").lower()
            if "knick" in ht or "knick" in at:
                return game["id"]
        return None
    except Exception as e:
        logger.warning(f"BDL game ID fetch failed: {e}")
        return None


async def fetch_live_prop_lines(home_team: str, away_team: str) -> Dict[str, Dict[str, float]]:
    """
    Fetch live prop lines for today's Knicks game.
    Returns dict: {player_name: {prop_type: line}}
    Falls back to hardcoded lines if API fails.
    """
    game_id = await fetch_game_id_for_today(home_team, away_team)
    if not game_id:
        logger.warning("BDL: Could not find game ID — using fallback lines")
        return _fallback_lines()

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{BDL_BASE}/props",
                headers={"Authorization": BDL_API_KEY},
                params={"game_id": game_id}
            )
            resp.raise_for_status()
            props_data = resp.json().get("data", [])

        if not props_data:
            logger.warning("BDL: No props returned for game — using fallback lines")
            return _fallback_lines()

        lines: Dict[str, Dict[str, float]] = {}
        for prop in props_data:
            market = prop.get("market", "")
            prop_type = MARKET_MAP.get(market)
            if not prop_type:
                continue

            player_name = prop.get("player", {}).get("first_name", "") + " " + prop.get("player", {}).get("last_name", "")
            player_name = player_name.strip()

            # Only care about Knicks players
            if not any(kp.lower() in player_name.lower() or player_name.lower() in kp.lower()
                      for kp in PLAYER_IDS.keys()):
                continue

            # Match to canonical name
            canonical = next((kp for kp in PLAYER_IDS.keys()
                            if kp.split()[0].lower() in player_name.lower() and
                            kp.split()[-1].lower() in player_name.lower()), player_name)

            line = prop.get("line")
            if line is not None:
                if canonical not in lines:
                    lines[canonical] = {}
                lines[canonical][prop_type] = float(line)

        if lines:
            logger.info(f"BDL: Fetched live prop lines for {len(lines)} players")
            # Fill missing players with fallback
            fallback = _fallback_lines()
            for player, plines in fallback.items():
                if player not in lines:
                    lines[player] = plines
                else:
                    for prop_type, line in plines.items():
                        if prop_type not in lines[player]:
                            lines[player][prop_type] = line
            return lines
        else:
            logger.warning("BDL: Props found but no Knicks players matched — using fallback")
            return _fallback_lines()

    except Exception as e:
        logger.warning(f"BDL props fetch failed: {e}")
        return _fallback_lines()


def _fallback_lines() -> Dict[str, Dict[str, float]]:
    """Hardcoded fallback lines — used when BDL API fails."""
    return {
        "Jalen Brunson": {"points": 26.5, "assists": 7.5, "rebounds": 4.5, "threes": 2.5, "pts_reb_ast": 38.5},
        "Karl-Anthony Towns": {"points": 24.5, "rebounds": 10.5, "assists": 3.5, "threes": 2.5, "pts_reb_ast": 38.5},
        "Mikal Bridges": {"points": 18.5, "steals": 1.5, "threes": 2.5, "rebounds": 4.5, "pts_reb_ast": 26.5},
        "OG Anunoby": {"points": 16.5, "steals": 1.5, "blocks": 1.5, "rebounds": 5.5, "threes": 2.5},
        "Josh Hart": {"points": 10.5, "rebounds": 7.5, "assists": 4.5, "pts_reb_ast": 22.5},
        "Miles McBride": {"points": 9.5, "assists": 3.5, "threes": 1.5},
        "Mitchell Robinson": {"rebounds": 8.5, "blocks": 1.5, "points": 8.5},
        "Jordan Clarkson": {"points": 12.5, "assists": 3.5, "threes": 1.5},
        "Jeremy Sochan": {"points": 11.5, "rebounds": 6.5, "assists": 2.5},
    }
