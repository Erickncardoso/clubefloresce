'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Captions,
  Check,
  Clock,
  Heart,
  Info,
  Link as LinkIcon,
  MessageSquare,
  PlayCircle,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { ApiError } from '@/lib/api'
import { buildModuleUrl, findLessonBySlug } from '@/lib/course-slug'
import {
  type Course,
  type CourseLesson,
  type CourseModule,
  type LessonComment,
  createLesson,
  createLessonComment,
  deleteLesson,
  deleteLessonComment,
  getLessonProgress,
  getLessonVideoUrl,
  getModule,
  listLessonComments,
  normalizeLessonMaterials,
  toggleLessonCommentLike,
  updateLessonProgress,
} from '@/lib/courses'
import { loadLessonNotes, saveLessonNotes, type LessonNote } from '@/lib/lesson-notes'
import { CourseVideoPlayer } from '@/components/courses/CourseVideoPlayer'
import { LessonFormModal, type LessonSavePayload } from '@/components/courses/LessonFormModal'
import { LessonSummaryPanel } from '@/components/courses/LessonSummaryPanel'
import { LessonTranscriptionPanel } from '@/components/courses/LessonTranscriptionPanel'
import styles from './modulo.module.scss'

type ModulePayload = CourseModule & {
  course?: Course & { modules?: CourseModule[] }
  lessons: CourseLesson[]
}

type TabId = 'resumo' | 'transcricao' | 'anotacoes' | 'links' | 'aulas'
type SidebarTab = 'aulas' | 'comunidade'

const TABS: { id: TabId; label: string; icon: typeof Info; mobileOnly?: boolean }[] = [
  { id: 'resumo', label: 'Resumo', icon: Info },
  { id: 'transcricao', label: 'Transcrição', icon: Captions },
  { id: 'anotacoes', label: 'Anotações', icon: StickyNote },
  { id: 'links', label: 'Links', icon: LinkIcon },
  { id: 'aulas', label: 'Aulas', icon: PlayCircle, mobileOnly: true },
]

function formatLinkUrl(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    const full = `${parsed.hostname}${path}${parsed.search}`
    return full.length > 64 ? `${full.slice(0, 64)}…` : full
  } catch {
    return url.length > 64 ? `${url.slice(0, 64)}…` : url
  }
}

function formatSeconds(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function LessonPlayer({
  lesson,
  onTimeUpdate,
  seekTo,
}: {
  lesson: CourseLesson | null
  onTimeUpdate: (t: number) => void
  seekTo: number | null
}) {
  return (
    <div className={styles.playerFrame}>
      <CourseVideoPlayer lesson={lesson} onTimeUpdate={onTimeUpdate} seekTo={seekTo} />
    </div>
  )
}

function NotesPanel({
  lessonId,
  currentTime,
  onSeek,
}: {
  lessonId: string
  currentTime: number
  onSeek: (seconds: number) => void
}) {
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setNotes(loadLessonNotes(lessonId))
    setDraft('')
  }, [lessonId])

  function persist(next: LessonNote[]) {
    setNotes(next)
    saveLessonNotes(lessonId, next)
  }

  function addNote() {
    const text = draft.trim()
    if (!text) return
    const next = [
      {
        id: `${Date.now()}`,
        text,
        seconds: Math.floor(currentTime || 0),
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ]
    persist(next)
    setDraft('')
  }

  return (
    <div className={styles.notes}>
      <div className={styles.noteComposer}>
        <textarea
          rows={3}
          value={draft}
          placeholder="Anote um trecho importante desta aula…"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="button" className="btn-primary" disabled={!draft.trim()} onClick={addNote}>
          Salvar anotação ({formatSeconds(currentTime)})
        </button>
      </div>
      {!notes.length ? (
        <p className={styles.emptyTab}>Nenhuma anotação ainda. Suas notas ficam só neste navegador.</p>
      ) : (
        <ul className={styles.noteList}>
          {notes.map((note) => (
            <li key={note.id}>
              <button type="button" className={styles.noteTime} onClick={() => onSeek(note.seconds)}>
                {formatSeconds(note.seconds)}
              </button>
              <p>{note.text}</p>
              <button
                type="button"
                className={styles.noteDelete}
                onClick={() => persist(notes.filter((item) => item.id !== note.id))}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ModuloPageInner() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const moduleId = params.id
  const curso = searchParams.get('curso') || undefined
  const aulaSlug = searchParams.get('aula') || undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moduleData, setModuleData] = useState<ModulePayload | null>(null)
  const [activeLessonId, setActiveLessonId] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('aulas')
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | null>(null)
  const [comments, setComments] = useState<LessonComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [lessonSaving, setLessonSaving] = useState(false)
  const [lessonError, setLessonError] = useState('')

  const load = useCallback(async () => {
    if (!moduleId) return
    setLoading(true)
    setError('')
    try {
      const data = await getModule(moduleId, { curso, aula: aulaSlug })
      setModuleData(data as ModulePayload)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar módulo.')
      setModuleData(null)
    } finally {
      setLoading(false)
    }
  }, [moduleId, curso, aulaSlug])

  useEffect(() => {
    void load()
  }, [load])

  const lessons = useMemo(
    () => [...(moduleData?.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [moduleData],
  )

  useEffect(() => {
    if (!lessons.length) {
      setActiveLessonId('')
      return
    }
    if (aulaSlug) {
      const found = findLessonBySlug(lessons, aulaSlug)
      if (found) {
        setActiveLessonId(found.id)
        return
      }
    }
    setActiveLessonId((prev) => prev || lessons[0].id)
  }, [lessons, aulaSlug])

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null
  const activeIndex = Math.max(0, lessons.findIndex((l) => l.id === activeLessonId))
  const activeProgress = getLessonProgress(activeLesson)
  const activeVideoUrl = getLessonVideoUrl(activeLesson)
  const lessonLinks = normalizeLessonMaterials(activeLesson?.materials)

  const nextModule = useMemo(() => {
    const modules = [...(moduleData?.course?.modules || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    )
    if (!modules.length || !moduleData?.id) return null
    const idx = modules.findIndex((m) => m.id === moduleData.id)
    return idx >= 0 ? modules[idx + 1] || null : null
  }, [moduleData])

  const totalDuration = useMemo(() => {
    const filled = lessons.map((l) => l.duration).filter(Boolean)
    if (!filled.length) return '—'
    return filled.length === 1 ? filled[0]! : `${filled.length} aulas`
  }, [lessons])

  useEffect(() => {
    setVideoCurrentTime(0)
    setSeekTo(null)
    setActiveTab('resumo')
  }, [activeLessonId])

  useEffect(() => {
    if (!activeLessonId || sidebarTab !== 'comunidade') return
    let cancelled = false
    ;(async () => {
      setCommentsLoading(true)
      try {
        const data = await listLessonComments(activeLessonId)
        if (!cancelled) setComments(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setComments([])
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeLessonId, sidebarTab])

  function selectLesson(lesson: CourseLesson) {
    setActiveLessonId(lesson.id)
    const paramsNext = new URLSearchParams()
    if (curso) paramsNext.set('curso', curso)
    paramsNext.set('aula', lesson.id)
    router.replace(`/modulos/${moduleId}?${paramsNext.toString()}`)
  }

  function seekVideo(seconds: number) {
    setSeekTo(seconds)
    setVideoCurrentTime(seconds)
  }

  async function toggleFlag(flag: 'watched' | 'favorited') {
    if (!activeLesson) return
    const current = Boolean(activeProgress?.[flag])
    try {
      const res = await updateLessonProgress(activeLesson.id, { [flag]: !current })
      setModuleData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          lessons: prev.lessons.map((lesson) =>
            lesson.id === activeLesson.id
              ? { ...lesson, progress: [res] }
              : lesson,
          ),
        }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar progresso.')
    }
  }

  async function removeLesson(lesson: CourseLesson) {
    if (!window.confirm(`Excluir a aula “${lesson.title}”?`)) return
    try {
      await deleteLesson(lesson.id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir aula.')
    }
  }

  async function saveNewLesson(payload: LessonSavePayload) {
    if (!moduleId) return
    setLessonSaving(true)
    setLessonError('')
    try {
      const created = await createLesson({
        moduleId,
        title: payload.title,
        videoUrl: payload.videoUrl,
        content: payload.content || null,
        thumbnail: payload.thumbnail,
        duration: payload.duration,
        materials: payload.materials || [],
        order: lessons.length,
      })
      setLessonModalOpen(false)
      await load()
      if (created?.id) {
        setActiveLessonId(created.id)
        const paramsNext = new URLSearchParams()
        if (curso || moduleData?.course?.id) paramsNext.set('curso', curso || moduleData!.course!.id)
        paramsNext.set('aula', created.id)
        router.replace(`/modulos/${moduleId}?${paramsNext.toString()}`)
      }
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : 'Erro ao criar aula.')
    } finally {
      setLessonSaving(false)
    }
  }

  async function sendComment() {
    if (!activeLessonId || !commentText.trim()) return
    try {
      const created = await createLessonComment(activeLessonId, commentText.trim())
      setComments((prev) => [created, ...prev])
      setCommentText('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao comentar.')
    }
  }

  function renderLessonList(compact = false) {
    return (
      <div className={compact ? styles.lessonListMobile : styles.sidebarLista}>
        {lessons.map((lesson) => {
          const thumb = lesson.thumbnail || lesson.cover || moduleData?.course?.thumbnail || ''
          return (
            <div
              key={lesson.id}
              className={`${styles.lessonRow} cf-squircle cf-squircle--control ${lesson.id === activeLessonId ? styles.lessonRowActive : ''}`}
              onClick={() => selectLesson(lesson)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectLesson(lesson)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className={`${styles.lessonThumb} cf-squircle cf-squircle--control`}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" />
                ) : (
                  <PlayCircle size={16} />
                )}
              </div>
              <div className={styles.lessonInfo}>
                <strong>{lesson.title}</strong>
                <small>{lesson.duration || '0:00'}</small>
              </div>
              <button
                type="button"
                className={styles.lessonDelete}
                title="Excluir aula"
                aria-label="Excluir aula"
                onClick={(e) => {
                  e.stopPropagation()
                  void removeLesson(lesson)
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <p className={styles.state}>Carregando aula…</p>
  if (error) return <p className={`${styles.state} ${styles.error}`}>{error}</p>
  if (!moduleData) return <p className={styles.state}>Módulo não encontrado.</p>

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/cursos" className={styles.back}>
          <ArrowLeft size={16} />
          Voltar aos cursos
        </Link>
        <div>
          <p className={styles.courseTitle}>{moduleData.course?.title || 'Curso'}</p>
          <h1>{moduleData.title}</h1>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <LessonPlayer
            lesson={activeLesson}
            onTimeUpdate={setVideoCurrentTime}
            seekTo={seekTo}
          />

          {activeLesson ? (
            <div className={`${styles.lessonHead} cf-admin-radius`}>
              <div>
                <span className={styles.lessonLabel}>Aula {activeIndex + 1}</span>
                <h2>{activeLesson.title}</h2>
                <span className={styles.duration}>
                  <Clock size={14} />
                  {activeLesson.duration || '—'}
                </span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`btn-secondary cf-squircle cf-squircle--control ${styles.actionBtn} ${activeProgress?.watched ? styles.actionDone : ''}`}
                  onClick={() => void toggleFlag('watched')}
                >
                  <Check size={16} />
                  {activeProgress?.watched ? 'Concluída' : 'Marcar concluída'}
                </button>
                <button
                  type="button"
                  className={`btn-secondary cf-squircle cf-squircle--control ${styles.iconBtn} ${activeProgress?.favorited ? styles.iconActive : ''}`}
                  title="Favoritar"
                  aria-label="Favoritar"
                  onClick={() => void toggleFlag('favorited')}
                >
                  <Heart size={16} fill={activeProgress?.favorited ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ) : null}

          {activeLesson ? (
            <div className={`${styles.tabsWrap} cf-admin-radius cf-squircle cf-squircle--control`}>
              <nav className={styles.tabs} aria-label="Conteúdo da aula">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      type="button"
                  className={`btn-secondary cf-squircle cf-squircle--control ${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''} ${tab.mobileOnly ? styles.tabMobileOnly : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>

              <div className={styles.tabContent}>
                {activeTab === 'resumo' ? (
                  <LessonSummaryPanel
                    key={activeLesson.id}
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.title}
                    videoUrl={activeVideoUrl}
                    content={activeLesson.content || ''}
                    transcription={activeLesson.transcription || []}
                    onSaved={(lesson) => {
                      setModuleData((prev) => {
                        if (!prev) return prev
                        return {
                          ...prev,
                          lessons: prev.lessons.map((item) =>
                            item.id === lesson.id ? { ...item, content: lesson.content } : item,
                          ),
                        }
                      })
                    }}
                  />
                ) : null}

                {activeTab === 'transcricao' ? (
                  <LessonTranscriptionPanel
                    key={`tr-${activeLesson.id}`}
                    lessonId={activeLesson.id}
                    videoUrl={activeVideoUrl}
                    transcription={activeLesson.transcription || []}
                    currentTime={videoCurrentTime}
                    canSync
                    onSeek={seekVideo}
                    onUpdated={(transcription) => {
                      setModuleData((prev) => {
                        if (!prev) return prev
                        return {
                          ...prev,
                          lessons: prev.lessons.map((item) =>
                            item.id === activeLesson.id ? { ...item, transcription } : item,
                          ),
                        }
                      })
                    }}
                  />
                ) : null}

                {activeTab === 'anotacoes' ? (
                  <NotesPanel
                    lessonId={activeLesson.id}
                    currentTime={videoCurrentTime}
                    onSeek={seekVideo}
                  />
                ) : null}

                {activeTab === 'links' ? (
                  lessonLinks.length ? (
                    <div className={styles.linksList}>
                      {lessonLinks.map((item, idx) => (
                        <a
                          key={`${item.url}-${idx}`}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkItem}
                        >
                          <span className={styles.linkIcon}>
                            <LinkIcon size={18} />
                          </span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{formatLinkUrl(item.url)}</small>
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyTab}>
                      <LinkIcon size={22} />
                      <p>Não existem links para esta aula.</p>
                    </div>
                  )
                ) : null}

                {activeTab === 'aulas' ? (
                  <div className={styles.mobileAulas}>
                    <div className={styles.sidebarCourse}>
                      {moduleData.course?.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={moduleData.course.thumbnail}
                          alt=""
                          className="cf-squircle cf-squircle--control"
                        />
                      ) : null}
                      <div>
                        <p className={styles.sidebarCourseName}>{moduleData.title}</p>
                        <p className={styles.sidebarCourseMeta}>
                          {moduleData.course?.title} · {lessons.length} aulas · {totalDuration}
                        </p>
                      </div>
                    </div>
                    {renderLessonList(true)}
                    <button
                      type="button"
                      className={styles.addLesson}
                      onClick={() => {
                        setLessonError('')
                        setLessonModalOpen(true)
                      }}
                    >
                      <Plus size={16} />
                      Nova aula
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <aside className={`${styles.aside} cf-admin-radius cf-squircle cf-squircle--control`}>
          <div className={styles.asideTabs}>
            <button
              type="button"
              className={`cf-squircle cf-squircle--control ${sidebarTab === 'aulas' ? styles.asideTabActive : ''}`}
              onClick={() => setSidebarTab('aulas')}
            >
              Aulas
            </button>
            <button
              type="button"
              className={`cf-squircle cf-squircle--control ${sidebarTab === 'comunidade' ? styles.asideTabActive : ''}`}
              onClick={() => setSidebarTab('comunidade')}
            >
              Comunidade
            </button>
          </div>

          {sidebarTab === 'aulas' ? (
            <>
              <div className={styles.sidebarCourse}>
                {moduleData.course?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={moduleData.course.thumbnail}
                    alt=""
                    className="cf-squircle cf-squircle--control"
                  />
                ) : (
                  <div className={`${styles.sidebarCourseFallback} cf-squircle cf-squircle--control`}>
                    <PlayCircle size={18} />
                  </div>
                )}
                <div>
                  <p className={styles.sidebarCourseName}>{moduleData.title}</p>
                  <p className={styles.sidebarCourseMeta}>
                    {moduleData.course?.title} · {lessons.length} aulas · {totalDuration}
                  </p>
                </div>
              </div>
              {renderLessonList()}
              <button
                type="button"
                className={styles.addLesson}
                onClick={() => {
                  setLessonError('')
                  setLessonModalOpen(true)
                }}
              >
                <Plus size={16} />
                Nova aula
              </button>
              {nextModule ? (
                <button
                  type="button"
                  className={styles.nextModule}
                  onClick={() =>
                    router.push(buildModuleUrl(nextModule, undefined, undefined, moduleData.course?.id))
                  }
                >
                  <PlayCircle size={16} />
                  <span>Próximo: {nextModule.title}</span>
                  <ArrowRight size={14} />
                </button>
              ) : null}
            </>
          ) : (
            <div className={styles.comments}>
              <div className={styles.commentComposer}>
                <input
                  value={commentText}
                  placeholder="Dúvida ou comentário..."
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void sendComment()
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!commentText.trim()}
                  onClick={() => void sendComment()}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
              {commentsLoading ? <p className={styles.state}>Carregando…</p> : null}
              {!commentsLoading && !comments.length ? (
                <div className={styles.emptyTab}>
                  <MessageSquare size={22} />
                  <p>Seja a primeira a comentar!</p>
                </div>
              ) : null}
              <div className={styles.commentList}>
                {comments.map((comment) => (
                  <article key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentAvatar}>
                      {comment.author?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={comment.author.avatar} alt="" />
                      ) : (
                        <span>
                          {(comment.author?.name || 'NA').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className={styles.commentMeta}>
                        <strong>{comment.author?.name || 'Usuário'}</strong>
                        {comment.author?.role === 'NUTRICIONISTA' ? (
                          <span className={styles.badge}>Instrutora</span>
                        ) : null}
                      </div>
                      <p>{comment.content}</p>
                      <div className={styles.commentFoot}>
                        <button
                          type="button"
                          onClick={() =>
                            void toggleLessonCommentLike(comment.id).then((updated) => {
                              setComments((prev) =>
                                prev.map((item) => (item.id === updated.id ? updated : item)),
                              )
                            })
                          }
                        >
                          <Heart size={12} />
                          {comment.likesCount || 0}
                        </button>
                        <button
                          type="button"
                          className={styles.commentDelete}
                          onClick={() =>
                            void deleteLessonComment(comment.id).then(() => {
                              setComments((prev) => prev.filter((item) => item.id !== comment.id))
                            })
                          }
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <LessonFormModal
        open={lessonModalOpen}
        mode="create"
        context={{
          courseTitle: moduleData.course?.title,
          moduleTitle: moduleData.title,
          lessonCount: lessons.length,
        }}
        saving={lessonSaving}
        error={lessonError}
        onClose={() => setLessonModalOpen(false)}
        onSave={saveNewLesson}
      />
    </div>
  )
}

export default function ModuloPage() {
  return (
    <Suspense fallback={<p className={styles.state}>Carregando aula…</p>}>
      <ModuloPageInner />
    </Suspense>
  )
}
