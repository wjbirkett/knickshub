from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class NewsItem(BaseModel):
    id: str
    title: str
    summary: Optional[str] = None
    url: str
    source: str
    author: Optional[str] = None
    published_at: datetime
    image_url: Optional[str] = None
class InjuryReport(BaseModel):
    player_id: int
    player_name: str
    team: str = "New York Knicks"
    status: str
    reason: str
    updated_at: datetime

class BettingLine(BaseModel):
    game_id: str
    home_team: str
    away_team: str
    commence_time: datetime
    bookmaker: str
    spread: Optional[float] = None
    moneyline_home: Optional[int] = None
    moneyline_away: Optional[int] = None
    over_under: Optional[float] = None
class Game(BaseModel):
    game_id: int
    game_date: date
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str
    arena: Optional[str] = None
    broadcast: Optional[str] = None

class TeamStanding(BaseModel):
    team_name: str
    conference: str
    division: str
    wins: int
    losses: int
    win_pct: float
    games_back: float
    conference_rank: int
    ppg: float = 0.0
    opp_ppg: float = 0.0
    streak: str = ""

class PlayerStat(BaseModel):
    player_id: int
    player_name: str
    position: Optional[str] = None
    games_played: int
    points_per_game: float
    rebounds_per_game: float
    assists_per_game: float
    steals_per_game: float
    blocks_per_game: float
    field_goal_pct: float
    three_point_pct: float
    threes_per_game: float = 0.0
    turnovers_per_game: float = 0.0
    minutes_per_game: float

class Tweet(BaseModel):
    tweet_id: str
    author_handle: str
    author_name: str
    text: str
    created_at: datetime
    url: str
    likes: int = 0
    retweets: int = 0

class PlayerBirthday(BaseModel):
    player_name: str
    birth_date: date
    age: int
    is_current_roster: bool
    position: Optional[str] = None
    notable: bool = False
