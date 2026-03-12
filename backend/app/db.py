import logging
logger = logging.getLogger(__name__)
_client = None

def get_supabase():
    global _client
    if _client is not None:
        return _client
    from app.config import settings
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials not set — DB features disabled.")
        return None
    try:
        from supabase import create_client
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialised.")
        return _client
    except Exception as e:
        logger.error(f"Supabase init failed: {e}")
        return None
