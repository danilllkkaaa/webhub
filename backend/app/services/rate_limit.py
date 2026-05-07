from collections import defaultdict, deque
from time import monotonic

from fastapi import HTTPException, Request, status


_buckets: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request, scope: str, identifier: str = "") -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host if request.client else "unknown"
    return f"{scope}:{ip}:{identifier.lower()}"


def check_rate_limit(
    request: Request,
    *,
    scope: str,
    identifier: str = "",
    limit: int = 5,
    window_seconds: int = 60,
) -> None:
    key = _client_key(request, scope, identifier)
    now = monotonic()
    bucket = _buckets[key]

    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
        )

    bucket.append(now)
