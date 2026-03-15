from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import Response
from app.services.article_service import (
    generate_game_preview, save_article, get_articles, get_article_by_slug
)
from app.services.nba_service import fetch_schedule, fetch_injury_report, fetch_player_stats
from app.services.odds_service import fetch_knicks_lines
from datetime import date

router = APIRouter()

def to_dict(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    return obj

def get_odds_for_game(games, next_game):
    spread = moneyline = over_under = "N/A"
    if games:
        o = games[0]
        is_knicks_away = "Knicks" in o.get("away_team", "") or "New York" in o.get("away_team", "")
        raw_spread = o.get("spread")
        ml_home = o.get("moneyline_home")
        ml_away = o.get("moneyline_away")
        ou = o.get("over_under")
        knicks_ml = ml_away if is_knicks_away else ml_home
        knicks_spread = (-raw_spread if is_knicks_away else raw_spread) if raw_spread is not None else None
        if knicks_spread is not None:
            spread = f"{knicks_spread:+.1f}"
        if knicks_ml is not None:
            moneyline = f"{knicks_ml:+d}"
        if ou is not None:
            over_under = f"{ou}"
    return spread, moneyline, over_under

@router.get("/sitemap.xml")
async def articles_sitemap():
    articles = await get_articles(limit=200)
    urls = "\n".join([
        f"""  <url>
    <loc>https://knickshub.vercel.app/predictions/{a['slug']}</loc>
    <lastmod>{a.get('updated_at', a.get('created_at', ''))[:10]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>"""
        for a in articles
    ])
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

@router.get("/")
async def list_articles(limit: int = 20):
    return await get_articles(limit)

@router.get("/{slug}")
async def get_article(slug: str):
    article = await get_article_by_slug(slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.post("/generate/next-game")
async def generate_next_game_article(background_tasks: BackgroundTasks, force: bool = False):
    today = date.today()
    games_raw = await fetch_schedule()
    games = [to_dict(g) for g in games_raw]

    def get_date(g):
        d = g["game_date"]
        if isinstance(d, date):
            return d
        return date.fromisoformat(str(d)[:10])

    next_game = next((g for g in games if get_date(g) >= today and g["status"] != "Final"), None)
    if not next_game:
        raise HTTPException(status_code=404, detail="No upcoming games found")

    game_date_str = str(next_game["game_date"])[:10]

    from app.services.article_service import slugify
    slug = slugify(f"{next_game['away_team']}-vs-{next_game['home_team']}-prediction-{game_date_str}")
    if not force:
        existing = await get_article_by_slug(slug)
        if existing:
            return {"message": "Article already exists", "slug": slug, "article": existing}

    injuries_raw = await fetch_injury_report()
    injuries = [to_dict(i) for i in injuries_raw]
    stats_raw = await fetch_player_stats()
    top_stats = [to_dict(s) for s in stats_raw[:8]] if stats_raw else []
    odds_raw = await fetch_knicks_lines()
    odds = [to_dict(o) for o in odds_raw]
    spread, moneyline, over_under = get_odds_for_game(odds, next_game)

    article = await generate_game_preview(
        home_team=next_game["home_team"],
        away_team=next_game["away_team"],
        game_date=game_date_str,
        spread=spread,
        moneyline=moneyline,
        over_under=over_under,
        injuries=injuries,
        recent_games=games,
        top_stats=top_stats,
    )
    saved = await save_article(article)
    return {"message": "Article generated", "slug": saved["slug"], "article": saved}


@router.post("/generate/player-prop")
async def generate_player_prop_article(background_tasks: BackgroundTasks, player: str = "Jalen Brunson", force: bool = False):
    today = date.today()
    games_raw = await fetch_schedule()
    games = [to_dict(g) for g in games_raw]

    def get_date(g):
        d = g["game_date"]
        if isinstance(d, date):
            return d
        return date.fromisoformat(str(d)[:10])

    next_game = next((g for g in games if get_date(g) >= today and g["status"] != "Final"), None)
    if not next_game:
        raise HTTPException(status_code=404, detail="No upcoming games found")

    game_date_str = str(next_game["game_date"])[:10]

    from app.services.article_service import slugify
    player_slug = player.lower().replace(" ", "-")
    slug = slugify(f"{player_slug}-prop-prediction-{game_date_str}")
    if not force:
        existing = await get_article_by_slug(slug)
        if existing:
            return {"message": "Article already exists", "slug": slug, "article": existing}

    injuries_raw = await fetch_injury_report()
    injuries = [to_dict(i) for i in injuries_raw]
    stats_raw = await fetch_player_stats()
    top_stats = [to_dict(s) for s in stats_raw[:8]] if stats_raw else []
    player_stats = next((s for s in top_stats if player.lower() in s.get("player_name", "").lower()), None)
    odds_raw = await fetch_knicks_lines()
    odds = [to_dict(o) for o in odds_raw]
    spread, moneyline, over_under = get_odds_for_game(odds, next_game)

    from app.services.article_service import generate_player_prop
    async def _gen():
        article = await generate_player_prop(
            player=player,
            home_team=next_game["home_team"],
            away_team=next_game["away_team"],
            game_date=game_date_str,
            player_stats=player_stats,
            injuries=injuries,
            top_stats=top_stats,
            over_under=over_under,
        )
        await save_article(article)
    background_tasks.add_task(_gen)
    return {"message": "Article generation started", "slug": slug}


@router.post("/generate/best-bet")
async def generate_best_bet_article(background_tasks: BackgroundTasks, force: bool = False):
    today = date.today()
    games_raw = await fetch_schedule()
    games = [to_dict(g) for g in games_raw]

    def get_date(g):
        d = g["game_date"]
        if isinstance(d, date):
            return d
        return date.fromisoformat(str(d)[:10])

    next_game = next((g for g in games if get_date(g) >= today and g["status"] != "Final"), None)
    if not next_game:
        raise HTTPException(status_code=404, detail="No upcoming games found")

    game_date_str = str(next_game["game_date"])[:10]

    from app.services.article_service import slugify
    slug = slugify(f"best-knicks-bet-{game_date_str}")
    if not force:
        existing = await get_article_by_slug(slug)
        if existing:
            return {"message": "Article already exists", "slug": slug, "article": existing}

    injuries_raw = await fetch_injury_report()
    injuries = [to_dict(i) for i in injuries_raw]
    stats_raw = await fetch_player_stats()
    top_stats = [to_dict(s) for s in stats_raw[:8]] if stats_raw else []
    odds_raw = await fetch_knicks_lines()
    odds = [to_dict(o) for o in odds_raw]
    spread, moneyline, over_under = get_odds_for_game(odds, next_game)

    from app.services.article_service import generate_best_bet
    article = await generate_best_bet(
        home_team=next_game["home_team"],
        away_team=next_game["away_team"],
        game_date=game_date_str,
        spread=spread,
        moneyline=moneyline,
        over_under=over_under,
        injuries=injuries,
        top_stats=top_stats,
    )
    saved = await save_article(article)
    return {"message": "Article generated", "slug": saved["slug"], "article": saved}


@router.post("/generate/history")
async def generate_history_article_endpoint(force: bool = False):
    from datetime import datetime
    from app.services.article_service import generate_history_article, slugify
    today_str = str(date.today())
    dt = datetime.strptime(today_str, "%Y-%m-%d")
    month = dt.strftime("%B")
    day = dt.day
    slug = slugify(f"this-day-in-knicks-history-{month}-{day}")
    if not force:
        existing = await get_article_by_slug(slug)
        if existing:
            return {"message": "History article already exists", "slug": slug, "article": existing}
    article = await generate_history_article(today_str)
    saved = await save_article(article)
    return {"message": "History article generated", "slug": saved["slug"], "article": saved}


@router.post("/test-tweet")
async def test_tweet():
    from app.services.twitter_service import post_article_tweet
    test_article = {
        "slug": "test-article",
        "title": "Test Tweet from KnicksHub",
        "article_type": "best_bet",
        "game_date": "2026-03-16",
        "home_team": "New York Knicks",
        "away_team": "Golden State Warriors",
        "key_picks": {
            "spread_pick": "Knicks -7.5",
            "spread_lean": "COVER",
            "total_pick": "Under 227.5",
            "total_lean": "UNDER",
            "confidence": "High"
        }
    }
    try:
        result = await post_article_tweet(test_article)
        return {"tweet_url": result}
    except Exception as e:
        return {"error": str(e)}


@router.post("/debug-twitter")
async def debug_twitter():
    from app.config import settings
    return {
        "api_key": bool(settings.TWITTER_API_KEY),
        "api_secret": bool(settings.TWITTER_API_SECRET),
        "access_token": bool(settings.TWITTER_ACCESS_TOKEN),
        "access_token_secret": bool(settings.TWITTER_ACCESS_TOKEN_SECRET),
    }


@router.patch("/{slug}")
async def update_article(slug: str, data: dict):
    from app.db import get_supabase
    db = get_supabase()
    db.table("articles").update(data).eq("slug", slug).execute()
    return {"updated": slug}

@router.delete("/{slug}")
async def delete_article(slug: str):
    from app.db import get_supabase
    db = get_supabase()
    db.table("articles").delete().eq("slug", slug).execute()
    return {"deleted": slug}
