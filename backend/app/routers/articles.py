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
async def generate_next_game_article(background_tasks: BackgroundTasks):
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

    # Check if article already exists
    from app.services.article_service import slugify
    slug = slugify(f"{next_game['away_team']}-vs-{next_game['home_team']}-prediction-{game_date_str}")
    existing = await get_article_by_slug(slug)
    if existing:
        return {"message": "Article already exists", "slug": slug, "article": existing}

    # Gather injuries
    injuries_raw = await fetch_injury_report()
    injuries = [to_dict(i) for i in injuries_raw]

    # Gather stats
    stats_raw = await fetch_player_stats()
    top_stats = [to_dict(s) for s in stats_raw[:8]] if stats_raw else []

    # Get odds
    odds_raw = await fetch_knicks_lines()
    odds = [to_dict(o) for o in odds_raw]
    spread = "N/A"
    moneyline = "N/A"
    over_under = "N/A"

    if odds:
        game_odds = odds[0]
        for bm in game_odds.get("bookmakers", []):
            bm = to_dict(bm) if hasattr(bm, "dict") else bm
            for market in bm.get("markets", []):
                market = to_dict(market) if hasattr(market, "dict") else market
                outcomes = market.get("outcomes", [])
                if market["key"] == "spreads":
                    knicks_s = next((o for o in outcomes if "Knicks" in str(o.get("name","")) or "New York" in str(o.get("name",""))), None)
                    if knicks_s:
                        spread = f"{float(knicks_s.get('point',0)):+.1f} ({int(knicks_s.get('price',0)):+d})"
                if market["key"] == "h2h":
                    knicks_ml = next((o for o in outcomes if "Knicks" in str(o.get("name","")) or "New York" in str(o.get("name",""))), None)
                    if knicks_ml:
                        moneyline = f"{int(knicks_ml.get('price',0)):+d}"
                if market["key"] == "totals":
                    over = next((o for o in outcomes if o.get("name") == "Over"), None)
                    if over:
                        over_under = f"{over.get('point','?')} ({int(over.get('price',0)):+d})"
            break

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
