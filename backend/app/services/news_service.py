import asyncio, hashlib, logging, feedparser
from datetime import datetime, timezone
import urllib.request, json
logger = logging.getLogger(__name__)

ESPN_NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?team=18&limit=50"

RSS_SOURCES = [
    {"url": "https://nypost.com/tag/new-york-knicks/feed/", "source": "nypost"},
    {"url": "https://bleacherreport.com/new-york-knicks.rss", "source": "bleacher"},
    {"url": "https://www.cbssports.com/rss/headlines/nba/", "source": "cbs"},
]

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
    return {"id": hashlib.md5(url.encode()).hexdigest(), "title": title, "summary": a.get("description", "")[:300].strip(), "url": url, "source": "espn", "author": ", ".join(a.get("byline", "").split(",")[:2]), "published_at": published_at, "image_url": image_url}

def _fetch_rss(source_info):
    try:
        feed = feedparser.parse(source_info["url"])
        items = []
        for entry in feed.entries[:15]:
            title = entry.get("title", "").strip()
            url = entry.get("link", "")
            if not title or not url:
                continue
            knicks_kw = ["knick", "brunson", "towns", "anunoby", "bridges", "nba"]
            if not any(k in title.lower() for k in knicks_kw):
                continue
            published_at = None
            if entry.get("published"):
                try:
                    from email.utils import parsedate_to_datetime
                    published_at = parsedate_to_datetime(entry.published).isoformat()
                except Exception:
                    pass
            image_url = None
            if entry.get("media_content"):
                image_url = entry.media_content[0].get("url")
            elif entry.get("media_thumbnail"):
                image_url = entry.media_thumbnail[0].get("url")
            items.append({"id": hashlib.md5(url.encode()).hexdigest(), "title": title, "summary": entry.get("summary", "")[:300].strip(), "url": url, "source": source_info["source"], "author": entry.get("author", ""), "published_at": published_at, "image_url": image_url})
        return items
    except Exception as e:
        logger.warning("RSS fetch failed for " + source_info["source"] + ": " + str(e))
        return []

async def fetch_all_news(source=None, limit=30):
    loop = asyncio.get_event_loop()
    all_items = []
    try:
        articles = await asyncio.wait_for(loop.run_in_executor(None, _fetch_espn_news), timeout=10)
        for a in articles:
            item = _article_to_item(a)
            if item:
                all_items.append(item)
    except Exception as e:
        logger.warning("ESPN news fetch failed: " + str(e))
    for src in RSS_SOURCES:
        try:
            items = await asyncio.wait_for(loop.run_in_executor(None, _fetch_rss, src), timeout=10)
            all_items.extend(items)
        except Exception as e:
            logger.warning("RSS timed out for " + src["source"] + ": " + str(e))
    if source:
        all_items = [i for i in all_items if i["source"] == source]
    seen = set()
    unique = []
    for item in all_items:
        if item["id"] not in seen:
            seen.add(item["id"])
            unique.append(item)
    unique.sort(key=lambda x: x.get("published_at") or "", reverse=True)
    return unique[:limit]

async def refresh_news():
    await fetch_all_news()
