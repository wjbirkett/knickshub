from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio, logging
logger = logging.getLogger(__name__)
_scheduler = BackgroundScheduler()

def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()

def refresh_news():
    from app.services.news_service import refresh_news as rn
    _run_async(rn())

def refresh_injuries():
    from app.services.nba_service import fetch_injury_report
    _run_async(fetch_injury_report())

def refresh_odds():
    from app.services.odds_service import fetch_knicks_lines
    _run_async(fetch_knicks_lines())

def generate_article():
    from datetime import date
    from app.services.article_service import generate_game_preview, generate_best_bet, generate_player_prop, save_article, get_article_by_slug, slugify
    from app.services.nba_service import fetch_schedule, fetch_injury_report, fetch_player_stats
    from app.services.odds_service import fetch_knicks_lines

    async def _generate():
        try:
            today = date.today()
            games_raw = await fetch_schedule()
            games = [g.model_dump() if hasattr(g, "model_dump") else g for g in games_raw]

            def get_date(g):
                d = g["game_date"]
                if isinstance(d, date):
                    return d
                return date.fromisoformat(str(d)[:10])

            next_game = next((g for g in games if get_date(g) >= today and g["status"] != "Final"), None)
            if not next_game:
                logger.info("Cron: no upcoming game found, skipping article generation")
                return

            game_date_str = str(next_game["game_date"])[:10]
            slug = slugify(f"{next_game['away_team']}-vs-{next_game['home_team']}-prediction-{game_date_str}")
            existing = await get_article_by_slug(slug)
            if existing:
                logger.info(f"Cron: articles already exist for {game_date_str}, skipping")
                return

            injuries_raw = await fetch_injury_report()
            injuries = [i.model_dump() if hasattr(i, "model_dump") else i for i in injuries_raw]

            stats_raw = await fetch_player_stats()
            top_stats = [s.model_dump() if hasattr(s, "model_dump") else s for s in stats_raw[:8]] if stats_raw else []

            odds_raw = await fetch_knicks_lines()
            odds = [o.model_dump() if hasattr(o, "model_dump") else o for o in odds_raw]
            spread = moneyline = over_under = "N/A"

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

            # Generate prediction article
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
            await save_article(article)
            logger.info(f"Cron: prediction article generated for {slug}")

            # Generate best bet article
            best_bet = await generate_best_bet(
                home_team=next_game["home_team"],
                away_team=next_game["away_team"],
                game_date=game_date_str,
                spread=spread,
                moneyline=moneyline,
                over_under=over_under,
                injuries=injuries,
                top_stats=top_stats,
            )
            await save_article(best_bet)
            logger.info(f"Cron: best bet article generated")

            # Generate Brunson prop article
            brunson_stats = next((s for s in top_stats if "Brunson" in s.get("player_name", "")), None)
            prop = await generate_player_prop(
                player="Jalen Brunson",
                home_team=next_game["home_team"],
                away_team=next_game["away_team"],
                game_date=game_date_str,
                player_stats=brunson_stats,
                injuries=injuries,
                top_stats=top_stats,
                over_under=over_under,
            )
            await save_article(prop)
            logger.info(f"Cron: prop article generated")

        except Exception as e:
            logger.error(f"Cron: article generation failed: {e}")

    _run_async(_generate())

def start_scheduler():
    _scheduler.add_job(refresh_news,     CronTrigger(minute="*/15"))
    _scheduler.add_job(refresh_injuries, CronTrigger(hour="*/3"))
    _scheduler.add_job(refresh_odds,     CronTrigger(hour="*/1"))
    _scheduler.add_job(generate_article, CronTrigger(hour=14, minute=0, timezone="UTC"))
    _scheduler.start()
    logger.info("Scheduler started")

def shutdown_scheduler():
    _scheduler.shutdown()
