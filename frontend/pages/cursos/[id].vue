<template>
  <NuxtLayout name="dashboard">
    <section v-if="course" class="lesson-design-page">
      <header class="top-hero">
        <img
          v-if="courseCover"
          :src="courseCover"
          :alt="course.title"
          class="hero-bg-image"
        >
        <div class="hero-bg-overlay"></div>

        <div class="hero-inner">
          <button class="back-btn" @click="navigateTo('/cursos')">
            <ArrowLeft class="i-sm" />
            Voltar
          </button>

          <div class="hero-grid">
            <div class="hero-copy">
              <h1>{{ course.title }}</h1>
              <p class="hero-description">{{ course.description || 'Formação com aulas práticas para evolução contínua.' }}</p>
              <div class="chip-row">
                <span v-for="chip in courseTags" :key="chip" class="chip">{{ chip }}</span>
              </div>
              <div class="rating-row">
                <strong>{{ ratingLabel }}</strong>
                <div class="stars-inline">
                  <Star v-for="n in 5" :key="`star-${n}`" class="i-xs fill" :class="{ dim: n > Math.round(ratingValue) }" />
                </div>
                <span>({{ reviewsCountLabel }})</span>
                <span>{{ totalLessons }} aulas • {{ modulesCount }} módulos</span>
              </div>
            </div>

            <div class="hero-side-badge">
              <div class="orb-ring">
                <span>{{ modulesCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="tabs-wrap">
        <div class="tabs-row">
          <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
            <LayoutGrid class="i-xs" />
            Visão geral
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'contents' }" @click="activeTab = 'contents'">
            <Library class="i-xs" />
            Conteúdos
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'projects' }" @click="activeTab = 'projects'">
            <FolderKanban class="i-xs" />
            Projetos
          </button>
        </div>
      </div>

      <main class="content-grid">
        <section class="left-column">
          <article v-if="activeTab === 'overview'" class="overview-card">
            <div class="overview-media">
              <img v-if="courseCover" :src="courseCover" :alt="course.title" class="overview-cover">
              <div class="overview-media-overlay"></div>
              <PlayCircle class="overview-play-icon" />
              <span class="overview-duration-pill">{{ totalDurationLabel }}</span>
              <h2 class="overview-title-on-media">Conheça a formação</h2>
            </div>
            <div class="overview-body">
              <p>{{ overviewParagraphs[0] }}</p>
              <p>{{ overviewParagraphs[1] }}</p>
            </div>
          </article>

          <article v-if="activeTab === 'overview'" class="content-summary-card">
            <div class="summary-head">
              <h3>Conteúdos</h3>
              <button class="summary-action" @click="toggleShowAllModules">
                {{ showAllModules ? 'Ver menos' : 'Ver tudo' }}
              </button>
            </div>

            <div class="summary-rows">
              <button
                v-for="module in displayedModules"
                :key="`summary-${module.id}`"
                class="summary-row"
                @click="toggleModule(module.id)"
              >
                <div class="summary-row-main">
                  <span class="summary-level">MÓDULO</span>
                  <p class="summary-title">{{ module.title }}</p>
                </div>
                <span class="summary-meta">{{ module.lessons?.length || 0 }} aulas</span>
                <div class="summary-progress-track">
                  <div class="summary-progress-fill" :style="{ width: `${getModuleProgressPct(module)}%` }"></div>
                </div>
                <strong class="summary-progress-pct">{{ getModuleProgressPct(module) }}%</strong>
              </button>
            </div>
          </article>

          <h3 v-if="activeTab !== 'projects'" class="details-heading">Módulos e aulas</h3>

          <article v-if="activeTab === 'contents'" class="content-alert-card">
            <div class="alert-head">
              <span class="alert-head-main">
                <Sparkles class="i-xs alert-icon" />
                <strong>Novas aulas de IA na prática</strong>
              </span>
              <button class="alert-close" type="button">×</button>
            </div>
            <p>Trilha atualizada com novos conteúdos de aplicação para você turbinar seu avanço no curso.</p>
            <button class="summary-action" @click="toggleShowAllModules">Ver novidades</button>
          </article>

          <section
            v-if="activeTab === 'contents' || activeTab === 'overview'"
            v-for="module in modules"
            :key="module.id"
            class="module-card"
            :class="{ 'content-module-card': activeTab === 'contents' }"
          >
            <button class="module-head" @click="toggleModule(module.id)">
              <div>
                <p v-if="activeTab === 'contents'" class="module-level">Nível {{ moduleOrder(module.id) }}</p>
                <h3>{{ module.title }}</h3>
                <p>{{ module.lessons?.length || 0 }} aulas neste módulo</p>
              </div>
              <ChevronDown class="i-sm chev" :class="{ open: isModuleExpanded(module.id) }" />
            </button>

            <div v-if="isModuleExpanded(module.id) && module.lessons?.length" class="lesson-list">
              <button
                v-for="(lesson, index) in module.lessons"
                :key="lesson.id"
                class="lesson-row"
                :class="{ 'content-lesson-row': activeTab === 'contents', 'is-completed': isLessonCompleted(lesson) }"
                @click="openLessonPlayer(module, lesson)"
              >
                <span class="lesson-order">{{ index + 1 }}</span>
                <img v-if="lesson.thumbnail || courseCover" :src="lesson.thumbnail || courseCover" :alt="lesson.title" class="lesson-thumb">
                <div class="lesson-main">
                  <p class="lesson-title">{{ lesson.title }}</p>
                  <p class="lesson-subtitle">{{ lesson.content || 'Clique para abrir a aula no player.' }}</p>
                  <span class="lesson-status" :class="{ completed: isLessonCompleted(lesson) }">
                    <CheckCircle2 v-if="isLessonCompleted(lesson)" class="i-xs" />
                    {{ isLessonCompleted(lesson) ? 'Aula concluída' : 'Aula pendente' }}
                  </span>
                </div>
                <span class="lesson-time">{{ lesson.duration || '-- min' }}</span>
              </button>
            </div>

            <p v-else-if="isModuleExpanded(module.id)" class="empty-text">Este módulo ainda não possui aulas.</p>
          </section>

          <section v-if="activeTab === 'overview'" class="overview-bottom-stack">
            <article class="overview-extra-card">
              <h4 class="overview-extra-title">Educadores</h4>
              <div class="educator-list">
                <article v-for="educator in educatorList" :key="educator.id" class="educator-item">
                  <img :src="educator.avatar" :alt="educator.name" class="educator-avatar">
                  <div class="educator-main">
                    <strong>{{ educator.name }}</strong>
                    <p>{{ educator.role }}</p>
                  </div>
                </article>
              </div>
            </article>

            <article class="overview-extra-card">
              <h4 class="overview-extra-title">Detalhes</h4>
              <div class="details-grid">
                <div v-for="detail in overviewDetails" :key="detail.label" class="details-item">
                  <span class="details-icon">
                    <component :is="detail.icon" class="i-xs" />
                  </span>
                  <div>
                    <p class="details-label">{{ detail.label }}</p>
                    <strong class="details-value">{{ detail.value }}</strong>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section v-if="activeTab === 'projects'" class="projects-wrap">
            <article v-if="projectLessons.length" class="project-card" v-for="project in projectLessons" :key="project.id">
              <div class="project-main">
                <h3>{{ project.title }}</h3>
                <p>{{ project.content || 'Projeto prático para consolidar o aprendizado do módulo.' }}</p>
                <span class="project-module">{{ project.moduleTitle }}</span>
              </div>
              <button class="project-action" @click="navigateTo(`/modulos/${project.moduleId}?lessonId=${project.id}`)">
                Abrir projeto
                <ChevronRight class="i-xs" />
              </button>
            </article>

            <article v-else class="project-empty">
              Nenhum projeto foi identificado ainda neste curso.
            </article>
          </section>
        </section>

        <aside class="right-column">
          <article v-if="activeTab !== 'contents'" class="side-card">
            <div class="side-head">
              <h4>Progresso geral</h4>
              <span>{{ expandedPct }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${expandedPct}%` }"></div>
            </div>
            <button class="cta-side" @click="scrollToFirstModule">
              Acessar conteúdos
              <ChevronRight class="i-xs" />
            </button>
          </article>

          <article v-if="isNutri" class="side-card">
            <h4>Gerenciar aulas</h4>
            <p class="side-text">Adicione novas aulas para este curso pelo painel de gestão.</p>
            <button class="cta-side" @click="openAddLessonAction">
              <Plus class="i-xs" />
              Adicionar aula
            </button>
          </article>

          <template v-else>
            <article class="side-card detailed-progress-card">
              <div class="side-head">
                <h4>Progresso detalhado</h4>
                <button class="help-icon-btn" type="button" aria-label="Informações de progresso">
                  <CircleHelp class="i-xs" />
                </button>
              </div>

              <p class="mini-label">OBRIGATÓRIO</p>
              <div class="detail-row">
                <span class="detail-name">
                  <span class="detail-icon-wrap"><Library class="i-xs detail-icon" /></span>
                  Aulas
                </span>
                <span class="detail-count">{{ totalLessons }}/{{ totalLessons }}</span>
                <div class="progress-track detail-progress"><div class="progress-fill" style="width: 100%"></div></div>
                <strong class="detail-pct">100%</strong>
              </div>
              <div class="detail-row">
                <span class="detail-name">
                  <span class="detail-icon-wrap"><LayoutGrid class="i-xs detail-icon" /></span>
                  Quizzes avaliativos
                </span>
                <span class="detail-count">{{ quizzesDone }}/{{ totalLessons }}</span>
                <div class="progress-track detail-progress"><div class="progress-fill" :style="{ width: `${quizPct}%` }"></div></div>
                <strong class="detail-pct">{{ quizPct }}%</strong>
              </div>

              <p class="mini-label complement">COMPLEMENTAR</p>
              <div class="detail-row">
                <span class="detail-name">
                  <span class="detail-icon-wrap"><FolderKanban class="i-xs detail-icon" /></span>
                  Projetos práticos
                </span>
                <span class="detail-count">{{ projectLessons.length }}/{{ totalLessons }}</span>
                <div class="progress-track detail-progress"><div class="progress-fill" :style="{ width: `${complementaryPct}%` }"></div></div>
                <strong class="detail-pct">{{ complementaryPct }}%</strong>
              </div>
            </article>

            <article v-if="isNutri" class="side-card">
              <h4>Gerenciar aulas</h4>
              <p class="side-text">Adicione novas aulas para este curso pelo painel de gestão.</p>
              <button class="cta-side" @click="openAddLessonAction">
                <Plus class="i-xs" />
                Adicionar aula
              </button>
            </article>
          </template>
        </aside>
      </main>
    </section>

    <section v-else class="loading-state">
      <div class="loader-card">
        <PlayCircle class="loader-icon" />
        <p>Carregando curso...</p>
      </div>
    </section>

    <div v-if="showLessonModal" class="modal-overlay" @click.self="showLessonModal = false">
      <div class="modal-card modal-card--lesson">
        <div class="modal-header">
          <h2>Nova Aula</h2>
          <button @click="showLessonModal = false" class="btn-close"><X /></button>
        </div>
        <p class="modal-subtitle">Adicionando aula neste módulo</p>

        <div class="form-group">
          <label>Título da Aula</label>
          <input v-model="newLesson.title" placeholder="Ex: A importância das proteínas" />
        </div>

        <div class="form-group">
          <label>Vídeo</label>
          <div class="tab-pills">
            <button :class="['tab-pill', videoSourceTab === 'link' ? 'active' : '']" @click="videoSourceTab = 'link'">
              <Link class="xs-icon" /> Link Externo
            </button>
            <button :class="['tab-pill', videoSourceTab === 'upload' ? 'active' : '']" @click="videoSourceTab = 'upload'">
              <Upload class="xs-icon" /> Upload de Vídeo
            </button>
          </div>
          <div v-if="videoSourceTab === 'link'" class="tab-content">
            <input v-model="newLesson.videoUrl" placeholder="Ex: https://youtube.com/watch?v=..." />
          </div>
          <div v-if="videoSourceTab === 'upload'" class="tab-content">
            <input ref="videoFileInput" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.mov,.webm,.avi,.mkv" class="file-input-hidden" @change="handleVideoFileSelect" />
            <div v-if="!videoFileLocal" class="video-upload-area" @click="triggerVideoUpload">
              <Film class="upload-icon" />
              <span>Clique para selecionar um vídeo (mp4, mov, webm)</span>
              <span class="upload-hint">Máximo: 500MB</span>
            </div>
            <div v-else class="video-selected-info">
              <Film class="xs-icon" />
              <span>{{ videoFileLocal.name }}</span>
              <button class="btn-mini" @click="triggerVideoUpload">Trocar</button>
            </div>
            <div v-if="videoUploadStatus === 'uploading'" class="upload-progress-bar">
              <div class="progress-fill" :style="{ width: videoUploadProgress + '%' }"></div>
              <span>{{ videoUploadProgress }}%</span>
            </div>
            <div v-if="videoUploadStatus === 'done'" class="upload-done">✓ Upload concluído</div>
            <div v-if="videoUploadStatus === 'error'" class="upload-error">✗ Erro no upload. Tente novamente.</div>
          </div>
        </div>

        <div class="form-group">
          <label>Duração (opcional)</label>
          <input v-model="newLesson.duration" placeholder="Ex: 44min ou 1h 20min" />
        </div>

        <div class="form-group">
          <label>Miniatura da Aula</label>
          <div class="tab-pills">
            <button :class="['tab-pill', thumbSourceTab === 'upload' ? 'active' : '']" @click="thumbSourceTab = 'upload'">
              <ImageIcon class="xs-icon" /> Upload de Imagem
            </button>
            <button :class="['tab-pill', thumbSourceTab === 'frame' ? 'active' : '']" @click="thumbSourceTab = 'frame'" :disabled="!frameVideoObjectUrl">
              <Camera class="xs-icon" /> Frame do Vídeo
            </button>
            <button v-if="isYoutube(newLesson.videoUrl)" :class="['tab-pill', thumbSourceTab === 'youtube' ? 'active' : '']" @click="thumbSourceTab = 'youtube'; applyYoutubeThumb()">
              <PlayCircle class="xs-icon" /> Capa YouTube
            </button>
          </div>
          <div v-if="thumbSourceTab === 'upload'" class="tab-content">
            <input ref="lessonThumbInput" type="file" accept="image/*" class="file-input-hidden" @change="handleLessonThumbSelect" />
            <div class="lesson-upload-area" @click="triggerLessonThumbUpload" :class="{ 'has-image': lessonThumbPreview }">
              <img v-if="lessonThumbPreview" :src="lessonThumbPreview" class="upload-preview" />
              <div v-else class="upload-placeholder">
                <ImageIcon class="upload-icon" />
                <span>Clique para escolher uma imagem</span>
              </div>
            </div>
          </div>
          <div v-if="thumbSourceTab === 'frame'" class="tab-content">
            <div v-if="frameVideoObjectUrl" class="frame-capture-area">
              <video ref="frameVideoRef" :src="frameVideoObjectUrl" class="frame-video-preview" preload="metadata" @loadedmetadata="onFrameVideoLoaded" muted></video>
              <div class="frame-controls">
                <input type="range" min="0" :max="frameVideoDuration" step="0.1" :value="frameSeekTime" @input="onFrameSeekInput" class="frame-slider" />
                <button @click.stop="captureVideoFrame" class="btn-capture">
                  <Camera class="xs-icon" /> Capturar este Frame
                </button>
              </div>
            </div>
            <div v-else class="upload-placeholder">
              <Camera class="upload-icon" />
              <span>Faça upload de um vídeo na aba acima para capturar um frame</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showLessonModal = false" class="btn-cancel">Cancelar</button>
          <button @click="handleCreateLessonFromDetail" class="btn-primary" :disabled="uploading">
            <span v-if="uploading && videoUploadStatus === 'uploading'">Enviando vídeo... {{ videoUploadProgress }}%</span>
            <span v-else-if="uploading">Salvando...</span>
            <span v-else>Criar Aula</span>
          </button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { onBeforeUnmount } from 'vue'
import {
  PlayCircle,
  ChevronDown,
  BookOpen,
  ArrowLeft,
  Star,
  Plus,
  X,
  Link,
  Upload,
  Film,
  Image as ImageIcon,
  Camera,
  ChevronRight,
  Clock3,
  Users,
  CalendarDays,
  BookCheck,
  ChartNoAxesColumn,
  CodeXml,
  CheckCircle2,
  LayoutGrid,
  Library,
  FolderKanban,
  Sparkles,
  Code2,
  CircleHelp
} from 'lucide-vue-next'

const route = useRoute()
const course = ref(null)
const isNutri = ref(false)
const showLessonModal = ref(false)
const uploading = ref(false)
const currentModuleIdForLesson = ref(null)
const newLesson = reactive({ title: '', videoUrl: '', duration: '', thumbnail: '' })
const lessonThumbPreview = ref(null)
const lessonThumbInput = ref(null)
const lessonThumbFile = ref(null)
const videoSourceTab = ref('link')
const thumbSourceTab = ref('upload')
const videoFileLocal = ref(null)
const videoUploadProgress = ref(0)
const videoUploadStatus = ref('')
const frameVideoRef = ref(null)
const frameSeekTime = ref(0)
const frameVideoDuration = ref(0)
const frameVideoObjectUrl = ref(null)
const videoFileInput = ref(null)
const expandedModuleIds = ref(new Set())
const showAllModules = ref(false)
const activeTab = ref('overview')
const lessonCompletionById = ref({})
const customCourseCoverDesktop = '/curso-capa-personalizada.png'
const customCourseCoverMobile = '/curso-capa-personalizada-mobile.png'
const isMobile = ref(false)

const modules = computed(() => course.value?.modules || [])
const courseCover = computed(() => {
  const fallback = isMobile.value ? customCourseCoverMobile : customCourseCoverDesktop
  if (isMobile.value) return course.value?.thumbnailMobile || course.value?.thumbnail || fallback
  if (course.value?.thumbnail) return course.value.thumbnail
  return fallback
})
const modulesCount = computed(() => modules.value.length)
const totalLessons = computed(() => modules.value.reduce((sum, module) => sum + (module.lessons?.length || 0), 0))
const expandedCount = computed(() => expandedModuleIds.value.size)
const expandedPct = computed(() => modulesCount.value ? Math.round((expandedCount.value / modulesCount.value) * 100) : 0)
const ratingValue = computed(() => Number(course.value?.rating || 4.9))
const ratingLabel = computed(() => ratingValue.value.toFixed(2).replace('.', ','))
const reviewsCountLabel = computed(() => Number(course.value?.reviewsCount || 660).toLocaleString('pt-BR'))
const displayedModules = computed(() => {
  if (showAllModules.value) return modules.value
  return modules.value.slice(0, 5)
})
const totalDurationLabel = computed(() => `${Math.max(totalLessons.value * 3, 3)} min`)
const overviewParagraphs = computed(() => {
  const raw = String(course.value?.description || '').trim()
  if (!raw) {
    return [
      'Nesta trilha, você percorre os conceitos essenciais do curso de forma prática, com foco em execução e entendimento progressivo.',
      'Ao avançar pelos módulos, você consolida fundamentos e aplica os aprendizados em cenários reais para evoluir com consistência.'
    ]
  }

  const normalized = raw.replace(/\s+/g, ' ')
  const parts = normalized.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (parts.length === 1) {
    return [parts[0], 'Continue pelas aulas para aprofundar os conceitos e aplicar cada etapa na prática.']
  }
  return [
    parts.slice(0, Math.ceil(parts.length / 2)).join(' '),
    parts.slice(Math.ceil(parts.length / 2)).join(' ')
  ]
})
const courseTags = computed(() => {
  const tags = ['Formação', 'Prático', `${modulesCount.value} módulos`, `${totalLessons.value} aulas`]
  return tags
})
const projectLessons = computed(() => {
  const allLessons = modules.value.flatMap((module) => (module.lessons || []).map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })))
  return allLessons.filter((lesson) => /projeto|desafio|prátic/i.test(`${lesson.title || ''} ${lesson.content || ''}`))
})
const quizzesDone = computed(() => Math.max(1, Math.round(totalLessons.value * 0.5)))
const quizPct = computed(() => Math.min(100, Math.round((quizzesDone.value / Math.max(totalLessons.value, 1)) * 100)))
const complementaryPct = computed(() => Math.min(100, Math.round((projectLessons.value.length / Math.max(totalLessons.value, 1)) * 100)))
const totalLessonMinutes = computed(() => {
  return modules.value.reduce((sum, module) => {
    return sum + (module.lessons || []).reduce((lessonSum, lesson) => lessonSum + parseDurationToMinutes(lesson.duration), 0)
  }, 0)
})
const totalHoursAndMinutes = computed(() => formatMinutes(totalLessonMinutes.value))
const courseCreatedAtLabel = computed(() => formatDate(course.value?.createdAt || course.value?.created_at))
const courseExpiresAtLabel = computed(() => {
  const rawDate = course.value?.expiresAt || course.value?.expires_at
  if (rawDate) return formatDate(rawDate)
  if (!course.value?.createdAt && !course.value?.created_at) return 'Sem prazo'
  const baseDate = new Date(course.value?.createdAt || course.value?.created_at)
  if (Number.isNaN(baseDate.getTime())) return 'Sem prazo'
  baseDate.setFullYear(baseDate.getFullYear() + 2)
  return formatDate(baseDate.toISOString())
})
const studentsCountLabel = computed(() => {
  const count = Number(course.value?.studentsCount || course.value?.students_count || 0)
  return count > 0 ? count.toLocaleString('pt-BR') : '--'
})
const overviewDetails = computed(() => [
  { label: 'Horas de estudo', value: `Aprox. ${totalHoursAndMinutes.value}`, icon: Clock3 },
  { label: 'Aulas', value: totalLessonMinutes.value > 0 ? `${totalLessons.value} aulas em ${totalHoursAndMinutes.value}` : `${totalLessons.value} aulas`, icon: BookCheck },
  { label: 'Alunos desta trilha', value: studentsCountLabel.value, icon: Users },
  { label: 'Nível de dificuldade', value: course.value?.difficulty || course.value?.level || 'Iniciante', icon: ChartNoAxesColumn },
  { label: 'Início da jornada', value: courseCreatedAtLabel.value, icon: CalendarDays },
  { label: 'Fim do acesso', value: courseExpiresAtLabel.value, icon: CalendarDays },
  { label: 'Atividades', value: `${projectLessons.value.length} projetos e ${quizzesDone.value} quizzes`, icon: CodeXml }
])
const educatorList = computed(() => {
  const buckets = [
    course.value?.nutritionists,
    course.value?.nutricionistas,
    course.value?.courseNutritionists,
    course.value?.nutritionist,
    course.value?.nutricionista,
    course.value?.educators,
    course.value?.instructors,
    course.value?.teachers
  ]
  const fromCourse = buckets.flatMap(toArray)

  // Fallback inteligente: alguns backends retornam o nutricionista no módulo/aula.
  const fromLessons = modules.value.flatMap((module) => {
    return (module.lessons || []).flatMap((lesson) => {
      return [
        lesson.nutritionist,
        lesson.nutricionista,
        lesson.instructor,
        lesson.teacher,
        lesson.educator,
        lesson.author
      ].flatMap(toArray)
    })
  })

  const merged = [...fromCourse, ...fromLessons]
  const normalized = merged
    .map((person, index) => normalizeEducator(person, index))
    .filter(Boolean)

  const uniqueById = new Map()
  normalized.forEach((person) => {
    const key = `${person.id}-${person.name}`.toLowerCase()
    if (!uniqueById.has(key)) uniqueById.set(key, person)
  })

  if (uniqueById.size) return Array.from(uniqueById.values())

  return [{
    id: 'unassigned-nutritionist',
    name: 'Nutricionista não vinculado',
    role: 'Vincule um nutricionista ao curso',
    avatar: 'https://ui-avatars.com/api/?name=Nutricionista&background=0b1020&color=ffffff'
  }]
})

const openLessonPlayer = (module, lesson) => {
  if (!module?.id || !lesson?.id) return
  navigateTo(`/modulos/${module.id}?lessonId=${lesson.id}`)
}

const isModuleExpanded = (moduleId) => expandedModuleIds.value.has(moduleId)

const toggleModule = (moduleId) => {
  const next = new Set(expandedModuleIds.value)
  if (next.has(moduleId)) next.delete(moduleId)
  else next.add(moduleId)
  expandedModuleIds.value = next
}

const getModuleProgressPct = (module) => {
  const lessons = module?.lessons?.length || 0
  if (!totalLessons.value) return 0
  const pct = Math.round((lessons / totalLessons.value) * 100)
  return Math.max(8, Math.min(100, pct))
}

const isLessonCompleted = (lesson) => {
  if (!lesson || typeof lesson !== 'object') return false
  if (lessonCompletionById.value[lesson.id] !== undefined) {
    return Boolean(lessonCompletionById.value[lesson.id])
  }
  return Boolean(
    lesson.completed
    || lesson.isCompleted
    || lesson.done
    || lesson.finished
    || lesson.completedAt
    || lesson.completed_at
    || lesson.progress === 100
    || lesson.progress === '100'
    || lesson.progressPercent === 100
    || lesson.progress_percentage === 100
    || lesson.watchProgress === 100
    || lesson.watched
    || lesson.status === 'COMPLETED'
    || lesson.status === 'completed'
  )
}

const toggleShowAllModules = () => {
  showAllModules.value = !showAllModules.value
}

const moduleOrder = (moduleId) => {
  const idx = modules.value.findIndex((module) => module.id === moduleId)
  return idx >= 0 ? idx + 1 : 1
}

const parseDurationToMinutes = (duration) => {
  if (!duration) return 0
  const text = String(duration).toLowerCase().trim()
  const directNumber = Number(text)
  if (!Number.isNaN(directNumber) && directNumber > 0) return directNumber

  const hourMatch = text.match(/(\d+)\s*h/)
  const minuteMatch = text.match(/(\d+)\s*min/)
  const hours = hourMatch ? Number(hourMatch[1]) : 0
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
  return (hours * 60) + minutes
}

const formatMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (!restMinutes) return `${hours}h`
  return `${hours}h ${restMinutes}min`
}

const formatDate = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('pt-BR')
}

const toArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return [value]
  return []
}

const normalizeEducator = (person, index) => {
  if (!person || typeof person !== 'object') return null
  const name = person.name || person.fullName || person.nome || person.usuario?.nome || person.user?.name
  if (!name) return null

  const avatar = person.avatar
    || person.photo
    || person.profilePicture
    || person.profile_picture
    || person.image
    || person.user?.avatar
    || person.user?.photo
    || person.usuario?.avatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b1020&color=ffffff`

  const role = person.role
    || person.title
    || person.profession
    || person.specialty
    || 'Nutricionista da formação'

  return {
    id: person.id || person.userId || person.usuarioId || `nutritionist-${index}`,
    name,
    role,
    avatar
  }
}

const scrollToFirstModule = () => {
  const firstModuleElement = document.querySelector('.module-card')
  firstModuleElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const parseCompletionFromProgress = (progressData) => {
  if (!progressData) return false
  const payload = Array.isArray(progressData) ? progressData[0] : progressData
  if (!payload || typeof payload !== 'object') return false

  return Boolean(
    payload.watched
    || payload.completed
    || payload.isCompleted
    || payload.finished
    || payload.completedAt
    || payload.completed_at
    || payload.progress === 100
    || payload.progressPercent === 100
    || payload.progress_percentage === 100
    || payload.watchProgress === 100
    || payload.status === 'COMPLETED'
    || payload.status === 'completed'
  )
}

const fetchLessonsProgress = async (courseData, token) => {
  const lessonIds = (courseData?.modules || [])
    .flatMap((module) => module?.lessons || [])
    .map((lesson) => lesson?.id)
    .filter(Boolean)

  if (!lessonIds.length || !token) return

  const entries = await Promise.all(lessonIds.map(async (lessonId) => {
    try {
      const progressData = await $fetch(`http://localhost:3001/api/courses/lessons/${lessonId}/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return [lessonId, parseCompletionFromProgress(progressData)]
    } catch {
      return [lessonId, undefined]
    }
  }))

  const nextMap = {}
  entries.forEach(([lessonId, completed]) => {
    if (completed !== undefined) nextMap[lessonId] = completed
  })
  lessonCompletionById.value = nextMap
}

const openAddLessonAction = () => {
  const firstModuleId = course.value?.modules?.[0]?.id
  if (!firstModuleId) {
    alert('Este curso ainda não possui módulo. Crie um módulo antes de adicionar aulas.')
    return
  }
  currentModuleIdForLesson.value = firstModuleId
  newLesson.title = ''
  newLesson.videoUrl = ''
  newLesson.duration = ''
  newLesson.thumbnail = ''
  lessonThumbPreview.value = null
  lessonThumbFile.value = null
  resetLessonVideoState()
  showLessonModal.value = true
}

const triggerLessonThumbUpload = () => {
  lessonThumbInput.value?.click()
}

const handleLessonThumbSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  lessonThumbFile.value = file
  lessonThumbPreview.value = URL.createObjectURL(file)
}

const triggerVideoUpload = () => {
  videoFileInput.value?.click()
}

const handleVideoFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  videoFileLocal.value = file
  if (frameVideoObjectUrl.value) URL.revokeObjectURL(frameVideoObjectUrl.value)
  frameVideoObjectUrl.value = URL.createObjectURL(file)
  frameSeekTime.value = 0
  frameVideoDuration.value = 0
  thumbSourceTab.value = 'frame'
}

const onFrameVideoLoaded = () => {
  if (!frameVideoRef.value) return
  const duration = frameVideoRef.value.duration || 0
  frameVideoDuration.value = duration
  if (!newLesson.duration && duration > 0) {
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60).toString().padStart(2, '0')
    newLesson.duration = `${minutes}:${seconds} min`
  }
}

const onFrameSeekInput = (event) => {
  const time = parseFloat(event.target.value)
  frameSeekTime.value = time
  if (frameVideoRef.value) frameVideoRef.value.currentTime = time
}

const captureVideoFrame = () => {
  const video = frameVideoRef.value
  if (!video) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 360
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob((blob) => {
    if (!blob) return
    lessonThumbFile.value = new File([blob], 'frame_capture.jpg', { type: 'image/jpeg' })
    lessonThumbPreview.value = URL.createObjectURL(blob)
  }, 'image/jpeg', 0.92)
}

const isYoutube = (url) => /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(String(url || ''))

const applyYoutubeThumb = () => {
  const url = newLesson.videoUrl || ''
  let videoId = ''
  if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0] || ''
  else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
  if (!videoId) return
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  lessonThumbPreview.value = thumbUrl
  newLesson.thumbnail = thumbUrl
}

const handleVideoUpload = async () => {
  if (!videoFileLocal.value) return
  const token = localStorage.getItem('auth_token')
  videoUploadStatus.value = 'uploading'
  videoUploadProgress.value = 0

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', videoFileLocal.value)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'http://localhost:3001/api/upload/video')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        videoUploadProgress.value = Math.round((event.loaded / event.total) * 100)
      }
    })
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText)
        videoUploadStatus.value = 'done'
        newLesson.videoUrl = data.url
        resolve(data.url)
      } else {
        videoUploadStatus.value = 'error'
        reject(new Error('Erro no upload do vídeo'))
      }
    }
    xhr.onerror = () => {
      videoUploadStatus.value = 'error'
      reject(new Error('Erro de rede no upload'))
    }
    xhr.send(formData)
  })
}

const resetLessonVideoState = () => {
  videoSourceTab.value = 'link'
  thumbSourceTab.value = 'upload'
  videoFileLocal.value = null
  videoUploadProgress.value = 0
  videoUploadStatus.value = ''
  frameSeekTime.value = 0
  frameVideoDuration.value = 0
  if (frameVideoObjectUrl.value) {
    URL.revokeObjectURL(frameVideoObjectUrl.value)
    frameVideoObjectUrl.value = null
  }
}

const handleCreateLessonFromDetail = async () => {
  if (!newLesson.title) return alert('Título é obrigatório.')
  if (videoSourceTab.value === 'link' && !newLesson.videoUrl) return alert('Informe o link do vídeo.')
  if (videoSourceTab.value === 'upload' && !videoFileLocal.value && !newLesson.videoUrl) return alert('Selecione um vídeo para upload.')

  uploading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    if (videoSourceTab.value === 'upload' && videoFileLocal.value && !newLesson.videoUrl) {
      await handleVideoUpload()
    }

    let finalThumbnail = newLesson.thumbnail
    if (lessonThumbFile.value) {
      const formData = new FormData()
      formData.append('file', lessonThumbFile.value)
      const uploadRes = await $fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      finalThumbnail = uploadRes.url
    }

    if (!newLesson.videoUrl) throw new Error('Não foi possível obter URL do vídeo.')

    await $fetch('http://localhost:3001/api/courses/lessons', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        moduleId: currentModuleIdForLesson.value,
        title: newLesson.title,
        videoUrl: newLesson.videoUrl,
        duration: newLesson.duration || null,
        thumbnail: finalThumbnail || null,
        order: 0
      }
    })

    showLessonModal.value = false
    resetLessonVideoState()
    await fetchCourse()
  } catch (err) {
    alert(`Erro ao criar aula: ${err?.data?.message || err?.message || 'Falha ao salvar aula.'}`)
  } finally {
    uploading.value = false
  }
}

const fetchCourse = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`http://localhost:3001/api/courses/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    course.value = data
    expandedModuleIds.value = new Set(data.modules?.[0]?.id ? [data.modules[0].id] : [])
    await fetchLessonsProgress(data, token)
  } catch (err) {
    console.error('Erro ao carregar curso:', err)
  }
}

const updateIsMobile = () => {
  if (process.server) return
  isMobile.value = window.matchMedia('(max-width: 640px)').matches
}

onMounted(() => {
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  fetchCourse()
})

onBeforeUnmount(() => {
  if (process.server) return
  window.removeEventListener('resize', updateIsMobile)
  if (lessonThumbPreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(lessonThumbPreview.value)
  }
})
</script>

<style scoped>
.lesson-design-page {
  min-height: 100%;
  background: #090b12;
  color: #f4f6fb;
  padding: 84px 120px 24px;
}

.top-hero {
  position: relative;
  background: radial-gradient(circle at 20% 20%, rgba(45, 90, 39, 0.2), transparent 40%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 2rem;
  overflow: hidden;
  margin-left: -120px;
  margin-right: -120px;
}

.hero-bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.3;
}

.hero-bg-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(7, 9, 14, 0.72) 0%, rgba(7, 9, 14, 0.86) 70%, rgba(7, 9, 14, 0.96) 100%),
    linear-gradient(90deg, rgba(8, 10, 16, 0.5) 0%, rgba(8, 10, 16, 0) 100%);
}

.back-btn,
.hero-grid {
  position: relative;
  z-index: 1;
}

.hero-inner {
  position: relative;
  z-index: 1;
  padding: 0 120px;
}

.back-btn {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  cursor: pointer;
  margin-bottom: 1rem;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 1rem;
  align-items: start;
}

.hero-copy h1 {
  font-size: clamp(1.8rem, 2.9vw, 2.6rem);
  margin-bottom: 0.6rem;
}

.hero-description {
  color: rgba(255, 255, 255, 0.74);
  max-width: 70ch;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  margin-top: 0.7rem;
}

.chip {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.78);
}

.rating-row {
  margin-top: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.stars-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.stars-inline .dim {
  opacity: 0.35;
}

.orb-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 5px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 18px rgba(255, 156, 68, 0.35);
}

.tabs-wrap {
  margin: 0.85rem 0 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.tabs-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tab-btn {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.68);
  padding: 0.55rem 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
}

.tab-btn.active {
  color: #fff;
  border-bottom-color: #8f71ff;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.65fr);
  gap: 1rem;
  align-items: start;
}

.overview-card,
.module-card,
.side-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(14, 17, 28, 0.92);
}

.overview-card {
  margin-bottom: 1rem;
  overflow: hidden;
}

.overview-media {
  position: relative;
}

.overview-cover {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
}

.overview-media-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(6, 9, 14, 0.04) 0%, rgba(6, 9, 14, 0.18) 58%, rgba(6, 9, 14, 0.48) 86%, rgba(6, 9, 14, 0.78) 100%),
    radial-gradient(circle at 50% 100%, rgba(6, 9, 14, 0.55) 0%, rgba(6, 9, 14, 0) 55%);
}

.overview-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.85);
}

.overview-duration-pill {
  position: absolute;
  right: 0.9rem;
  bottom: 0.85rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  background: rgba(8, 10, 14, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.overview-title-on-media {
  position: absolute;
  left: 1rem;
  bottom: 0.8rem;
  margin: 0;
  font-size: 1.7rem;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
}

.overview-body {
  padding: 1rem 1rem 1.15rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.overview-body p {
  color: rgba(15, 23, 42, 0.88);
  line-height: 1.58;
  margin-bottom: 1rem;
}

.overview-body p:last-child {
  margin-bottom: 0;
}

.content-summary-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(14, 17, 28, 0.92);
  margin-bottom: 1rem;
  padding: 0.9rem;
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.summary-action {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
}

.summary-rows {
  display: grid;
  gap: 0.35rem;
}

.summary-row {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 68px 40px;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  text-align: left;
  cursor: pointer;
}

.summary-row-main {
  min-width: 0;
}

.summary-level {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.56);
}

.summary-title {
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-meta {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.62);
}

.summary-progress-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.summary-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2cd8a6, #51e0bb);
}

.summary-progress-pct {
  font-size: 0.72rem;
  text-align: right;
}

.details-heading {
  margin: 0.25rem 0 0.75rem;
}

.content-alert-card {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(160deg, rgba(18, 21, 31, 0.95), rgba(12, 15, 24, 0.95));
  border-radius: 12px;
  padding: 0.95rem 1rem;
  margin-bottom: 0.9rem;
}

.alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.45rem;
}

.alert-head-main {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.alert-icon {
  color: rgba(255, 255, 255, 0.86);
}

.alert-close {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  line-height: 1;
}

.content-alert-card p {
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 0.75rem;
  font-size: 0.83rem;
}

.projects-wrap {
  display: grid;
  gap: 0.7rem;
}

.overview-bottom-stack {
  display: grid;
  gap: 0.9rem;
  margin-top: 0.5rem;
}

.overview-extra-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(10, 13, 22, 0.92);
  padding: 1rem;
}

.overview-extra-title {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 0.85rem;
}

.educator-list {
  display: grid;
}

.educator-item {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.72rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.educator-item:first-child {
  border-top: none;
  padding-top: 0;
}

.educator-item:last-child {
  padding-bottom: 0;
}

.educator-avatar {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  object-fit: cover;
}

.educator-main strong {
  font-size: 1.02rem;
}

.educator-main p {
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.65);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.72rem 1.2rem;
}

.details-item {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 0.58rem;
  align-items: start;
}

.details-icon {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.details-label {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.16rem;
  font-size: 0.87rem;
}

.details-value {
  font-size: 1.04rem;
}

.project-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(14, 17, 28, 0.92);
  padding: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.project-main h3 {
  margin-bottom: 0.3rem;
}

.project-main p {
  color: rgba(255, 255, 255, 0.74);
  line-height: 1.45;
  margin-bottom: 0.55rem;
}

.project-module {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.64);
}

.project-action {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  padding: 0.5rem 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.project-empty {
  border: 1px dashed rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.module-card {
  padding: 0.9rem;
  margin-bottom: 0.8rem;
}

.content-module-card {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(10, 13, 22, 0.9);
}

.module-head {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  cursor: pointer;
  margin-bottom: 0.7rem;
}

.module-head p {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.86rem;
}

.module-level {
  color: rgba(197, 201, 214, 0.62) !important;
  font-size: 0.68rem !important;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.18rem;
}

.chev {
  transition: transform 0.2s;
}

.chev.open {
  transform: rotate(180deg);
}

.lesson-list {
  display: grid;
  gap: 0.45rem;
}

.lesson-row {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  width: 100%;
  color: inherit;
  display: grid;
  grid-template-columns: 34px 86px minmax(0, 1fr) 72px;
  gap: 0.65rem;
  align-items: center;
  text-align: left;
  padding: 0.45rem;
  cursor: pointer;
}

.lesson-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

.content-lesson-row {
  border-radius: 12px;
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.lesson-thumb {
  width: 86px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.lesson-subtitle {
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.83rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lesson-status {
  margin-top: 0.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  font-size: 0.73rem;
  color: rgba(255, 255, 255, 0.52);
}

.lesson-status.completed {
  color: #20e3c2;
  font-weight: 600;
}

.lesson-row.is-completed {
  border-color: rgba(32, 227, 194, 0.35);
}

.lesson-time {
  text-align: right;
  font-weight: 700;
  font-size: 0.85rem;
}

.empty-text {
  color: rgba(255, 255, 255, 0.68);
}

.right-column {
  position: sticky;
  top: 86px;
  display: grid;
  gap: 0.8rem;
}

.side-card {
  padding: 0.85rem;
}

.side-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.progress-track {
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #39d6a7, #56e5ba);
}

.cta-side,
.ghost-side,
.link-side {
  width: 100%;
  margin-top: 0.65rem;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
}

.ghost-side {
  justify-content: space-between;
}

.link-side {
  justify-content: flex-start;
}

.side-text {
  color: rgba(255, 255, 255, 0.72);
  margin-top: 0.35rem;
}

.detailed-progress-card {
  border-color: rgba(255, 255, 255, 0.16);
}

.help-icon-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.mini-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.56);
  margin: 0.25rem 0 0.62rem;
}

.mini-label.complement {
  margin-top: 0.85rem;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 84px 38px;
  gap: 0.4rem 0.6rem;
  align-items: center;
  margin-bottom: 0.42rem;
}

.detail-name {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.9);
}

.detail-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.detail-icon {
  width: 15px;
  height: 15px;
  color: #20e3c2;
}

.detail-count {
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.68);
}

.detail-pct {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.92);
  text-align: right;
}

.detail-progress {
  height: 5px;
  background: rgba(90, 93, 121, 0.48);
}

.detail-progress .progress-fill {
  background: #20e3c2;
}

.content-link-side {
  justify-content: flex-start;
  gap: 0.55rem;
}

.link-side-arrow {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.56);
}

.loading-state {
  min-height: 70vh;
  display: grid;
  place-items: center;
}

.loader-card {
  border-radius: 12px;
  border: 1px solid #e9ecef;
  background: #fff;
  padding: 1.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.loader-icon {
  width: 20px;
  height: 20px;
}

.i-sm {
  width: 18px;
  height: 18px;
}

.i-xs {
  width: 14px;
  height: 14px;
}

.fill {
  fill: currentColor;
}

/* Tema claro para a tela de detalhes do curso */
.lesson-design-page {
  background: #f7f9fc;
  color: #0f172a;
}

.top-hero {
  background: radial-gradient(circle at 20% 20%, rgba(76, 175, 80, 0.14), transparent 42%);
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
}

.hero-bg-image {
  opacity: 0.42;
}

.hero-bg-overlay {
  background:
    linear-gradient(180deg, rgba(247, 249, 252, 0.66) 0%, rgba(247, 249, 252, 0.82) 72%, rgba(247, 249, 252, 0.95) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0) 100%);
}

.back-btn,
.hero-description,
.chip,
.tab-btn,
.summary-meta,
.module-head p,
.lesson-subtitle,
.empty-text,
.side-text,
.details-label,
.mini-label,
.detail-count {
  color: rgba(15, 23, 42, 0.72);
}

.tabs-wrap {
  border-bottom-color: rgba(15, 23, 42, 0.12);
}

.tab-btn.active {
  color: #0f172a;
  border-bottom-color: #2563eb;
}

.overview-card,
.module-card,
.side-card,
.content-summary-card,
.overview-extra-card,
.content-alert-card,
.project-card {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.12);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
}

.lesson-row,
.content-lesson-row {
  background: #f8fafc;
  border-color: rgba(15, 23, 42, 0.1);
}

.lesson-row:hover {
  background: #f1f5f9;
}

.progress-track,
.summary-progress-track,
.detail-progress {
  background: rgba(15, 23, 42, 0.12);
}

/* Correção de contraste de textos no tema light */
.hero-copy h1,
.rating-row,
.summary-title,
.lesson-title,
.details-heading,
.overview-extra-title,
.project-main h3,
.side-head h4,
.details-value,
.educator-main strong,
.module-head h3 {
  color: #0f172a;
}

.summary-level,
.module-level,
.summary-meta,
.module-head p,
.lesson-subtitle,
.side-text,
.details-label,
.educator-main p,
.project-main p,
.project-module,
.mini-label,
.detail-count,
.empty-text {
  color: rgba(15, 23, 42, 0.68) !important;
}

.alert-head-main strong,
.content-alert-card h4,
.content-alert-card p {
  color: #0f172a;
}

.alert-close {
  color: rgba(15, 23, 42, 0.62);
}

.summary-action,
.project-action,
.cta-side,
.ghost-side,
.link-side {
  color: #0f172a;
  border-color: rgba(15, 23, 42, 0.14);
  background: #ffffff;
}

.link-side-arrow,
.dim-text {
  color: rgba(15, 23, 42, 0.52);
}

.detail-pct,
.summary-progress-pct,
.lesson-time {
  color: #0f172a;
}

@media (max-width: 960px) {
  .lesson-design-page {
    padding: 84px 20px 24px;
  }

  .top-hero {
    margin-left: -20px;
    margin-right: -20px;
  }

  .hero-inner {
    padding: 0 20px;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .right-column {
    position: static;
  }

  .hero-grid {
    grid-template-columns: 1fr;
  }

  .lesson-row {
    grid-template-columns: 30px 82px minmax(0, 1fr);
  }

  .lesson-time {
    grid-column: 2 / -1;
    text-align: left;
  }

  .detail-row {
    grid-template-columns: minmax(0, 1fr) auto 72px 34px;
    gap: 0.35rem;
  }

  .educator-item {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .educator-avatar {
    width: 40px;
    height: 40px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 18, 0.62);
  backdrop-filter: blur(4px);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  width: min(720px, 96vw);
  max-height: 92vh;
  overflow: auto;
  border-radius: 16px;
  background: #fff;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.08);
  padding: 1.1rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.btn-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #f8fafc;
  cursor: pointer;
}

.form-group {
  margin-bottom: 0.8rem;
}

.form-group label {
  display: block;
  font-size: 0.86rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.form-group input,
.form-group select {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  font-family: inherit;
}

.file-input-hidden {
  display: none;
}

.upload-preview {
  margin-top: 0.5rem;
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}

.btn-cancel,
.btn-primary {
  border-radius: 10px;
  padding: 0.62rem 1rem;
  border: none;
  cursor: pointer;
  font-weight: 700;
}

.btn-cancel {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-primary {
  background: #1f5a25;
  color: #fff;
}

.modal-card--lesson {
  width: min(780px, 96vw);
}

.modal-subtitle {
  color: #64748b;
  margin-bottom: 0.85rem;
}

.tab-pills {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.tab-pill {
  flex: 1;
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.58rem 0.7rem;
  font-weight: 700;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
}

.tab-pill.active {
  background: #ffffff;
  border-color: #1f5a25;
  color: #1f5a25;
}

.tab-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.xs-icon {
  width: 14px;
  height: 14px;
}

.tab-content {
  margin-top: 0.55rem;
}

.video-upload-area,
.lesson-upload-area {
  border: 1px dashed rgba(15, 23, 42, 0.22);
  border-radius: 10px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  color: #64748b;
  text-align: center;
  padding: 0.65rem;
}

.video-selected-info {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #334155;
}

.btn-mini {
  border: 1px solid rgba(15, 23, 42, 0.2);
  background: #fff;
  border-radius: 8px;
  padding: 0.2rem 0.45rem;
  cursor: pointer;
}

.upload-progress-bar {
  margin-top: 0.5rem;
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.upload-progress-bar span {
  position: absolute;
  right: 8px;
  top: -20px;
  font-size: 0.75rem;
  color: #475569;
}

.upload-done {
  margin-top: 0.45rem;
  color: #16a34a;
  font-size: 0.85rem;
  font-weight: 700;
}

.upload-error {
  margin-top: 0.45rem;
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 700;
}

.upload-icon {
  width: 26px;
  height: 26px;
}

.frame-video-preview {
  width: 100%;
  border-radius: 10px;
  background: #000;
}

.frame-controls {
  margin-top: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.frame-slider {
  width: 100%;
}

.btn-capture {
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 8px;
  background: #f8fafc;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
</style>
