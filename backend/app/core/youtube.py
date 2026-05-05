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
