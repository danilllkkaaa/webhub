import httpx
import re
from typing import Optional

_PATTERNS = [
    r"(?:v=|youtu\.be/|embed/|shorts/|live/)([a-zA-Z0-9_-]{11})",
]


def extract_video_id(url: str) -> Optional[str]:
    for pattern in _PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


async def is_video_exists(video_id: str) -> bool:
    """Checks if a YouTube video exists and is public using oEmbed API."""
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url)
            return r.status_code == 200
        except Exception:
            return False
