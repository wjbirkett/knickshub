"""
prop_lines_service.py — Generates dynamic player prop lines from real season averages.
No hardcoded lines. Props are calculated from NBA.com stats data, rounded to
standard sportsbook half-point intervals.
"""
import logging
import math
from typing import Dict, Optional
from app.services.nba_service import fetch_player_stats

logger = logging.getLogger(__name__)

# Knicks rotation players to generate props for
KNICKS_PLAYERS = [
    "Jalen Brunson", "Karl-Anthony Towns", "Mikal Bridges",
    "OG Anunoby", "Josh Hart", "Miles McBride", "Mitchell Robinson",
    "Jordan Clarkson", "Tyler Kolek", "Landry Shamet",
]


def _round_to_half(value: float) -> float:
    """Round to nearest 0.5 (standard sportsbook prop line interval)."""
    return math.floor(value * 2) / 2 + 0.5 if value % 0.5 != 0 else value + 0.5


def _stat_to_prop_line(avg: float) -> float:
    """Convert a season average to a realistic prop line.
    Sportsbooks typically set lines very close to the player's average,
    slightly adjusted. We round to the nearest .5."""
    if avg <= 0:
        return 0.5
    return _round_to_half(avg)


async def fetch_live_prop_lines(home_team: str, away_team: str) -> Dict[str, Dict[str, float]]:
    """
    Generate prop lines from real NBA.com season averages.
    Returns dict: {player_name: {prop_type: line}}
    """
    try:
        stats = await fetch_player_stats()
    except Exception as e:
        logger.error(f"Failed to fetch player stats for prop lines: {e}")
        return {}

    if not stats:
        logger.warning("No player stats available for prop lines")
        return {}

    lines: Dict[str, Dict[str, float]] = {}

    for player in stats:
        name = player.player_name
        # Only generate for known Knicks rotation players
        if not any(kp.lower() in name.lower() or name.lower() in kp.lower()
                   for kp in KNICKS_PLAYERS):
            continue

        # Match to canonical name
        canonical = next(
            (kp for kp in KNICKS_PLAYERS
             if kp.split()[0].lower() in name.lower()
             and kp.split()[-1].lower() in name.lower()),
            name
        )

        # Skip players with very low minutes (not in rotation)
        if player.minutes_per_game < 10:
            continue

        player_lines = {}

        # Points
        if player.points_per_game > 0:
            player_lines["points"] = _stat_to_prop_line(player.points_per_game)

        # Rebounds
        if player.rebounds_per_game > 0:
            player_lines["rebounds"] = _stat_to_prop_line(player.rebounds_per_game)

        # Assists
        if player.assists_per_game > 0:
            player_lines["assists"] = _stat_to_prop_line(player.assists_per_game)

        # Threes
        if player.threes_per_game > 0:
            player_lines["threes"] = _stat_to_prop_line(player.threes_per_game)

        # Steals
        if player.steals_per_game > 0:
            player_lines["steals"] = _stat_to_prop_line(player.steals_per_game)

        # Blocks
        if player.blocks_per_game > 0:
            player_lines["blocks"] = _stat_to_prop_line(player.blocks_per_game)

        # PRA combo (points + rebounds + assists)
        pra = player.points_per_game + player.rebounds_per_game + player.assists_per_game
        if pra > 0:
            player_lines["pts_reb_ast"] = _stat_to_prop_line(pra)

        if player_lines:
            lines[canonical] = player_lines
            logger.debug(f"Generated prop lines for {canonical}: {player_lines}")

    logger.info(f"Generated dynamic prop lines for {len(lines)} players from season averages")
    return lines
