from fastapi import APIRouter
from typing import List
from app.models.schemas import Tweet
from app.services.twitter_service import fetch_beat_writer_tweets

router = APIRouter()

@router.get("/", response_model=List[Tweet])
async def get_tweets():
    return await fetch_beat_writer_tweets()
