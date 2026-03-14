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

def _get_posting_client():
    """Client with full OAuth 1.0a credentials for posting tweets."""
    import tweepy
    return tweepy.Client(
        consumer_key=settings.TWITTER_API_KEY,
        consumer_secret=settings.TWITTER_API_SECRET,
        access_token=settings.TWITTER_ACCESS_TOKEN,
        access_token_secret=settings.TWITTER_ACCESS_TOKEN_SECRET,
        wait_on_rate_limit=True,
    )

def _build_tweet_text(article: dict) -> str:
    """Build tweet text for a given article. Stays under 280 chars with URL."""
    article_type = article.get("article_type", "prediction")
    title = article.get("title", "")
    slug = article.get("slug", "")
    url = f"https://knickshub.vercel.app/predictions/{slug}"
    away = article.get("away_team", "")
    home = article.get("home_team", "")
    opponent = away if "Knicks" not in away else home

    key_picks = article.get("key_picks") or {}

    if article_type == "prop":
        player = key_picks.get("player", "")
        pick = key_picks.get("pick", "")
        confidence = key_picks.get("confidence", "")
        if player and pick:
            body = f"🎯 {player} prop tonight vs {opponent}\n\nPick: {pick}"
            if confidence:
                body += f" ({confidence} confidence)"
        else:
            body = f"🎯 Player prop prediction for tonight's Knicks vs {opponent} game"
        hashtags = "#Knicks #NBA #PlayerProps"

    elif article_type == "best_bet":
        pick = key_picks.get("total_pick") or key_picks.get("spread_pick", "")
        confidence = key_picks.get("confidence", "")
        if pick:
            body = f"💰 Best bet tonight vs {opponent}\n\nPick: {pick}"
            if confidence:
                body += f" ({confidence} confidence)"
        else:
            body = f"💰 Our best bet for tonight's Knicks vs {opponent} game is locked in"
        hashtags = "#Knicks #NBA #BestBet"

    else:  # prediction
        spread = key_picks.get("spread_pick", "")
        total = key_picks.get("total_pick", "")
        confidence = key_picks.get("confidence", "")
        if spread:
            body = f"🏀 Knicks vs {opponent} prediction\n\nSpread: {spread}"
            if total:
                body += f" | Total: {total}"
            if confidence:
                body += f"\nConfidence: {confidence}"
        else:
            body = f"🏀 Full Knicks vs {opponent} prediction, odds & best bet is up"
        hashtags = "#Knicks #NBA #KnicksTape"

    tweet = f"{body}\n\n{url}\n\n{hashtags}"

    # Truncate body if over 280 chars
    if len(tweet) > 280:
        max_body = 280 - len(f"\n\n{url}\n\n{hashtags}") - 3
        body = body[:max_body] + "..."
        tweet = f"{body}\n\n{url}\n\n{hashtags}"

    return tweet

async def post_article_tweet(article: dict) -> str | None:
    """Post a tweet for a given article. Returns tweet URL or None on failure."""
    if not all([
        settings.TWITTER_API_KEY,
        settings.TWITTER_API_SECRET,
        settings.TWITTER_ACCESS_TOKEN,
        settings.TWITTER_ACCESS_TOKEN_SECRET,
    ]):
        logger.warning("Twitter posting credentials not fully set — skipping tweet")
        return None

    try:
        import asyncio
        tweet_text = _build_tweet_text(article)
        client = _get_posting_client()
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.create_tweet(text=tweet_text)
        )
        tweet_id = response.data["id"]
        tweet_url = f"https://twitter.com/KnicksHub/status/{tweet_id}"
        logger.info(f"Tweet posted: {tweet_url}")
        return tweet_url
    except Exception as e:
        logger.error(f"Failed to post tweet: {e}")
        return None


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
