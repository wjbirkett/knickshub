from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    ODDS_API_KEY: str = ""
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""
    TWITTER_ACCESS_TOKEN: str = ""
    TWITTER_ACCESS_SECRET: str = ""
    TWITTER_BEARER_TOKEN: str = ""
    ANTHROPIC_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
print(f"DEBUG: ANTHROPIC_API_KEY={'SET' if settings.ANTHROPIC_API_KEY else 'NOT SET'}")
print(f"DEBUG: SUPABASE_KEY={'SET' if settings.SUPABASE_KEY else 'NOT SET'}")
print(f"DEBUG: ODDS_API_KEY={'SET' if settings.ODDS_API_KEY else 'NOT SET'}")