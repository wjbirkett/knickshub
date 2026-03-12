import logging
from datetime import datetime, timezone
from typing import List, Optional
from app.models.schemas import Tweet
from app.config import settings

logger = logging.getLogger(__name__)

BEAT_WRITERS = [
    {"handle": "KristianWinfield", "name": "Kristian Winfield"},
    {"handle": "IanBegley",        "name": "Ian Begley"},
    {"handle": "SBondyNYDN",       "name": "Stefan Bondy"},
    {"handle": "FredKatz",         "name": "Fred Katz"},
]
_user_id_cache = {}

def _get_client():
    import tweepy
    return tweepy.Client(bearer_token=settings.TWITTER_BEARER_TOKEN, wait_on_rate_limit=True)

async def fetch_beat_writer_tweets(handles: Optional[List[str]] = None, max_per_user: int = 5) -> List[Tweet]:
    if not settings.TWITTER_BEARER_TOKEN:
        logger.warning("TWITTER_BEARER_TOKEN not set")
        return []
    writers = BEAT_WRITERS
    if handles:
        writers = [w for w in BEAT_WRITERS if w["handle"] in handles]
    all_tweets = []
    client = _get_client()
    for writer in writers:
        try:
            tweets = await _fetch_user_tweets(client, writer, max_per_user)
            all_tweets.extend(tweets)
        except Exception as e:
            logger.warning(f"Tweet fetch failed for @{writer['handle']}: {e}")
    all_tweets.sort(key=lambda t: t.created_at, reverse=True)
    return all_tweets

async def _fetch_user_tweets(client, writer, max_results):
    import asyncio
    from functools import partial
    handle = writer["handle"]
    if handle not in _user_id_cache:
        loop = asyncio.get_event_loop()
        user_resp = await loop.run_in_executor(None, partial(client.get_user, username=handle, user_fields=["id","name"]))
        if not user_resp.data: return []
        _user_id_cache[handle] = str(user_resp.data.id)
    user_id = _user_id_cache[handle]
    loop = asyncio.get_event_loop()
    timeline = await loop.run_in_executor(None, partial(
        client.get_users_tweets, id=user_id,
        max_results=max(5, min(max_results, 100)),
        tweet_fields=["created_at","public_metrics","text"],
        exclude=["retweets","replies"],
    ))
    if not timeline.data: return []
    tweets = []
    for tw in timeline.data:
        metrics = tw.public_metrics or {}
        tweets.append(Tweet(
            tweet_id=str(tw.id), author_handle=handle, author_name=writer["name"],
            text=tw.text, created_at=tw.created_at or datetime.now(timezone.utc),
            url=f"https://twitter.com/{handle}/status/{tw.id}",
            likes=metrics.get("like_count",0), retweets=metrics.get("retweet_count",0),
        ))
    return tweets
