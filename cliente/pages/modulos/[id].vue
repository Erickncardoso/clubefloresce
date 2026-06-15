<template>
  <NuxtLayout :name="layoutName">
    <div
      v-if="moduleData"
      class="aula-page"
      :class="{ 'aula-page--mobile': isPatientApp }"
    >
      <PlayerNavigation
        :is-open="isLessonMenuOpen"
        :course-title="moduleData.course?.title"
        :module-title="moduleData.title"
        :course-thumbnail="moduleData.course?.thumbnail"
        @close="isLessonMenuOpen = false"
      />

      <section class="section-aula">
        <div class="aula-mobile-bar">
          <button type="button" class="aula-mobile-bar__menu" aria-label="Abrir menu" @click="isLessonMenuOpen = true">
            <Menu :size="20" />
          </button>
          <div v-if="moduleData.course?.thumbnail" class="aula-mobile-bar__thumb">
            <img :src="moduleData.course.thumbnail" alt="" />
          </div>
          <p class="aula-mobile-bar__title">{{ moduleData.course?.title || moduleData.title }}</p>
        </div>

        <div class="layout-aula">
          <div class="coluna-principal">
            <div class="player">
              <CoursesCourseVideoPlayer
                v-if="activeLesson"
                ref="videoPlayerRef"
                :key="activeLesson.id"
                :video-url="activeVideoUrl"
                :youtube-id="activeYoutubeId || ''"
                :poster="activeLesson.thumbnail || activeLesson.cover || ''"
                :caption-url="activeCaptionUrl"
                :lesson-id="activeLesson.id"
                :transcription="activeLesson.transcription || []"
                @ended="handleVideoEnded"
                @timeupdate="videoCurrentTime = $event"
              >
                <template v-if="!activeVideoUrl && !activeYoutubeId" #empty>
                  <PlayCircle :size="48" />
                  <p>Esta aula ainda não possui vídeo configurado.</p>
                  <small v-if="activeVideoDebugLabel">{{ activeVideoDebugLabel }}</small>
                </template>
              </CoursesCourseVideoPlayer>
              <CoursesCourseVideoPlayer v-else />
              </div>

            <header v-if="activeLesson" class="cabecalho-aula">
              <div class="cabecalho-aula__info">
                <span class="aula-numero">Aula {{ activeLessonIndex + 1 }}</span>
                <h1>{{ activeLesson.title }}</h1>
                <span class="aula-duracao">
                  <Clock :size="14" />
                  {{ activeLesson.duration || '—' }}
                </span>
                </div>
              <div class="cabecalho-aula__acoes">
                <button 
                  type="button"
                  class="btn-concluida"
                  :class="{ 'is-done': isLessonWatched(activeLesson.id) }"
                  @click="toggleProgress(activeLesson.id, 'watched')"
                >
                  <FlorescerPlayerIcons :name="isLessonWatched(activeLesson.id) ? 'check' : 'check-limpo'" />
                  {{ isLessonWatched(activeLesson.id) ? 'Concluída' : 'Marcar concluída' }}
                </button>
                <button 
                  type="button"
                  class="btn-aula-icon"
                  :class="{ 'is-active': getLessonProgress(activeLesson.id)?.favorited }"
                  title="Favoritar"
                  @click="toggleProgress(activeLesson.id, 'favorited')"
                >
                  <Heart
                    :size="18"
                    :fill="getLessonProgress(activeLesson.id)?.favorited ? 'currentColor' : 'none'"
                  />
                </button>
              </div>
            </header>

            <div v-if="activeLesson" class="abas" :class="{ 'abas--transcricao': activeTab === 'transcricao' }">
              <nav class="abas-aula" aria-label="Conteúdo da aula">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  type="button"
                  class="aba-aula"
                  :class="{
                    'is-active': activeTab === tab.id,
                    'aba-aula--aulas': tab.id === 'aulas',
                  }"
                  @click="activeTab = tab.id"
                >
                  <FlorescerPlayerIcons
                    v-if="tab.florescerIcon"
                    :name="tab.florescerIcon"
                    class="aba-aula__icon"
                  />
                  <component v-else :is="tab.icon" class="aba-aula__icon" />
                  {{ tab.label }}
                </button>
              </nav>

              <div
                class="conteudoAba"
                :class="{
                  'conteudoAba--aulas': activeTab === 'aulas',
                  'conteudoAba--transcricao': activeTab === 'transcricao',
                }"
              >
                <Transition name="fade-tab" mode="out-in">
                  <div :key="activeTab">
                    <template v-if="activeTab === 'resumo'">
                      <CoursesLessonSummaryContent
                        :content="activeLesson.content || ''"
                      />
                    </template>

                    <template v-else-if="activeTab === 'transcricao'">
                      <CoursesLessonTranscriptionPanel
                        :key="`transcription-${activeLesson.id}`"
                        :lesson-id="activeLesson.id"
                        :video-url="activeVideoUrl"
                        :transcription="activeLesson.transcription || []"
                        :current-time="videoCurrentTime"
                        @seek="seekToTranscriptionLine({ seconds: $event })"
                      />
                    </template>

                    <template v-else-if="activeTab === 'quiz'">
                      <div class="conteudoAba__vazio">
                        <ClipboardList class="conteudoAba__vazio-icon" />
                        <p>O quiz desta aula será liberado em breve.</p>
                </div>
                    </template>

                    <template v-else-if="activeTab === 'anotacoes'">
                      <CoursesLessonNotesPanel
                        :key="`notes-${activeLesson.id}`"
                        :lesson-id="activeLesson.id"
                        :current-time="videoCurrentTime"
                        @seek="seekToTranscriptionLine({ seconds: $event })"
                      />
                    </template>

                    <template v-else-if="activeTab === 'aulas'">
                      <div class="aula-lista-mobile">
                        <div class="coluna-lateral__curso coluna-lateral__curso--inline">
                          <div v-if="moduleData.course?.thumbnail" class="coluna-lateral__thumb">
                            <img :src="moduleData.course.thumbnail" alt="" />
                          </div>
                          <div>
                            <p class="coluna-lateral__curso-nome">{{ moduleData.course?.title || moduleData.title }}</p>
                            <p class="coluna-lateral__curso-meta">
                              {{ moduleData.lessons?.length || 0 }} aulas · {{ totalDuration }}
                            </p>
                          </div>
                        </div>
                        <div class="aula-lista-mobile__lista">
                          <div
                            v-for="(lesson, index) in moduleData.lessons"
                            :key="lesson.id"
                            class="aula-lista-item"
                            :class="{
                              'is-active': activeLesson?.id === lesson.id,
                              'is-done': isLessonWatched(lesson.id),
                            }"
                            @click="setActiveLesson(lesson)"
                          >
                            <span class="aula-lista-item__num">
                              <CheckCircle2 v-if="isLessonWatched(lesson.id)" :size="12" />
                              <template v-else>{{ index + 1 }}</template>
                            </span>
                            <div class="aula-lista-item__thumb">
                              <img
                                v-if="lesson.thumbnail || lesson.cover || moduleData.course?.thumbnail"
                                :src="lesson.thumbnail || lesson.cover || moduleData.course?.thumbnail"
                                alt=""
                              />
                            </div>
                            <div>
                              <div class="aula-lista-item__titulo">{{ lesson.title }}</div>
                              <div class="aula-lista-item__dur">{{ lesson.duration || '0:00' }}</div>
                            </div>
                          </div>
                        </div>
                        <div v-if="nextModule" class="aula-lista-mobile__footer">
                          <button type="button" class="aula-proximo-modulo" @click="navigateTo(buildModuleUrl(nextModule))">
                            <PlayCircle :size="16" />
                            <span>Próximo: {{ nextModule.title }}</span>
                            <ArrowRight :size="14" />
                          </button>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="activeTab === 'links'">
                      <div v-if="activeLesson.materials?.length" class="aula-links-grid">
                        <a
                          v-for="(file, idx) in activeLesson.materials"
                          :key="idx"
                          :href="file.url"
                          target="_blank"
                          rel="noopener"
                          class="aula-link-card"
                        >
                          <span class="aula-link-card__icon">
                            <FileText :size="18" />
                          </span>
                          <div>
                            <div class="aula-link-card__nome">{{ file.name }}</div>
                            <div class="aula-link-card__meta">{{ file.size || 'Download' }}</div>
                </div>
                          <Download :size="16" />
                      </a>
                    </div>
                      <div v-else class="conteudoAba__vazio">
                        <Link class="conteudoAba__vazio-icon" />
                        <p>Não existem links ou materiais para esta aula.</p>
                  </div>
                    </template>
                  </div>
                </Transition>
              </div>
            </div>

          </div>

          <div
            v-if="isSidebarVisible"
            class="aula-sidebar-backdrop"
            aria-hidden="true"
            @click="isSidebarVisible = false"
          />

          <aside class="coluna-lateral" :class="{ 'is-open': isSidebarVisible }">
            <div class="coluna-lateral__tabs">
              <button
                type="button"
                :class="{ 'is-active': sidebarTab === 'aulas' }"
                @click="sidebarTab = 'aulas'"
              >
                Aulas
                                </button>
              <button
                type="button"
                :class="{ 'is-active': sidebarTab === 'comunidade' }"
                @click="sidebarTab = 'comunidade'"
              >
                Comunidade
                                </button>
                          </div>

            <template v-if="sidebarTab === 'aulas'">
              <div class="coluna-lateral__curso">
                <div v-if="moduleData.course?.thumbnail" class="coluna-lateral__thumb">
                  <img :src="moduleData.course.thumbnail" alt="" />
                            </div>
                <div>
                  <p class="coluna-lateral__curso-nome">{{ moduleData.course?.title || moduleData.title }}</p>
                  <p class="coluna-lateral__curso-meta">
                    {{ moduleData.lessons?.length || 0 }} aulas · {{ totalDuration }}
                  </p>
                      </div>
                    </div>
                    
              <div class="coluna-lateral__lista">
                <div
                  v-for="(lesson, index) in moduleData.lessons"
                  :key="lesson.id"
                  class="aula-lista-item"
                  :class="{
                    'is-active': activeLesson?.id === lesson.id,
                    'is-done': isLessonWatched(lesson.id),
                  }"
                  @click="setActiveLesson(lesson)"
                >
                  <span class="aula-lista-item__num">
                    <CheckCircle2 v-if="isLessonWatched(lesson.id)" :size="12" />
                    <template v-else>{{ index + 1 }}</template>
                  </span>
                  <div class="aula-lista-item__thumb">
                    <img
                      v-if="lesson.thumbnail || lesson.cover || moduleData.course?.thumbnail"
                      :src="lesson.thumbnail || lesson.cover || moduleData.course?.thumbnail"
                      alt=""
                    />
                    </div>
                  <div>
                    <div class="aula-lista-item__titulo">{{ lesson.title }}</div>
                    <div class="aula-lista-item__dur">{{ lesson.duration || '0:00' }}</div>
            </div>
          </div>
        </div>

              <div v-if="nextModule" class="coluna-lateral__footer">
                <button type="button" class="aula-proximo-modulo" @click="navigateTo(buildModuleUrl(nextModule))">
                  <PlayCircle :size="16" />
                  <span>Próximo: {{ nextModule.title }}</span>
                  <ArrowRight :size="14" />
            </button>
          </div>
            </template>

            <div v-else class="aula-comentarios coluna-lateral__lista">
              <div class="comentario-input">
                <div class="comentario-avatar">
                  <span v-if="!currentUser?.avatar">{{ currentUser?.name?.substring(0, 2).toUpperCase() || 'US' }}</span>
                  <img v-else :src="currentUser.avatar" alt="" />
            </div>
                <div class="comentario-input__campo">
                  <input
                    v-model="newCommentText"
                    type="text"
                    placeholder="Dúvida ou comentário..."
                    @keyup.enter="sendComment"
                  />
                  <button type="button" :disabled="!newCommentText.trim()" @click="sendComment">
                    <ArrowRight :size="14" />
                  </button>
            </div>
          </div>

              <div v-if="activeLessonComments.length" class="comentario-lista">
                <article
                  v-for="comment in activeLessonComments"
                  :key="comment.id"
                  class="comentario-item"
                  :class="{ 'is-instrutora': comment.author?.role === 'NUTRICIONISTA' }"
                >
                  <div class="comentario-avatar comentario-avatar--sm">
                    <span v-if="!comment.author?.avatar">{{ comment.author?.name?.substring(0, 2).toUpperCase() || 'NA' }}</span>
                    <img v-else :src="comment.author.avatar" alt="" />
                  </div>
                  <div class="comentario-corpo">
                    <div class="comentario-meta">
                      <span class="comentario-autor">{{ comment.author?.name }}</span>
                      <span v-if="comment.author?.role === 'NUTRICIONISTA'" class="comentario-badge">Instrutora</span>
                      <span class="comentario-data">{{ timeAgo(comment.createdAt) }}</span>
                </div>
                    <div v-if="editingCommentId === comment.id" class="comentario-editar">
                      <textarea v-model="editingContent" rows="3" @keyup.esc="cancelEdit" />
                      <div class="comentario-editar__acoes">
                        <button type="button" @click="cancelEdit">Cancelar</button>
                        <button type="button" class="is-primary" @click="saveEdit(comment.id)">Salvar</button>
              </div>
              </div>
                    <p v-else class="comentario-texto">{{ comment.content }}</p>
                    <div class="comentario-rodape">
                      <button
                        type="button"
                        class="comentario-like"
                        :class="{ 'is-liked': comment.likedBy?.some(u => u.id === currentUser?.id) }"
                        @click="toggleCommentLike(comment.id)"
                      >
                        <Heart
                          :size="12"
                          :fill="comment.likedBy?.some(u => u.id === currentUser?.id) ? 'currentColor' : 'none'"
                        />
                        {{ comment.likesCount || 0 }}
                      </button>
                      <template v-if="isAuthor(comment)">
                        <button type="button" @click="startEdit(comment)"><Pencil :size="12" /></button>
                        <button type="button" class="is-delete" @click="deleteComment(comment.id)"><Trash2 :size="12" /></button>
                      </template>
            </div>
                  </div>
                </article>
          </div>
          
              <div v-else class="painel-aula__vazio">
                <MessageSquare class="painel-aula__vazio-icon" />
                <p>Seja a primeira a comentar!</p>
            </div>
          </div>
        </aside>
      </div>
      </section>
    </div>

    <div v-else-if="loading" class="aula-loading">
      <div class="aula-loading__spinner" />
      <span>Carregando aula...</span>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { 
  Menu,
  PlayCircle, 
  CheckCircle2, 
  ArrowRight,
  MessageSquare,
  Download,
  Clock,
  Info,
  FileText,
  Pencil,
  Trash2,
  Heart,
  ClipboardList,
  Captions,
  Link,
  StickyNote,
} from 'lucide-vue-next'
import { ref, onMounted, computed, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter, navigateTo } from '#app'
import { getVideoCaptionUrl } from '~/utils/video-provider'
import { parseTranscriptionTimeToSeconds } from '~/utils/cloudinary-video'
import { buildModuleUrl, findLessonBySlug } from '~/utils/course-slug'
const route = useRoute()
const router = useRouter()
const moduleParam = computed(() => decodeURIComponent(String(route.params.id || '')))
const config = useRuntimeConfig()
const layoutName = computed(() => (config.public.mobileApp ? 'patient' : 'dashboard'))
const isPatientApp = computed(() => Boolean(config.public.mobileApp))
const apiBase = config.public.apiBase
const authApiBase = `${config.public.apiBase}/auth`
const moduleData = ref(null)
const loading = ref(true)
const activeLesson = ref(null)
const completedLessons = ref([])
const isLessonMenuOpen = ref(false)
const isTheaterMode = ref(false)
const isSidebarVisible = ref(false)
const isAutoplay = ref(true)
const activeTab = ref('resumo')
const sidebarTab = ref('aulas')
const showTheaterAlert = ref(false)
const videoPlayerRef = ref(null)
const videoCurrentTime = ref(0)

const tabs = [
  { id: 'resumo', label: 'Resumo', icon: Info },
  { id: 'transcricao', label: 'Transcrição', icon: Captions },
  { id: 'quiz', label: 'Quiz', icon: ClipboardList },
  { id: 'anotacoes', label: 'Anotações', icon: StickyNote },
  { id: 'links', label: 'Links', icon: Link },
  { id: 'aulas', label: 'Aulas', florescerIcon: 'quadros' },
]

const activeLessonIndex = computed(() => {
  if (!moduleData.value?.lessons || !activeLesson.value) return 0
  const idx = moduleData.value.lessons.findIndex((l) => l.id === activeLesson.value.id)
  return idx >= 0 ? idx : 0
})

const toggleTheater = () => {
  isTheaterMode.value = !isTheaterMode.value
  if (isTheaterMode.value) {
    showTheaterAlert.value = true
    setTimeout(() => { showTheaterAlert.value = false }, 3000)
  }
}

const handleKeydown = (e) => {
  if (e.key.toLowerCase() === 't') toggleTheater()
}

function syncSidebarForViewport() {
  if (!import.meta.client) return
  isSidebarVisible.value = window.innerWidth > 960
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', syncSidebarForViewport)
  syncSidebarForViewport()
  const saved = localStorage.getItem('completed_lessons')
  if (saved) completedLessons.value = JSON.parse(saved)
})

// Helpers de Formatação
const timeAgo = (date) => {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' anos'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' meses'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' dias'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' horas'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' min'
  return 'agora mesmo'
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', syncSidebarForViewport)
})

const { showToast } = useAppToast()

const toggleProgress = async (lessonId, field) => {
  try {
    const token = localStorage.getItem('auth_token')
    const lesson = moduleData.value.lessons?.find(l => l.id === lessonId)
    if (!lesson) return

    const currentProgress = (lesson.progress && lesson.progress[0]) || {}
    const newValue = !currentProgress[field]
    
    // Regra de exclusão Like/Dislike
    let payload = { [field]: newValue }
    if (field === 'liked' && newValue) payload.disliked = false
    if (field === 'disliked' && newValue) payload.liked = false

    const res = await $fetch(`${apiBase}/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: payload
    })
    
    // Atualiza localmente no moduleData para refletir na UI
    if (!lesson.progress) lesson.progress = [{}]
    lesson.progress[0] = res

    if (field === 'watched' && newValue) {
      showToast({ type: 'success', title: 'Aula concluída!' })
    }
  } catch (err) {
    console.error(`Erro ao atualizar ${field}:`, err)
    showToast({
      type: 'error',
      title: 'Não foi possível salvar o progresso.',
      message: err?.data?.message || err?.message || 'Tente novamente.',
    })
  }
}

const getLessonProgress = (lessonId) => {
  const lesson = moduleData.value?.lessons?.find(l => l.id === lessonId)
  return lesson?.progress?.[0] || null
}

const isLessonWatched = (lessonId) => getLessonProgress(lessonId)?.watched || false

const extractYoutubeId = (url) => {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/embed\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i
  ]
  for (const pattern of patterns) {
    const match = String(url).match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

const getLessonVideoUrl = (lesson) => {
  if (!lesson || typeof lesson !== 'object') return ''
  const resolved = String(
    lesson.videoUrl
    || lesson.video_url
    || lesson.video
    || lesson.videoURL
    || lesson.fileUrl
    || lesson.file_url
    || lesson.mediaUrl
    || lesson.media_url
    || lesson.secure_url
    || lesson.urlVideo
    || lesson.videoLink
    || lesson.url
    || lesson.link
    || lesson.media?.url
    || lesson.media?.secure_url
    || ''
  ).trim()

  return resolved
}

const activeVideoUrl = computed(() => getLessonVideoUrl(activeLesson.value))
const activeYoutubeId = computed(() => extractYoutubeId(activeVideoUrl.value))
const activeCaptionUrl = computed(() => {
  if (!activeVideoUrl.value || activeYoutubeId.value) return ''
  return getVideoCaptionUrl(activeVideoUrl.value)
})

const activeVideoDebugLabel = computed(() => {
  if (!activeLesson.value) return ''
  return activeVideoUrl.value ? '' : `Aula ${activeLesson.value.id} sem URL de vídeo`
})

const prevLesson = computed(() => {
  if (!moduleData.value?.lessons || !activeLesson.value) return null
  const idx = moduleData.value.lessons.findIndex(l => l.id === activeLesson.value.id)
  return idx > 0 ? moduleData.value.lessons[idx - 1] : null
})

const nextLesson = computed(() => {
  if (!moduleData.value?.lessons || !activeLesson.value) return null
  const idx = moduleData.value.lessons.findIndex(l => l.id === activeLesson.value.id)
  return idx < moduleData.value.lessons.length - 1 ? moduleData.value.lessons[idx + 1] : null
})

const nextModule = computed(() => {
  if (!moduleData.value?.course?.modules) return null
  const idx = moduleData.value.course.modules.findIndex(m => m.id === moduleData.value.id)
  return idx < moduleData.value.course.modules.length - 1 ? moduleData.value.course.modules[idx + 1] : null
})

const totalDuration = computed(() => '45:00')
const handleVideoEnded = () => {
  if (isAutoplay.value && nextLesson.value) setActiveLesson(nextLesson.value)
}

const seekToTranscriptionLine = (line) => {
  const seconds = Number(line?.seconds ?? parseTranscriptionTimeToSeconds(line?.time))
  videoPlayerRef.value?.seekToSeconds?.(seconds)
}

const syncLessonUrl = (lesson, replace = true) => {
  if (!import.meta.client || !moduleData.value || !lesson) return
  nextTick(() => {
    const nextUrl = buildModuleUrl(moduleData.value, lesson, moduleData.value.lessons)
    if (route.fullPath !== nextUrl) {
      router[replace ? 'replace' : 'push'](nextUrl)
    }
  })
}

const setActiveLesson = (lesson) => {
  activeLesson.value = lesson
  fetchComments(lesson.id)
  syncLessonUrl(lesson)
  if (import.meta.client && window.innerWidth <= 960) {
    isSidebarVisible.value = false
    if (activeTab.value === 'aulas') activeTab.value = 'resumo'
  }
}

const activeLessonComments = ref([])
const newCommentText = ref('')

const fetchComments = async (lessonId) => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`${apiBase}/courses/lessons/${lessonId}/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    activeLessonComments.value = data
  } catch (err) { console.error('Erro ao buscar comentários:', err) }
}

const sendComment = async () => {
  if (!newCommentText.value.trim() || !activeLesson.value) return
  
  try {
    const token = localStorage.getItem('auth_token')
    const content = newCommentText.value
    newCommentText.value = '' // Limpa antes para feedback rápido
    
    const res = await $fetch(`${apiBase}/courses/lessons/${activeLesson.value.id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { content }
    })
    
    activeLessonComments.value.push(res)
  } catch (err) { 
    console.error('Erro ao enviar comentário:', err)
    showToast({ type: 'error', title: 'Erro ao enviar comentário.', message: 'Tente novamente.' })
  }
}

// Gestão de Comentários (Edição/Exclusão)
const editingCommentId = ref(null)
const editingContent = ref('')

const isAuthor = (comment) => {
  const token = localStorage.getItem('auth_token')
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return comment.authorId === payload.id
  } catch { return false }
}

const startEdit = (comment) => {
  editingCommentId.value = comment.id
  editingContent.value = comment.content
}

const cancelEdit = () => {
  editingCommentId.value = null
  editingContent.value = ''
}

const saveEdit = async (commentId) => {
  if (!editingContent.value.trim()) return
  try {
    const token = localStorage.getItem('auth_token')
    const res = await $fetch(`${apiBase}/courses/comments/${commentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: editingContent.value }
    })
    
    // Atualiza localmente
    const idx = activeLessonComments.value.findIndex(c => c.id === commentId)
    if (idx !== -1) activeLessonComments.value[idx] = res
    
    cancelEdit()
  } catch (err) { console.error('Erro ao editar:', err) }
}

const toggleCommentLike = async (commentId) => {
  try {
    const token = localStorage.getItem('auth_token')
    const res = await $fetch(`${apiBase}/courses/comments/${commentId}/toggle-like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // Atualiza localmente o comentário na lista
    const idx = activeLessonComments.value.findIndex(c => c.id === commentId)
    if (idx !== -1) {
      // O backend retorna o comentário atualizado
      activeLessonComments.value[idx] = res
    }
  } catch (err) { console.error('Erro ao curtir comentário:', err) }
}

const deleteComment = async (commentId) => {
  if (!confirm('Tem certeza que deseja excluir seu comentário?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/courses/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    activeLessonComments.value = activeLessonComments.value.filter(c => c.id !== commentId)
  } catch (err) { console.error('Erro ao excluir:', err) }
}

const fetchModule = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`${apiBase}/courses/modules/${encodeURIComponent(moduleParam.value)}`, { headers: { Authorization: `Bearer ${token}` } })
    moduleData.value = data
    if (data.lessons?.length > 0) {
      const queryAula = String(route.query.aula || '')
      const queryLessonId = String(route.query.lessonId || '')
      let target = null
      if (queryAula) {
        target = findLessonBySlug(data.lessons, decodeURIComponent(queryAula))
      } else if (queryLessonId) {
        target = data.lessons.find((lesson) => lesson.id === queryLessonId)
      }
      activeLesson.value = target || data.lessons[0]
      loadLessonNotes(activeLesson.value.id)
      fetchComments(activeLesson.value.id)
      syncLessonUrl(activeLesson.value)
    }
  } catch (err) { console.error(err) } finally { loading.value = false }
}

// Usuário Atual
const currentUser = ref(null)

const fetchCurrentUser = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    const user = await $fetch(`${authApiBase}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    currentUser.value = user
  } catch (err) { console.error('Erro ao buscar perfil:', err) }
}

onMounted(() => {
  fetchModule()
  fetchCurrentUser()
})
</script>

<style scoped>
/* Layout principal em ~/assets/css/lesson-player-page.css */
</style>