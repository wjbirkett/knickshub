import logging
logger = logging.getLogger(__name__)

def get_supabase():
    from app.config import settings
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials not set — DB features disabled.")
        return None
    try:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return client
    except Exception as e:
        logger.error(f"Supabase init failed: {e}")
        raise e