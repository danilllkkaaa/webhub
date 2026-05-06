from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import engine, AsyncSessionLocal
from app.config import settings
from app.core.security import hash_password, verify_password, generate_viewer_token
from app.models import User, Webinar

from app.routers import auth, webinars, registrations, watch, chat, timeline, analytics, public_webinar, broadcast, projects, courses, videos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed admin user and tokens
    async with AsyncSessionLocal() as db:
        # Generate invite tokens for webinars that don't have one
        result = await db.execute(select(Webinar).where(Webinar.invite_token.is_(None)))
        webinars_to_update = result.scalars().all()
        for webinar in webinars_to_update:
            webinar.invite_token = generate_viewer_token()

        # Seed admin
        result = await db.execute(select(User).where(User.email == settings.admin_email))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
            )
            db.add(admin)
        elif not admin.hashed_password or not verify_password(settings.admin_password, admin.hashed_password):
            admin.hashed_password = hash_password(settings.admin_password)

        await db.commit()

    yield


app = FastAPI(title="Webinar Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(webinars.router)
app.include_router(registrations.router)
app.include_router(watch.router)
app.include_router(chat.router)
app.include_router(timeline.router)
app.include_router(analytics.router)
app.include_router(public_webinar.router)
app.include_router(broadcast.router)
app.include_router(projects.router)
app.include_router(courses.router)
app.include_router(videos.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
