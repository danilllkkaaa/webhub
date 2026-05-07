import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Award, CheckCircle2, ChevronRight, GraduationCap, HelpCircle, LayoutDashboard, Lock, Menu, PlayCircle, X } from 'lucide-react'
import { courseApi, CourseLearn, CourseLesson, Quiz } from '../../api/courses'
import BunnyPlayer from '../../components/BunnyPlayer'
import { sanitizeHtml } from '../../utils/sanitize'

export default function CourseLearnPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [data, setData] = useState<CourseLearn | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null)
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [courseCompleted, setCourseCompleted] = useState(false)

  const load = async () => {
    if (!slug || !token) return
    try {
      const response = await courseApi.learn(slug, token)
      setData(response)
      if (!currentLesson && !currentQuiz && !courseCompleted && response.lessons.length > 0) {
        const firstIncomplete = response.lessons.find((lesson) => !response.completed_lesson_ids.includes(lesson.id))
        setCurrentLesson(firstIncomplete || response.lessons[0])
      }
    } catch {
      navigate('/student/dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!slug || !token) {
      navigate('/student/dashboard')
      return
    }
    load()
  }, [slug, token])

  const nextModuleWithSteps = (moduleIndex: number, source: CourseLearn) =>
    source.modules.slice(moduleIndex + 1).find((module) => {
      const hasLessons = source.lessons.some((lesson) => lesson.module_id === module.id)
      return hasLessons || Boolean(module.quiz)
    })

  const isFinalLesson = () => {
    if (!data || !currentLesson) return false
    const moduleIndex = data.modules.findIndex((module) => module.id === currentLesson.module_id)
    const moduleLessons = data.lessons.filter((lesson) => lesson.module_id === currentLesson.module_id)
    const lessonIndex = moduleLessons.findIndex((lesson) => lesson.id === currentLesson.id)
    return lessonIndex === moduleLessons.length - 1 && !data.modules[moduleIndex]?.quiz && !nextModuleWithSteps(moduleIndex, data)
  }

  const isFinalQuiz = (quiz: Quiz) => {
    if (!data) return false
    const moduleIndex = data.modules.findIndex((module) => module.quiz?.id === quiz.id)
    return moduleIndex !== -1 && !nextModuleWithSteps(moduleIndex, data)
  }

  const completeAndNext = async () => {
    if (!currentLesson || !token || !data) return
    await courseApi.completeLesson(currentLesson.id, token)

    const moduleIndex = data.modules.findIndex((module) => module.id === currentLesson.module_id)
    const moduleLessons = data.lessons.filter((lesson) => lesson.module_id === currentLesson.module_id)
    const lessonIndex = moduleLessons.findIndex((lesson) => lesson.id === currentLesson.id)

    if (lessonIndex < moduleLessons.length - 1) {
      setCurrentLesson(moduleLessons[lessonIndex + 1])
      setCurrentQuiz(null)
    } else if (data.modules[moduleIndex]?.quiz) {
      setCurrentLesson(null)
      setCurrentQuiz(data.modules[moduleIndex].quiz)
    } else {
      const nextModule = nextModuleWithSteps(moduleIndex, data)
      if (nextModule) {
        const nextLessons = data.lessons.filter((lesson) => lesson.module_id === nextModule.id)
        setCurrentLesson(nextLessons[0] ?? null)
        setCurrentQuiz(nextLessons.length > 0 ? null : nextModule.quiz)
      } else {
        setCurrentLesson(null)
        setCurrentQuiz(null)
        setCourseCompleted(true)
      }
    }

    await load()
  }

  const isLessonLocked = (lesson: CourseLesson) => {
    if (!data?.course.sequential_access) return false
    const index = data.lessons.findIndex((item) => item.id === lesson.id)
    if (index <= 0) return false
    return !data.completed_lesson_ids.includes(data.lessons[index - 1].id)
  }

  const isQuizLocked = (moduleId: number) => {
    if (!data?.course.sequential_access) return false
    const moduleLessons = data.lessons.filter((lesson) => lesson.module_id === moduleId)
    if (moduleLessons.length === 0) return false
    return !data.completed_lesson_ids.includes(moduleLessons[moduleLessons.length - 1].id)
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Подготовка учебного места...</div>
  if (!data) return null

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {!courseCompleted && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-2xl lg:hidden"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      )}

      {!courseCompleted && (
        <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-gray-50 transition-all duration-300 lg:static`}>
          <div className="flex shrink-0 items-center justify-between border-b bg-white p-6">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
                <GraduationCap size={18} />
              </div>
              <h2 className="truncate text-sm font-black tracking-tight">{data.course.title}</h2>
            </div>
            <button onClick={() => navigate('/student/dashboard')} title="В кабинет" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <LayoutDashboard size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {data.modules.map((module, moduleIndex) => (
              <div key={module.id} className="border-b border-gray-100">
                <div className="flex items-center gap-3 bg-gray-100/50 px-6 py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Модуль {moduleIndex + 1}</span>
                  <h3 className="truncate text-xs font-bold text-gray-900">{module.title}</h3>
                </div>
                <div className="space-y-1 p-2">
                  {data.lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => {
                    const locked = isLessonLocked(lesson)
                    const completed = data.completed_lesson_ids.includes(lesson.id)
                    const active = currentLesson?.id === lesson.id

                    return (
                      <button
                        key={lesson.id}
                        disabled={locked}
                        onClick={() => {
                          setCurrentQuiz(null)
                          setCurrentLesson(lesson)
                          if (window.innerWidth < 1024) setIsSidebarOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${active ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'hover:bg-white'} ${locked ? 'cursor-not-allowed opacity-40 grayscale' : ''}`}
                      >
                        <div className={`shrink-0 ${active ? 'text-white' : completed ? 'text-green-500' : 'text-gray-300'}`}>
                          {completed ? <CheckCircle2 size={18} /> : locked ? <Lock size={18} /> : <PlayCircle size={18} />}
                        </div>
                        <span className={`truncate text-xs font-bold ${active ? 'text-white' : 'text-gray-700'}`}>{lesson.title}</span>
                      </button>
                    )
                  })}

                  {module.quiz ? (
                    <button
                      disabled={isQuizLocked(module.id)}
                      onClick={() => {
                        setCurrentLesson(null)
                        setCurrentQuiz(module.quiz)
                        if (window.innerWidth < 1024) setIsSidebarOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${currentQuiz?.id === module.quiz.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-orange-600 hover:bg-orange-50'} ${isQuizLocked(module.id) ? 'cursor-not-allowed opacity-40 grayscale' : ''}`}
                    >
                      <div className={`shrink-0 ${currentQuiz?.id === module.quiz.id ? 'text-white' : data.passed_quiz_ids.includes(module.quiz.id) ? 'text-green-500' : 'text-orange-400'}`}>
                        {data.passed_quiz_ids.includes(module.quiz.id) ? <CheckCircle2 size={18} /> : isQuizLocked(module.id) ? <Lock size={18} /> : <HelpCircle size={18} />}
                      </div>
                      <span className="text-xs font-bold">Тест модуля</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white">
          {courseCompleted ? (
            <CourseCompletedView data={data} onDashboard={() => navigate('/student/dashboard')} />
          ) : currentLesson ? (
            <LessonView
              data={data}
              lesson={currentLesson}
              isFinal={isFinalLesson()}
              onComplete={completeAndNext}
            />
          ) : currentQuiz ? (
            <QuizTakingView
              quiz={currentQuiz}
              token={token!}
              onCompleted={async (passed) => {
                await load()
                if (passed && isFinalQuiz(currentQuiz)) {
                  setCurrentLesson(null)
                  setCurrentQuiz(null)
                  setCourseCompleted(true)
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">Выберите урок для начала обучения</div>
          )}
        </div>
      </main>
    </div>
  )
}

function LessonView({ data, lesson, isFinal, onComplete }: { data: CourseLearn; lesson: CourseLesson; isFinal: boolean; onComplete: () => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> Сейчас изучаем
        </div>
        <h1 className="text-3xl font-black leading-tight tracking-tight text-gray-900 md:text-4xl">{lesson.title}</h1>
      </div>

      {lesson.bunny_video_id ? (
        <div className="aspect-video overflow-hidden rounded-3xl border-4 border-white bg-black shadow-2xl shadow-gray-200">
          <BunnyPlayer videoId={lesson.bunny_video_id} />
        </div>
      ) : null}

      {lesson.content ? (
        <div
          className="prose prose-brand max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-gray-600"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }}
        />
      ) : null}

      <div className="flex items-center justify-between border-t pt-10">
        <div className="hidden sm:block">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Прогресс курса</p>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-brand" style={{ width: `${data.student.progress_percent}%` }} />
            </div>
            <span className="text-sm font-black text-gray-900">{Math.round(data.student.progress_percent)}%</span>
          </div>
        </div>
        <button onClick={onComplete} className="group flex items-center gap-3 rounded-2xl bg-gray-900 px-8 py-4 font-black text-white shadow-xl shadow-gray-200 transition-all hover:bg-brand">
          {isFinal ? 'Завершить' : 'Завершить и далее'}
          {!isFinal ? <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" /> : null}
        </button>
      </div>
      <div className="h-20" />
    </div>
  )
}

function CourseCompletedView({ data, onDashboard }: { data: CourseLearn; onDashboard: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/25">
          <Award size={48} />
        </div>
        <h1 className="mb-3 text-4xl font-black tracking-tight text-gray-900">Поздравляем с завершением курса!</h1>
        <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-gray-500">
          Вы прошли все доступные материалы курса «{data.course.title}».
        </p>

        {data.quiz_count > 0 && data.avg_quiz_score !== null ? (
          <div className="mx-auto mb-8 max-w-sm rounded-2xl border bg-white p-6 shadow-sm">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-gray-400">Средняя оценка по тестам</p>
            <p className="text-5xl font-black text-emerald-600">{Math.round(data.avg_quiz_score)}%</p>
          </div>
        ) : null}

        <button onClick={onDashboard} className="inline-flex items-center gap-3 rounded-2xl bg-gray-900 px-8 py-4 font-black text-white shadow-xl shadow-gray-200 transition-all hover:bg-brand">
          <LayoutDashboard size={20} /> Вернуться на главную
        </button>
      </div>
    </div>
  )
}

function QuizTakingView({ quiz, token, onCompleted }: { quiz: Quiz; token: string; onCompleted: (passed: boolean) => void | Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const toggleOption = (questionId: number, optionId: number, isMultiple: boolean) => {
    setAnswers((previous) => {
      const key = String(questionId)
      const current = previous[key] || []
      if (isMultiple) {
        return { ...previous, [key]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId] }
      }
      return { ...previous, [key]: [optionId] }
    })
  }

  const submit = async () => {
    if (!confirm('Отправить ответы на проверку?')) return
    setSubmitting(true)
    try {
      const response = await courseApi.submitQuiz(quiz.id, token, answers)
      setResult(response)
      await onCompleted(response.passed)
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка отправки')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl ${result.passed ? 'bg-green-500 shadow-green-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
          {result.passed ? <Award size={48} className="text-white" /> : <X size={48} className="text-white" />}
        </div>
        <h2 className="mb-2 text-3xl font-black text-gray-900">{result.passed ? 'Тест успешно сдан!' : 'Тест не сдан'}</h2>
        <p className="mb-8 text-lg text-gray-500">
          Ваш результат: <span className={`font-black ${result.passed ? 'text-green-500' : 'text-red-500'}`}>{result.score}%</span> (проходной {quiz.passing_score}%)
        </p>
        {!result.passed ? (
          <button onClick={() => { setResult(null); setAnswers({}) }} className="rounded-2xl bg-gray-900 px-8 py-4 font-black text-white transition-all hover:bg-brand">
            Попробовать еще раз
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10">
      <div className="space-y-2 border-b pb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500">
          <HelpCircle size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-900">{quiz.title}</h1>
        <p className="text-gray-500">{quiz.description || `Для прохождения нужно набрать минимум ${quiz.passing_score}% правильных ответов.`}</p>
      </div>

      <div className="space-y-8">
        {quiz.questions?.map((question: any, index: number) => {
          const isMultiple = question.question_type === 'multiple'
          return (
            <div key={question.id} className="rounded-3xl border-2 border-gray-100 bg-white p-8">
              <h3 className="mb-6 flex gap-4 text-lg font-bold text-gray-900">
                <span className="text-orange-500">{index + 1}.</span> {question.text}
              </h3>
              <div className="space-y-3">
                {question.options?.map((option: any) => {
                  const isSelected = (answers[question.id] || []).includes(option.id)
                  return (
                    <label key={option.id} className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all ${isMultiple ? 'rounded' : 'rounded-full'} ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                        {isSelected ? <CheckCircle2 size={14} className="text-white" /> : null}
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>{option.text}</span>
                      <input
                        type={isMultiple ? 'checkbox' : 'radio'}
                        className="hidden"
                        checked={isSelected}
                        onChange={() => toggleOption(question.id, option.id, isMultiple)}
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-10">
        <button
          disabled={submitting || Object.keys(answers).length === 0}
          onClick={submit}
          className="rounded-2xl bg-orange-500 px-10 py-4 text-lg font-black text-white shadow-xl shadow-orange-200 transition-all hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? 'Отправка...' : 'Завершить тест'}
        </button>
      </div>
      <div className="h-20" />
    </div>
  )
}
