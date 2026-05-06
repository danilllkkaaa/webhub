import asyncio
import subprocess
import sys

from sqlalchemy import text

from app.database import engine


async def has_table(table_name: str) -> bool:
    query = text(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :table_name
        )
        """
    )
    async with engine.connect() as conn:
        result = await conn.execute(query, {"table_name": table_name})
        return bool(result.scalar())


async def main() -> None:
    has_users = await has_table("users")
    has_alembic_version = await has_table("alembic_version")
    await engine.dispose()

    if has_users and not has_alembic_version:
        subprocess.run(["alembic", "stamp", "20260506_0001"], check=True)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Database migration bootstrap failed: {exc}", file=sys.stderr)
        raise
