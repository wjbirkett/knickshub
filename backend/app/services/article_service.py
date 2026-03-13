import anthropic, logging, re, asyncio
from datetime import datetime, timezone
from app.config import settings
from app.services.nba_stats_service import get_knicks_last5, get_h2h_this_season, get_knicks_team_stats

logger = logging.getLogger(__name__)

def _get_client():
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text

def _format_injuries(injuries):
    return "\n".join([f"- {i['player_name']}: {i['status']} ({i['reason']})" for i in injuries]) or "None reported"

def _format_stats(top_stats):
    return "\n".join([f"- {s.get('player_name','?')}: {s.get('points_per_game',0)}pts {s.get('rebounds_per_game',0)}reb {s.get('assists_per_game',0)}ast" for s in top_stats[:5]]) or "Stats unavailable"

async def _fetch_nba_context(opponent):
    try:
        loop = asyncio.get_event_loop()
        recent_text = await loop.run_in_executor(None, get_knicks_last5)
        h2h_text = await loop.run_in_executor(None, get_h2h_this_season, opponent)
        team_stats_text = await loop.run_in_executor(None, get_knicks_team_stats)
        return recent_text, h2h_text, team_stats_text
    except Exception as e:
        logger.warning(f"nba_api enrichment failed: {e}")
        return "Recent game data unavailable", "H2H data unavailable", "Team stats unavailable"

def _call_claude(prompt: str) -> str:
    client = _get_client()
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

SEASON_FACTS = """
=== VERIFIED 2025-26 SEASON FACTS - USE ONLY THESE, DO NOT INVENT DETAILS ===

KNICKS HEAD COACH: Mike Brown (hired July 2025, replaced Tom Thibodeau who was fired)
KNICKS STARTING FIVE: Jalen Brunson (PG), Mikal Bridges (SG), OG Anunoby (SF), Karl-Anthony Towns (PF/C), Mitchell Robinson (C)
KNICKS KEY BENCH: Josh Hart, Miles McBride
PLAYERS NO LONGER ON THE KNICKS (do not mention): Precious Achiuwa, Donte DiVincenzo, Quentin Grimes, Isaiah Hartenstein

INDIANA PACERS HEAD COACH: Rick Carlisle
INDIANA PACERS KEY FACT: Tyrese Haliburton is OUT FOR THE ENTIRE 2025-26 SEASON with a torn Achilles suffered in Game 7 of the 2025 NBA Finals.
INDIANA WITHOUT HALIBURTON: They have one of the worst records in the league. Andrew Nembhard is their starting PG. Pascal Siakam leads them in scoring. Jarace Walker has been playing well recently. Ivica Zubac was recently acquired from the Clippers.
INDIANA SEASON CONTEXT: The Pacers were eliminated from playoff contention on March 10, 2026.

=== END VERIFIED FACTS ===
"""

async def generate_game_preview(
    home_team: str,
    away_team: str,
    game_date: str,
    spread: str = "N/A",
    moneyline: str = "N/A",
    over_under: str = "N/A",
    injuries: list = [],
    recent_games: list = [],
    top_stats: list = [],
) -> dict:
    opponent = away_team if away_team != "New York Knicks" else home_team
    injury_text = _format_injuries(injuries)
    stats_text = _format_stats(top_stats)
    recent_text, h2h_text, team_stats_text = await _fetch_nba_context(opponent)

    prompt = f"""You are a sports analyst writing a prediction article for a New York Knicks fan site called KnicksHub.

Write a compelling, SEO-optimized prediction article for this game:

{away_team} @ {home_team}
Date: {game_date}
Spread: {spread}
Moneyline: {moneyline}
Over/Under: {over_under}

{SEASON_FACTS}

Knicks Injury Report (live data):
{injury_text}

Recent Knicks Results:
{recent_text}

Knicks Season Stats:
{team_stats_text}

Knicks vs {opponent} This Season (H2H):
{h2h_text}

Top Knicks Players This Season (stats):
{stats_text}

Write the article in this exact structure:
1. A compelling intro paragraph (2-3 sentences)
2. ## Game Overview (odds, spread, total)
3. ## Knicks Recent Form (analyze last 5 games)
4. ## Injury Report (impact of injuries on the Knicks)
5. ## Key Matchup to Watch
6. ## Prediction and Best Bet
7. ## Final Score Prediction

Guidelines:
- Write 600-900 words total
- Use markdown formatting
- Be specific with stats and analysis
- End with a clear pick (spread or moneyline)
- Sound like a real beat writer, not a robot
- Include the phrase "bet responsibly" naturally
- Only mention players who are actually on the current rosters
- Target keywords: Knicks prediction, Knicks odds, {away_team} vs {home_team} prediction
"""

    loop = asyncio.get_event_loop()
    content = await loop.run_in_executor(None, _call_claude, prompt)
    title = f"{away_team} vs {home_team} Prediction, Odds & Best Bet - {game_date}"
    slug = slugify(f"{away_team}-vs-{home_team}-prediction-{game_date}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
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
    player_stats: dict = None,
    injuries: list = [],
    top_stats: list = [],
    over_under: str = "N/A",
) -> dict:
    opponent = away_team if away_team != "New York Knicks" else home_team
    injury_text = _format_injuries(injuries)
    stats_text = _format_stats(top_stats)
    recent_text, h2h_text, team_stats_text = await _fetch_nba_context(opponent)

    player_line = ""
    if player_stats:
        ppg = player_stats.get("points_per_game", "N/A")
        rpg = player_stats.get("rebounds_per_game", "N/A")
        apg = player_stats.get("assists_per_game", "N/A")
        player_line = f"{player} season averages: {ppg} PPG, {rpg} RPG, {apg} APG"
    else:
        player_line = f"{player} stats unavailable"

    prompt = f"""You are a sports analyst writing a player prop prediction article for a New York Knicks fan site called KnicksHub.

Write a compelling, SEO-optimized player prop prediction article for:

Player: {player}
Game: {away_team} @ {home_team}
Date: {game_date}
Game Total (O/U): {over_under}

{SEASON_FACTS}

{player} Stats:
{player_line}

All Knicks Players Stats:
{stats_text}

Knicks Injury Report:
{injury_text}

Recent Knicks Results:
{recent_text}

Knicks Season Stats:
{team_stats_text}

Knicks vs {opponent} H2H This Season:
{h2h_text}

Write the article in this exact structure:
1. Compelling intro (2-3 sentences about {player}'s role tonight)
2. ## {player} Season Averages (stats breakdown)
3. ## Tonight's Matchup (how the opponent defends his position)
4. ## Recent Form (last 5 games performance)
5. ## Injury Report (any factors affecting his play)
6. ## Points Prop Prediction (over/under analysis with a specific line recommendation)
7. ## Final Prediction (clear over or under pick with confidence level)

Guidelines:
- Write 500-700 words
- Use markdown formatting
- Give a specific points line recommendation (e.g. "Over 27.5 points")
- Sound like a real analyst, not a robot
- Include "bet responsibly" naturally
- Target keywords: {player} prop, {player} points tonight, {player} prediction
"""

    loop = asyncio.get_event_loop()
    content = await loop.run_in_executor(None, _call_claude, prompt)
    player_slug = player.lower().replace(" ", "-")
    title = f"{player} Prop Prediction vs {opponent} - {game_date}"
    slug = slugify(f"{player_slug}-prop-prediction-{game_date}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
        "game_date": game_date,
        "home_team": home_team,
        "away_team": away_team,
        "article_type": "prop",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_best_bet(
    home_team: str,
    away_team: str,
    game_date: str,
    spread: str = "N/A",
    moneyline: str = "N/A",
    over_under: str = "N/A",
    injuries: list = [],
    top_stats: list = [],
) -> dict:
    opponent = away_team if away_team != "New York Knicks" else home_team
    injury_text = _format_injuries(injuries)
    stats_text = _format_stats(top_stats)
    recent_text, h2h_text, team_stats_text = await _fetch_nba_context(opponent)

    prompt = f"""You are a sharp sports bettor writing a best bet article for a New York Knicks fan site called KnicksHub.

Write a sharp, analytical best bet article for tonight's game:

{away_team} @ {home_team}
Date: {game_date}
Spread: {spread}
Moneyline: {moneyline}
Over/Under: {over_under}

{SEASON_FACTS}

Knicks Injury Report:
{injury_text}

Recent Knicks Results:
{recent_text}

Knicks Season Stats:
{team_stats_text}

Knicks vs {opponent} H2H This Season:
{h2h_text}

Top Knicks Players (stats):
{stats_text}

Write the article in this exact structure:
1. Sharp intro (1-2 sentences — what's the best bet tonight and why)
2. ## The Line (break down spread, moneyline, total)
3. ## Why This Bet Wins (3 bullet-point reasons with stats)
4. ## Injury Impact (how injuries affect the line)
5. ## The Lean (which side of the spread/total has value)
6. ## Best Bet (one clear, specific pick with unit size: 1u, 2u, or 3u)

Guidelines:
- Write 400-600 words
- Use markdown formatting  
- Be direct and confident — sharp bettors don't hedge
- Give ONE best bet, not multiple
- Include "bet responsibly" naturally
- Target keywords: Knicks best bet tonight, Knicks spread pick, {away_team} vs {home_team} pick
"""

    loop = asyncio.get_event_loop()
    content = await loop.run_in_executor(None, _call_claude, prompt)
    title = f"Best Knicks Bet Tonight vs {opponent} - {game_date}"
    slug = slugify(f"best-knicks-bet-{game_date}")

    return {
        "slug": slug,
        "title": title,
        "content": content,
        "game_date": game_date,
        "home_team": home_team,
        "away_team": away_team,
        "article_type": "best_bet",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def save_article(article: dict) -> dict:
    from app.db import get_supabase
    db = get_supabase()
    if not db:
        logger.warning("Supabase not available - article not saved")
        return article
    try:
        db.table("articles").upsert(article, on_conflict="slug").execute()
        logger.info(f"Article saved: {article['slug']}")
    except Exception as e:
        logger.error(f"Failed to save article: {e}")
    return article

async def get_articles(limit: int = 20) -> list:
    from app.db import get_supabase
    db = get_supabase()
    if not db:
        return []
    try:
        result = db.table("articles").select("*").order("game_date", desc=True).limit(limit).execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to fetch articles: {e}")
        return []

async def get_article_by_slug(slug: str) -> dict | None:
    from app.db import get_supabase
    db = get_supabase()
    if not db:
        return None
    try:
        result = db.table("articles").select("*").eq("slug", slug).single().execute()
        return result.data
    except Exception:
        return None
