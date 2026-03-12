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

def start_scheduler():
    _scheduler.add_job(refresh_news,     CronTrigger(minute="*/15"))
    _scheduler.add_job(refresh_injuries, CronTrigger(hour="*/3"))
    _scheduler.add_job(refresh_odds,     CronTrigger(hour="*/1"))
    _scheduler.start()
    logger.info("Scheduler started")

def shutdown_scheduler():
    _scheduler.shutdown()
