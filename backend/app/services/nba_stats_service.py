"""
nba_stats_service.py — ESPN-based NBA stats for KnicksHub
All functions are async — no more _run_sync / new event loop creation.
"""
import logging
import httpx

logger = logging.getLogger(__name__)
KNICKS_ESPN_ID = "18"
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"

_schedule_cache = None
_schedule_cache_time = None

async def _fetch_knicks_schedule() -> dict:
    global _schedule_cache, _schedule_cache_time
    import time
    now = time.time()
    if _schedule_cache and _schedule_cache_time and (now - _schedule_cache_time) < 300:
        return _schedule_cache
    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.get(f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/schedule")
        resp.raise_for_status()
        data = resp.json()
    _schedule_cache = data
    _schedule_cache_time = now
    return data


async def get_knicks_last5() -> str:
    try:
        data = await _fetch_knicks_schedule()
        events = data.get("events", [])
        completed = [
            e for e in events
            if e.get("competitions", [{}])[0].get("status", {}).get("type", {}).get("completed", False)
        ]
        last5 = list(reversed(completed[-5:])) if completed else []
        lines = []
        for event in last5:
            comp = event["competitions"][0]
            competitors = comp.get("competitors", [])
            knicks = next((c for c in competitors if c.get("team", {}).get("id") == KNICKS_ESPN_ID), None)
            opp = next((c for c in competitors if c.get("team", {}).get("id") != KNICKS_ESPN_ID), None)
            if not knicks or not opp:
                continue
            wl = "W" if knicks.get("winner") else "L"
            home_away = "vs" if knicks.get("homeAway") == "home" else "@"
            opp_name = opp.get("team", {}).get("shortDisplayName", "OPP")
            lines.append(f"- {wl} {home_away} {opp_name}: {knicks.get('score','?')}-{opp.get('score','?')}")
        return "\n".join(lines) if lines else "Recent game data unavailable"
    except Exception as e:
        logger.error(f"ESPN last5 failed: {e}")
        return "Recent game data unavailable"


async def get_h2h_this_season(opponent_name: str) -> str:
    try:
        data = await _fetch_knicks_schedule()
        events = data.get("events", [])
        opp_keyword = opponent_name.split()[-1].lower()
        h2h = []
        for event in events:
            comp = event.get("competitions", [{}])[0]
            if not comp.get("status", {}).get("type", {}).get("completed", False):
                continue
            competitors = comp.get("competitors", [])
            opp = next((c for c in competitors if c.get("team", {}).get("id") != KNICKS_ESPN_ID), None)
            if not opp:
                continue
            opp_team_name = opp.get("team", {}).get("displayName", "").lower()
            if opp_keyword not in opp_team_name:
                continue
            knicks = next((c for c in competitors if c.get("team", {}).get("id") == KNICKS_ESPN_ID), None)
            if not knicks:
                continue
            wl = "W" if knicks.get("winner") else "L"
            home_away = "vs" if knicks.get("homeAway") == "home" else "@"
            date_str = event.get("date", "")[:10]
            h2h.append(f"- {date_str} {wl} {home_away} {opponent_name}: {knicks.get('score','?')}-{opp.get('score','?')}")
        return "\n".join(h2h) if h2h else f"No H2H games found vs {opponent_name} this season"
    except Exception as e:
        logger.error(f"ESPN H2H failed: {e}")
        return f"H2H data unavailable vs {opponent_name}"


async def get_knicks_team_stats() -> str:
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.get(
                f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}",
                params={"enable": "stats"}
            )
            resp.raise_for_status()
            data = resp.json()

        team = data.get("team", {})
        record = team.get("record", {}).get("items", [{}])[0]
        summary = record.get("summary", "N/A")

        stats_data = team.get("stats", {})
        categories = stats_data.get("splits", {}).get("categories", [])

        ppg = opg = None
        for cat in categories:
            for stat in cat.get("stats", []):
                name = stat.get("name", "")
                val = stat.get("value")
                if name == "avgPoints" and val is not None:
                    ppg = round(float(val), 1)
                if name == "avgPointsAgainst" and val is not None:
                    opg = round(float(val), 1)

        lines = [f"Record: {summary}"]
        if ppg is not None:
            lines.append(f"Offensive avg: {ppg} PPG")
        if opg is not None:
            lines.append(f"Defensive avg: {opg} OPP PPG")
        if ppg and opg:
            lines.append(f"Net: {round(ppg - opg, 1):+.1f}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"ESPN team stats failed: {e}")
        return "Team stats unavailable"
