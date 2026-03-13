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
    client = _get_client()
    injury_text = "\n".join([f"- {i['player_name']}: {i['status']} ({i['reason']})" for i in injuries]) or "None reported"

    try:
        loop2 = asyncio.get_event_loop()
        opponent = away_team if away_team != "New York Knicks" else home_team
        recent_text = await loop2.run_in_executor(None, get_knicks_last5)
        h2h_text = await loop2.run_in_executor(None, get_h2h_this_season, opponent)
        team_stats_text = await loop2.run_in_executor(None, get_knicks_team_stats)
    except Exception as e:
        logger.warning(f"nba_api enrichment failed, using fallback: {e}")
        recent_text = "\n".join([f"- {g['away_team']} @ {g['home_team']}: {g['away_score']}-{g['home_score']}" for g in recent_games[-5:]]) or "No recent games"
        h2h_text = "H2H data unavailable"
        team_stats_text = "Team stats unavailable"
        opponent = away_team if away_team != "New York Knicks" else home_team

    stats_text = "\n".join([f"- {s.get('player_name','?')}: {s.get('points_per_game',0)}pts {s.get('rebounds_per_game',0)}reb {s.get('assists_per_game',0)}ast" for s in top_stats[:5]]) or "Stats unavailable"

    prompt = f"""You are a sports analyst writing a prediction article for a New York Knicks fan site called KnicksHub.

Write a compelling, SEO-optimized prediction article for this game:

{away_team} @ {home_team}
Date: {game_date}
Spread: {spread}
Moneyline: {moneyline}
Over/Under: {over_under}

=== VERIFIED 2025-26 SEASON FACTS - USE ONLY THESE, DO NOT INVENT DETAILS ===

KNICKS HEAD COACH: Mike Brown (hired July 2025, replaced Tom Thibodeau who was fired)
KNICKS STARTING FIVE: Jalen Brunson (PG), Mikal Bridges (SG), OG Anunoby (SF), Karl-Anthony Towns (PF/C), Mitchell Robinson (C)
KNICKS KEY BENCH: Josh Hart, Miles McBride
PLAYERS NO LONGER ON THE KNICKS (do not mention): Precious Achiuwa, Donte DiVincenzo, Quentin Grimes, Isaiah Hartenstein

INDIANA PACERS HEAD COACH: Rick Carlisle
INDIANA PACERS KEY FACT: Tyrese Haliburton is OUT FOR THE ENTIRE 2025-26 SEASON with a torn Achilles suffered in Game 7 of the 2025 NBA Finals. He is NOT playing. Do not write about him as an active player.
INDIANA WITHOUT HALIBURTON: They have one of the worst records in the league this season. Andrew Nembhard is their starting PG. Pascal Siakam leads them in scoring. Jarace Walker has been playing well recently. Ivica Zubac was recently acquired from the Clippers.
INDIANA SEASON CONTEXT: The Pacers were eliminated from playoff contention on March 10, 2026. They are in a lost season and evaluating young players.

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

=== END VERIFIED FACTS ===

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
- Reflect that Indiana is a struggling, rebuilding team this season without Haliburton
- Target keywords: Knicks prediction, Knicks odds, {away_team} vs {home_team} prediction
"""

    loop = asyncio.get_event_loop()

    def _call():
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    content = await loop.run_in_executor(None, _call)
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
