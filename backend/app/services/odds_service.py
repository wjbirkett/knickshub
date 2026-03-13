import logging
from datetime import datetime, timezone
from typing import List, Optional
import httpx
from app.models.schemas import BettingLine
from app.config import settings

logger = logging.getLogger(__name__)
BASE_URL       = "https://api.the-odds-api.com/v4"
KNICKS_NAMES   = {"New York Knicks","Knicks"}
BOOKMAKER_PREF = ["draftkings","fanduel","betmgm","caesars"]

async def fetch_knicks_lines() -> List[BettingLine]:
    if not settings.ODDS_API_KEY:
        logger.warning("ODDS_API_KEY not set")
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/sports/basketball_nba/odds", params={
    "apiKey": settings.ODDS_API_KEY,
    "regions": "us",
    "markets": "spreads,h2h,totals",
    "oddsFormat": "american",
})
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"Odds API: {resp.headers.get('x-requests-used','?')} used, {resp.headers.get('x-requests-remaining','?')} remaining")
    except Exception as e:
        logger.error(f"Odds API failed: {e}")
        return []
    lines = []
    for game in data:
        home, away = game.get("home_team",""), game.get("away_team","")
        if home not in KNICKS_NAMES and away not in KNICKS_NAMES:
            continue
        try: commence_time = datetime.fromisoformat(game.get("commence_time","").replace("Z","+00:00"))
        except: commence_time = datetime.now(timezone.utc)
        bk = _pick_bookmaker(game.get("bookmakers",[]))
        if not bk: continue
        spread, ml_home, ml_away, ou = _extract_markets(bk, home, away)
        lines.append(BettingLine(
            game_id=game.get("id",""), home_team=home, away_team=away,
            commence_time=commence_time, bookmaker=bk.get("title","Unknown"),
            spread=spread, moneyline_home=ml_home, moneyline_away=ml_away, over_under=ou,
        ))
    lines.sort(key=lambda g: g.commence_time)
    return lines

def _pick_bookmaker(bookmakers):
    bk_by_key = {bk["key"]: bk for bk in bookmakers}
    for key in BOOKMAKER_PREF:
        if key in bk_by_key: return bk_by_key[key]
    return bookmakers[0] if bookmakers else None

def _extract_markets(bk, home_team, away_team):
    spread = ml_home = ml_away = ou = None
    for market in bk.get("markets",[]):
        key = market.get("key")
        outcomes = {o["name"]: o for o in market.get("outcomes",[])}
        if key == "spreads":
            if home_team in outcomes: spread = outcomes[home_team].get("point")
        elif key == "h2h":
            if home_team in outcomes: ml_home = int(outcomes[home_team].get("price",0))
            if away_team in outcomes: ml_away = int(outcomes[away_team].get("price",0))
        elif key == "totals":
            if "Over" in outcomes: ou = outcomes["Over"].get("point")
    return spread, ml_home, ml_away, ou
