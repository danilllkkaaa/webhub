from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.config import settings
from app.core.bunny import create_video, get_video, delete_video
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/admin/videos", tags=["videos"])


class CreateVideoRequest(BaseModel):
    title: str


class VideoUploadInfo(BaseModel):
    video_id: str
    upload_url: str
    access_key: str
    library_id: str


class VideoStatus(BaseModel):
    status: int
    encode_progress: int
    duration: Optional[float]
    ready: bool


@router.post("/create", response_model=VideoUploadInfo)
async def create_video_entry(
    data: CreateVideoRequest,
    _: User = Depends(get_current_user),
):
    if not settings.bunny_api_key or not settings.bunny_library_id:
        raise HTTPException(status_code=500, detail="Bunny not configured")
    video = await create_video(data.title)
    video_id = video["guid"]
    return VideoUploadInfo(
        video_id=video_id,
        upload_url=f"https://video.bunnycdn.com/library/{settings.bunny_library_id}/videos/{video_id}",
        access_key=settings.bunny_api_key,
        library_id=settings.bunny_library_id,
    )


@router.get("/{video_id}/status", response_model=VideoStatus)
async def video_status(
    video_id: str,
    _: User = Depends(get_current_user),
):
    video = await get_video(video_id)
    status = video.get("status", 0)
    # Bunny status: 0=Queued, 1=Processing, 2=Encoding, 3=Finished, 4=ResolutionError, 5=UploadError, 6=Failed
    return VideoStatus(
        status=status,
        encode_progress=video.get("encodeProgress", 0),
        duration=video.get("length"),
        ready=status == 3,
    )


@router.delete("/{video_id}", status_code=204)
async def delete_video_entry(
    video_id: str,
    _: User = Depends(get_current_user),
):
    try:
        await delete_video(video_id)
    except Exception:
        pass
