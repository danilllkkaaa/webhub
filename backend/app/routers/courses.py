from datetime import datetime
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

from app.database import get_db
from app.models.user import User
from app.models.course import Course, CourseModule, CourseLesson, CourseStudent, CourseLessonProgress, CourseStatus, CourseStudentStatus
from app.schemas.course import (
    CourseCreate, CourseUpdate, CourseOut, CourseStructureOut,
    ModuleCreate, ModuleUpdate, ModuleOut,
    LessonCreate, LessonUpdate, LessonOut,
    CourseJoinRequest, CourseStudentOut, CourseLearnOut,
)
from app.core.dependencies import get_current_user
from app.core.security import generate_viewer_token
from app.core.youtube import extract_video_id

router = APIRouter(tags=["courses"])


async def _unique_slug(title: str, db: AsyncSession) -> str:
    base = slugify(title) or "course"
    slug = base
    i = 1
    while True:
        result = await db.execute(select(Course).where(Course.slug == slug))
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base}-{i}"
        i += 1


async def _course_or_404(course_id: int, db: AsyncSession) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


async def _course_out(course: Course, db: AsyncSession) -> CourseOut:
    module_count = (await db.execute(select(func.count(CourseModule.id)).where(CourseModule.course_id == course.id))).scalar() or 0
    lesson_count = (
        await db.execute(
            select(func.count(CourseLesson.id))
            .join(CourseModule, CourseLesson.module_id == CourseModule.id)
            .where(CourseModule.course_id == course.id)
        )
    ).scalar() or 0
    student_count = (await db.execute(select(func.count(CourseStudent.id)).where(CourseStudent.course_id == course.id))).scalar() or 0
    return CourseOut(
        id=course.id,
        project_id=course.project_id,
        slug=course.slug,
        invite_token=course.invite_token,
        title=course.title,
        description=course.description,
        cover_url=course.cover_url,
        status=course.status,
        module_count=module_count,
        lesson_count=lesson_count,
        student_count=student_count,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


async def _student_out(student: CourseStudent, db: AsyncSession) -> CourseStudentOut:
    total = (
        await db.execute(
            select(func.count(CourseLesson.id))
            .join(CourseModule, CourseLesson.module_id == CourseModule.id)
            .where(CourseModule.course_id == student.course_id)
            .where(CourseModule.is_published.is_(True))
            .where(CourseLesson.is_published.is_(True))
        )
    ).scalar() or 0
    completed = (
        await db.execute(
            select(func.count(distinct(CourseLessonProgress.lesson_id))).where(CourseLessonProgress.student_id == student.id)
        )
    ).scalar() or 0
    percent = round(completed / total * 100, 1) if total else 0
    return CourseStudentOut(
        id=student.id,
        course_id=student.course_id,
        token=student.token,
        name=student.name,
        phone=student.phone,
        email=student.email,
        telegram=student.telegram,
        status=student.status,
        progress_percent=percent,
        completed_lessons=completed,
        total_lessons=total,
        created_at=student.created_at,
        last_seen_at=student.last_seen_at,
    )


@router.get("/courses/", response_model=list[CourseOut])
async def list_courses(
    project_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Course).order_by(Course.created_at.desc())
    if project_id:
        query = query.where(Course.project_id == project_id)
    result = await db.execute(query)
    return [await _course_out(course, db) for course in result.scalars().all()]


@router.post("/courses/", response_model=CourseOut, status_code=201)
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    course = Course(
        project_id=data.project_id,
        slug=await _unique_slug(data.title, db),
        invite_token=generate_viewer_token(),
        title=data.title.strip(),
        description=data.description,
        cover_url=data.cover_url,
        status=data.status,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return await _course_out(course, db)


@router.get("/courses/{course_id}", response_model=CourseOut)
async def get_course(course_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    return await _course_out(await _course_or_404(course_id, db), db)


@router.patch("/courses/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    data: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    course = await _course_or_404(course_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    await db.commit()
    await db.refresh(course)
    return await _course_out(course, db)


@router.delete("/courses/{course_id}", status_code=204)
async def delete_course(course_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    course = await _course_or_404(course_id, db)
    await db.delete(course)
    await db.commit()


@router.get("/courses/{course_id}/structure", response_model=CourseStructureOut)
async def course_structure(course_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    course = await _course_or_404(course_id, db)
    modules = (await db.execute(select(CourseModule).where(CourseModule.course_id == course_id).order_by(CourseModule.position, CourseModule.id))).scalars().all()
    lessons = (
        await db.execute(
            select(CourseLesson)
            .join(CourseModule, CourseLesson.module_id == CourseModule.id)
            .where(CourseModule.course_id == course_id)
            .order_by(CourseModule.position, CourseLesson.position, CourseLesson.id)
        )
    ).scalars().all()
    return CourseStructureOut(course=await _course_out(course, db), modules=modules, lessons=lessons)


@router.post("/courses/{course_id}/modules", response_model=ModuleOut, status_code=201)
async def create_module(course_id: int, data: ModuleCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    await _course_or_404(course_id, db)
    module = CourseModule(course_id=course_id, **data.model_dump())
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


@router.patch("/courses/modules/{module_id}", response_model=ModuleOut)
async def update_module(module_id: int, data: ModuleUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    module = (await db.execute(select(CourseModule).where(CourseModule.id == module_id))).scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(module, field, value)
    await db.commit()
    await db.refresh(module)
    return module


@router.delete("/courses/modules/{module_id}", status_code=204)
async def delete_module(module_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    module = (await db.execute(select(CourseModule).where(CourseModule.id == module_id))).scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    await db.delete(module)
    await db.commit()


@router.post("/courses/modules/{module_id}/lessons", response_model=LessonOut, status_code=201)
async def create_lesson(module_id: int, data: LessonCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    module = (await db.execute(select(CourseModule).where(CourseModule.id == module_id))).scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    payload = data.model_dump()
    payload["video_id"] = extract_video_id(payload["video_url"]) if payload.get("video_url") else None
    lesson = CourseLesson(module_id=module_id, **payload)
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.patch("/courses/lessons/{lesson_id}", response_model=LessonOut)
async def update_lesson(lesson_id: int, data: LessonUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    lesson = (await db.execute(select(CourseLesson).where(CourseLesson.id == lesson_id))).scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    update_data = data.model_dump(exclude_unset=True)
    if "video_url" in update_data:
        update_data["video_id"] = extract_video_id(update_data["video_url"]) if update_data["video_url"] else None
    for field, value in update_data.items():
        setattr(lesson, field, value)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/courses/lessons/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    lesson = (await db.execute(select(CourseLesson).where(CourseLesson.id == lesson_id))).scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await db.delete(lesson)
    await db.commit()


@router.get("/courses/{course_id}/students", response_model=list[CourseStudentOut])
async def list_students(course_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    await _course_or_404(course_id, db)
    result = await db.execute(select(CourseStudent).where(CourseStudent.course_id == course_id).order_by(CourseStudent.created_at.desc()))
    return [await _student_out(student, db) for student in result.scalars().all()]


@router.get("/courses/{course_id}/students/export.xlsx")
async def export_students_xlsx(course_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    await _course_or_404(course_id, db)
    result = await db.execute(select(CourseStudent).where(CourseStudent.course_id == course_id).order_by(CourseStudent.created_at))
    students = [await _student_out(student, db) for student in result.scalars().all()]

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Ученики"
    headers = ["ФИО", "Телефон", "Email", "Telegram", "Прогресс", "Пройдено уроков", "Всего уроков", "Дата входа", "Последний вход"]
    sheet.append(headers)
    for cell in sheet[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="EEF2FF")
    for s in students:
        sheet.append([
            s.name, s.phone, s.email, s.telegram, f"{s.progress_percent}%",
            s.completed_lessons, s.total_lessons,
            s.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            s.last_seen_at.strftime("%Y-%m-%d %H:%M:%S") if s.last_seen_at else "",
        ])
    for index, width in enumerate([32, 20, 32, 22, 14, 18, 14, 22, 22], start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="course_students_{course_id}.xlsx"'},
    )


@router.get("/course/invite/{invite_token}", response_model=CourseOut)
async def public_course_invite(invite_token: str, db: AsyncSession = Depends(get_db)):
    course = (await db.execute(select(Course).where(Course.invite_token == invite_token))).scalar_one_or_none()
    if not course or course.status == CourseStatus.archived:
        raise HTTPException(status_code=404, detail="Course not found")
    return await _course_out(course, db)


@router.post("/course/invite/{invite_token}/join", response_model=CourseStudentOut, status_code=201)
async def join_course(invite_token: str, data: CourseJoinRequest, db: AsyncSession = Depends(get_db)):
    course = (await db.execute(select(Course).where(Course.invite_token == invite_token))).scalar_one_or_none()
    if not course or course.status == CourseStatus.archived:
        raise HTTPException(status_code=404, detail="Course not found")
    student = CourseStudent(
        course_id=course.id,
        token=generate_viewer_token(),
        name=data.name.strip(),
        phone=data.phone.strip(),
        email=str(data.email),
        telegram=data.telegram,
        last_seen_at=datetime.utcnow(),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return await _student_out(student, db)


@router.get("/course/{slug}/learn", response_model=CourseLearnOut)
async def learn_course(slug: str, token: str, db: AsyncSession = Depends(get_db)):
    course = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    student = (await db.execute(select(CourseStudent).where(CourseStudent.course_id == course.id, CourseStudent.token == token))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=403, detail="Invalid token")
    student.last_seen_at = datetime.utcnow()
    modules = (await db.execute(select(CourseModule).where(CourseModule.course_id == course.id, CourseModule.is_published.is_(True)).order_by(CourseModule.position, CourseModule.id))).scalars().all()
    lessons = (
        await db.execute(
            select(CourseLesson)
            .join(CourseModule, CourseLesson.module_id == CourseModule.id)
            .where(CourseModule.course_id == course.id)
            .where(CourseModule.is_published.is_(True))
            .where(CourseLesson.is_published.is_(True))
            .order_by(CourseModule.position, CourseLesson.position, CourseLesson.id)
        )
    ).scalars().all()
    completed = (await db.execute(select(CourseLessonProgress.lesson_id).where(CourseLessonProgress.student_id == student.id))).scalars().all()
    await db.commit()
    return CourseLearnOut(
        course=await _course_out(course, db),
        student=await _student_out(student, db),
        modules=modules,
        lessons=lessons,
        completed_lesson_ids=list(completed),
    )


@router.post("/course/lessons/{lesson_id}/complete")
async def complete_lesson(lesson_id: int, token: str, db: AsyncSession = Depends(get_db)):
    lesson = (await db.execute(select(CourseLesson).where(CourseLesson.id == lesson_id))).scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    module = (await db.execute(select(CourseModule).where(CourseModule.id == lesson.module_id))).scalar_one()
    student = (await db.execute(select(CourseStudent).where(CourseStudent.course_id == module.course_id, CourseStudent.token == token))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=403, detail="Invalid token")
    exists = (
        await db.execute(select(CourseLessonProgress).where(CourseLessonProgress.student_id == student.id, CourseLessonProgress.lesson_id == lesson_id))
    ).scalar_one_or_none()
    if not exists:
        db.add(CourseLessonProgress(student_id=student.id, lesson_id=lesson_id))
    student.last_seen_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


@router.patch("/courses/students/{student_id}", response_model=CourseStudentOut)
async def update_student_status(
    student_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    student = (await db.execute(select(CourseStudent).where(CourseStudent.id == student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if "status" in data:
        student.status = CourseStudentStatus(data["status"])
    await db.commit()
    await db.refresh(student)
    return await _student_out(student, db)
