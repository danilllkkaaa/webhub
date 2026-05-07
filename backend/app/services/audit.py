from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security import AuditEvent, AuditLog
from app.models.user import User


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None


async def write_audit_log(
    db: AsyncSession,
    event: AuditEvent,
    *,
    request: Request | None = None,
    actor: User | None = None,
    target_user_id: int | None = None,
    organization_id: int | None = None,
    project_id: int | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AuditLog(
            event=event,
            actor_user_id=actor.id if actor else None,
            target_user_id=target_user_id,
            organization_id=organization_id if organization_id is not None else actor.organization_id if actor else None,
            project_id=project_id,
            ip_address=_client_ip(request),
            user_agent=request.headers.get("user-agent")[:512] if request and request.headers.get("user-agent") else None,
            detail=detail,
        )
    )
