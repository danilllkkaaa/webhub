import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  Course,
  CourseLesson,
  CourseModule,
  CourseStatus,
  Quiz,
  QuizQuestionType,
  courseApi,
} from '../../api/courses'
import VideoUploader from '../../components/VideoUploader'
import { useLanguage } from '../../i18n/LanguageProvider'
import { Language } from '../../i18n/translations'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Settings,
  Trash2,
  Video,
  X,
} from 'lucide-react'

type EditorMode =
  | { type: 'course' }
  | { type: 'module'; id: number }
  | { type: 'lesson'; id: number }
  | { type: 'quiz'; moduleId: number }

type DraftOption = {
  id?: number
  text: string
  is_correct: boolean
  position: number
}

type DraftQuestion = {
  id?: number
  text: string
  question_type: QuizQuestionType
  position: number
  options: DraftOption[]
}

type DraftQuiz = {
  id?: number
  title: string
  description: string | null
  passing_score: number
  questions: DraftQuestion[]
}

const statusLabel: Record<CourseStatus, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
}

function systemTitle(value: string, language: Language) {
  const moduleMatch = value.match(/^Модуль\s+(\d+)$/)
  const lessonMatch = value.match(/^Урок\s+(\d+)$/)
  if (language === 'en') {
    if (moduleMatch) return `Module ${moduleMatch[1]}`
    if (lessonMatch) return `Lesson ${lessonMatch[1]}`
  }
  if (language === 'kk') {
    if (moduleMatch) return `Модуль ${moduleMatch[1]}`
    if (lessonMatch) return `Сабақ ${lessonMatch[1]}`
  }
  return value
}

function defaultModuleTitle(index: number, language: Language) {
  if (language === 'en') return `Module ${index}`
  return `Модуль ${index}`
}

function defaultLessonTitle(index: number, language: Language) {
  if (language === 'en') return `Lesson ${index}`
  if (language === 'kk') return `Сабақ ${index}`
  return `Урок ${index}`
}

function countLabel(count: number, unit: 'modules' | 'lessons', language: Language) {
  if (unit === 'modules') {
    if (language === 'en') return `${count} modules`
    if (language === 'kk') return `${count} модуль`
    return `${count} мод.`
  }
  if (language === 'en') return `${count} lessons`
  if (language === 'kk') return `${count} сабақ`
  return `${count} ур.`
}

const defaultQuestion = (position = 0): DraftQuestion => ({
  text: '',
  question_type: 'single',
  position,
  options: [
    { text: '', is_correct: true, position: 0 },
    { text: '', is_correct: false, position: 1 },
  ],
})

const emptyQuiz = (): DraftQuiz => ({
  title: 'Тест модуля',
  description: '',
  passing_score: 80,
  questions: [defaultQuestion()],
})

export default function CourseBuilderPage() {
  const { language, t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const courseRef = id ?? ''

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<CourseModule[]>([])
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<EditorMode>({ type: 'course' })

  const load = useCallback(async () => {
    const data = await courseApi.structure(courseRef)
    setCourse(data.course)
    setModules(data.modules)
    setLessons(data.lessons)
    setLoading(false)
  }, [courseRef])

  useEffect(() => {
    setLoading(true)
    load().catch(() => setLoading(false))
  }, [load])

  const lessonsByModule = useMemo(() => {
    const map: Record<number, CourseLesson[]> = {}
    lessons.forEach((lesson) => {
      map[lesson.module_id] = [...(map[lesson.module_id] ?? []), lesson]
    })
    return map
  }, [lessons])

  const selectedModule = mode.type === 'module' ? modules.find((item) => item.id === mode.id) : null
  const selectedLesson = mode.type === 'lesson' ? lessons.find((item) => item.id === mode.id) : null

  const createModule = async () => {
    if (!course) return
    setBusy(true)
    try {
      const module = await courseApi.createModule(course.public_id, {
        title: defaultModuleTitle(modules.length + 1, language),
        position: modules.length,
        is_published: true,
      })
      await load()
      setMode({ type: 'module', id: module.id })
    } finally {
      setBusy(false)
    }
  }

  const createLesson = async (moduleId: number) => {
    const moduleLessons = lessonsByModule[moduleId] ?? []
    setBusy(true)
    try {
      const lesson = await courseApi.createLesson(moduleId, {
        title: defaultLessonTitle(moduleLessons.length + 1, language),
        lesson_type: 'mixed',
        position: moduleLessons.length,
        is_published: true,
      })
      await load()
      setMode({ type: 'lesson', id: lesson.id })
    } finally {
      setBusy(false)
    }
  }

  const deleteModule = async (module: CourseModule) => {
    if (!confirm(`Удалить модуль "${module.title}" вместе со всеми уроками и тестом?`)) return
    await courseApi.deleteModule(module.id)
    setMode({ type: 'course' })
    await load()
  }

  const deleteLesson = async (lesson: CourseLesson) => {
    if (!confirm(`Удалить урок "${lesson.title}"?`)) return
    await courseApi.deleteLesson(lesson.id)
    setMode({ type: 'course' })
    await load()
  }

  const moveModule = async (index: number, direction: -1 | 1) => {
    const target = modules[index]
    const swap = modules[index + direction]
    if (!target || !swap) return
    await Promise.all([
      courseApi.updateModule(target.id, { position: swap.position }),
      courseApi.updateModule(swap.id, { position: target.position }),
    ])
    await load()
  }

  const moveLesson = async (moduleId: number, index: number, direction: -1 | 1) => {
    const moduleLessons = lessonsByModule[moduleId] ?? []
    const target = moduleLessons[index]
    const swap = moduleLessons[index + direction]
    if (!target || !swap) return
    await Promise.all([
      courseApi.updateLesson(target.id, { position: swap.position }),
      courseApi.updateLesson(swap.id, { position: target.position }),
    ])
    await load()
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-[420px] items-center justify-center text-gray-400">
          <Loader2 className="mr-2 animate-spin" size={18} /> {t('Загрузка конструктора')}
        </div>
      </AdminLayout>
    )
  }

  if (!course) {
    return (
      <AdminLayout>
        <div className="rounded-lg border bg-white p-8 text-sm text-gray-500">{t('Курс не найден.')}</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/admin/courses" className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand">
            <ArrowLeft size={14} /> {t('Курсы')}
          </Link>
          <h1 className="truncate text-2xl font-black text-gray-900">{course.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
            <span className="rounded-full bg-gray-100 px-2.5 py-1">{t(statusLabel[course.status])}</span>
            <span>{countLabel(modules.length, 'modules', language)}</span>
            <span>{countLabel(lessons.length, 'lessons', language)}</span>
            <span>{t(course.sequential_access ? 'Последовательно' : 'Свободный доступ')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode({ type: 'course' })}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <Settings size={16} /> {t('Настройки')}
          </button>
          <button
            onClick={createModule}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            <Plus size={16} /> {t('Модуль')}
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-170px)] min-h-[620px] grid-cols-[360px_minmax(0,1fr)] gap-5">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-gray-800">{t('Структура')}</h2>
              <button onClick={createModule} className="rounded-md p-1.5 text-brand hover:bg-brand/10" title={t('Добавить модуль')}>
                <Plus size={17} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <button
              onClick={() => setMode({ type: 'course' })}
              className={`mb-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold ${
                mode.type === 'course' ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings size={16} /> {t('Общие настройки')}
            </button>

            {modules.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-gray-400">
                {t('Добавьте первый модуль, затем наполните его уроками.')}
              </div>
            ) : null}

            <div className="space-y-3">
              {modules.map((module, moduleIndex) => {
                const moduleLessons = lessonsByModule[module.id] ?? []
                const activeModule = mode.type === 'module' && mode.id === module.id
                return (
                  <section key={module.id} className="rounded-lg border bg-white">
                    <div className={`border-b px-3 py-3 ${activeModule ? 'bg-brand/5' : 'bg-gray-50/70'}`}>
                      <button
                        onClick={() => setMode({ type: 'module', id: module.id })}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        <Layers className={activeModule ? 'text-brand' : 'text-gray-400'} size={17} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-black ${activeModule ? 'text-brand' : 'text-gray-900'}`}>
                            {systemTitle(module.title, language)}
                          </span>
                          <span className="mt-1 block text-[11px] font-bold text-gray-400">
                            {countLabel(moduleLessons.length, 'lessons', language)} · {t(module.quiz ? 'есть тест' : 'без теста')}
                          </span>
                        </span>
                        {module.is_published ? <Eye size={15} className="text-emerald-500" /> : <EyeOff size={15} className="text-gray-300" />}
                      </button>
                      <div className="mt-2 flex items-center gap-1">
                        <IconButton label={t('Выше')} disabled={moduleIndex === 0} onClick={() => moveModule(moduleIndex, -1)} icon={<ArrowUp size={14} />} />
                        <IconButton label={t('Ниже')} disabled={moduleIndex === modules.length - 1} onClick={() => moveModule(moduleIndex, 1)} icon={<ArrowDown size={14} />} />
                        <IconButton label={t('Урок')} onClick={() => createLesson(module.id)} icon={<Plus size={14} />} />
                        <IconButton label={t('Тест')} onClick={() => setMode({ type: 'quiz', moduleId: module.id })} icon={<HelpCircle size={14} />} />
                      </div>
                    </div>

                    <div className="space-y-1 p-2">
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const activeLesson = mode.type === 'lesson' && mode.id === lesson.id
                        return (
                          <div key={lesson.id} className={`flex items-center gap-1 rounded-md ${activeLesson ? 'bg-brand/10' : 'hover:bg-gray-50'}`}>
                            <button
                              onClick={() => setMode({ type: 'lesson', id: lesson.id })}
                              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-xs font-bold"
                            >
                              {lesson.bunny_video_id ? <Video size={14} className="text-blue-500" /> : <FileText size={14} className="text-gray-400" />}
                              <span className={`truncate ${activeLesson ? 'text-brand' : 'text-gray-600'}`}>{systemTitle(lesson.title, language)}</span>
                              {!lesson.is_published ? <EyeOff size={13} className="text-gray-300" /> : null}
                            </button>
                            <IconButton label={t('Выше')} disabled={lessonIndex === 0} onClick={() => moveLesson(module.id, lessonIndex, -1)} icon={<ArrowUp size={13} />} />
                            <IconButton label={t('Ниже')} disabled={lessonIndex === moduleLessons.length - 1} onClick={() => moveLesson(module.id, lessonIndex, 1)} icon={<ArrowDown size={13} />} />
                          </div>
                        )
                      })}
                      <button
                        onClick={() => createLesson(module.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-brand"
                      >
                        <Plus size={14} /> {t('Добавить урок')}
                      </button>
                      <button
                        onClick={() => setMode({ type: 'quiz', moduleId: module.id })}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-bold ${
                          mode.type === 'quiz' && mode.moduleId === module.id ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        <ClipboardList size={14} /> {t(module.quiz ? 'Редактировать тест' : 'Добавить тест')}
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="min-h-0 overflow-hidden rounded-lg border bg-white">
          {mode.type === 'course' ? <CourseEditor course={course} onSave={load} /> : null}
          {mode.type === 'module' && selectedModule ? (
            <ModuleEditor module={selectedModule} onSave={load} onDelete={() => deleteModule(selectedModule)} />
          ) : null}
          {mode.type === 'lesson' && selectedLesson ? (
            <LessonEditor lesson={selectedLesson} onSave={load} onDelete={() => deleteLesson(selectedLesson)} />
          ) : null}
          {mode.type === 'quiz' ? <QuizEditor moduleId={mode.moduleId} onSave={load} /> : null}
        </main>
      </div>
    </AdminLayout>
  )
}

function IconButton({ label, icon, disabled, onClick }: { label: string; icon: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {icon}
    </button>
  )
}

function PanelHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: React.ReactNode }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center justify-between gap-4 border-b bg-gray-50/70 px-6 py-4">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-gray-400">{t(eyebrow)}</p> : null}
        <h2 className="text-lg font-black text-gray-900">{t(title)}</h2>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

function SaveButton({ saving, color = 'brand' }: { saving: boolean; color?: 'brand' | 'orange' }) {
  const { t } = useLanguage()
  const colorClass = color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-brand hover:bg-brand-dark'
  return (
    <button
      type="submit"
      disabled={saving}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60 ${colorClass}`}
    >
      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {t(saving ? 'Сохранение' : 'Сохранить')}
    </button>
  )
}

function CourseEditor({ course, onSave }: { course: Course; onSave: () => void }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? '',
    status: course.status,
    sequential_access: course.sequential_access,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      title: course.title,
      description: course.description ?? '',
      status: course.status,
      sequential_access: course.sequential_access,
    })
  }, [course])

  const inviteLink = `${window.location.origin}/course/join/${course.invite_token}`

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await courseApi.update(course.public_id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        sequential_access: form.sequential_access,
      })
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex h-full flex-col">
      <PanelHeader title="Настройки курса" eyebrow="Общее" actions={<SaveButton saving={saving} />} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-6">
          <Field label={t('Название')}>
            <input
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="input-control"
            />
          </Field>
          <Field label={t('Описание')}>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="input-control min-h-32"
            />
          </Field>
          <Field label={t('Статус')}>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as CourseStatus })}
              className="input-control"
            >
              <option value="draft">{t('Черновик')}</option>
              <option value="published">{t('Опубликован')}</option>
              <option value="archived">{t('Архив')}</option>
            </select>
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50 p-4">
            <input
              type="checkbox"
              checked={form.sequential_access}
              onChange={(event) => setForm({ ...form, sequential_access: event.target.checked })}
              className="mt-0.5 h-5 w-5 accent-brand"
            />
            <span>
              <span className="block text-sm font-black text-gray-900">{t('Последовательное прохождение')}</span>
              <span className="mt-1 block text-sm text-gray-500">{t('Ученик не сможет завершать уроки и тесты, пока не прошёл предыдущие шаги.')}</span>
            </span>
          </label>
          <div className="rounded-lg border bg-white p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-gray-900">
              <LinkIcon size={16} className="text-brand" /> {t('Ссылка для заявки')}
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={inviteLink} className="input-control bg-gray-50 text-sm" />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
                className="rounded-lg border px-3 py-2 text-gray-600 hover:bg-gray-50"
                title={t('Скопировать')}
              >
                <Copy size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function ModuleEditor({ module, onSave, onDelete }: { module: CourseModule; onSave: () => void; onDelete: () => void }) {
  const { language, t } = useLanguage()
  const [form, setForm] = useState({
    title: systemTitle(module.title, language),
    description: module.description ?? '',
    is_published: module.is_published,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      title: systemTitle(module.title, language),
      description: module.description ?? '',
      is_published: module.is_published,
    })
  }, [module, language])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await courseApi.updateModule(module.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        is_published: form.is_published,
      })
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex h-full flex-col">
      <PanelHeader
        title="Модуль"
        eyebrow="Раздел курса"
        actions={
          <>
            <button type="button" onClick={onDelete} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title={t('Удалить')}>
              <Trash2 size={18} />
            </button>
            <SaveButton saving={saving} />
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-6">
          <Field label={t('Название модуля')}>
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input-control" />
          </Field>
          <Field label={t('Краткое описание')}>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="input-control min-h-28"
            />
          </Field>
          <VisibilityToggle checked={form.is_published} onChange={(checked) => setForm({ ...form, is_published: checked })} label={t('Модуль виден ученикам')} />
        </div>
      </div>
    </form>
  )
}

function LessonEditor({ lesson, onSave, onDelete }: { lesson: CourseLesson; onSave: () => void; onDelete: () => void }) {
  const { language, t } = useLanguage()
  const [form, setForm] = useState({
    title: systemTitle(lesson.title, language),
    content: lesson.content ?? '',
    bunny_video_id: lesson.bunny_video_id,
    lesson_type: lesson.lesson_type,
    is_published: lesson.is_published,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({
      title: systemTitle(lesson.title, language),
      content: lesson.content ?? '',
      bunny_video_id: lesson.bunny_video_id,
      lesson_type: lesson.lesson_type,
      is_published: lesson.is_published,
    })
  }, [lesson, language])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const hasVideo = Boolean(form.bunny_video_id)
      const hasText = Boolean(form.content.trim())
      await courseApi.updateLesson(lesson.id, {
        title: form.title.trim(),
        content: form.content.trim() || null,
        bunny_video_id: form.bunny_video_id,
        lesson_type: hasVideo && hasText ? 'mixed' : hasVideo ? 'video' : 'text',
        is_published: form.is_published,
      })
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex h-full flex-col">
      <PanelHeader
        title="Урок"
        eyebrow="Контент"
        actions={
          <>
            <button type="button" onClick={onDelete} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title={t('Удалить')}>
              <Trash2 size={18} />
            </button>
            <SaveButton saving={saving} />
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl space-y-7">
          <Field label={t('Название урока')}>
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input-control" />
          </Field>
          <VisibilityToggle checked={form.is_published} onChange={(checked) => setForm({ ...form, is_published: checked })} label={t('Урок виден ученикам')} />
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-gray-900">
              <Video size={17} className="text-blue-500" /> {t('Видео')}
            </h3>
            <VideoUploader
              key={lesson.id}
              title={form.title || t('Урок')}
              existingVideoId={form.bunny_video_id}
              onComplete={(videoId) => setForm((current) => ({ ...current, bunny_video_id: videoId }))}
            />
          </section>
          <Field label={t('Текст урока')}>
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder={language === 'en'
                ? '<h2>Heading</h2><p>Lesson material...</p>'
                : language === 'kk'
                  ? '<h2>Тақырып</h2><p>Сабақ материалы...</p>'
                  : '<h2>Заголовок</h2><p>Материал урока...</p>'}
              className="input-control min-h-[280px] font-mono text-sm"
            />
          </Field>
        </div>
      </div>
    </form>
  )
}

function QuizEditor({ moduleId, onSave }: { moduleId: number; onSave: () => void }) {
  const [quiz, setQuiz] = useState<DraftQuiz>(emptyQuiz())
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await courseApi.getQuiz(moduleId)
      setExists(true)
      setQuiz(toDraftQuiz(data))
    } catch {
      setExists(false)
      setQuiz(emptyQuiz())
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    load()
  }, [load])

  const errors = useMemo(() => validateQuiz(quiz), [quiz])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (errors.length > 0) return
    setSaving(true)
    try {
      const saved = await courseApi.updateQuiz(moduleId, {
        title: quiz.title.trim(),
        description: quiz.description?.trim() || null,
        passing_score: Number(quiz.passing_score),
        questions: quiz.questions.map((question, questionIndex) => ({
          text: question.text.trim(),
          question_type: question.question_type,
          position: questionIndex,
          options: question.options.map((option, optionIndex) => ({
            text: option.text.trim(),
            is_correct: option.is_correct,
            position: optionIndex,
          })),
        })),
      })
      setExists(true)
      setQuiz(toDraftQuiz(saved))
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!exists) {
      setQuiz(emptyQuiz())
      return
    }
    if (!confirm('Удалить тест модуля?')) return
    await courseApi.deleteQuiz(moduleId)
    setExists(false)
    setQuiz(emptyQuiz())
    await onSave()
  }

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((question, questionIndex) => {
        if (questionIndex !== index) return question
        const next = { ...question, ...patch }
        if (patch.question_type === 'single') {
          next.options = next.options.map((option, optionIndex) => ({ ...option, is_correct: optionIndex === 0 }))
        }
        return next
      }),
    })
  }

  const updateOption = (questionIndex: number, optionIndex: number, patch: Partial<DraftOption>) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((question, currentQuestionIndex) => {
        if (currentQuestionIndex !== questionIndex) return question
        return {
          ...question,
          options: question.options.map((option, currentOptionIndex) => {
            if (currentOptionIndex !== optionIndex) {
              if (patch.is_correct && question.question_type === 'single') return { ...option, is_correct: false }
              return option
            }
            return { ...option, ...patch }
          }),
        }
      }),
    })
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Загрузка теста...</div>
  }

  return (
    <form onSubmit={save} className="flex h-full flex-col">
      <PanelHeader
        title={exists ? 'Тест модуля' : 'Новый тест'}
        eyebrow="Проверка знаний"
        actions={
          <>
            <button type="button" onClick={remove} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title={exists ? 'Удалить' : 'Очистить'}>
              <Trash2 size={18} />
            </button>
            <SaveButton saving={saving} color="orange" />
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl space-y-6">
          <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-4">
            <Field label="Название теста">
              <input value={quiz.title} onChange={(event) => setQuiz({ ...quiz, title: event.target.value })} className="input-control" />
            </Field>
            <Field label="Проходной балл">
              <input
                type="number"
                min={1}
                max={100}
                value={quiz.passing_score}
                onChange={(event) => setQuiz({ ...quiz, passing_score: Number(event.target.value) })}
                className="input-control"
              />
            </Field>
          </div>
          <Field label="Описание">
            <textarea
              value={quiz.description ?? ''}
              onChange={(event) => setQuiz({ ...quiz, description: event.target.value })}
              className="input-control min-h-20"
            />
          </Field>

          {errors.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              {errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={17} /> Тест готов к сохранению.
            </div>
          )}

          <div className="space-y-4 pb-10">
            {quiz.questions.map((question, questionIndex) => (
              <section key={questionIndex} className="rounded-lg border bg-white p-5">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-sm font-black text-white">
                    {questionIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <input
                      value={question.text}
                      onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
                      placeholder="Введите вопрос"
                      className="w-full border-b-2 border-gray-100 py-1 text-base font-black outline-none focus:border-brand"
                    />
                    <select
                      value={question.question_type}
                      onChange={(event) => updateQuestion(questionIndex, { question_type: event.target.value as QuizQuestionType })}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 outline-none"
                    >
                      <option value="single">Один правильный ответ</option>
                      <option value="multiple">Несколько правильных ответов</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuiz({ ...quiz, questions: quiz.questions.filter((_, index) => index !== questionIndex) })}
                    className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    title="Удалить вопрос"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-2 pl-12">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateOption(questionIndex, optionIndex, { is_correct: !option.is_correct })}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          option.is_correct ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                        }`}
                        title="Правильный ответ"
                      >
                        {option.is_correct ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </button>
                      <input
                        value={option.text}
                        onChange={(event) => updateOption(questionIndex, optionIndex, { text: event.target.value })}
                        placeholder={`Вариант ${optionIndex + 1}`}
                        className="input-control h-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(questionIndex, {
                            options: question.options.filter((_, index) => index !== optionIndex),
                          })
                        }
                        className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                        title="Удалить вариант"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(questionIndex, {
                        options: [...question.options, { text: '', is_correct: false, position: question.options.length }],
                      })
                    }
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
                  >
                    <Plus size={15} /> Вариант
                  </button>
                </div>
              </section>
            ))}
            <button
              type="button"
              onClick={() => setQuiz({ ...quiz, questions: [...quiz.questions, defaultQuestion(quiz.questions.length)] })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-sm font-black text-gray-400 hover:border-brand hover:text-brand"
            >
              <Plus size={18} /> Добавить вопрос
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-black text-gray-800">{label}</span>
      {children}
    </label>
  )
}

function VisibilityToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border bg-gray-50 p-4">
      <span className="flex items-center gap-3 text-sm font-black text-gray-900">
        {checked ? <Eye size={17} className="text-emerald-500" /> : <EyeOff size={17} className="text-gray-400" />}
        {label}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-brand" />
    </label>
  )
}

function toDraftQuiz(quiz: Quiz): DraftQuiz {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passing_score: quiz.passing_score,
    questions: (quiz.questions ?? []).map((question, questionIndex) => ({
      id: question.id,
      text: question.text,
      question_type: question.question_type,
      position: question.position ?? questionIndex,
      options: question.options.map((option, optionIndex) => ({
        id: option.id,
        text: option.text,
        is_correct: Boolean(option.is_correct),
        position: option.position ?? optionIndex,
      })),
    })),
  }
}

function validateQuiz(quiz: DraftQuiz): string[] {
  const errors: string[] = []
  if (!quiz.title.trim()) errors.push('Укажите название теста.')
  if (quiz.passing_score < 1 || quiz.passing_score > 100) errors.push('Проходной балл должен быть от 1 до 100.')
  if (quiz.questions.length === 0) errors.push('Добавьте хотя бы один вопрос.')

  quiz.questions.forEach((question, questionIndex) => {
    const label = `Вопрос ${questionIndex + 1}`
    if (!question.text.trim()) errors.push(`${label}: заполните текст вопроса.`)
    if (question.options.length < 2) errors.push(`${label}: нужно минимум два варианта ответа.`)

    const filledOptions = question.options.filter((option) => option.text.trim())
    if (filledOptions.length !== question.options.length) errors.push(`${label}: заполните все варианты ответа.`)

    const correctCount = question.options.filter((option) => option.is_correct).length
    if (question.question_type === 'single' && correctCount !== 1) errors.push(`${label}: выберите один правильный ответ.`)
    if (question.question_type === 'multiple' && correctCount < 1) errors.push(`${label}: выберите хотя бы один правильный ответ.`)
  })

  return errors
}
