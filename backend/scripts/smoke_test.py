import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

async def test_news():
    print("\n── News (RSS) ──────────────────────────")
    from app.services.news_service import fetch_all_news
    items = await fetch_all_news(limit=3)
    for i in items: print(f"  ✓ [{i.source}] {i.title[:70]}")
    if not items: print("  ✗ No items")

async def test_injuries():
    print("\n── Injuries (ESPN) ─────────────────────")
    from app.services.nba_service import fetch_injury_report
    injuries = await fetch_injury_report()
    for i in injuries: print(f"  ✓ {i.player_name} — {i.status}")
    if not injuries: print("  ✓ No injuries reported")

async def test_odds():
    print("\n── Betting Lines ───────────────────────")
    from app.services.odds_service import fetch_knicks_lines
    lines = await fetch_knicks_lines()
    for l in lines: print(f"  ✓ {l.away_team} @ {l.home_team} | spread:{l.spread} O/U:{l.over_under}")
    if not lines: print("  ✗ No lines (check key or no upcoming games)")

async def test_birthdays():
    print("\n── Birthdays (next 30 days) ────────────")
    from app.services.birthday_service import get_upcoming_birthdays
    bdays = await get_upcoming_birthdays(days=30)
    for b in bdays: print(f"  ✓ {b.player_name} — {b.birth_date.strftime('%b %d')}")
    if not bdays: print("  ✗ No birthdays in next 30 days")

async def main():
    print("=" * 45)
    print("  KnicksHub Smoke Test")
    print("=" * 45)
    for fn in [test_news, test_injuries, test_odds, test_birthdays]:
        try: await fn()
        except Exception as e: print(f"  ✗ EXCEPTION: {e}")
    print("\n" + "=" * 45 + "\nDone.")

asyncio.run(main())
