import asyncio, hashlib, logging
from datetime import datetime, timezone
import urllib.request, json

logger = logging.getLogger(__name__)

ESPN_NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?team=18&limit=50"

def _fetch_espn_news():
    req = urllib.request.Request(ESPN_NEWS_URL, headers={"User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=10).read())
    return data.get("articles", [])

def _article_to_item(a):
    url = a.get("links", {}).get("web", {}).get("href", "")
    title = a.get("headline", "").strip()
    if not url or not title:
        return None
    image_url = None
    images = a.get("images", [])
    if images:
        image_url = images[0].get("url")
    published_at = None
    raw_date = a.get("published") or a.get("lastModified")
    if raw_date:
        try:
            published_at = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).isoformat()
        except Exception:
            pass
    return {
        "id": hashlib.md5(url.encode()).hexdigest(),
        "title": title,
        "summary": a.get("description", "")[:300].strip(),
        "url": url,
        "source": "espn",
        "author": ", ".join(a.get("byline", "").split(",")[:2]),
        "published_at": published_at,
        "image_url": image_url,
    }

async def fetch_all_news(source=None, limit=30):
    loop = asyncio.get_event_loop()
    try:
        articles = await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_espn_news), timeout=10
        )
    except Exception as e:
        logger.warning(f"ESPN news fetch failed: {e}")
        articles = []
    items = []
    for a in articles:
        item = _article_to_item(a)
        if item:
            items.append(item)
    items.sort(key=lambda x: x.get("published_at") or "", reverse=True)
    return items[:limit]

async def refresh_news():
    await fetch_all_news()
