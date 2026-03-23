import asyncio, httpx, logging
from datetime import datetime, date
from typing import List
from app.models.schemas import InjuryReport, Game, TeamStanding, PlayerStat

logger = logging.getLogger(__name__)
KNICKS_ESPN_ID = "18"
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
ESPN_V2   = "https://site.api.espn.com/apis/v2/sports/basketball/nba"

def _safe_float(val, default=0.0):
    try: return float(val) if val is not None else default
    except: return default

def _safe_int(val, default=0):
    try: return int(val) if val is not None else default
    except: return default


async def fetch_injury_report() -> List[InjuryReport]:
    url = f"{ESPN_BASE}/injuries"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"ESPN injury fetch failed: {e}")
        return []

    status_map = {
        "Day-To-Day": "Day-To-Day", "GTD": "Day-To-Day", "DTD": "Day-To-Day",
        "Out": "Out", "Doubtful": "Doubtful", "Questionable": "Questionable",
    }

    knicks = next((t for t in data.get("injuries", []) if t.get("id") == KNICKS_ESPN_ID), None)
    if not knicks:
        return []

    injuries = []
    for inj in knicks.get("injuries", []):
        athlete = inj.get("athlete", {})
        raw_status = inj.get("status", "Unknown").strip()
        status = status_map.get(raw_status, raw_status)
        details = inj.get("details", {})
        if details.get("type"):
            body_part = details.get("type", "")
            detail = details.get("detail", "")
            reason = f"{body_part} ({detail})" if detail else body_part
        else:
            reason = inj.get("shortComment") or inj.get("longComment") or "Not specified"

        try:
            href = next(l for l in athlete.get("links", []) if "player" in l.get("rel", []))
            player_id = int(href["href"].split("/id/")[1].split("/")[0])
        except:
            player_id = hash(athlete.get("displayName", "")) % 100000

        injuries.append(InjuryReport(
            player_id=player_id,
            player_name=athlete.get("displayName", "Unknown"),
            status=status,
            reason=reason,
            updated_at=datetime.utcnow(),
        ))
    return injuries


async def fetch_schedule() -> List[Game]:
    url = f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/schedule"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"ESPN schedule fetch failed: {e}")
        return []

    games = []
    for event in data.get("events", []):
        try:
            comp = event["competitions"][0]
            competitors = comp["competitors"]
            home = next((c for c in competitors if c["homeAway"] == "home"), competitors[0])
            away = next((c for c in competitors if c["homeAway"] == "away"), competitors[1])

            raw_date = event.get("date", "")
            try:
                game_date = datetime.strptime(raw_date[:10], "%Y-%m-%d").date()
            except:
                game_date = date.today()

            status_name = comp.get("status", {}).get("type", {}).get("name", "STATUS_SCHEDULED")
            if "FINAL" in status_name:
                status = "Final"
            elif "PROGRESS" in status_name:
                status = "Live"
            else:
                status = "Scheduled"

            def parse_score(c):
                s = c.get("score")
                if s is None or status == "Scheduled":
                    return None
                if isinstance(s, dict):
                    return int(s.get("value", 0))
                return _safe_int(s) or None
            home_score = parse_score(home)
            away_score = parse_score(away)

            games.append(Game(
                game_id=_safe_int(event.get("id", 0)),
                game_date=game_date,
                home_team=home.get("team", {}).get("displayName", ""),
                away_team=away.get("team", {}).get("displayName", ""),
                home_score=home_score,
                away_score=away_score,
                status=status,
                arena=comp.get("venue", {}).get("fullName"),
                broadcast=None,
            ))
        except Exception as e:
            logger.warning(f"Skipping game parse: {e}")
            continue

    games.sort(key=lambda g: g.game_date)
    return games


async def fetch_standings() -> List[TeamStanding]:
    url = f"{ESPN_V2}/standings"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"ESPN standings fetch failed: {e}")
        return []

    standings = []
    for conf in data.get("children", []):
        conf_name = "East" if "Eastern" in conf.get("name", "") else "West"
        entries = conf.get("standings", {}).get("entries", [])
        for i, entry in enumerate(entries):
            team = entry.get("team", {})
            stats = {s["name"]: s.get("displayValue", "0") for s in entry.get("stats", [])}
            try:
                wins, losses = stats.get("overall", "0-0").split("-")
            except:
                wins, losses = "0", "0"
            try:
                gb_raw = stats.get("gamesBehind", "0").replace("\u2014", "0").replace("-", "0")
                gb = float(gb_raw) if gb_raw.replace(".", "").isdigit() else 0.0
            except:
                gb = 0.0
            try:
                wp_raw = stats.get("winPercent", "0").lstrip(".")
                win_pct = float("0." + wp_raw) if wp_raw.isdigit() else float(wp_raw or 0)
            except:
                win_pct = 0.0

            ppg = _safe_float(stats.get("avgPointsFor", 0))
            opp_ppg = _safe_float(stats.get("avgPointsAgainst", 0))
            streak = stats.get("streak", "")

            standings.append(TeamStanding(
                team_name=team.get("displayName", ""),
                conference=conf_name,
                division="",
                wins=_safe_int(wins),
                losses=_safe_int(losses),
                win_pct=win_pct,
                games_back=gb,
                conference_rank=i + 1,
                ppg=ppg,
                opp_ppg=opp_ppg,
                streak=streak,
            ))

    # Re-rank each conference best-to-worst (ESPN order is not reliable)
    # Sort by wins DESC, then losses ASC for proper tiebreaking
    east = sorted([s for s in standings if s.conference == "East"], key=lambda s: (-s.wins, s.losses))
    west = sorted([s for s in standings if s.conference == "West"], key=lambda s: (-s.wins, s.losses))
    for i, s in enumerate(east): s.conference_rank = i + 1
    for i, s in enumerate(west): s.conference_rank = i + 1
    standings = east + west
    standings.sort(key=lambda s: (s.conference, s.conference_rank))
    return standings


async def fetch_player_stats() -> List[PlayerStat]:
    url = (
        "https://stats.nba.com/stats/leaguedashplayerstats"
        "?College=&Conference=&Country=&DateFrom=&DateTo=&Division="
        "&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height="
        "&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base"
        "&Month=0&OpponentTeamID=0&PaceAdjust=N&PerMode=PerGame&Period=0"
        "&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N"
        "&Season=2025-26&SeasonSegment=&SeasonType=Regular+Season"
        "&ShotClockRange=&StarterBench=&TeamID=1610612752&TwoWay=0"
        "&VsConference=&VsDivision=&Weight="
    )
    nba_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.nba.com/",
        "x-nba-stats-origin": "stats",
        "x-nba-stats-token": "true",
        "Accept": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30, headers=nba_headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"NBA stats fetch failed: {e}")
        return []

    try:
        result_set = data["resultSets"][0]
        col = result_set["headers"]
        rows = result_set["rowSet"]
    except Exception as e:
        logger.error(f"NBA stats parse failed: {e}")
        return []

    def col_idx(name):
        try: return col.index(name)
        except: return None

    stats = []
    for row in rows:
        try:
            def g(name, default=0):
                i = col_idx(name)
                return row[i] if i is not None else default

            stats.append(PlayerStat(
                player_id=_safe_int(g("PLAYER_ID")),
                player_name=str(g("PLAYER_NAME", "")),
                position=None,
                games_played=_safe_int(g("GP")),
                points_per_game=_safe_float(g("PTS")),
                rebounds_per_game=_safe_float(g("REB")),
                assists_per_game=_safe_float(g("AST")),
                steals_per_game=_safe_float(g("STL")),
                blocks_per_game=_safe_float(g("BLK")),
                field_goal_pct=_safe_float(g("FG_PCT")),
                three_point_pct=_safe_float(g("FG3_PCT")),
                threes_per_game=_safe_float(g("FG3M")),
                turnovers_per_game=_safe_float(g("TOV")),
                minutes_per_game=_safe_float(g("MIN")),
            ))
        except Exception as e:
            logger.warning(f"Skipping player row: {e}")
            continue

    stats.sort(key=lambda p: p.points_per_game, reverse=True)
    return stats


async def fetch_roster() -> list:
    url = f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/roster"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"ESPN roster fetch failed: {e}")
        return []

    roster = []
    for athlete in data.get("athletes", []):
        dob = athlete.get("dateOfBirth", "")
        try:
            birth_date = datetime.strptime(dob[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        except:
            birth_date = ""
        roster.append({
            "PLAYER_ID": _safe_int(athlete.get("id", 0)),
            "PLAYER": athlete.get("displayName", ""),
            "POSITION": athlete.get("position", {}).get("abbreviation", ""),
            "BIRTH_DATE": birth_date,
            "NUM": athlete.get("jersey", ""),
        })
    return roster


async def fetch_recent_games(last_n: int = 5) -> List[Game]:
    games = await fetch_schedule()
    finished = [g for g in games if g.status == "Final"]
    return finished[-last_n:] if finished else []
