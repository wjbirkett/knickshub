from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio, logging, threading
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

def generate_article(force: bool = False):
    """
    Runs every 15 minutes. Checks if there's a Knicks game today and whether
    we're within 2 hours of tip-off. If so, generates all betting articles.
    Falls back to 5pm ET (22:00 UTC) if game time can't be determined.
    """
    import threading
from datetime import date, datetime, timezone, timedelta
    from app.services.article_service import (
        generate_game_preview, generate_best_bet, generate_player_prop, generate_daily_props,
        save_article, get_article_by_slug, slugify
    )
    from app.services.nba_service import fetch_schedule, fetch_injury_report, fetch_player_stats
    from app.services.odds_service import fetch_knicks_lines
    import httpx

    async def _generate():
        try:
            today = date.today()
            now_utc = datetime.now(timezone.utc)

            # Fetch raw ESPN schedule to get game times
            KNICKS_ESPN_ID = "18"
            ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
            url = f"{ESPN_BASE}/teams/{KNICKS_ESPN_ID}/schedule"
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    raw_data = resp.json()
            except Exception as e:
                logger.error(f"ESPN schedule fetch failed in generate_article: {e}")
                return

            # Find today's game and its tip-off time
            today_event = None
            game_time_utc = None
            for event in raw_data.get("events", []):
                raw_date = event.get("date", "")
                try:
                    event_date = datetime.strptime(raw_date[:10], "%Y-%m-%d").date()
                    if event_date == today or event_date == today + timedelta(days=1):
                        comp = event["competitions"][0]
                        status_name = comp.get("status", {}).get("type", {}).get("name", "")
                        if "FINAL" not in status_name:
                            today_event = event
                            # Parse full datetime for tip-off
                            try:
                                game_time_utc = datetime.strptime(raw_date, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc)
                            except:
                                try:
                                    game_time_utc = datetime.strptime(raw_date[:16], "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
                                except:
                                    # Default to 8pm ET = 1am UTC next day... use 00:00 UTC as fallback
                                    game_time_utc = datetime(today.year, today.month, today.day, 22, 0, tzinfo=timezone.utc)
                            break
                except:
                    continue

            if not today_event:
                logger.info("Cron: no game today — skipping betting article generation")
                return

            # Check if we're within the 2-hour window before tip-off
            time_until_tip = game_time_utc - now_utc
            minutes_until_tip = time_until_tip.total_seconds() / 60

            logger.info(f"Cron: game today at {game_time_utc.isoformat()}, {minutes_until_tip:.0f} min until tip-off")

            # Generate articles 40-70 minutes before tip (after NBA 1hr injury deadline)
            if not force and not (40 <= minutes_until_tip <= 70):
                logger.info(f"Cron: not in generation window ({minutes_until_tip:.0f} min to tip) — skipping")
                return

            # Use the normal schedule fetch for game details
            games_raw = await fetch_schedule()
            games = [g.model_dump() if hasattr(g, "model_dump") else g for g in games_raw]

            def get_date(g):
                d = g["game_date"]
                if isinstance(d, date):
                    return d
                return date.fromisoformat(str(d)[:10])

            tomorrow = today + timedelta(days=1)
            next_game = next((g for g in games if get_date(g) in (today, tomorrow) and g["status"] != "Final"), None)
            if not next_game:
                logger.info("Cron: could not find today's game in schedule — skipping")
                return

            game_date_str = str(today)

            slug = slugify(f"{next_game['away_team']}-vs-{next_game['home_team']}-prediction-{game_date_str}")
            existing = await get_article_by_slug(slug)
            if existing and not force:
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
                if knicks_spread is not None: spread = f"{knicks_spread:+.1f}"
                if knicks_ml is not None: moneyline = f"{knicks_ml:+d}"
                if ou is not None: over_under = f"{ou}"

            # Game prediction
            article = await generate_game_preview(
                home_team=next_game["home_team"], away_team=next_game["away_team"],
                game_date=game_date_str, spread=spread, moneyline=moneyline, over_under=over_under,
                injuries=injuries, recent_games=games, top_stats=top_stats,
            )
            await save_article(article)
            logger.info(f"Cron: prediction article generated for {slug}")

            # Best bet — force total lean to match prediction article
            pred_picks = article.get("key_picks") or {}
            forced_total_lean = pred_picks.get("total_lean") if isinstance(pred_picks, dict) else None
            forced_total_pick = pred_picks.get("total_pick") if isinstance(pred_picks, dict) else None
            best_bet = await generate_best_bet(
                home_team=next_game["home_team"], away_team=next_game["away_team"],
                game_date=game_date_str, spread=spread, moneyline=moneyline, over_under=over_under,
                injuries=injuries, top_stats=top_stats,
                forced_total_lean=forced_total_lean, forced_total_pick=forced_total_pick,
            )
            await save_article(best_bet)
            logger.info("Cron: best bet article generated")

            # Prop articles - generate for key players
            prop_players = ["Jalen Brunson", "Karl-Anthony Towns", "OG Anunoby", "Mikal Bridges", "Josh Hart"]
            # Filter out injured players
            active_players = []
            for player_name in prop_players:
                is_out = any(
                    player_name.split()[0].lower() in inj.get("player_name", "").lower()
                    and "out" in inj.get("status", "").lower()
                    for inj in injuries
                )
                if is_out:
                    logger.info(f"Cron: {player_name} listed as Out — skipping prop article")
                else:
                    active_players.append(player_name)
            prop_articles = await generate_daily_props(
                home_team=next_game["home_team"], away_team=next_game["away_team"],
                game_date=game_date_str, players=active_players,
                over_under=over_under, injuries=injuries, top_stats=top_stats,
                max_props_per_player=1,
            )
            for prop in prop_articles:
                await save_article(prop)
                logger.info(f"Cron: prop article generated for {prop.get('player', 'unknown')}")

        except Exception as e:
            logger.error(f"Cron: article generation failed: {e}")

    _run_async(_generate())


def generate_history_article():
    from datetime import date, datetime
    from app.services.article_service import generate_history_article as gen_history, save_article, get_article_by_slug, slugify
    from app.services.nba_service import fetch_schedule

    async def _generate():
        try:
            today = date.today()
            today_str = str(today)

            games_raw = await fetch_schedule()
            games = [g.model_dump() if hasattr(g, "model_dump") else g for g in games_raw]

            def get_date(g):
                d = g["game_date"]
                if isinstance(d, date):
                    return d
                return date.fromisoformat(str(d)[:10])

            has_game_today = any(
                str(get_date(g)) == today_str and g["status"] != "Final"
                for g in games
            )

            if has_game_today:
                logger.info("Cron: game today — skipping history article")
                return

            dt = datetime.strptime(today_str, "%Y-%m-%d")
            month = dt.strftime("%B")
            day = dt.day
            slug = slugify(f"this-day-in-knicks-history-{month}-{day}")
            existing = await get_article_by_slug(slug)
            if existing:
                logger.info(f"Cron: history article already exists for {today_str}, skipping")
                return

            article = await gen_history(today_str)
            await save_article(article)
            logger.info(f"Cron: history article generated for {today_str}")

        except Exception as e:
            logger.error(f"Cron: history article generation failed: {e}")

    _run_async(_generate())


def resolve_results():
    from app.services.results_service import resolve_game_predictions
    from datetime import date, timedelta
    async def _resolve():
        try:
            yesterday = str(date.today() - timedelta(days=1))
            result = await resolve_game_predictions(yesterday)
            logger.info(f"Results resolved for {yesterday}: {result}")
        except Exception as e:
            logger.error(f"Results resolution failed: {e}")
    _run_async(_resolve())

def generate_postgame_article():
    """Runs every 15min. Generates post-game analysis ~3hrs after tip-off."""
    from app.scheduler import _run_async
    async def _gen():
        try:
            import httpx
            from datetime import date as dt, timedelta, datetime, timezone
            now_utc = datetime.now(timezone.utc)
            today = dt.today()
            yesterday = today - timedelta(days=1)
            # Check today and yesterday for a completed Knicks game
            for check_date in [today, yesterday]:
                ds = check_date.strftime("%Y%m%d")
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.get(f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={ds}")
                    data = r.json()
                for ev in data.get("events", []):
                    comp = ev["competitions"][0]
                    ids = [x.get("team",{}).get("id") for x in comp.get("competitors",[])]
                    if "18" not in ids: continue
                    completed = comp.get("status",{}).get("type",{}).get("completed", False)
                    if not completed: continue
                    # Get tip-off time
                    try:
                        tip_utc = datetime.fromisoformat(ev.get("date","").replace("Z","+00:00"))
                    except:
                        continue
                    minutes_since_tip = (now_utc - tip_utc).total_seconds() / 60
                    # Window: 170-200 minutes after tip (roughly 3hrs, catches the 15min cron)
                    if not (170 <= minutes_since_tip <= 200):
                        logger.info(f"Postgame: {minutes_since_tip:.0f}min since tip — not in window")
                        continue
                    game_date = ev.get("date","")[:10]
                    # Check if postgame article already exists
                    from app.db import get_supabase
                    db = get_supabase()
                    if db:
                        existing = db.table("articles").select("slug").eq("game_date", game_date).eq("article_type", "postgame").execute()
                        if existing.data:
                            logger.info(f"Postgame: article already exists for {game_date}")
                            return
                    from app.services.article_service import generate_postgame_analysis, save_article
                    logger.info(f"Postgame: generating analysis for {game_date}")
                    article = await generate_postgame_analysis(game_date)
                    if article and article.get("slug"):
                        await save_article(article)
                        logger.info(f"Postgame: article saved for {game_date}")
                    return
        except Exception as e:
            logger.error(f"Postgame generation failed: {e}", exc_info=True)
    threading.Thread(target=lambda: _run_async(_gen()), daemon=True).start()


def start_scheduler():
    _scheduler.add_job(refresh_news,             CronTrigger(minute="*/15"))
    _scheduler.add_job(refresh_injuries,         CronTrigger(hour="*/3"))
    _scheduler.add_job(refresh_odds,             CronTrigger(hour="*/1"))
    # Check every 15min — generates articles when 40-70min before tip-off (after 1hr injury report deadline)
    _scheduler.add_job(generate_article,         CronTrigger(minute="*/15"))
    # History articles: off days only, 10am ET (15:00 UTC)
    _scheduler.add_job(generate_history_article, CronTrigger(hour=15, minute=0, timezone="UTC"))
    _scheduler.add_job(resolve_results, CronTrigger(hour=4, minute=0, timezone="UTC"))  # 11pm ET - resolve last night
    _scheduler.add_job(generate_postgame_article, CronTrigger(minute="*/15"))  # Check every 15min for postgame window
    _scheduler.start()
    logger.info("Scheduler started")

def shutdown_scheduler():
    _scheduler.shutdown()
