import asyncio
from datetime import date, datetime
from typing import List
from app.models.schemas import PlayerBirthday

NOTABLE_ALUMNI = [
    {"player_name":"Patrick Ewing",      "birth_date":date(1962,8,5),   "position":"C"},
    {"player_name":"John Starks",        "birth_date":date(1965,8,10),  "position":"SG"},
    {"player_name":"Latrell Sprewell",   "birth_date":date(1970,9,8),   "position":"SF"},
    {"player_name":"Allan Houston",      "birth_date":date(1971,4,20),  "position":"SG"},
    {"player_name":"Walt Frazier",       "birth_date":date(1945,3,29),  "position":"PG"},
    {"player_name":"Willis Reed",        "birth_date":date(1942,6,25),  "position":"C"},
    {"player_name":"Earl Monroe",        "birth_date":date(1944,11,21), "position":"PG"},
    {"player_name":"Dave DeBusschere",   "birth_date":date(1940,10,16), "position":"PF"},
    {"player_name":"Bernard King",       "birth_date":date(1956,12,4),  "position":"SF"},
    {"player_name":"Charles Oakley",     "birth_date":date(1963,12,18), "position":"PF"},
    {"player_name":"Carmelo Anthony",    "birth_date":date(1984,5,29),  "position":"SF"},
    {"player_name":"Kristaps Porzingis", "birth_date":date(1995,8,2),   "position":"C"},
]

def _parse_nba_date(raw):
    if not raw: return None
    for fmt in ("%b %d, %Y","%B %d, %Y","%Y-%m-%dT%H:%M:%S","%Y-%m-%d"):
        try: return datetime.strptime(raw.strip(), fmt).date()
        except: continue
    return None

async def _get_all_players():
    from app.services.nba_service import fetch_roster
    try:
        roster = await asyncio.wait_for(fetch_roster(), timeout=5.0)
    except Exception:
        roster = []
    players = []
    for p in roster:
        bd = _parse_nba_date(str(p.get("BIRTH_DATE","")))
        if bd:
            players.append({"player_name":p["PLAYER"],"birth_date":bd,
                            "position":p.get("POSITION"),"is_current_roster":True,"notable":False})
    current_names = {p["player_name"] for p in players}
    for a in NOTABLE_ALUMNI:
        if a["player_name"] not in current_names:
            players.append({**a,"is_current_roster":False,"notable":True})
    return players

def _make(p, today):
    bd = p["birth_date"]
    return PlayerBirthday(player_name=p["player_name"], birth_date=bd,
                          age=today.year-bd.year, is_current_roster=p["is_current_roster"],
                          position=p.get("position"), notable=p.get("notable",False))

async def get_todays_birthdays() -> List[PlayerBirthday]:
    today = date.today()
    players = await _get_all_players()
    return [_make(p,today) for p in players
            if p["birth_date"].month==today.month and p["birth_date"].day==today.day]

async def get_upcoming_birthdays(days=7) -> List[PlayerBirthday]:
    today = date.today()
    players = await _get_all_players()
    results = []
    for p in players:
        bd = p["birth_date"]
        this_year = bd.replace(year=today.year)
        if this_year < today: this_year = bd.replace(year=today.year+1)
        if 0 <= (this_year - today).days <= days:
            results.append(_make(p,today))
    results.sort(key=lambda b: (b.birth_date.month, b.birth_date.day))
    return results
