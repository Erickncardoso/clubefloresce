'use client'

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  type ContentTile,
  type Course,
  type CoursePayload,
  type Ebook,
  buildAddTile,
  createCourse,
  createEbook,
  createLesson,
  deleteCourse,
  deleteEbook,
  ensureFirstModule,
  getCourseBannerCover,
  getCourseBannerPosition,
  listCourses,
  listEbooks,
  mapCourseToTile,
  mapEbookToTile,
  openCoursePlayerHref,
  updateCourse,
  updateEbook,
} from '@/lib/courses'
import { CourseFormModal, type CourseEditMode } from '@/components/courses/CourseFormModal'
import { EbookFormModal, type EbookSavePayload } from '@/components/courses/EbookFormModal'
import { EbookReaderModal } from '@/components/courses/EbookReaderModal'
import { LessonFormModal, type LessonSavePayload } from '@/components/courses/LessonFormModal'
import { TileActionsMenu } from '@/components/courses/TileActionsMenu'
import { TileCarousel } from '@/components/courses/TileCarousel'
import styles from './cursos.module.scss'

export default function CursosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [ebooks, setEbooks] = useState<Ebook[]>([])

  const [courseModalOpen, setCourseModalOpen] = useState(false)
  const [courseModalMode, setCourseModalMode] = useState<CourseEditMode>('create')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseSaving, setCourseSaving] = useState(false)
  const [courseError, setCourseError] = useState('')

  const [ebookModalOpen, setEbookModalOpen] = useState(false)
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null)
  const [ebookSaving, setEbookSaving] = useState(false)
  const [ebookError, setEbookError] = useState('')
  const [ebookReader, setEbookReader] = useState<{ title: string; fileUrl: string } | null>(null)

  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [lessonModuleId, setLessonModuleId] = useState('')
  const [lessonContext, setLessonContext] = useState<{
    courseTitle?: string
    moduleTitle?: string
    lessonCount?: number
  }>({})
  const [lessonSaving, setLessonSaving] = useState(false)
  const [lessonError, setLessonError] = useState('')

  const featured = courses[0] || null

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [coursesData, ebooksData] = await Promise.all([listCourses(), listEbooks()])
      setCourses(Array.isArray(coursesData) ? coursesData : [])
      setEbooks(Array.isArray(ebooksData) ? ebooksData : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar cursos.')
      setCourses([])
      setEbooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const courseTiles = useMemo(() => {
    const tiles = courses.map(mapCourseToTile)
    tiles.push(buildAddTile('course'))
    return tiles
  }, [courses])

  const ebookTiles = useMemo(() => {
    const tiles = ebooks.map(mapEbookToTile)
    tiles.push(buildAddTile('ebook'))
    return tiles
  }, [ebooks])

  const bannerStyle = useMemo(() => {
    const url = getCourseBannerCover(featured)
    const pos = getCourseBannerPosition(featured)
    return {
      ['--patient-banner-desktop' as string]: `url(${JSON.stringify(url)})`,
      ['--patient-banner-pos-desktop' as string]: pos,
    } as CSSProperties
  }, [featured])

  function openCreateCourse() {
    setEditingCourse(null)
    setCourseModalMode('create')
    setCourseError('')
    setCourseModalOpen(true)
  }

  function openEditCourse(course: Course, mode: CourseEditMode) {
    setEditingCourse(course)
    setCourseModalMode(mode)
    setCourseError('')
    setCourseModalOpen(true)
  }

  async function saveCourse(payload: CoursePayload) {
    setCourseSaving(true)
    setCourseError('')
    try {
      if (courseModalMode === 'create') {
        await createCourse(payload)
      } else if (editingCourse?.id) {
        await updateCourse(editingCourse.id, payload)
      }
      setCourseModalOpen(false)
      await load()
    } catch (err) {
      setCourseError(err instanceof Error ? err.message : 'Erro ao salvar curso.')
    } finally {
      setCourseSaving(false)
    }
  }

  async function removeCourse(id: string) {
    if (!window.confirm('Excluir este curso? Esta ação não pode ser desfeita.')) return
    try {
      await deleteCourse(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir curso.')
    }
  }

  async function prepareAddLesson(course: Course) {
    try {
      let moduleId = course.modules?.[0]?.id
      let moduleTitle = course.modules?.[0]?.title
      if (!moduleId) {
        const ensured = await ensureFirstModule(course.id)
        moduleId = ensured?.id
        moduleTitle = ensured?.title
        await load()
      }
      if (!moduleId) throw new Error('Não foi possível preparar o módulo.')
      setLessonModuleId(moduleId)
      setLessonContext({
        courseTitle: course.title,
        moduleTitle: moduleTitle || 'Módulo 1',
        lessonCount: course.modules?.find((m) => m.id === moduleId)?.lessons?.length || 0,
      })
      setLessonError('')
      setLessonModalOpen(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao preparar módulo.')
    }
  }

  async function saveLesson(payload: LessonSavePayload) {
    if (!lessonModuleId) return
    setLessonSaving(true)
    setLessonError('')
    try {
      await createLesson({
        moduleId: lessonModuleId,
        title: payload.title,
        videoUrl: payload.videoUrl,
        content: payload.content || null,
        thumbnail: payload.thumbnail,
        duration: payload.duration,
        materials: payload.materials || [],
        order: lessonContext.lessonCount || 0,
      })
      setLessonModalOpen(false)
      await load()
      const course = courses.find((c) => c.modules?.some((m) => m.id === lessonModuleId))
      const href = course ? openCoursePlayerHref(course) : null
      if (href) router.push(href)
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : 'Erro ao publicar aula.')
    } finally {
      setLessonSaving(false)
    }
  }

  async function saveEbook(payload: EbookSavePayload) {
    setEbookSaving(true)
    setEbookError('')
    try {
      if (editingEbook?.id) {
        await updateEbook(editingEbook.id, payload)
      } else {
        await createEbook(payload)
      }
      setEbookModalOpen(false)
      await load()
    } catch (err) {
      setEbookError(err instanceof Error ? err.message : 'Erro ao salvar ebook.')
    } finally {
      setEbookSaving(false)
    }
  }

  async function removeEbook(id: string) {
    if (!window.confirm('Excluir este ebook?')) return
    try {
      await deleteEbook(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir ebook.')
    }
  }

  function onCourseSelect(item: ContentTile) {
    if (item.isAdd) {
      openCreateCourse()
      return
    }
    const course = item.raw as Course
    const href = openCoursePlayerHref(course)
    if (href) router.push(href)
    else void prepareAddLesson(course)
  }

  function onEbookSelect(item: ContentTile) {
    if (item.isAdd) {
      setEditingEbook(null)
      setEbookError('')
      setEbookModalOpen(true)
      return
    }
    const ebook = item.raw as Ebook
    if (ebook.fileUrl) {
      setEbookReader({ title: ebook.title, fileUrl: ebook.fileUrl })
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.banner} style={bannerStyle}>
        <div className={styles.bannerBg} aria-hidden />
        {featured ? (
          <button
            type="button"
            className={styles.bannerEdit}
            onClick={() => openEditCourse(featured, 'banner')}
          >
            <Edit2 size={15} />
            Editar capa
          </button>
        ) : null}
        <div className={styles.bannerContent}>
          <span className={styles.kicker}>{featured?.bannerKicker || 'Destaque da semana'}</span>
          <h1>
            {featured?.bannerTitle ||
              featured?.title ||
              'Sua jornada de transformação continua'}
          </h1>
          <p>
            {featured?.bannerSubtitle ||
              featured?.description ||
              'Assista às aulas e mantenha consistência no seu processo.'}
          </p>
          <div className={styles.bannerActions}>
            {featured ? (
              <button
                type="button"
                className={styles.cta}
                onClick={() => {
                  const href = openCoursePlayerHref(featured)
                  if (href) router.push(href)
                }}
              >
                {featured.bannerCtaText || 'Continuar agora'}
              </button>
            ) : null}
            <button type="button" className={styles.ghost} onClick={openCreateCourse}>
              Novo curso
            </button>
          </div>
        </div>
      </section>

      <div className={styles.content}>
        {loading ? <p className={styles.state}>Carregando cursos…</p> : null}
        {!loading && error ? <p className={`${styles.state} ${styles.stateError}`}>{error}</p> : null}

        {!loading && !error ? (
          <>
            <section className={styles.row}>
              <h2 className={styles.rowTitle}>Cursos</h2>
              <TileCarousel
                items={courseTiles}
                ariaLabel="Cursos"
                onSelect={onCourseSelect}
                renderActions={(item) => {
                  const course = item.raw as Course
                  return (
                    <TileActionsMenu menuKey={`course-${item.id}`}>
                      <button
                        type="button"
                        className="cf-tile-actions-item"
                        role="menuitem"
                        onClick={() => void prepareAddLesson(course)}
                      >
                        <Plus size={14} />
                        Adicionar videoaula
                      </button>
                      <button
                        type="button"
                        className="cf-tile-actions-item"
                        role="menuitem"
                        onClick={() => openEditCourse(course, 'card')}
                      >
                        <Edit2 size={14} />
                        Editar curso
                      </button>
                      <button
                        type="button"
                        className="cf-tile-actions-item cf-tile-actions-item--danger"
                        role="menuitem"
                        onClick={() => void removeCourse(course.id)}
                      >
                        <Trash2 size={14} />
                        Excluir curso
                      </button>
                    </TileActionsMenu>
                  )
                }}
              />
            </section>

            <section className={styles.row} id="ebooks">
              <button
                type="button"
                className={`${styles.rowTitle} ${styles.rowLink}`}
                onClick={() => router.push('/ebooks')}
              >
                Ebooks
              </button>
              <TileCarousel
                items={ebookTiles}
                ariaLabel="Ebooks"
                onSelect={onEbookSelect}
                renderActions={(item) => {
                  const ebook = item.raw as Ebook
                  return (
                    <TileActionsMenu menuKey={`ebook-${item.id}`}>
                      <button
                        type="button"
                        className="cf-tile-actions-item"
                        role="menuitem"
                        onClick={() => {
                          setEditingEbook(null)
                          setEbookError('')
                          setEbookModalOpen(true)
                        }}
                      >
                        <Plus size={14} />
                        Adicionar PDF
                      </button>
                      <button
                        type="button"
                        className="cf-tile-actions-item"
                        role="menuitem"
                        onClick={() => {
                          setEditingEbook(ebook)
                          setEbookError('')
                          setEbookModalOpen(true)
                        }}
                      >
                        <Edit2 size={14} />
                        Editar ebook
                      </button>
                      <button
                        type="button"
                        className="cf-tile-actions-item cf-tile-actions-item--danger"
                        role="menuitem"
                        onClick={() => void removeEbook(ebook.id)}
                      >
                        <Trash2 size={14} />
                        Excluir ebook
                      </button>
                    </TileActionsMenu>
                  )
                }}
              />
            </section>
          </>
        ) : null}
      </div>

      <CourseFormModal
        open={courseModalOpen}
        mode={courseModalMode}
        course={editingCourse}
        saving={courseSaving}
        error={courseError}
        onClose={() => setCourseModalOpen(false)}
        onSave={saveCourse}
      />

      <EbookFormModal
        open={ebookModalOpen}
        ebook={editingEbook}
        saving={ebookSaving}
        error={ebookError}
        onClose={() => setEbookModalOpen(false)}
        onSave={saveEbook}
      />

      <EbookReaderModal
        open={Boolean(ebookReader)}
        title={ebookReader?.title || ''}
        fileUrl={ebookReader?.fileUrl || ''}
        onClose={() => setEbookReader(null)}
      />

      <LessonFormModal
        open={lessonModalOpen}
        context={lessonContext}
        saving={lessonSaving}
        error={lessonError}
        onClose={() => setLessonModalOpen(false)}
        onSave={saveLesson}
      />
    </div>
  )
}
