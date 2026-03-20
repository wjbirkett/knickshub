import logging
from datetime import datetime, timezone
from typing import List, Optional
import httpx
from app.models.schemas import BettingLine

logger = logging.getLogger(__name__)
ESPN_BASE = "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba"
KNICKS_ESPN_ID = "18"

async def fetch_knicks_lines() -> List[BettingLine]:
    try:
        # Step 1: get today's scoreboard to find Knicks game ID
        async with httpx.AsyncClient(timeout=15) as client:
            from datetime import date as _date, timedelta
            today = _date.today().strftime("%Y%m%d")
            tomorrow = (_date.today() + timedelta(days=1)).strftime("%Y%m%d")
            resp = await client.get(f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={today},{tomorrow}")
            resp.raise_for_status()
            data = resp.json()
        
        game_id = None
        home_team = away_team = None
        commence_time = datetime.now(timezone.utc)
        
        for event in data.get("events", []):
            comps = event.get("competitions", [])
            if not comps:
                continue
            competitors = comps[0].get("competitors", [])
            team_ids = [c.get("team", {}).get("id") for c in competitors]
            if KNICKS_ESPN_ID in team_ids:
                game_id = event.get("id")
                for c in competitors:
                    if c.get("homeAway") == "home":
                        home_team = c.get("team", {}).get("displayName")
                    else:
                        away_team = c.get("team", {}).get("displayName")
                try:
                    commence_time = datetime.fromisoformat(event.get("date","").replace("Z","+00:00"))
                except:
                    pass
                break
        
        if not game_id:
            logger.warning("No Knicks game found in ESPN scoreboard")
            return []
        
        # Step 2: fetch odds for that game
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{ESPN_BASE}/events/{game_id}/competitions/{game_id}/odds")
            resp.raise_for_status()
            odds_data = resp.json()
        
        items = odds_data.get("items", [])
        if not items:
            logger.warning("No odds found for Knicks game")
            return []
        
        # Use first provider (DraftKings is priority 1)
        item = items[0]
        spread = item.get("spread")  # negative = home team favored
        over_under = item.get("current", {}).get("total", {}).get("alternateDisplayValue")
        if not over_under:
            over_under = item.get("overUnder")
        
        home_odds = item.get("homeTeamOdds", {})
        away_odds = item.get("awayTeamOdds", {})
        ml_home = home_odds.get("moneyLine")
        ml_away = away_odds.get("moneyLine")
        
        if over_under:
            try:
                over_under = float(over_under)
            except:
                pass
        
        line = BettingLine(
            game_id=game_id,
            home_team=home_team or "New York Knicks",
            away_team=away_team or "Unknown",
            commence_time=commence_time,
            bookmaker="DraftKings (ESPN)",
            spread=spread,
            moneyline_home=int(ml_home) if ml_home else None,
            moneyline_away=int(ml_away) if ml_away else None,
            over_under=float(over_under) if over_under else None,
        )
        logger.info(f"ESPN odds fetched: spread={spread}, ml_home={ml_home}, ml_away={ml_away}, ou={over_under}")
        return [line]
    
    except Exception as e:
        logger.error(f"ESPN odds fetch failed: {e}")
        return []
