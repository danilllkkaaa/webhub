from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.webinar import Webinar
from app.schemas.webinar import WebinarOut

router = APIRouter(tags=["public"])


@router.get("/webinars/by-slug/{slug}", response_model=WebinarOut)
async def get_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Webinar).where(Webinar.slug == slug))
    webinar = result.scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")
    return webinar
