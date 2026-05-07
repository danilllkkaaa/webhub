import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.config import settings
from app.database import get_db
from app.models.organization import Organization
from app.models.project import Project
from app.models.security import AuditEvent, PasswordResetToken
from app.models.user import User, UserRole
from app.schemas.auth import (
    LoginRequest, OrganizationRegisterRequest, TokenResponse, UserOut,
    UpdateProfileRequest, ChangePasswordRequest, ForgotPasswordRequest,
    ForgotPasswordResponse, ResetPasswordRequest,
)
from app.core.security import verify_password, hash_password, create_access_token
from app.core.dependencies import get_current_user
from app.services.audit import write_audit_log
from app.services.rate_limit import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    email = str(data.email).lower()
    check_rate_limit(request, scope="auth.login", identifier=email, limit=8, window_seconds=300)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        await write_audit_log(db, AuditEvent.login_failed, request=request, target_user_id=user.id if user else None, detail=email)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    await write_audit_log(db, AuditEvent.login_success, request=request, actor=user, target_user_id=user.id)
    await db.commit()
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.post("/register-organization", response_model=TokenResponse, status_code=201)
async def register_organization(data: OrganizationRegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    email = str(data.email).lower()
    check_rate_limit(request, scope="auth.register", identifier=email, limit=5, window_seconds=3600)
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    organization = Organization(name=data.organization_name.strip())
    db.add(organization)
    await db.flush()

    user = User(
        organization_id=organization.id,
        email=email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        role=UserRole.owner,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    project = Project(
        organization_id=organization.id,
        owner_id=user.id,
        name=data.project_name.strip(),
        color="#2D9A27",
    )
    db.add(project)
    await db.flush()
    await write_audit_log(
        db,
        AuditEvent.organization_registered,
        request=request,
        actor=user,
        target_user_id=user.id,
        organization_id=organization.id,
        project_id=project.id,
    )
    await db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UpdateProfileRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.email and data.email != current_user.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = data.email

    if data.full_name is not None:
        current_user.full_name = data.full_name.strip() or None

    db.add(current_user)
    await write_audit_log(db, AuditEvent.profile_updated, request=request, actor=current_user, target_user_id=current_user.id)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/password", status_code=204)
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    check_rate_limit(request, scope="auth.change_password", identifier=str(current_user.id), limit=5, window_seconds=300)
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Новый пароль должен быть не менее 6 символов")
    current_user.hashed_password = hash_password(data.new_password)
    db.add(current_user)
    await write_audit_log(db, AuditEvent.password_changed, request=request, actor=current_user, target_user_id=current_user.id)
    await db.commit()


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(data: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    email = str(data.email).lower()
    check_rate_limit(request, scope="auth.forgot_password", identifier=email, limit=5, window_seconds=3600)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    response = ForgotPasswordResponse(message="If the email exists, password reset instructions have been prepared.")
    if not user:
        await write_audit_log(db, AuditEvent.password_reset_requested, request=request, detail=email)
        await db.commit()
        return response

    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id)
        .where(PasswordResetToken.used_at.is_(None))
        .values(used_at=datetime.utcnow())
    )
    raw_token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_reset_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.password_reset_token_minutes),
    )
    db.add(reset_token)
    await write_audit_log(db, AuditEvent.password_reset_requested, request=request, target_user_id=user.id, organization_id=user.organization_id)
    await db.commit()

    if settings.expose_password_reset_token:
        response.reset_token = raw_token
    return response


@router.post("/reset-password", status_code=204)
async def reset_password(data: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    check_rate_limit(request, scope="auth.reset_password", identifier=data.token[:16], limit=8, window_seconds=300)
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_reset_token(data.token))
    )
    reset_token = result.scalar_one_or_none()
    if not reset_token or reset_token.used_at is not None or reset_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = hash_password(data.new_password)
    reset_token.used_at = datetime.utcnow()
    db.add(user)
    db.add(reset_token)
    await write_audit_log(
        db,
        AuditEvent.password_reset_completed,
        request=request,
        actor=user,
        target_user_id=user.id,
        organization_id=user.organization_id,
    )
    await db.commit()
