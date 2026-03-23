"""
prop_lines_service.py — Fetches real sportsbook player prop lines.

Primary: The Odds API (real DraftKings/FanDuel lines)
Fallback: Dynamic lines calculated from NBA.com season averages
"""
import logging
import math
import httpx
from datetime import date, timedelta
from typing import Dict, List, Optional
from app.services.nba_service import fetch_player_stats

logger = logging.getLogger(__name__)

ODDS_API_KEY = "ea936af7908166c106f76b3f68a87d4f"
ODDS_API_BASE = "https://api.the-odds-api.com/v4"
SPORT = "basketball_nba"

# Prop markets to fetch (each counts as 1 credit per request)
PROP_MARKETS = [
    "player_points",
    "player_rebounds",
    "player_assists",
    "player_threes",
    "player_steals",
    "player_blocks",
    "player_points_rebounds_assists",
]

# Map Odds API market names to our internal prop types
MARKET_MAP = {
    "player_points": "points",
    "player_rebounds": "rebounds",
    "player_assists": "assists",
    "player_threes": "threes",
    "player_steals": "steals",
    "player_blocks": "blocks",
    "player_points_rebounds_assists": "pts_reb_ast",
}

# Knicks rotation players
KNICKS_PLAYERS = [
    "Jalen Brunson", "Karl-Anthony Towns", "Mikal Bridges",
    "OG Anunoby", "Josh Hart", "Miles McBride", "Mitchell Robinson",
    "Jordan Clarkson", "Tyler Kolek", "Landry Shamet",
]


def _match_knicks_player(name: str) -> Optional[str]:
    """Match an API player name to a canonical Knicks player name."""
    name_lower = name.lower()
    for kp in KNICKS_PLAYERS:
        first = kp.split()[0].lower()
        last = kp.split()[-1].lower()
        if first in name_lower and last in name_lower:
            return kp
    return None


async def _fetch_knicks_event_id() -> Optional[str]:
    """Find today's or tomorrow's Knicks game event ID from The Odds API."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{ODDS_API_BASE}/sports/{SPORT}/events",
                params={"apiKey": ODDS_API_KEY}
            )
            resp.raise_for_status()
            events = resp.json()

        today = date.today()
        tomorrow = today + timedelta(days=1)

        for event in events:
            # Check if Knicks are playing
            home = event.get("home_team", "")
            away = event.get("away_team", "")
            if "Knicks" not in home and "Knicks" not in away:
                continue

            # Check if game is today or tomorrow
            commence = event.get("commence_time", "")
            if commence:
                game_date_str = commence[:10]
                try:
                    game_date = date.fromisoformat(game_date_str)
                    if game_date in (today, tomorrow):
                        event_id = event.get("id")
                        logger.info(f"Odds API: Found Knicks event {event_id} ({away} @ {home})")
                        return event_id
                except ValueError:
                    pass

        logger.warning("Odds API: No upcoming Knicks game found in events")
        return None

    except Exception as e:
        logger.error(f"Odds API: Failed to fetch events: {e}")
        return None


async def _fetch_odds_api_props(event_id: str) -> Dict[str, Dict[str, float]]:
    """Fetch player prop lines from The Odds API for a specific event."""
    lines: Dict[str, Dict[str, float]] = {}

    try:
        # Fetch all prop markets in one request (costs len(PROP_MARKETS) credits)
        markets_str = ",".join(PROP_MARKETS)
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{ODDS_API_BASE}/sports/{SPORT}/events/{event_id}/odds",
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "us",
                    "markets": markets_str,
                    "oddsFormat": "american",
                }
            )
            resp.raise_for_status()
            data = resp.json()

        # Log remaining credits
        remaining = resp.headers.get("x-requests-remaining", "?")
        used = resp.headers.get("x-requests-used", "?")
        logger.info(f"Odds API: Credits used={used}, remaining={remaining}")

        # Parse bookmaker data — use first available bookmaker (usually DraftKings)
        bookmakers = data.get("bookmakers", [])
        if not bookmakers:
            logger.warning("Odds API: No bookmakers returned for event")
            return {}

        for bookmaker in bookmakers:
            bk_name = bookmaker.get("title", "Unknown")
            markets = bookmaker.get("markets", [])

            for market in markets:
                market_key = market.get("key", "")
                prop_type = MARKET_MAP.get(market_key)
                if not prop_type:
                    continue

                outcomes = market.get("outcomes", [])
                for outcome in outcomes:
                    player_name = outcome.get("description", "")
                    canonical = _match_knicks_player(player_name)
                    if not canonical:
                        continue

                    point = outcome.get("point")
                    if point is not None:
                        if canonical not in lines:
                            lines[canonical] = {}
                        # Only set if not already set (first bookmaker wins)
                        if prop_type not in lines[canonical]:
                            lines[canonical][prop_type] = float(point)

            # If we got lines from this bookmaker, use them
            if lines:
                logger.info(f"Odds API: Got prop lines from {bk_name} for {len(lines)} players")
                break

        return lines

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 422:
            logger.warning("Odds API: Props not available yet for this event (422)")
        elif e.response.status_code == 429:
            logger.warning("Odds API: Rate limited / credits exhausted")
        else:
            logger.error(f"Odds API: HTTP error {e.response.status_code}")
        return {}
    except Exception as e:
        logger.error(f"Odds API: Failed to fetch props: {e}")
        return {}


# ── Fallback: Season averages ──

def _round_to_half(value: float) -> float:
    """Round to nearest 0.5 (standard sportsbook prop line interval)."""
    return math.floor(value * 2) / 2 + 0.5 if value % 0.5 != 0 else value + 0.5


def _stat_to_prop_line(avg: float) -> float:
    """Convert a season average to a prop line, rounded to nearest .5."""
    if avg <= 0:
        return 0.5
    return _round_to_half(avg)


async def _fallback_season_avg_lines() -> Dict[str, Dict[str, float]]:
    """Generate prop lines from real NBA.com season averages as fallback."""
    try:
        stats = await fetch_player_stats()
    except Exception as e:
        logger.error(f"Fallback: Failed to fetch player stats: {e}")
        return {}

    if not stats:
        return {}

    lines: Dict[str, Dict[str, float]] = {}

    for player in stats:
        canonical = _match_knicks_player(player.player_name)
        if not canonical:
            continue
        if player.minutes_per_game < 10:
            continue

        player_lines = {}
        if player.points_per_game > 0:
            player_lines["points"] = _stat_to_prop_line(player.points_per_game)
        if player.rebounds_per_game > 0:
            player_lines["rebounds"] = _stat_to_prop_line(player.rebounds_per_game)
        if player.assists_per_game > 0:
            player_lines["assists"] = _stat_to_prop_line(player.assists_per_game)
        if player.threes_per_game > 0:
            player_lines["threes"] = _stat_to_prop_line(player.threes_per_game)
        if player.steals_per_game > 0:
            player_lines["steals"] = _stat_to_prop_line(player.steals_per_game)
        if player.blocks_per_game > 0:
            player_lines["blocks"] = _stat_to_prop_line(player.blocks_per_game)
        pra = player.points_per_game + player.rebounds_per_game + player.assists_per_game
        if pra > 0:
            player_lines["pts_reb_ast"] = _stat_to_prop_line(pra)

        if player_lines:
            lines[canonical] = player_lines

    logger.info(f"Fallback: Generated prop lines from season averages for {len(lines)} players")
    return lines


# ── Main entry point ──

async def fetch_live_prop_lines(home_team: str, away_team: str) -> Dict[str, Dict[str, float]]:
    """
    Fetch real sportsbook prop lines.
    Primary: The Odds API (DraftKings/FanDuel lines)
    Fallback: Season averages from NBA.com

    Returns dict: {player_name: {prop_type: line}}
    """
    # Try The Odds API first
    event_id = await _fetch_knicks_event_id()
    if event_id:
        odds_lines = await _fetch_odds_api_props(event_id)
        if odds_lines:
            # Fill any missing props with season averages
            fallback = await _fallback_season_avg_lines()
            for player, plines in fallback.items():
                if player not in odds_lines:
                    odds_lines[player] = plines
                else:
                    for prop_type, line in plines.items():
                        if prop_type not in odds_lines[player]:
                            odds_lines[player][prop_type] = line
            logger.info(f"Using Odds API lines (supplemented with season avg fallback)")
            return odds_lines
        else:
            logger.warning("Odds API returned no props — falling back to season averages")

    # Fallback to season averages
    return await _fallback_season_avg_lines()
