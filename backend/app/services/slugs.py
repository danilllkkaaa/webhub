from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify


async def make_unique_slug(
    title: str,
    model: Any,
    db: AsyncSession,
    fallback: str,
) -> str:
    base = slugify(title) or fallback
    slug = base
    suffix = 1

    while True:
        result = await db.execute(select(model).where(model.slug == slug))
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1
