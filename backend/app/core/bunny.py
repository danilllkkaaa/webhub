import hashlib
import time
import httpx
from app.config import settings

_BASE = "https://video.bunnycdn.com/library"


def _headers() -> dict:
    return {"AccessKey": settings.bunny_api_key, "Content-Type": "application/json"}


async def create_video(title: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{_BASE}/{settings.bunny_library_id}/videos",
            json={"title": title},
            headers=_headers(),
        )
        r.raise_for_status()
        return r.json()


async def get_video(video_id: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{_BASE}/{settings.bunny_library_id}/videos/{video_id}",
            headers=_headers(),
        )
        r.raise_for_status()
        return r.json()


async def delete_video(video_id: str) -> None:
    async with httpx.AsyncClient(timeout=30) as client:
        await client.delete(
            f"{_BASE}/{settings.bunny_library_id}/videos/{video_id}",
            headers=_headers(),
        )


def generate_secure_url(video_id: str, expires_in: int = 3600) -> str:
    """
    Generates a Bunny.net HLS playback URL.
    If BUNNY_SECURITY_KEY is set, produces a signed URL. Otherwise plain URL.
    Raises ValueError if BUNNY_CDN_HOSTNAME is not configured.
    """
    if not settings.bunny_cdn_hostname:
        raise ValueError("BUNNY_CDN_HOSTNAME is not configured")

    path = f"/{video_id}/playlist.m3u8"

    if not settings.bunny_security_key:
        return f"https://{settings.bunny_cdn_hostname}{path}"

    expires = int(time.time()) + expires_in
    token_input = f"{settings.bunny_security_key}{path}{expires}"
    token = hashlib.md5(token_input.encode()).hexdigest()

    return f"https://{settings.bunny_cdn_hostname}{path}?token={token}&expires={expires}"
