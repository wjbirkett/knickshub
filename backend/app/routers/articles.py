from fastapi import APIRouter, HTTPException, BackgroundTasks
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

    # Get next game
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

    # Check if article already exists (skip if force=True)
    from app.services.article_service import slugify
    slug = slugify(f"{next_game['away_team']}-vs-{next_game['home_team']}-prediction-{game_date_str}")
    if not force:
        existing = await get_article_by_slug(slug)
        if existing:
            return {"message": "Article already exists", "slug": slug, "article": existing}

    # Gather injuries
    injuries_raw = await fetch_injury_report()
    injuries = [to_dict(i) for i in injuries_raw]

    # Gather stats
    stats_raw = await fetch_player_stats()
    top_stats = [to_dict(s) for s in stats_raw[:8]] if stats_raw else []

    # Get odds — service returns flat BettingLine objects
    odds_raw = await fetch_knicks_lines()
    odds = [to_dict(o) for o in odds_raw]
    spread = "N/A"
    moneyline = "N/A"
    over_under = "N/A"

    if odds:
        o = odds[0]
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

    # Generate article
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
@router.delete("/{slug}")
async def delete_article(slug: str):
    from app.db import get_supabase
    db = get_supabase()
    db.table("articles").delete().eq("slug", slug).execute()
    return {"deleted": slug}
@router.get("/debug/test")
async def debug_test():
    from app.config import settings
    from app.db import get_supabase
    key_prefix = settings.SUPABASE_KEY[:15] if settings.SUPABASE_KEY else "empty"
    try:
        db = get_supabase()
        if not db:
            return {"error": "get_supabase returned None", "key_prefix": key_prefix}
        result = db.table("articles").select("slug").execute()
        return {"count": len(result.data) if isinstance(result.data, list) else 1, "data": result.data}
    except Exception as e:
        return {"key_prefix": key_prefix, "error": str(e), "error_type": type(e).__name__}