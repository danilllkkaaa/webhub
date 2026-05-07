from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from app.models.course import CourseStatus, LessonType, CourseStudentStatus, QuizQuestionType


# --- Course ---
class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    status: CourseStatus = CourseStatus.draft
    project_id: Optional[int] = None
    sequential_access: bool = True


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    status: Optional[CourseStatus] = None
    sequential_access: Optional[bool] = None


class CourseOut(BaseModel):
    id: int
    public_id: str
    project_id: Optional[int]
    slug: str
    invite_token: str
    title: str
    description: Optional[str]
    cover_url: Optional[str]
    status: CourseStatus
    sequential_access: bool
    module_count: int = 0
    lesson_count: int = 0
    student_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Quiz ---
class QuizOptionCreate(BaseModel):
    text: str
    is_correct: bool = False
    position: int = 0


class QuizOptionOut(BaseModel):
    id: int
    text: str
    is_correct: bool
    position: int

    model_config = {"from_attributes": True}


class QuizQuestionCreate(BaseModel):
    text: str
    question_type: QuizQuestionType = QuizQuestionType.single
    position: int = 0
    options: List[QuizOptionCreate]


class QuizQuestionOut(BaseModel):
    id: int
    text: str
    question_type: QuizQuestionType
    position: int
    options: List[QuizOptionOut]

    model_config = {"from_attributes": True}


class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    passing_score: int = Field(default=80, ge=1, le=100)
    questions: List[QuizQuestionCreate]


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    passing_score: Optional[int] = None


class QuizOut(BaseModel):
    id: int
    module_id: int
    title: str
    description: Optional[str]
    passing_score: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuizFullOut(QuizOut):
    questions: List[QuizQuestionOut]


class QuizOptionPublicOut(BaseModel):
    id: int
    text: str
    position: int

    model_config = {"from_attributes": True}


class QuizQuestionPublicOut(BaseModel):
    id: int
    text: str
    question_type: QuizQuestionType
    position: int
    options: List[QuizOptionPublicOut]

    model_config = {"from_attributes": True}


class QuizPublicOut(QuizOut):
    questions: List[QuizQuestionPublicOut]


class QuizAttemptCreate(BaseModel):
    answers: dict[str, List[int]]  # question_id -> list of option_ids


class QuizAttemptOut(BaseModel):
    id: int
    score: int
    passed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Module ---
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
    quiz: Optional[QuizOut] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ModuleLearnOut(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    position: int
    is_published: bool
    quiz: Optional[QuizPublicOut] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Lesson ---
class LessonCreate(BaseModel):
    title: str
    lesson_type: LessonType = LessonType.mixed
    bunny_video_id: Optional[str] = None
    content: Optional[str] = None
    position: int = 0
    is_published: bool = True


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    lesson_type: Optional[LessonType] = None
    bunny_video_id: Optional[str] = None
    content: Optional[str] = None
    position: Optional[int] = None
    is_published: Optional[bool] = None


class LessonOut(BaseModel):
    id: int
    module_id: int
    title: str
    lesson_type: LessonType
    video_id: Optional[str]
    bunny_video_id: Optional[str]
    content: Optional[str]
    position: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- UI & Auth ---
class CourseStructureOut(BaseModel):
    course: CourseOut
    modules: List[ModuleOut]
    lessons: List[LessonOut]


class CourseJoinRequest(BaseModel):
    name: str
    phone: str
    email: EmailStr
    password: str = Field(min_length=6)
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
    modules: List[ModuleLearnOut]
    lessons: List[LessonOut]
    completed_lesson_ids: List[int]
    passed_quiz_ids: List[int] = []
    quiz_count: int = 0
    avg_quiz_score: Optional[float] = None
