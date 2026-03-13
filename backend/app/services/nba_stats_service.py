import logging
from nba_api.stats.endpoints import teamgamelog, leaguegamefinder, teamdashboardbygeneralsplits
from nba_api.stats.static import teams

logger = logging.getLogger(__name__)

KNICKS_ID = 1610612752  # New York Knicks team ID
CURRENT_SEASON = "2025-26"

def _get_team_id(team_name: str) -> int | None:
    all_teams = teams.get_teams()
    for t in all_teams:
        if team_name.lower() in t["full_name"].lower() or team_name.lower() in t["nickname"].lower():
            return t["id"]
    return None

def get_knicks_last5() -> str:
    """Returns a formatted string of Knicks last 5 games."""
    try:
        log = teamgamelog.TeamGameLog(
            team_id=KNICKS_ID,
            season=CURRENT_SEASON,
            season_type_all_star="Regular Season",
            timeout=10
        )
        df = log.get_data_frames()[0].head(5)
        lines = []
        for _, row in df.iterrows():
            wl = row["WL"]
            matchup = row["MATCHUP"]
            pts = int(row["PTS"])
            # Score from MATCHUP like "NYK vs. BOS" or "NYK @ BOS"
            lines.append(f"- {matchup}: {'W' if wl == 'W' else 'L'} {pts} pts")
        return "\n".join(lines) if lines else "No recent game data available"
    except Exception as e:
        logger.error(f"nba_api last5 failed: {e}")
        return "Recent game data unavailable"

def get_h2h_this_season(opponent_name: str) -> str:
    """Returns head-to-head results vs opponent this season."""
    try:
        finder = leaguegamefinder.LeagueGameFinder(
            team_id_nullable=KNICKS_ID,
            season_nullable=CURRENT_SEASON,
            season_type_nullable="Regular Season",
            timeout=10
        )
        df = finder.get_data_frames()[0]
        opp_short = opponent_name.split()[-1]  # e.g. "Pacers"
        h2h = df[df["MATCHUP"].str.contains(opp_short, case=False, na=False)]
        if h2h.empty:
            return f"No H2H data found vs {opponent_name} this season"
        lines = []
        for _, row in h2h.iterrows():
            wl = row["WL"]
            pts = int(row["PTS"])
            matchup = row["MATCHUP"]
            lines.append(f"- {matchup}: {'W' if wl == 'W' else 'L'} {pts} pts")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"nba_api h2h failed: {e}")
        return "H2H data unavailable"

def get_knicks_team_stats() -> str:
    """Returns Knicks team dashboard stats."""
    try:
        dash = teamdashboardbygeneralsplits.TeamDashboardByGeneralSplits(
            team_id=KNICKS_ID,
            season=CURRENT_SEASON,
            season_type_all_star="Regular Season",
            timeout=10
        )
        df = dash.get_data_frames()[0]
        row = df.iloc[0]
        w = int(row["W"])
        l = int(row["L"])
        ppg = round(float(row["PTS"]) / (w + l), 1)
        opp_ppg = round(float(row["OPP_PTS"]) / (w + l), 1) if "OPP_PTS" in row else "N/A"
        return f"Record: {w}-{l} | Avg: {ppg} PPG scored, {opp_ppg} PPG allowed"
    except Exception as e:
        logger.error(f"nba_api team stats failed: {e}")
        return "Team stats unavailable"