import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
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

@router.get("/odds")
async def get_odds():
    from app.services.odds_service import fetch_knicks_lines
    lines = await fetch_knicks_lines()
    return [l.model_dump() if hasattr(l, "model_dump") else l for l in lines]

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

@router.post("/trigger-all")
async def trigger_all_articles():
    from app.scheduler import _run_async
    from app.services.article_service import generate_game_preview, generate_best_bet, generate_player_prop, save_article
    from app.services.nba_service import fetch_schedule, fetch_injury_report, fetch_player_stats
    from app.services.odds_service import fetch_knicks_lines
    from datetime import date
    import threading
    async def _gen():
        try:
            today = date.today()
            games_raw = await fetch_schedule()
            games = [g.model_dump() if hasattr(g, "model_dump") else g for g in games_raw]
            from datetime import date as dt
            def get_date(g):
                d = g["game_date"]
                if isinstance(d, dt): return d
                return dt.fromisoformat(str(d)[:10])
            tomorrow = today + __import__("datetime").timedelta(days=1)
            next_game = next((g for g in sorted(games, key=lambda g: str(g["game_date"])) if get_date(g) in (today, tomorrow) and g["status"] != "Final"), None)
            if not next_game: return
            injuries_raw = await fetch_injury_report()
            injuries = [i.model_dump() if hasattr(i, "model_dump") else i for i in injuries_raw]
            stats_raw = await fetch_player_stats()
            top_stats = [s.model_dump() if hasattr(s, "model_dump") else s for s in stats_raw[:8]] if stats_raw else []
            odds_raw = await fetch_knicks_lines()
            odds = [o.model_dump() if hasattr(o, "model_dump") else o for o in odds_raw]
            spread = moneyline = over_under = "N/A"
            if odds:
                o = odds[0]
                is_away = "Knicks" in o.get("away_team","") or "New York" in o.get("away_team","")
                raw_s = o.get("spread"); ml_h = o.get("moneyline_home"); ml_a = o.get("moneyline_away"); ou = o.get("over_under")
                ks = (-raw_s if is_away else raw_s) if raw_s is not None else None
                km = ml_a if is_away else ml_h
                if ks is not None: spread = f"{ks:+.1f}"
                if km is not None: moneyline = f"{km:+d}"
                if ou is not None: over_under = f"{ou}"
            gd = str(next_game["game_date"])[:10]
            art = await generate_game_preview(home_team=next_game["home_team"],away_team=next_game["away_team"],game_date=gd,spread=spread,moneyline=moneyline,over_under=over_under,injuries=injuries,recent_games=games,top_stats=top_stats)
            await save_article(art)
            # Extract total lean from prediction to force consistency in best bet
            pred_picks = art.get("key_picks") or {}
            forced_total_lean = pred_picks.get("total_lean") if isinstance(pred_picks, dict) else None
            forced_total_pick = pred_picks.get("total_pick") if isinstance(pred_picks, dict) else None
            bb = await generate_best_bet(home_team=next_game["home_team"],away_team=next_game["away_team"],game_date=gd,spread=spread,moneyline=moneyline,over_under=over_under,injuries=injuries,top_stats=top_stats,forced_total_lean=forced_total_lean,forced_total_pick=forced_total_pick)
            await save_article(bb)
            from app.services.article_service import generate_daily_props
            prop_players = ["Jalen Brunson","Karl-Anthony Towns","OG Anunoby","Mikal Bridges","Josh Hart"]
            active = [pl for pl in prop_players if not any(pl.split()[0].lower() in inj.get("player_name","").lower() and "out" in inj.get("status","").lower() for inj in injuries)]
            prop_articles = await generate_daily_props(home_team=next_game["home_team"],away_team=next_game["away_team"],game_date=gd,players=active,over_under=over_under,injuries=injuries,top_stats=top_stats,max_props_per_player=1)
            for prop in prop_articles:
                await save_article(prop)
        except Exception as e:
            import logging; logging.getLogger(__name__).error(f"trigger-all failed: {e}", exc_info=True)
    threading.Thread(target=lambda: _run_async(_gen()), daemon=True).start()
    return {"message": "Article generation triggered"}

@router.get("/debug-trigger")
async def debug_trigger():
    from app.services.nba_service import fetch_schedule, fetch_injury_report
    from app.services.odds_service import fetch_knicks_lines
    import traceback
    try:
        games_raw = await fetch_schedule()
        games = [g.model_dump() if hasattr(g, "model_dump") else g for g in games_raw]
        odds_raw = await fetch_knicks_lines()
        odds = [o.model_dump() if hasattr(o, "model_dump") else o for o in odds_raw]
        inj_raw = await fetch_injury_report()
        injuries = [i.model_dump() if hasattr(i, "model_dump") else i for i in inj_raw]
        from datetime import date, timedelta; today = date.today(); tom = today + timedelta(days=1)
        next_g = next((g for g in sorted(games, key=lambda g: str(g["game_date"])) if str(g["game_date"])[:10] in (str(today), str(tom)) and g["status"] != "Final"), None)
        return {"games_count": len(games), "next_game": next_g, "odds_count": len(odds), "odds": odds[0] if odds else None, "injuries_count": len(injuries)}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}

@router.post("/resolve-results")
async def resolve_results(game_date: str = None):
    from app.services.results_service import resolve_game_predictions
    from datetime import date, timedelta
    if not game_date:
        game_date = str(date.today() - timedelta(days=1))
    result = await resolve_game_predictions(game_date)
    return {"game_date": game_date, "result": result}

@router.get("/debug-injuries")
async def debug_injuries(opponent: str = "Golden State Warriors"):
    from app.services.article_service import _fetch_opponent_injuries
    result = await _fetch_opponent_injuries(opponent)
    return {"opponent": opponent, "injuries": result}

@router.get("/")
async def list_articles(limit: int = 20):
    return await get_articles(limit)

@router.get("/results")
async def get_results():
    from app.db import get_supabase
    db = get_supabase()
    if not db: return []
    pred = db.table("prediction_results").select("*").order("game_date", desc=True).execute()
    props = db.table("prop_results").select("*").order("game_date", desc=True).execute()
    return {"predictions": pred.data, "props": props.data}

@router.get("/debug-boxscore")
async def debug_boxscore(game_id: str, player: str):
    from app.services.results_service import fetch_player_stats_from_boxscore
    result = await fetch_player_stats_from_boxscore(game_id, player)
    return {"player": player, "stats": result}

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

    game_date_str = str(today)

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

    game_date_str = str(today)

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
    asyncio.create_task(_gen())
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

    game_date_str = str(today)

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
    async def _gen_best_bet():
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
        await save_article(article)
    asyncio.create_task(_gen_best_bet())
    return {"message": "Article generation started", "slug": slug}


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
async def update_article(slug: str, request: Request):
    from app.db import get_supabase
    data = await request.json()
    db = get_supabase()
    db.table("articles").update(data).eq("slug", slug).execute()
    return {"updated": slug}

@router.delete("/{slug}")
async def delete_article(slug: str):
    from app.db import get_supabase
    db = get_supabase()
    db.table("articles").delete().eq("slug", slug).execute()
    return {"deleted": slug}
