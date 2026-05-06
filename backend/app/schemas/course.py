from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.models.course import CourseStatus, LessonType, CourseStudentStatus


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    status: CourseStatus = CourseStatus.draft
    project_id: Optional[int] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    status: Optional[CourseStatus] = None


class CourseOut(BaseModel):
    id: int
    project_id: Optional[int]
    slug: str
    invite_token: str
    title: str
    description: Optional[str]
    cover_url: Optional[str]
    status: CourseStatus
    module_count: int = 0
    lesson_count: int = 0
    student_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    position: int = 0
    is_published: bool = True


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None
    is_published: Optional[bool] = None


class ModuleOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    position: int
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LessonCreate(BaseModel):
    title: str
    lesson_type: LessonType = LessonType.video
    video_url: Optional[str] = None
    bunny_video_id: Optional[str] = None
    content: Optional[str] = None
    position: int = 0
    is_published: bool = True


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    lesson_type: Optional[LessonType] = None
    video_url: Optional[str] = None
    bunny_video_id: Optional[str] = None
    content: Optional[str] = None
    position: Optional[int] = None
    is_published: Optional[bool] = None


class LessonOut(BaseModel):
    id: int
    module_id: int
    title: str
    lesson_type: LessonType
    video_url: Optional[str]
    video_id: Optional[str]
    bunny_video_id: Optional[str]
    content: Optional[str]
    position: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseStructureOut(BaseModel):
    course: CourseOut
    modules: list[ModuleOut]
    lessons: list[LessonOut]


class CourseJoinRequest(BaseModel):
    name: str
    phone: str
    email: EmailStr
    telegram: Optional[str] = None


class CourseStudentOut(BaseModel):
    id: int
    course_id: int
    token: str
    name: str
    phone: str
    email: str
    telegram: Optional[str]
    status: CourseStudentStatus = CourseStudentStatus.pending
    progress_percent: float = 0
    completed_lessons: int = 0
    total_lessons: int = 0
    created_at: datetime
    last_seen_at: Optional[datetime]

    model_config = {"from_attributes": True}


class CourseLearnOut(BaseModel):
    course: CourseOut
    student: CourseStudentOut
    modules: list[ModuleOut]
    lessons: list[LessonOut]
    completed_lesson_ids: list[int]
