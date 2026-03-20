"""
scoring_service.py — Rules-based composite game scorer for KnicksHub.

Computes a 0–100 composite score from 4 weighted factors:
  - Offensive/Defensive rating differential  (40%)
  - Rest days advantage                       (20%)
  - Home/Away factor                          (15%)
  - Injury impact weight                      (25%)

The output is injected into all 3 article prompts (Prediction, Best Bet, Prop)
to give Claude a concrete data anchor for picks and predictions.
"""

import httpx
import logging
from datetime import date, timedelta
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ESPN Team Stats endpoint (free, no key required)
# Returns current-season offensive/defensive ratings per team
# ---------------------------------------------------------------------------
ESPN_TEAM_STATS_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}"
    "?enable=stats"
)

# ESPN team ID lookup (same mapping used in article_service.py)
TEAM_IDS: Dict[str, str] = {
    "atlanta hawks": "1", "boston celtics": "2", "brooklyn nets": "17",
    "charlotte hornets": "30", "chicago bulls": "4", "cleveland cavaliers": "5",
    "dallas mavericks": "6", "denver nuggets": "7", "detroit pistons": "8",
    "golden state warriors": "9", "houston rockets": "10", "indiana pacers": "11",
    "la clippers": "12", "los angeles clippers": "12", "los angeles lakers": "13",
    "memphis grizzlies": "29", "miami heat": "14", "milwaukee bucks": "15",
    "minnesota timberwolves": "16", "new orleans pelicans": "3",
    "new york knicks": "18", "oklahoma city thunder": "25",
    "orlando magic": "19", "philadelphia 76ers": "20", "phoenix suns": "21",
    "portland trail blazers": "22", "sacramento kings": "23",
    "san antonio spurs": "24", "toronto raptors": "28", "utah jazz": "26",
    "washington wizards": "27",
}

KNICKS_ID = "18"

# ---------------------------------------------------------------------------
# Injury role weights — how much each injured player hurts their team
# ---------------------------------------------------------------------------
STARTER_INJURY_WEIGHT = 2.5
BENCH_INJURY_WEIGHT = 1.0

# Rough starter lists for the 2025-26 season (used for injury weighting)
# If a player isn't listed here, we treat them as bench
KNOWN_STARTERS: Dict[str, List[str]] = {
    "new york knicks": [
        "jalen brunson", "mikal bridges", "og anunoby",
        "karl-anthony towns", "mitchell robinson"
    ],
}


# ---------------------------------------------------------------------------
# Helper: resolve team name → ESPN team ID
# ---------------------------------------------------------------------------
def _resolve_team_id(team_name: str) -> Optional[str]:
    key = team_name.lower().strip()
    if key in TEAM_IDS:
        return TEAM_IDS[key]
    # Fuzzy fallback
    for name, tid in TEAM_IDS.items():
        if any(word in key for word in name.split() if len(word) > 3):
            return tid
    return None


# ---------------------------------------------------------------------------
# Factor 1: Offensive / Defensive rating differential
# Weight: 40 points max
#
# We pull points-per-game (proxy for offensive rating) and
# opponent-points-per-game (proxy for defensive rating) from ESPN.
# Net rating = team_ppg - opp_ppg per team, then diff = Knicks net - opp net.
# ---------------------------------------------------------------------------
async def _fetch_team_net_rating(team_id: str) -> Optional[float]:
    """
    Returns a rough net rating (ppg - opp_ppg) for a given ESPN team ID.
    Falls back to None on any error.
    """
    url = f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url, params={"enable": "stats"})
            resp.raise_for_status()
            data = resp.json()

        stats = (
            data.get("team", {})
                .get("record", {})
                .get("items", [])
        )
        # ESPN buries stats differently per endpoint; use a safe fallback approach
        # Try the team stats categories
        team_stats = data.get("team", {}).get("stats", {})
        if not team_stats:
            return None

        ppg = opp_ppg = None
        for category in team_stats.get("splits", {}).get("categories", []):
            for stat in category.get("stats", []):
                name = stat.get("name", "")
                value = stat.get("value")
                if name == "avgPoints":
                    ppg = float(value)
                if name == "avgPointsAgainst":
                    opp_ppg = float(value)

        if ppg is not None and opp_ppg is not None:
            return round(ppg - opp_ppg, 2)
        return None

    except Exception as e:
        logger.warning(f"Could not fetch net rating for team {team_id}: {e}")
        return None


def _rating_diff_score(knicks_net: Optional[float], opp_net: Optional[float]) -> tuple[float, str]:
    """
    Convert net rating differential into a 0–40 score.
    diff > +8  → 40 pts (strong Knicks edge)
    diff  0–8  → 20–39 pts (moderate edge)
    diff -8–0  → 10–19 pts (slight disadvantage)
    diff < -8  → 0–9 pts (significant disadvantage)
    Returns (score, explanation).
    """
    if knicks_net is None or opp_net is None:
        return 20.0, "Rating differential: data unavailable (neutral 20/40)"

    diff = knicks_net - opp_net
    if diff >= 8:
        score = 40.0
    elif diff >= 4:
        score = 30.0 + (diff - 4) * 2.5  # 30–40
    elif diff >= 0:
        score = 20.0 + diff * 2.5         # 20–30
    elif diff >= -4:
        score = 10.0 + (diff + 4) * 2.5  # 10–20
    else:
        score = max(0.0, 10.0 + diff)     # 0–10

    direction = "favor Knicks" if diff > 0 else "favor opponent" if diff < 0 else "even"
    explanation = (
        f"Net rating diff: {diff:+.1f} ({direction}) | "
        f"Knicks net: {knicks_net:+.1f}, Opponent net: {opp_net:+.1f}"
    )
    return round(score, 1), explanation


# ---------------------------------------------------------------------------
# Factor 2: Rest days advantage
# Weight: 20 points max
#
# We accept last_game_date for each team (ISO string or date object).
# Rest advantage = Knicks rest days - opponent rest days.
# ---------------------------------------------------------------------------
def _rest_score(
    knicks_last_game: Optional[str],
    opponent_last_game: Optional[str],
    game_date_str: str,
) -> tuple[float, str]:
    """
    Returns (score 0–20, explanation).
    """
    try:
        gd = date.fromisoformat(game_date_str)
    except Exception:
        gd = date.today()

    def _days_rest(last_game_str: Optional[str]) -> Optional[int]:
        if not last_game_str:
            return None
        try:
            lg = date.fromisoformat(str(last_game_str)[:10])
            return (gd - lg).days - 1  # days between last game and tonight
        except Exception:
            return None

    k_rest = _days_rest(knicks_last_game)
    o_rest = _days_rest(opponent_last_game)

    if k_rest is None and o_rest is None:
        return 10.0, "Rest advantage: data unavailable (neutral 10/20)"

    k_rest = k_rest if k_rest is not None else 1
    o_rest = o_rest if o_rest is not None else 1

    advantage = k_rest - o_rest  # positive = Knicks more rested

    if advantage >= 2:
        score = 20.0
    elif advantage == 1:
        score = 15.0
    elif advantage == 0:
        score = 10.0
    elif advantage == -1:
        score = 5.0
    else:
        score = 0.0

    tag = (
        f"Knicks +{advantage} rest days" if advantage > 0
        else "Even rest" if advantage == 0
        else f"Opponent +{-advantage} rest days"
    )
    explanation = f"Rest: Knicks {k_rest}d | Opponent {o_rest}d | {tag}"
    return score, explanation


# ---------------------------------------------------------------------------
# Factor 3: Home / Away factor
# Weight: 15 points max
#
# Knicks home → full 15 pts
# Knicks neutral → 7.5 pts
# Knicks away → 0 pts
# ---------------------------------------------------------------------------
def _home_away_score(home_team: str, away_team: str) -> tuple[float, str]:
    is_home = "knicks" in home_team.lower() or "new york" in home_team.lower()
    is_away = "knicks" in away_team.lower() or "new york" in away_team.lower()

    if is_home:
        return 15.0, "Home court: Knicks at MSG (+15/15)"
    elif is_away:
        return 0.0, "Home court: Knicks on the road (0/15)"
    else:
        return 7.5, "Home court: Neutral venue (7.5/15)"


# ---------------------------------------------------------------------------
# Factor 4: Injury impact weight
# Weight: 25 points max
#
# We score both teams' injury lists. Each injured starter = 2.5 pts off
# their team's score, each bench player = 1.0 pt off.
# Net impact = opponent_penalty - knicks_penalty, scaled to 0–25.
# ---------------------------------------------------------------------------
def _injury_score(
    knicks_injuries: Optional[List[Dict]],
    opponent_injuries_text: Optional[str],
    opponent_name: str,
) -> tuple[float, str]:
    """
    knicks_injuries: list of injury dicts (player_name, status, reason)
    opponent_injuries_text: raw string from _fetch_opponent_injuries()
    Returns (score 0–25, explanation).
    """
    knicks_starters = KNOWN_STARTERS.get("new york knicks", [])

    # --- Score Knicks injury penalty ---
    knicks_penalty = 0.0
    knicks_out = []
    if knicks_injuries:
        for inj in knicks_injuries:
            status = inj.get("status", "").lower()
            if "out" not in status and "doubtful" not in status:
                continue
            name = inj.get("player_name", "").lower()
            is_starter = any(s in name for s in knicks_starters)
            weight = STARTER_INJURY_WEIGHT if is_starter else BENCH_INJURY_WEIGHT
            knicks_penalty += weight
            knicks_out.append(inj.get("player_name", "Unknown"))

    # --- Score opponent injury penalty from text ---
    opp_penalty = 0.0
    opp_out = []
    if opponent_injuries_text and "no injuries" not in opponent_injuries_text.lower():
        lines = [
            l.strip() for l in opponent_injuries_text.split("\n")
            if l.strip().startswith("-")
        ]
        for line in lines:
            lower = line.lower()
            if "out" in lower or "doubtful" in lower:
                # Try to extract player name (first part before colon)
                try:
                    name = line.split(":")[0].replace("-", "").strip()
                    opp_out.append(name)
                except Exception:
                    opp_out.append("Unknown")
                # We don't have opponent starter lists for all 30 teams,
                # so treat all as starters (conservative)
                opp_penalty += STARTER_INJURY_WEIGHT

    # Net advantage to Knicks: more opponent injuries = higher score
    net = opp_penalty - knicks_penalty
    # Scale: net of +5 or more → full 25 pts; net -5 → 0 pts
    raw = 12.5 + (net / 5.0) * 12.5
    score = max(0.0, min(25.0, raw))

    k_str = ", ".join(knicks_out) if knicks_out else "None"
    o_str = ", ".join(opp_out) if opp_out else "None"
    explanation = (
        f"Injuries — Knicks out: {k_str} (penalty: {knicks_penalty:.1f}) | "
        f"{opponent_name} out: {o_str} (penalty: {opp_penalty:.1f}) | "
        f"Net Knicks advantage: {net:+.1f}"
    )
    return round(score, 1), explanation


# ---------------------------------------------------------------------------
# Confidence label from composite score
# ---------------------------------------------------------------------------
def _confidence_label(score: float) -> str:
    if score >= 70:
        return "High"
    elif score >= 45:
        return "Moderate"
    else:
        return "Low"


def _lean_label(score: float) -> str:
    if score >= 65:
        return "Knicks"
    elif score <= 35:
        return "Opponent"
    else:
        return "Toss-up"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def compute_game_score(
    home_team: str,
    away_team: str,
    game_date: str,
    knicks_injuries: Optional[List[Dict]] = None,
    opponent_injuries_text: Optional[str] = None,
    knicks_last_game_date: Optional[str] = None,
    opponent_last_game_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compute a composite 0–100 score for the Knicks' chances tonight.

    Returns a dict suitable for injection into Claude prompts:
    {
        "composite_score": 68,
        "lean": "Knicks",
        "confidence": "Moderate",
        "factors": {
            "rating_differential": { "score": 28.0, "max": 40, "detail": "..." },
            "rest_advantage":      { "score": 15.0, "max": 20, "detail": "..." },
            "home_away":           { "score": 15.0, "max": 15, "detail": "..." },
            "injury_impact":       { "score": 10.0, "max": 25, "detail": "..." },
        },
        "scoring_block": "<formatted string for prompt injection>"
    }
    """
    opponent = away_team if "knicks" not in away_team.lower() and "new york" not in away_team.lower() else home_team

    # --- Factor 1: Rating differential ---
    knicks_id = KNICKS_ID
    opp_id = _resolve_team_id(opponent)

    knicks_net = await _fetch_team_net_rating(knicks_id)
    opp_net = await _fetch_team_net_rating(opp_id) if opp_id else None

    rating_score, rating_detail = _rating_diff_score(knicks_net, opp_net)

    # --- Factor 2: Rest days ---
    rest_score, rest_detail = _rest_score(
        knicks_last_game_date, opponent_last_game_date, game_date
    )

    # --- Factor 3: Home/Away ---
    home_score, home_detail = _home_away_score(home_team, away_team)

    # --- Factor 4: Injury impact ---
    injury_score, injury_detail = _injury_score(
        knicks_injuries, opponent_injuries_text, opponent
    )

    # --- Composite ---
    composite = round(rating_score + rest_score + home_score + injury_score, 1)
    lean = _lean_label(composite)
    confidence = _confidence_label(composite)

    factors = {
        "rating_differential": {"score": rating_score, "max": 40, "detail": rating_detail},
        "rest_advantage":      {"score": rest_score,   "max": 20, "detail": rest_detail},
        "home_away":           {"score": home_score,   "max": 15, "detail": home_detail},
        "injury_impact":       {"score": injury_score, "max": 25, "detail": injury_detail},
    }

    # --- Build the prompt injection block ---
    scoring_block = _build_scoring_block(composite, lean, confidence, factors)

    return {
        "composite_score": composite,
        "lean": lean,
        "confidence": confidence,
        "factors": factors,
        "scoring_block": scoring_block,
    }


def _build_scoring_block(
    composite: float,
    lean: str,
    confidence: str,
    factors: Dict[str, Any],
) -> str:
    """
    Formats the scoring data as a clear, structured block for Claude prompt injection.
    """
    lines = [
        "=== KNICKSHUB COMPOSITE GAME SCORE ===",
        f"Score: {composite}/100 | Lean: {lean} | Confidence: {confidence}",
        "",
        "Factor Breakdown (use these to anchor your analysis):",
    ]
    for name, data in factors.items():
        label = name.replace("_", " ").title()
        lines.append(
            f"  [{label}] {data['score']}/{data['max']} — {data['detail']}"
        )
    lines += [
        "",
        "Instructions for Claude:",
        "- Reference the composite score when framing your confidence level.",
        "- Use the factor breakdown to explain WHY you lean one way.",
        "- If injury impact is high, lead with that angle.",
        "- If rest advantage is significant, mention it as a sharp edge.",
        "- The composite score should directionally match your spread/total lean.",
        "=== END COMPOSITE SCORE ===",
    ]
    return "\n".join(lines)
