import logging
import httpx
import asyncio

logger = logging.getLogger(__name__)

KNICKS_ESPN_ID = "18"
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"

def _run_sync(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

async def _fetch_knicks_schedule():
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/schedule")
        resp.raise_for_status()
        return resp.json()

def get_knicks_last5() -> str:
    try:
        data = _run_sync(_fetch_knicks_schedule())
        events = data.get("events", [])
        completed = [e for e in events if e.get("competitions", [{}])[0].get("status", {}).get("type", {}).get("completed", False)]
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

def get_h2h_this_season(opponent_name: str) -> str:
    try:
        data = _run_sync(_fetch_knicks_schedule())
        events = data.get("events", [])
        opp_keyword = opponent_name.split()[-1].lower()
        h2h = []
        for event in events:
            comp = event["competitions"][0]
            if not comp.get("status", {}).get("type", {}).get("completed", False):
                continue
            competitors = comp.get("competitors", [])
            has_opp = any(opp_keyword in c.get("team", {}).get("displayName", "").lower() for c in competitors)
            if not has_opp:
                continue
            knicks = next((c for c in competitors if c.get("team", {}).get("id") == KNICKS_ESPN_ID), None)
            opp = next((c for c in competitors if c.get("team", {}).get("id") != KNICKS_ESPN_ID), None)
            if not knicks or not opp:
                continue
            wl = "W" if knicks.get("winner") else "L"
            home_away = "vs" if knicks.get("homeAway") == "home" else "@"
            h2h.append(f"- {wl} {home_away} {opp.get('team',{}).get('shortDisplayName','OPP')}: {knicks.get('score','?')}-{opp.get('score','?')}")
        return "\n".join(h2h) if h2h else f"No H2H data vs {opponent_name} this season"
    except Exception as e:
        logger.error(f"ESPN h2h failed: {e}")
        return "H2H data unavailable"

def get_knicks_team_stats() -> str:
    try:
        async def _fetch():
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}")
                resp.raise_for_status()
                return resp.json()
        data = _run_sync(_fetch())
        team = data.get("team", {})
        record = team.get("record", {}).get("items", [{}])[0]
        stats = {s["name"]: s["value"] for s in record.get("stats", [])}
        wins = int(stats.get("wins", 0))
        losses = int(stats.get("losses", 0))
        win_pct = round(stats.get("winPercent", 0) * 100, 1)
        ppg = round(stats.get("pointsFor", 0), 1)
        opp_ppg = round(stats.get("pointsAgainst", 0), 1)
        return f"Record: {wins}-{losses} ({win_pct}% win) | {ppg} PPG scored, {opp_ppg} PPG allowed"
    except Exception as e:
        logger.error(f"ESPN team stats failed: {e}")
        return "Team stats unavailable"
