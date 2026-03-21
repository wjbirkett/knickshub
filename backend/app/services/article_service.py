import anthropic
import logging
import re
import json
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple, Union
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from aiocache import cached
from aiocache.serializers import JsonSerializer

from app.config import settings
from app.services.nba_stats_service import (
    get_knicks_last5,
    get_h2h_this_season,
    get_knicks_team_stats,
)
from app.services.scoring_service import compute_game_score
from app.services.ml_scoring_service import predict_game_score
from app.services.prop_lines_service import fetch_live_prop_lines
from app.db import get_supabase

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
ANTHROPIC_MODEL = "claude-sonnet-4-5"
ANTHROPIC_MAX_TOKENS = 2000
ANTHROPIC_TEMPERATURE = 0.55
ANTHROPIC_TIMEOUT = 120  # seconds

# Prop bet configuration
PROP_TYPES = {
    "points": {"key": "points_per_game", "suffix": "PTS", "description": "points", "stat_type": "scoring"},
    "rebounds": {"key": "rebounds_per_game", "suffix": "REB", "description": "rebounds", "stat_type": "rebounding"},
    "assists": {"key": "assists_per_game", "suffix": "AST", "description": "assists", "stat_type": "playmaking"},
    "threes": {"key": "threes_per_game", "suffix": "3PM", "description": "three-pointers made", "stat_type": "shooting"},
    "steals": {"key": "steals_per_game", "suffix": "STL", "description": "steals", "stat_type": "defense"},
    "blocks": {"key": "blocks_per_game", "suffix": "BLK", "description": "blocks", "stat_type": "defense"},
    "turnovers": {"key": "turnovers_per_game", "suffix": "TO", "description": "turnovers", "stat_type": "misc"},
    "pts_reb_ast": {"key": "combined", "suffix": "PRA", "description": "points+rebounds+assists combined", "stat_type": "combined"},
}

# TODO: Replace with actual odds API integration
# Typical prop lines by player (hardcoded for now)
PROP_LINES = {
    "Jalen Brunson": {"points": 26.5, "assists": 7.5, "rebounds": 4.5, "threes": 2.5, "pts_reb_ast": 38.5},
    "Karl-Anthony Towns": {"points": 24.5, "rebounds": 10.5, "assists": 3.5, "threes": 2.5, "pts_reb_ast": 38.5},
    "Mikal Bridges": {"points": 18.5, "steals": 1.5, "threes": 2.5, "rebounds": 4.5, "pts_reb_ast": 26.5},
    "OG Anunoby": {"points": 16.5, "steals": 1.5, "blocks": 1.5, "rebounds": 5.5, "threes": 2.5},
    "Josh Hart": {"points": 10.5, "rebounds": 7.5, "assists": 4.5, "pts_reb_ast": 22.5},
    "Miles McBride": {"points": 9.5, "assists": 3.5, "threes": 1.5},
    "Mitchell Robinson": {"rebounds": 8.5, "blocks": 1.5, "points": 8.5},
    "Jordan Clarkson": {"points": 12.5, "assists": 3.5, "threes": 1.5},
    "Jose Alvarado": {"steals": 1.5, "assists": 4.5, "points": 8.5},
    "Jeremy Sochan": {"points": 11.5, "rebounds": 6.5, "assists": 2.5},
    "Landry Shamet": {"points": 8.5, "threes": 1.5},
    "Tyler Kolek": {"assists": 3.5, "points": 6.5},
}

# Which props to generate for each player by default
DEFAULT_PLAYER_PROPS = {
    "Jalen Brunson": ["points", "assists", "pts_reb_ast"],
    "Karl-Anthony Towns": ["points", "rebounds", "pts_reb_ast"],
    "Mikal Bridges": ["points", "steals", "threes"],
    "OG Anunoby": ["points", "steals", "blocks"],
    "Josh Hart": ["pts_reb_ast", "rebounds", "assists"],
    "Miles McBride": ["points", "assists"],
    "Mitchell Robinson": ["rebounds", "blocks"],
    "Jordan Clarkson": ["points", "assists"],
    "Jose Alvarado": ["steals", "assists"],
    "Jeremy Sochan": ["points", "rebounds"],
    "Landry Shamet": ["points", "threes"],
    "Tyler Kolek": ["assists", "points"],
}

SEASON_FACTS = """
=== VERIFIED 2025-26 SEASON FACTS - USE ONLY THESE, DO NOT INVENT OR HALLUCINATE ===

KNICKS HEAD COACH: Mike Brown (hired July 2025 after Tom Thibodeau was fired)
KNICKS CURRENT CORE/STARTERS (as of March 2026): 
- Jalen Brunson (PG)
- Mikal Bridges (SG/SF)
- OG Anunoby (SF)
- Karl-Anthony Towns (PF/C)
- Mitchell Robinson (C) when healthy

KNICKS KEY ROTATION/BENCH: Josh Hart, Miles McBride, Jordan Clarkson, 
Jose Alvarado, Landry Shamet, Tyler Kolek, Pacôme Dadiet, Ariel Hukporti, Jeremy Sochan

PLAYERS NO LONGER ON THE KNICKS (never mention as current roster players):
Precious Achiuwa, Donte DiVincenzo, Quentin Grimes, Isaiah Hartenstein

INDIANA PACERS CONTEXT (as of mid-March 2026):
Tyrese Haliburton is OUT FOR THE ENTIRE 2025-26 SEASON 
(torn Achilles in 2025 NBA Finals Game 7 + subsequent shingles issues).
Without him, the Pacers have one of the worst records in the NBA (~15-53) 
and were eliminated from playoff contention early.
Andrew Nembhard starts at PG. Pascal Siakam leads the team in scoring. 
Jarace Walker has stepped up significantly. Ivica Zubac was acquired from the Clippers.

The Knicks are a strong Eastern Conference playoff team under Mike Brown.

=== END VERIFIED FACTS ===
"""

# ----------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------
def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


def _ordinal(n: int) -> str:
    if 11 <= n <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def _format_injuries(injuries: Optional[List[Dict]]) -> str:
    if not injuries:
        return "None reported"
    return "\n".join([
        f"- {i.get('player_name', '?')}: {i.get('status', 'Unknown')} ({i.get('reason', 'Undisclosed')})"
        for i in injuries
    ])


def _format_stats(stats: Optional[List[Dict]]) -> str:
    if not stats:
        return "Stats unavailable"
    return "\n".join([
        f"- {s.get('player_name', '?')}: {s.get('points_per_game', 0)}pts "
        f"{s.get('rebounds_per_game', 0)}reb {s.get('assists_per_game', 0)}ast"
        for s in stats[:5]
    ])


def _normalize_and_validate_picks(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Normalize enum values and validate required fields."""
    if not isinstance(data, dict):
        return None

    # Normalize string values
    for field in ["spread_lean", "moneyline_lean", "total_lean", "lean"]:
        if field in data and isinstance(data[field], str):
            data[field] = data[field].strip().upper()

    if "confidence" in data and isinstance(data["confidence"], str):
        v = data["confidence"].strip().lower()
        data["confidence"] = v[0].upper() + v[1:] if v else ""

    # Validate enums
    if data.get("spread_lean") not in (None, "COVER", "NO COVER"):
        logger.warning(f"Invalid spread_lean: {data.get('spread_lean')}")
        return None
    if data.get("moneyline_lean") not in (None, "WIN", "LOSS"):
        logger.warning(f"Invalid moneyline_lean: {data.get('moneyline_lean')}")
        return None
    if data.get("total_lean") not in (None, "OVER", "UNDER"):
        logger.warning(f"Invalid total_lean: {data.get('total_lean')}")
        return None
    if data.get("lean") not in (None, "OVER", "UNDER"):
        logger.warning(f"Invalid lean: {data.get('lean')}")
        return None
    if data.get("confidence") not in (None, "Low", "Medium", "High"):
        logger.warning(f"Invalid confidence: {data.get('confidence')}")
        return None

    return data


def _safe_json_parse(raw: str) -> Optional[Dict]:
    """Robust JSON extraction using clear delimiters."""
    try:
        # First, strip everything before the article content end marker
        if "=== ARTICLE CONTENT END ===" in raw:
            json_part = raw.split("=== ARTICLE CONTENT END ===")[-1]
        else:
            json_part = raw

        # Look for key picks markers
        start = json_part.find("###KEY PICKS START###")
        end = json_part.find("###KEY PICKS END###")

        if start != -1 and end != -1:
            json_str = json_part[start + len("###KEY PICKS START###"):end].strip()
        else:
            # Fallback: find first { and last }
            start = json_part.find("{")
            end = json_part.rfind("}") + 1
            if start == -1 or end <= start:
                logger.warning("No JSON object found in response")
                return None
            json_str = json_part[start:end]

        # Clean common issues
        json_str = re.sub(r",\s*}", "}", json_str)  # Remove trailing commas
        json_str = re.sub(r",\s*]", "]", json_str)
        
        data = json.loads(json_str)
        return _normalize_and_validate_picks(data)

    except json.JSONDecodeError as e:
        logger.warning(f"JSON decode failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"JSON parsing failed: {e}")
        return None


def _strip_key_picks_block(content: str) -> str:
    """Remove everything after the article delimiter."""
    if "=== ARTICLE CONTENT END ===" in content:
        return content.split("=== ARTICLE CONTENT END ===")[0].strip()
    return content.strip()


def validate_config() -> None:
    """Validate required configuration."""
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not set in settings")
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials not fully configured")


# ----------------------------------------------------------------------
# Data Fetching (with caching and retries)
# ----------------------------------------------------------------------
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
    reraise=True
)
@cached(ttl=300, serializer=JsonSerializer(), key_builder=lambda f, opp: f"injuries_{opp.lower().strip()}")
async def _fetch_opponent_injuries(opponent: str) -> str:
    """Fetch opponent injury report from ESPN API with retries."""
    TEAM_IDS = {
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

    team_key = opponent.lower().strip()
    team_id = TEAM_IDS.get(team_key)
    
    if not team_id:
        # Fuzzy matching for common variations
        for name, tid in TEAM_IDS.items():
            if any(word in team_key for word in name.split() if len(word) > 3):
                team_id = tid
                logger.info(f"Fuzzy matched {opponent} to {name}")
                break
    
    if not team_id:
        return f"Opponent injury data unavailable for {opponent}"

    url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
    
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    all_teams = data.get("injuries", [])
    team_data = next((t for t in all_teams if t.get("id") == team_id), None)
    if not team_data:
        return f"No injuries reported for {opponent}"
    injuries = team_data.get("injuries", [])
    if not injuries:
        return f"No injuries reported for {opponent}"

    lines = []
    for inj in injuries:
        athlete = inj.get("athlete", {})
        name = athlete.get("displayName", "Unknown")
        status = inj.get("status", "Unknown")
        details = inj.get("details", {})
        reason = details.get("type", inj.get("longComment", "Undisclosed"))
        lines.append(f"- {name}: {status} ({reason})")
    
    return "\n".join(lines) if lines else f"No injuries reported for {opponent}"


async def _fetch_nba_context(opponent: str) -> Tuple[str, str, str]:
    """Fetch recent games, H2H, and team stats concurrently."""
    recent, h2h, stats = await asyncio.gather(
        get_knicks_last5(),
        get_h2h_this_season(opponent),
        get_knicks_team_stats(),
        return_exceptions=True,
    )

    if isinstance(recent, Exception):
        recent = "Recent game data unavailable"
        logger.warning(f"Recent data fetch failed: {recent}")
    if isinstance(h2h, Exception):
        h2h = f"H2H data unavailable vs {opponent}"
        logger.warning(f"H2H fetch failed: {h2h}")
    if isinstance(stats, Exception):
        stats = "Team stats unavailable"
        logger.warning(f"Team stats fetch failed: {stats}")

    return recent, h2h, stats


async def get_accuracy_summary() -> str:
    try:
        db = get_supabase()
        if not db: return ""
        result = db.table("prediction_results").select("spread_result,total_result,moneyline_result").execute()
        rows = result.data or []
        if not rows: return ""
        sh = sum(1 for r in rows if r.get("spread_result") == "HIT")
        st = sum(1 for r in rows if r.get("spread_result"))
        th = sum(1 for r in rows if r.get("total_result") == "HIT")
        tt = sum(1 for r in rows if r.get("total_result"))
        mh = sum(1 for r in rows if r.get("moneyline_result") == "HIT")
        mt = sum(1 for r in rows if r.get("moneyline_result"))
        lines = ["=== KNICKSHUB RECENT RECORD - USE TO CALIBRATE PICKS ==="]
        if st: lines.append(f"ATS: {sh}-{st-sh} ({round(sh/st*100)}%) - if below 50% reconsider spread picks")
        if tt: lines.append(f"O/U: {th}-{tt-th} ({round(th/tt*100)}%) - if below 50% reconsider total picks")
        if mt: lines.append(f"ML: {mh}-{mt-mh} ({round(mh/mt*100)}%)")
        lines.append("===")
        return "\n".join(lines)
    except Exception as e:
        logger.warning(f"Could not fetch accuracy: {e}")
        return ""

async def build_game_context(
    home_team: str,
    away_team: str,
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
    over_under: Optional[str] = None,
    recent_games: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """Centralized context builder for all game-related articles."""
    opponent = away_team if away_team != "New York Knicks" else home_team
    recent_text, h2h_text, team_stats_text = await _fetch_nba_context(opponent)
    opponent_injury_text = await _fetch_opponent_injuries(opponent)

    accuracy_summary = await get_accuracy_summary()

    # ── Rules-based composite scorer ──────────────────────────────────────────
    # Pull last game dates from recent_text if available (best-effort parse)
    knicks_last_game = None
    opp_last_game = None
    if isinstance(recent_text, str):
        import re as _re
        dates = _re.findall(r"\d{4}-\d{2}-\d{2}", recent_text)
        if dates:
            knicks_last_game = dates[0]

    scoring_result = await compute_game_score(
        home_team=home_team,
        away_team=away_team,
        game_date=str(__import__("datetime").date.today()),
        knicks_injuries=injuries,
        opponent_injuries_text=opponent_injury_text,
        knicks_last_game_date=knicks_last_game,
        opponent_last_game_date=opp_last_game,
    )
    scoring_block = scoring_result.get("scoring_block", "")
    # ─────────────────────────────────────────────────────────────────────────

    # ── ML score prediction ───────────────────────────────────────────────────
    ml_result = await predict_game_score(
        home_team=home_team,
        away_team=away_team,
        recent_games=recent_games if recent_games else [],
        knicks_last_game_date=knicks_last_game,
        game_date=str(__import__("datetime").date.today()),
        spread=None,
        over_under=over_under,
    )
    ml_block = ml_result.get("ml_block", "")
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "opponent": opponent,
        "injury_text": _format_injuries(injuries),
        "stats_text": _format_stats(top_stats),
        "recent_text": recent_text,
        "h2h_text": h2h_text,
        "team_stats_text": team_stats_text,
        "opponent_injury_text": opponent_injury_text,
        "over_under": over_under or "N/A",
        "scoring_block": scoring_block,
        "ml_block": ml_block,
    }


async def warm_cache(opponents: List[str]) -> None:
    """Pre-warm injury cache for common opponents."""
    logger.info(f"Warming cache for {len(opponents)} opponents")
    tasks = [_fetch_opponent_injuries(opp) for opp in opponents]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Log any failures
    for opp, result in zip(opponents, results):
        if isinstance(result, Exception):
            logger.warning(f"Failed to warm cache for {opp}: {result}")


# ----------------------------------------------------------------------
# Anthropic Client
# ----------------------------------------------------------------------
_async_client: Optional[anthropic.AsyncAnthropic] = None


def get_async_client() -> anthropic.AsyncAnthropic:
    """Get or create async Anthropic client."""
    global _async_client
    if _async_client is None:
        validate_config()
        _async_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _async_client


async def _call_claude(system_prompt: str, user_prompt: str) -> str:
    """Core Claude calling function."""
    client = get_async_client()
    
    try:
        response = await client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=ANTHROPIC_MAX_TOKENS,
            temperature=ANTHROPIC_TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        
        content = response.content[0].text
        
        # Log token usage for monitoring
        if hasattr(response, 'usage'):
            logger.info(f"Claude token usage - Input: {response.usage.input_tokens}, "
                       f"Output: {response.usage.output_tokens}")
        
        return content
        
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Claude call: {e}")
        raise


async def _call_claude_with_timeout(
    system_prompt: str, 
    user_prompt: str, 
    timeout: int = ANTHROPIC_TIMEOUT
) -> Tuple[str, Optional[Dict]]:
    """Wrapper for Claude calls with timeout and JSON extraction."""
    try:
        raw_content = await asyncio.wait_for(
            _call_claude(system_prompt, user_prompt),
            timeout=timeout
        )
        
        key_picks = _safe_json_parse(raw_content)
        clean_content = _strip_key_picks_block(raw_content)
        
        return clean_content, key_picks
        
    except asyncio.TimeoutError:
        logger.error(f"Claude API call timed out after {timeout}s")
        raise
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        raise


# ----------------------------------------------------------------------
# Base System Prompt
# ----------------------------------------------------------------------
BASE_SYSTEM = """You are "KnicksHub AI" — a high-level NBA betting analyst and New York Knicks beat writer with 15+ years of sharp betting experience.
Write in an engaging, opinionated, data-driven style. Never invent statistics, trades, roster moves, or events.

Strict rules:
- ONLY use players, stats, and facts from the provided SEASON_FACTS and live data sections.
- If data is missing, say "data unavailable" instead of guessing.
- Always include the phrase "bet responsibly" naturally in the text.
- Be specific with stats and analysis. Back up every claim with concrete numbers.
- Write with the voice of someone who watches every Knicks game and knows the team inside out.

=== SHARP ANALYSIS FRAMEWORK ===

1. THE INJURY RIPPLE EFFECT:
- Never just list who is OUT. Analyze the usage redistribution.
- If a key opponent player is out, calculate which teammates see the biggest jump in usage and minutes.
- Example: "With Haliburton out, expect McConnell to run the offense. His pace-up style means more possessions for both teams - lean Over."
- For Knicks injuries: identify which player absorbs the missing production and whether their prop lines have adjusted.

2. THE SELF-CORRECTION PROTOCOL:
- You will be given your recent betting record in the prompt. Study it carefully.
- If you have been consistently missing on a specific bet type (e.g., Unders, spread covers), adjust your confidence and lean accordingly.
- If your ATS record is below 50%, be more conservative on spread picks.
- If your Over/Under record shows a pattern (e.g., 3 straight Over misses), recalibrate your scoring projections.
- Acknowledge the pattern subtly: "The total has trended lower in recent Knicks home games..."

3. REFEREE CONTEXT (when provided):
- If tonight's referee crew is identified, factor their tendencies into your pick.
- High foul-rate crews = lean Over on points and free throw props for Brunson.
- Let them play crews = lean Under on points and individual scoring props.
- Mention the referee angle briefly if it supports your pick.

4. THE SHARP ANGLE:
- Always identify one non-obvious reason your pick has value.
- This could be a pace mismatch, defensive scheme exploit, rest advantage, or a line that has not adjusted for an injury.
- Lead with this angle. It is what separates sharp analysis from surface-level takes.

TONE: Professional, data-driven, and slightly New York Gritty. Avoid fluff. Give the sharp angle for every pick.

At the VERY END of your response, you MUST output exactly this format with nothing after it:

=== ARTICLE CONTENT END ===

###KEY PICKS START###
{"spread_pick": "Knicks -7.5", "spread_lean": "COVER", "moneyline_pick": "Knicks -280", "moneyline_lean": "WIN", "total_pick": "Over 224.5", "total_lean": "OVER", "confidence": "High"}
###KEY PICKS END###

The JSON must use EXACTLY these keys: spread_pick, spread_lean (COVER or NO COVER), moneyline_pick, moneyline_lean (WIN or LOSS), total_pick, total_lean (OVER or UNDER), confidence (Low, Medium, or High). No other keys allowed.
"""
import anthropic
import logging
import re
import json
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple, Union
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from aiocache import cached
from aiocache.serializers import JsonSerializer

from app.config import settings
from app.services.nba_stats_service import (
    get_knicks_last5,
    get_h2h_this_season,
    get_knicks_team_stats,
)
from app.db import get_supabase

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
ANTHROPIC_MODEL = "claude-sonnet-4-5"
ANTHROPIC_MAX_TOKENS = 2000
ANTHROPIC_TEMPERATURE = 0.55
ANTHROPIC_TIMEOUT = 120  # seconds

# Prop bet configuration
PROP_TYPES = {
    "points": {"key": "points_per_game", "suffix": "PTS", "description": "points", "stat_type": "scoring"},
    "rebounds": {"key": "rebounds_per_game", "suffix": "REB", "description": "rebounds", "stat_type": "rebounding"},
    "assists": {"key": "assists_per_game", "suffix": "AST", "description": "assists", "stat_type": "playmaking"},
    "threes": {"key": "threes_per_game", "suffix": "3PM", "description": "three-pointers made", "stat_type": "shooting"},
    "steals": {"key": "steals_per_game", "suffix": "STL", "description": "steals", "stat_type": "defense"},
    "blocks": {"key": "blocks_per_game", "suffix": "BLK", "description": "blocks", "stat_type": "defense"},
    "turnovers": {"key": "turnovers_per_game", "suffix": "TO", "description": "turnovers", "stat_type": "misc"},
    "pts_reb_ast": {"key": "combined", "suffix": "PRA", "description": "points+rebounds+assists combined", "stat_type": "combined"},
}

# TODO: Replace with actual odds API integration
# Typical prop lines by player (hardcoded for now)
PROP_LINES = {
    "Jalen Brunson": {"points": 26.5, "assists": 7.5, "rebounds": 4.5, "threes": 2.5, "pts_reb_ast": 38.5},
    "Karl-Anthony Towns": {"points": 24.5, "rebounds": 10.5, "assists": 3.5, "threes": 2.5, "pts_reb_ast": 38.5},
    "Mikal Bridges": {"points": 18.5, "steals": 1.5, "threes": 2.5, "rebounds": 4.5, "pts_reb_ast": 26.5},
    "OG Anunoby": {"points": 16.5, "steals": 1.5, "blocks": 1.5, "rebounds": 5.5, "threes": 2.5},
    "Josh Hart": {"points": 10.5, "rebounds": 7.5, "assists": 4.5, "pts_reb_ast": 22.5},
    "Miles McBride": {"points": 9.5, "assists": 3.5, "threes": 1.5},
    "Mitchell Robinson": {"rebounds": 8.5, "blocks": 1.5, "points": 8.5},
    "Jordan Clarkson": {"points": 12.5, "assists": 3.5, "threes": 1.5},
    "Jose Alvarado": {"steals": 1.5, "assists": 4.5, "points": 8.5},
    "Jeremy Sochan": {"points": 11.5, "rebounds": 6.5, "assists": 2.5},
    "Landry Shamet": {"points": 8.5, "threes": 1.5},
    "Tyler Kolek": {"assists": 3.5, "points": 6.5},
}

# Which props to generate for each player by default
DEFAULT_PLAYER_PROPS = {
    "Jalen Brunson": ["points", "assists", "pts_reb_ast"],
    "Karl-Anthony Towns": ["points", "rebounds", "pts_reb_ast"],
    "Mikal Bridges": ["points", "steals", "threes"],
    "OG Anunoby": ["points", "steals", "blocks"],
    "Josh Hart": ["pts_reb_ast", "rebounds", "assists"],
    "Miles McBride": ["points", "assists"],
    "Mitchell Robinson": ["rebounds", "blocks"],
    "Jordan Clarkson": ["points", "assists"],
    "Jose Alvarado": ["steals", "assists"],
    "Jeremy Sochan": ["points", "rebounds"],
    "Landry Shamet": ["points", "threes"],
    "Tyler Kolek": ["assists", "points"],
}

SEASON_FACTS = """
=== VERIFIED 2025-26 SEASON FACTS - USE ONLY THESE, DO NOT INVENT OR HALLUCINATE ===

KNICKS HEAD COACH: Mike Brown (hired July 2025 after Tom Thibodeau was fired)
KNICKS CURRENT CORE/STARTERS (as of March 2026): 
- Jalen Brunson (PG)
- Mikal Bridges (SG/SF)
- OG Anunoby (SF)
- Karl-Anthony Towns (PF/C)
- Mitchell Robinson (C) when healthy

KNICKS KEY ROTATION/BENCH: Josh Hart, Miles McBride, Jordan Clarkson, 
Jose Alvarado, Landry Shamet, Tyler Kolek, Pacôme Dadiet, Ariel Hukporti, Jeremy Sochan

PLAYERS NO LONGER ON THE KNICKS (never mention as current roster players):
Precious Achiuwa, Donte DiVincenzo, Quentin Grimes, Isaiah Hartenstein

INDIANA PACERS CONTEXT (as of mid-March 2026):
Tyrese Haliburton is OUT FOR THE ENTIRE 2025-26 SEASON 
(torn Achilles in 2025 NBA Finals Game 7 + subsequent shingles issues).
Without him, the Pacers have one of the worst records in the NBA (~15-53) 
and were eliminated from playoff contention early.
Andrew Nembhard starts at PG. Pascal Siakam leads the team in scoring. 
Jarace Walker has stepped up significantly. Ivica Zubac was acquired from the Clippers.

The Knicks are a strong Eastern Conference playoff team under Mike Brown.

=== END VERIFIED FACTS ===
"""

# ----------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------
def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


def _ordinal(n: int) -> str:
    if 11 <= n <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def _format_injuries(injuries: Optional[List[Dict]]) -> str:
    if not injuries:
        return "None reported"
    return "\n".join([
        f"- {i.get('player_name', '?')}: {i.get('status', 'Unknown')} ({i.get('reason', 'Undisclosed')})"
        for i in injuries
    ])


def _format_stats(stats: Optional[List[Dict]]) -> str:
    if not stats:
        return "Stats unavailable"
    return "\n".join([
        f"- {s.get('player_name', '?')}: {s.get('points_per_game', 0)}pts "
        f"{s.get('rebounds_per_game', 0)}reb {s.get('assists_per_game', 0)}ast"
        for s in stats[:5]
    ])


def _normalize_and_validate_picks(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Normalize enum values and validate required fields."""
    if not isinstance(data, dict):
        return None

    # Normalize string values
    for field in ["spread_lean", "moneyline_lean", "total_lean", "lean"]:
        if field in data and isinstance(data[field], str):
            data[field] = data[field].strip().upper()

    if "confidence" in data and isinstance(data["confidence"], str):
        v = data["confidence"].strip().lower()
        data["confidence"] = v[0].upper() + v[1:] if v else ""

    # Validate enums
    if data.get("spread_lean") not in (None, "COVER", "NO COVER"):
        logger.warning(f"Invalid spread_lean: {data.get('spread_lean')}")
        return None
    if data.get("moneyline_lean") not in (None, "WIN", "LOSS"):
        logger.warning(f"Invalid moneyline_lean: {data.get('moneyline_lean')}")
        return None
    if data.get("total_lean") not in (None, "OVER", "UNDER"):
        logger.warning(f"Invalid total_lean: {data.get('total_lean')}")
        return None
    if data.get("lean") not in (None, "OVER", "UNDER"):
        logger.warning(f"Invalid lean: {data.get('lean')}")
        return None
    if data.get("confidence") not in (None, "Low", "Medium", "High"):
        logger.warning(f"Invalid confidence: {data.get('confidence')}")
        return None

    return data


def _safe_json_parse(raw: str) -> Optional[Dict]:
    """Robust JSON extraction using clear delimiters."""
    try:
        # First, strip everything before the article content end marker
        if "=== ARTICLE CONTENT END ===" in raw:
            json_part = raw.split("=== ARTICLE CONTENT END ===")[-1]
        else:
            json_part = raw

        # Look for key picks markers
        start = json_part.find("###KEY PICKS START###")
        end = json_part.find("###KEY PICKS END###")

        if start != -1 and end != -1:
            json_str = json_part[start + len("###KEY PICKS START###"):end].strip()
        else:
            # Fallback: find first { and last }
            start = json_part.find("{")
            end = json_part.rfind("}") + 1
            if start == -1 or end <= start:
                logger.warning("No JSON object found in response")
                return None
            json_str = json_part[start:end]

        # Clean common issues
        json_str = re.sub(r",\s*}", "}", json_str)  # Remove trailing commas
        json_str = re.sub(r",\s*]", "]", json_str)
        
        data = json.loads(json_str)
        return _normalize_and_validate_picks(data)

    except json.JSONDecodeError as e:
        logger.warning(f"JSON decode failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"JSON parsing failed: {e}")
        return None


def _strip_key_picks_block(content: str) -> str:
    """Remove everything after the article delimiter."""
    if "=== ARTICLE CONTENT END ===" in content:
        return content.split("=== ARTICLE CONTENT END ===")[0].strip()
    return content.strip()


def validate_config() -> None:
    """Validate required configuration."""
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not set in settings")
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials not fully configured")


# ----------------------------------------------------------------------
# Data Fetching (with caching and retries)
# ----------------------------------------------------------------------
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
    reraise=True
)
@cached(ttl=300, serializer=JsonSerializer(), key_builder=lambda f, opp: f"injuries_{opp.lower().strip()}")
async def _fetch_opponent_injuries(opponent: str) -> str:
    """Fetch opponent injury report from ESPN API with retries."""
    TEAM_IDS = {
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

    team_key = opponent.lower().strip()
    team_id = TEAM_IDS.get(team_key)
    
    if not team_id:
        # Fuzzy matching for common variations
        for name, tid in TEAM_IDS.items():
            if any(word in team_key for word in name.split() if len(word) > 3):
                team_id = tid
                logger.info(f"Fuzzy matched {opponent} to {name}")
                break
    
    if not team_id:
        return f"Opponent injury data unavailable for {opponent}"

    url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
    
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    all_teams = data.get("injuries", [])
    team_data = next((t for t in all_teams if t.get("id") == team_id), None)
    if not team_data:
        return f"No injuries reported for {opponent}"
    injuries = team_data.get("injuries", [])
    if not injuries:
        return f"No injuries reported for {opponent}"

    lines = []
    for inj in injuries:
        athlete = inj.get("athlete", {})
        name = athlete.get("displayName", "Unknown")
        status = inj.get("status", "Unknown")
        details = inj.get("details", {})
        reason = details.get("type", inj.get("longComment", "Undisclosed"))
        lines.append(f"- {name}: {status} ({reason})")
    
    return "\n".join(lines) if lines else f"No injuries reported for {opponent}"


async def _fetch_nba_context(opponent: str) -> Tuple[str, str, str]:
    """Fetch recent games, H2H, and team stats concurrently."""
    recent, h2h, stats = await asyncio.gather(
        get_knicks_last5(),
        get_h2h_this_season(opponent),
        get_knicks_team_stats(),
        return_exceptions=True,
    )

    if isinstance(recent, Exception):
        recent = "Recent game data unavailable"
        logger.warning(f"Recent data fetch failed: {recent}")
    if isinstance(h2h, Exception):
        h2h = f"H2H data unavailable vs {opponent}"
        logger.warning(f"H2H fetch failed: {h2h}")
    if isinstance(stats, Exception):
        stats = "Team stats unavailable"
        logger.warning(f"Team stats fetch failed: {stats}")

    return recent, h2h, stats


async def get_accuracy_summary() -> str:
    try:
        db = get_supabase()
        if not db: return ""
        result = db.table("prediction_results").select("spread_result,total_result,moneyline_result").execute()
        rows = result.data or []
        if not rows: return ""
        sh = sum(1 for r in rows if r.get("spread_result") == "HIT")
        st = sum(1 for r in rows if r.get("spread_result"))
        th = sum(1 for r in rows if r.get("total_result") == "HIT")
        tt = sum(1 for r in rows if r.get("total_result"))
        mh = sum(1 for r in rows if r.get("moneyline_result") == "HIT")
        mt = sum(1 for r in rows if r.get("moneyline_result"))
        lines = ["=== KNICKSHUB RECENT RECORD - USE TO CALIBRATE PICKS ==="]
        if st: lines.append(f"ATS: {sh}-{st-sh} ({round(sh/st*100)}%) - if below 50% reconsider spread picks")
        if tt: lines.append(f"O/U: {th}-{tt-th} ({round(th/tt*100)}%) - if below 50% reconsider total picks")
        if mt: lines.append(f"ML: {mh}-{mt-mh} ({round(mh/mt*100)}%)")
        lines.append("===")
        return "\n".join(lines)
    except Exception as e:
        logger.warning(f"Could not fetch accuracy: {e}")
        return ""

async def build_game_context(
    home_team: str,
    away_team: str,
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
    over_under: Optional[str] = None,
    recent_games: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """Centralized context builder for all game-related articles."""
    opponent = away_team if away_team != "New York Knicks" else home_team
    recent_text, h2h_text, team_stats_text = await _fetch_nba_context(opponent)
    opponent_injury_text = await _fetch_opponent_injuries(opponent)

    accuracy_summary = await get_accuracy_summary()
    return {
        "opponent": opponent,
        "injury_text": _format_injuries(injuries),
        "stats_text": _format_stats(top_stats),
        "recent_text": recent_text,
        "h2h_text": h2h_text,
        "team_stats_text": team_stats_text,
        "opponent_injury_text": opponent_injury_text,
        "over_under": over_under or "N/A",
    }


async def warm_cache(opponents: List[str]) -> None:
    """Pre-warm injury cache for common opponents."""
    logger.info(f"Warming cache for {len(opponents)} opponents")
    tasks = [_fetch_opponent_injuries(opp) for opp in opponents]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Log any failures
    for opp, result in zip(opponents, results):
        if isinstance(result, Exception):
            logger.warning(f"Failed to warm cache for {opp}: {result}")


# ----------------------------------------------------------------------
# Anthropic Client
# ----------------------------------------------------------------------
_async_client: Optional[anthropic.AsyncAnthropic] = None


def get_async_client() -> anthropic.AsyncAnthropic:
    """Get or create async Anthropic client."""
    global _async_client
    if _async_client is None:
        validate_config()
        _async_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _async_client


async def _call_claude(system_prompt: str, user_prompt: str) -> str:
    """Core Claude calling function."""
    client = get_async_client()
    
    try:
        response = await client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=ANTHROPIC_MAX_TOKENS,
            temperature=ANTHROPIC_TEMPERATURE,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        
        content = response.content[0].text
        
        # Log token usage for monitoring
        if hasattr(response, 'usage'):
            logger.info(f"Claude token usage - Input: {response.usage.input_tokens}, "
                       f"Output: {response.usage.output_tokens}")
        
        return content
        
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Claude call: {e}")
        raise


async def _call_claude_with_timeout(
    system_prompt: str, 
    user_prompt: str, 
    timeout: int = ANTHROPIC_TIMEOUT
) -> Tuple[str, Optional[Dict]]:
    """Wrapper for Claude calls with timeout and JSON extraction."""
    try:
        raw_content = await asyncio.wait_for(
            _call_claude(system_prompt, user_prompt),
            timeout=timeout
        )
        
        key_picks = _safe_json_parse(raw_content)
        clean_content = _strip_key_picks_block(raw_content)
        
        return clean_content, key_picks
        
    except asyncio.TimeoutError:
        logger.error(f"Claude API call timed out after {timeout}s")
        raise
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        raise


# ----------------------------------------------------------------------
# Base System Prompt
# ----------------------------------------------------------------------


# ----------------------------------------------------------------------
# Article Generators
# ----------------------------------------------------------------------
async def generate_game_preview(
    home_team: str,
    away_team: str,
    game_date: str,
    spread: str = "N/A",
    moneyline: str = "N/A",
    over_under: str = "N/A",
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
    recent_games: Optional[List[Dict]] = None,
) -> Dict:
    """Generate a comprehensive game preview with predictions."""
    ctx = await build_game_context(home_team, away_team, injuries, top_stats, over_under, recent_games)

    system = BASE_SYSTEM + "\nYou specialize in game previews and betting predictions."

    user_prompt = f"""Write a compelling, SEO-optimized prediction article for this game:

{away_team} @ {home_team}
Date: {game_date}
Spread: {spread}
Moneyline: {moneyline}
Over/Under: {over_under}

{SEASON_FACTS}

Knicks Injury Report (live data):
{ctx['injury_text']}

{ctx['opponent']} Injury Report (live data):
{ctx['opponent_injury_text']}

Recent Knicks Results:
{ctx['recent_text']}

Knicks Season Stats:
{ctx['team_stats_text']}

Knicks vs {ctx['opponent']} This Season (H2H):
{ctx['h2h_text']}

Referee Context (if available):
{ctx.get("referee_text", "Referee assignment not yet available.")}

{ctx.get("scoring_block", "")}

{ctx.get("ml_block", "")}

Top Knicks Players This Season:
{ctx['stats_text']}

Write the article in this exact structure:
1. A compelling intro paragraph (2-3 sentences) — lead with the strongest angle (injuries, streak, rivalry, etc.)
2. ## Game Overview (odds, spread, total analysis)
3. ## Knicks Recent Form (analyze last 5 games with specific stats)
4. ## Injury Report (cover BOTH teams and their impact on rotations and betting lines)
5. ## Key Matchup to Watch (player vs player or unit vs unit)
6. ## Prediction and Best Bet (clear pick with reasoning)
7. ## Final Score Prediction

Guidelines:
- Write 650-900 words total
- Use markdown formatting with proper headers
- Be specific with stats — mention exact numbers from the data provided
- Always highlight how opponent injuries affect the spread and total
- Target keywords naturally: Knicks prediction, Knicks odds, {away_team} vs {home_team} prediction
- ANTI-REPETITION: Each section must make a different point. Never repeat the same injury or stat in multiple sections.
- VARIED OPENERS: Do NOT start the intro with injury news. Lead with the sharpest betting angle, a streak, or a matchup edge instead.
- SPECIFIC NUMBERS: Every analytical claim must include an actual number (e.g. "covering 7 of their last 10" not "covering recently").
- SHARP ANGLE FIRST: The intro sentence must be the single most compelling reason to bet this game. Make it specific, not generic.

Remember: At the very end, include your picks in the JSON format specified in the system prompt."""

    content, key_picks = await _call_claude_with_timeout(system, user_prompt)

    title = f"{away_team} vs {home_team} Prediction, Best Bets & Player Props ({game_date})"
    slug = slugify(f"{away_team}-vs-{home_team}-prediction-{game_date}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
        "key_picks": key_picks,
        "game_date": game_date,
        "home_team": home_team,
        "away_team": away_team,
        "article_type": "prediction",

        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_player_prop(
    player: str,
    home_team: str,
    away_team: str,
    game_date: str,
    prop_type: str = "points",
    player_stats: Optional[Dict] = None,
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
    over_under: str = "N/A",
) -> Dict:
    """Generate a player prop article for any stat type."""
    
    # Validate and normalize prop type
    if prop_type not in PROP_TYPES:
        logger.warning(f"Invalid prop type '{prop_type}' for {player}, falling back to points")
        prop_type = "points"
    
    prop_config = PROP_TYPES[prop_type]
    
    # Get live prop line from BallDontLie, fall back to hardcoded
    try:
        live_lines = await fetch_live_prop_lines(home_team, away_team)
        line = live_lines.get(player, {}).get(prop_type, "N/A")
    except Exception:
        line = PROP_LINES.get(player, {}).get(prop_type, "N/A")
    if line == "N/A" and prop_type == "pts_reb_ast":
        player_lines = PROP_LINES.get(player, {})
        pts = player_lines.get("points", 0)
        reb = player_lines.get("rebounds", 0)
        ast = player_lines.get("assists", 0)
        if pts and reb and ast:
            line = round(pts + reb + ast, 1)
    
    ctx = await build_game_context(home_team, away_team, injuries, top_stats, over_under)

    # Format player stat specifically for this prop type
    if prop_type == "pts_reb_ast" and player_stats:
        total = (player_stats.get('points_per_game', 0) + 
                player_stats.get('rebounds_per_game', 0) + 
                player_stats.get('assists_per_game', 0))
        player_line = f"{player} season average combined PRA: {total:.1f}"
    elif prop_type != "points" and player_stats:
        stat_value = player_stats.get(prop_config['key'], 'N/A')
        player_line = f"{player} season average {prop_config['description']}: {stat_value} {prop_config['suffix']}"
    else:
        player_line = (
            f"{player} season averages: {player_stats.get('points_per_game', 'N/A')} PPG, "
            f"{player_stats.get('rebounds_per_game', 'N/A')} RPG, "
            f"{player_stats.get('assists_per_game', 'N/A')} APG"
            if player_stats else f"{player} stats unavailable"
        )

    system = BASE_SYSTEM + "\nYou specialize in player prop analysis and betting."

    user_prompt = f"""Write a compelling, SEO-optimized player prop prediction article for:

Player: {player}
Prop Type: {prop_config['description'].upper()}
Line: {line} {prop_config['suffix']}
Game: {away_team} @ {home_team}
Date: {game_date}
Game Total (O/U): {over_under}

{SEASON_FACTS}

{player} Stats:
{player_line}

All Knicks Players Stats (for context):
{ctx['stats_text']}

Knicks Injury Report (affects usage):
{ctx['injury_text']}

{ctx['opponent']} Injury Report (affects matchup):
{ctx['opponent_injury_text']}

Recent Knicks Results:
{ctx['recent_text']}

Knicks Season Stats:
{ctx['team_stats_text']}

Knicks vs {ctx['opponent']} H2H This Season:
{ctx['h2h_text']}

{ctx.get("scoring_block", "")}

{ctx.get("ml_block", "")}

Write the article in this exact structure:
1. Compelling intro (2-3 sentences about {player}'s {prop_config['description']} potential tonight — lead with injuries or matchup advantages)
2. ## {player} Season Averages ({prop_config['description'].upper()})
3. ## Tonight's Matchup (how the opponent defends this stat, who guards {player})
4. ## Recent Form (last 5 games {prop_config['description']} performance)
5. ## Injury Impact (how injuries affect {player}'s usage and opportunity)
6. ## {prop_config['description'].upper()} Prop Prediction (over/under analysis with line {line})
7. ## Final Prediction

Guidelines:
- Write 500-750 words
- Use markdown formatting
- Give a specific recommendation: "Over {line}" or "Under {line}"
- Analyze defensive matchups, pace, and usage rate
- Include "bet responsibly" naturally
- Target keywords: {player} {prop_config['description']} prop, {player} {prop_config['description']} tonight, {player} prediction
- VARIED OPENERS: Do NOT start with "With [player] OUT...". Lead with the player's matchup edge or recent form instead.
- SPECIFIC STATS: Include the player's last 5-game average for this prop type, not just season average.
- MATCHUP FOCUS: Identify the specific defender/scheme the player faces and why it's favorable or unfavorable.
- NO COPY-PASTE INJURY INTROS: Each prop article must have a unique opening angle specific to that player.

Remember: At the very end, include your picks in the JSON format specified in the system prompt."""

    content, key_picks = await _call_claude_with_timeout(system, user_prompt)

    # If Claude didn't provide picks, create minimal ones from defaults
    if not key_picks:
        key_picks = {
            "player": player,
            "prop_type": prop_type,
            "pick": f"Over {line}",
            "lean": "OVER",
            "confidence": "Medium"
        }

    player_slug = player.lower().replace(" ", "-")
    title = f"{player} Props vs {ctx['opponent']}: AI Pick, Line & Analysis ({game_date})"
    slug = slugify(f"{player_slug}-{prop_type}-prop-{game_date}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
        "key_picks": key_picks,
        "game_date": game_date,
        "home_team": home_team,
        "away_team": away_team,
        "article_type": "prop",
        "prop_type": prop_type,
        "player": player,

        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_daily_props(
    home_team: str,
    away_team: str,
    game_date: str,
    players: Optional[List[str]] = None,
    over_under: str = "N/A",
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
    max_props_per_player: int = 2,
) -> List[Dict]:
    """Generate prop articles for multiple players in parallel."""
    
    # If no players specified, generate for all key Knicks
    if players is None:
        players = list(DEFAULT_PLAYER_PROPS.keys())
    
    logger.info(f"Generating props for {len(players)} players")
    
    # Create a stats lookup dict
    stats_lookup = {}
    if top_stats:
        for stat in top_stats:
            if stat.get('player_name'):
                stats_lookup[stat['player_name']] = stat
    
    tasks = []
    for player in players:
        prop_types = DEFAULT_PLAYER_PROPS.get(player, ["points"])
        # Limit props per player to avoid over-generating
        for prop_type in prop_types[:max_props_per_player]:
            tasks.append(
                generate_player_prop(
                    player=player,
                    home_team=home_team,
                    away_team=away_team,
                    game_date=game_date,
                    prop_type=prop_type,
                    player_stats=stats_lookup.get(player),
                    injuries=injuries,
                    top_stats=top_stats,
                    over_under=over_under,
                )
            )
    
    # Run all prop generations concurrently with rate limiting
    articles = []
    # Process in batches of 5 to avoid rate limits
    for i in range(0, len(tasks), 5):
        batch = tasks[i:i+5]
        results = await asyncio.gather(*batch, return_exceptions=True)
        
        for r in results:
            if isinstance(r, Exception):
                logger.error(f"Prop generation failed: {r}")
            else:
                articles.append(r)
        
        # Small delay between batches
        if i + 5 < len(tasks):
            await asyncio.sleep(1)
    
    logger.info(f"Successfully generated {len(articles)} prop articles")
    return articles


async def generate_best_bet(
    home_team: str,
    away_team: str,
    game_date: str,
    spread: str = "N/A",
    moneyline: str = "N/A",
    over_under: str = "N/A",
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
    forced_total_lean: Optional[str] = None,
    forced_total_pick: Optional[str] = None,
) -> Dict:
    """Generate a sharp best bet article."""
    ctx = await build_game_context(home_team, away_team, injuries, top_stats, over_under)

    system = BASE_SYSTEM + "\nYou specialize in sharp betting analysis. Be direct and confident."

    user_prompt = f"""Write a sharp analytical best bet article for:

{away_team} @ {home_team}
Date: {game_date}
Spread: {spread}
Moneyline: {moneyline}
Over/Under: {over_under}

{SEASON_FACTS}

Knicks Injury Report:
{ctx['injury_text']}

{ctx['opponent']} Injury Report (CRITICAL for betting analysis):
{ctx['opponent_injury_text']}

Recent Knicks Results (ATS if available):
{ctx['recent_text']}

Knicks Season Stats:
{ctx['team_stats_text']}

Knicks vs {ctx['opponent']} H2H This Season:
{ctx['h2h_text']}

{ctx.get("scoring_block", "")}

{ctx.get("ml_block", "")}

Top Knicks Players:
{ctx['stats_text']}

{f"CRITICAL CONSISTENCY RULE: The prediction article already picked {forced_total_pick} ({forced_total_lean}). You MUST use the same total lean in this article. Do NOT pick the opposite side of the total." if forced_total_lean else ""}

Write the article in this exact structure:
1. Sharp intro (1-2 sentences — what's the best bet and why — lead with the strongest angle)
2. ## The Line (break down spread, moneyline, total — where's the value?)
3. ## Why This Bet Wins (3 bullet-point reasons with specific stats)
4. ## Injury Impact (how injuries affect the line — be specific)
5. ## The Lean (which side of the spread/total has edge)
6. ## Best Bet (one clear pick with unit size: 1u, 2u or 3u)

Guidelines:
- Write 450-650 words
- Use markdown formatting
- Give ONE best bet only — be decisive
- Explain WHY the number is off, not just that you like the team
- Include "bet responsibly" naturally
- Target keywords: Knicks best bet tonight, Knicks spread pick, {away_team} vs {home_team} pick
- ANTI-REPETITION: Do NOT repeat the same points made in the prediction article. Find a new angle.
- SHARP OPENER: Lead with the market inefficiency or line value, not the team matchup summary.
- NO GENERIC BULLETS: Each "Why This Bet Wins" bullet must include a specific stat or number.

Remember: At the very end, include your picks in the JSON format specified in the system prompt."""

    content, key_picks = await _call_claude_with_timeout(system, user_prompt)

    # Ensure unit_size is present
    if key_picks and "unit_size" not in key_picks:
        key_picks["unit_size"] = "2u"

    title = f"Knicks vs {ctx['opponent']} Best Bet & Spread Pick - AI Prediction ({game_date})"
    slug = slugify(f"best-knicks-bet-{game_date}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
        "key_picks": key_picks,
        "game_date": game_date,
        "home_team": home_team,
        "away_team": away_team,
        "article_type": "best_bet",

        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_parlay(
    home_team: str,
    away_team: str,
    game_date: str,
    spread: str = "N/A",
    over_under: str = "N/A",
    injuries: Optional[List[Dict]] = None,
    top_stats: Optional[List[Dict]] = None,
) -> Dict:
    """Generate a same-game parlay article."""
    
    ctx = await build_game_context(home_team, away_team, injuries, top_stats, over_under)
    
    system = BASE_SYSTEM + "\nYou specialize in same-game parlays and multi-leg bets."
    
    user_prompt = f"""Write an engaging same-game parlay article for:

{away_team} @ {home_team}
Date: {game_date}
Spread: {spread}
Over/Under: {over_under}

{SEASON_FACTS}

Knicks Injury Report:
{ctx['injury_text']}

{ctx['opponent']} Injury Report:
{ctx['opponent_injury_text']}

Recent Knicks Results:
{ctx['recent_text']}

Knicks Season Stats:
{ctx['team_stats_text']}

Knicks vs {ctx['opponent']} H2H This Season:
{ctx['h2h_text']}

Top Knicks Players:
{ctx['stats_text']}

Write the article in this structure:
1. Intro explaining why tonight's matchup is perfect for a same-game parlay
2. ## Leg 1: [Pick with specific reasoning and stats]
3. ## Leg 2: [Pick with specific reasoning and stats]
4. ## Leg 3: [Pick with specific reasoning and stats]
5. ## Parlay Odds and Payout (estimated odds: +350 to +450 range)
6. ## Final Verdict

Guidelines:
- Write 400-600 words
- Include 3 legs (can be spread/total + 2 player props)
- Explain why these picks correlate (e.g., if Brunson scores more because Haliburton is out)
- Show approximate odds (e.g., +375, +400)
- Be realistic — explain the risk
- Target keywords: Knicks parlay, same-game parlay, {away_team} vs {home_team} parlay

Remember: At the very end, include a simple JSON with your parlay details:
{{
  "parlay_legs": 3,
  "estimated_odds": "+375",
  "confidence": "Medium"
}}"""

    content, key_picks = await _call_claude_with_timeout(system, user_prompt)
    
    # Create default picks if none provided
    if not key_picks:
        key_picks = {
            "parlay_legs": 3,
            "estimated_odds": "+375",
            "confidence": "Medium"
        }
    
    return {
        "slug": slugify(f"knicks-same-game-parlay-{game_date}"),
        "title": f"Knicks vs {ctx['opponent']} Same-Game Parlay Picks ({game_date})",
        "content": content,
        "key_picks": key_picks,
        "game_date": game_date,
        "home_team": home_team,
        "away_team": away_team,
        "article_type": "parlay",

        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_history_article(game_date: str) -> Dict:
    """Generate 'This Day in Knicks History' article."""
    dt = datetime.strptime(game_date, "%Y-%m-%d")
    month = dt.strftime("%B")
    day = dt.day
    day_str = _ordinal(day)

    system = "You are a passionate New York Knicks historian. Write accurately and never invent events or stats."

    user_prompt = f"""Write a deep-dive article about ONE significant, well-documented event in New York Knicks history on {month} {day_str}.

Choose the most historically significant or memorable event you are highly confident about. Options could include:
- Playoff games
- Regular season milestones
- Trades or draft picks
- Franchise records
- Championship moments

Structure:
# This Day in Knicks History: {month} {day_str}
A compelling intro paragraph (2-3 sentences setting the scene)
## The Story (full narrative with details — who, what, when, where, why)
## Why It Still Matters (lasting significance for the franchise)
## By The Numbers (4-6 key stats or facts as a clean bulleted list)

Guidelines:
- Write 450-650 words
- Use markdown formatting
- Be specific with years, players, scores, and context
- If no exact event with high confidence exists for this date, use the closest significant date and note it in the intro
- DO NOT invent statistics — if exact numbers aren't certain, describe qualitatively
- End with one sentence connecting it to the current Knicks era
- Target keywords: Knicks history, New York Knicks {month} {day_str}, this day in Knicks history

No JSON picks needed for history articles."""

    client = get_async_client()
    try:
        response = await client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=ANTHROPIC_MAX_TOKENS,
            temperature=0.6,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content = response.content[0].text
    except Exception as e:
        logger.error(f"History article generation failed: {e}")
        raise

    title = f"This Day in Knicks History: {month} {day_str}"
    slug = slugify(f"this-day-in-knicks-history-{month.lower()}-{day}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
        "key_picks": None,
        "game_date": game_date,
        "home_team": "New York Knicks",
        "away_team": "New York Knicks",
        "article_type": "history",

        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ----------------------------------------------------------------------
# Database Functions
# ----------------------------------------------------------------------
# Columns that exist in the Supabase articles table
ARTICLE_COLUMNS = {
    "slug", "title", "content", "key_picks", "game_date",
    "home_team", "away_team", "article_type",
    "created_at", "prop_type", "player",
}

async def save_article(article: Dict) -> Dict:
    """Save article to Supabase."""
    db = get_supabase()
    if not db:
        logger.warning("Supabase not available - article not saved")
        return article

    # Strip any fields not in the Supabase schema to avoid 400 errors
    article = {k: v for k, v in article.items() if k in ARTICLE_COLUMNS}

    # Ensure key_picks is a proper dict for Supabase jsonb column
    import ast as _ast
    kp = article.get("key_picks")
    if isinstance(kp, str):
        try:
            article["key_picks"] = _ast.literal_eval(kp)
        except Exception:
            article["key_picks"] = None
    elif not isinstance(kp, (dict, type(None))):
        article["key_picks"] = None



    # Final key_picks coercion right before upsert
    import ast as _ast
    kp = article.get("key_picks")
    if isinstance(kp, str):
        try:
            article["key_picks"] = _ast.literal_eval(kp)
        except Exception:
            article["key_picks"] = None

    try:
        # Ensure slug is unique
        raw = db.table("articles").upsert(article, on_conflict="slug")
        result = raw if hasattr(raw, "execute") else raw
        logger.info(f"Article saved: {article['slug']}")
        return result.data[0] if result.data else article
    except Exception as e:
        import json as _json
        logger.error(f"Failed to save article: {e}")
        logger.error(f"Article keys: {list(article.keys())}")
        logger.error(f"Article payload: {_json.dumps({k: str(v)[:100] for k, v in article.items()}, default=str)}")
        return article


async def save_articles(articles: List[Dict]) -> List[Dict]:
    """Save multiple articles efficiently."""
    db = get_supabase()
    if not db:
        logger.warning("Supabase not available - articles not saved")
        return articles
    
    saved = []
    for article in articles:
        try:
            raw = db.table("articles").upsert(article, on_conflict="slug")
            result = raw if hasattr(raw, "execute") else raw
            if result.data:
                saved.append(result.data[0])
                logger.info(f"Saved: {article['slug']}")
        except Exception as e:
            logger.error(f"Failed to save {article.get('slug', 'unknown')}: {e}")
    
    return saved


async def get_articles(limit: int = 20, article_type: Optional[str] = None) -> List[Dict]:
    """Fetch articles with optional type filter."""
    db = get_supabase()
    if not db:
        return []
    
    try:
        query = db.table("articles").select("*").order("created_at", desc=True)
        if article_type:
            query = query.eq("article_type", article_type)
        result = query.limit(limit).execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to fetch articles: {e}")
        return []


async def get_article_by_slug(slug: str) -> Optional[Dict]:
    """Fetch single article by slug."""
    db = get_supabase()
    if not db:
        return None
    
    try:
        result = db.table("articles").select("*").eq("slug", slug).single().execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to fetch article by slug {slug}: {e}")
        return None


async def get_articles_by_player(player: str, limit: int = 10) -> List[Dict]:
    """Fetch prop articles for a specific player."""
    db = get_supabase()
    if not db:
        return []
    
    try:
        result = db.table("articles").select("*")\
            .eq("article_type", "prop")\
            .eq("player", player)\
            .order("game_date", desc=True)\
            .limit(limit)\
            
        return result.data
    except Exception as e:
        logger.error(f"Failed to fetch articles for player {player}: {e}")
        return []