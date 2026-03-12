from fastapi import APIRouter, Query
from typing import List
from app.models.schemas import PlayerBirthday
from app.services.birthday_service import get_todays_birthdays, get_upcoming_birthdays

router = APIRouter()

@router.get("/today", response_model=List[PlayerBirthday])
async def todays_birthdays():
    return await get_todays_birthdays()

@router.get("/upcoming", response_model=List[PlayerBirthday])
async def upcoming_birthdays(days: int = Query(7, le=30)):
    return await get_upcoming_birthdays(days=days)
