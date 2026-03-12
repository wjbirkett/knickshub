from fastapi import APIRouter
from typing import List
from app.models.schemas import BettingLine
from app.services.odds_service import fetch_knicks_lines

router = APIRouter()

@router.get("/", response_model=List[BettingLine])
async def get_betting_lines():
    return await fetch_knicks_lines()
