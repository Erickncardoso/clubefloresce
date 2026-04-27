<template>
  <NuxtLayout name="default">
    <div class="player-wrapper" :class="{ 'theater-mode': isTheaterMode }" v-if="moduleData">
      <!-- Header Principal (Ocultado no Modo Teatro) -->
      <PlayerHeader 
        v-if="!isTheaterMode"
        :courseTitle="moduleData.course?.title" 
        :moduleTitle="moduleData.title" 
        :courseThumbnail="moduleData.course?.thumbnail"
      />

      <div class="player-main-container">
        <!-- Main Content -->
        <div class="content-view">
          <!-- Context Bar (Breadcrumbs + Autoplay) - AGORA DENTRO DO CONTEÚDO -->
          <div class="context-bar-premium">
            <div class="top-left">
              <button class="btn-back-square" @click="navigateTo('/cursos')">
                <ChevronLeft class="icon-md" />
              </button>
              
              <div class="course-thumbnail-glow" v-if="moduleData.course?.thumbnail">
                <img :src="moduleData.course.thumbnail" class="img-course-mini" />
              </div>

              <div class="breadcrumb-mini">
                <span class="course-breadcrumb-title">{{ moduleData.course?.title }}</span>
                <span class="breadcrumb-separator">/</span>
                <span class="module-breadcrumb-title">{{ moduleData.title }}</span>
              </div>
            </div>
            
            <div class="top-right">
              <div class="autoplay-control">
                <span class="autoplay-label">Reprodução automática</span>
                <div 
                  class="toggle-switch" 
                  :class="{ 'is-active': isAutoplay }"
                  @click="isAutoplay = !isAutoplay"
                >
                  <div class="toggle-handler"></div>
                </div>
              </div>
              
              <Transition name="fade">
                <button 
                  v-if="isTheaterMode || !isSidebarVisible" 
                  class="btn-side-list-toggle"
                  :class="{ 'is-theatre-btn': isTheaterMode }"
                  @click="isTheaterMode ? (isTheaterMode = false) : (isSidebarVisible = true)"
                >
                  <Menu class="icon-sm" />
                  Lista de aulas
                </button>
              </Transition>
            </div>
          </div>
          <div class="video-container-box">
            <div class="video-wrapper-premium">
              <iframe
                v-if="activeLesson && activeYoutubeId"
                class="video-iframe"
                :src="`https://www.youtube.com/embed/${activeYoutubeId}?rel=0&modestbranding=1`"
                title="Aula em vídeo"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
              <video
                v-else-if="activeLesson && activeVideoUrl"
                ref="playerElement"
                class="native-video-player"
                :key="activeLesson.id"
                playsinline
                controls
                preload="metadata"
                @ended="handleVideoEnded"
              >
                <source :src="activeVideoUrl" />
                Seu navegador não suporta reprodução de vídeo.
              </video>
              <div v-else-if="activeLesson && !activeVideoUrl" class="video-placeholder-premium">
                <PlayCircle class="large-icon-premium" />
                <p style="color: #374151">Esta aula ainda não possui vídeo configurado.</p>
                <small v-if="activeVideoDebugLabel" style="color:#94a3b8">{{ activeVideoDebugLabel }}</small>
              </div>
              <div v-else class="video-placeholder-premium">
                <PlayCircle class="large-icon-premium" />
                <p style="color: #374151">Selecione uma aula para começar.</p>
              </div>

              <!-- Theater Mode Flash Message -->
              <Transition name="slide-up">
                <div v-if="showTheaterAlert" class="theater-alert">
                  Modo teatro ativado. Para desativar pressione <strong>T</strong>
                </div>
              </Transition>
            </div>

            <!-- Botões de Navegação Inferior -->
            <div class="video-nav-bar-premium">
              <div class="nav-left">
                <button 
                  class="btn-nav-control" 
                  :disabled="!prevLesson"
                  @click="prevLesson && setActiveLesson(prevLesson)"
                >
                  <SkipBack class="icon-sm" />
                  Aula anterior
                </button>
                <button 
                  class="btn-nav-control" 
                  :disabled="!nextLesson"
                  @click="nextLesson && setActiveLesson(nextLesson)"
                >
                  Próxima aula
                  <SkipForward class="icon-sm" />
                </button>
              </div>
              
              <div class="nav-right">
                <button 
                  class="btn-theater-mode" 
                  :class="{ 'is-active-btn': isTheaterMode }"
                  @click="toggleTheater"
                  title="Ativar modo teatro (T)"
                >
                  <Monitor class="icon-md" />
                </button>
              </div>
            </div>
          </div>

          <!-- Abas de Conteúdo -->
          <div class="lesson-details-section">
            <div class="tabs-header-premium">
              <div class="tabs-navigation-group">
                <button 
                  v-for="tab in tabs" 
                  :key="tab.id"
                  class="tab-btn"
                  :class="{ 'active-tab': activeTab === tab.id }"
                  @click="activeTab = tab.id"
                >
                  <component :is="tab.icon" class="icon-xs" />
                  {{ tab.label }}
                </button>
              </div>

              <!-- Ações da Aula (Movidas para cá) -->
              <div class="action-buttons-group" v-if="activeLesson">
                <div class="like-dislike-pair-premium">
                  <button 
                    class="btn-action-icon" 
                    :class="{ 'is-active-like': getLessonProgress(activeLesson.id)?.liked }"
                    @click="toggleProgress(activeLesson.id, 'liked')"
                    title="Gostei"
                  >
                    <ThumbsUp class="icon-sm" />
                  </button>
                  <button 
                    class="btn-action-icon" 
                    :class="{ 'is-active-dislike': getLessonProgress(activeLesson.id)?.disliked }"
                    @click="toggleProgress(activeLesson.id, 'disliked')"
                    title="Não gostei"
                  >
                    <ThumbsDown class="icon-sm" />
                  </button>
                </div>
                
                <button 
                  class="btn-action-icon-card" 
                  :class="{ 'is-active-fav': getLessonProgress(activeLesson.id)?.favorited }"
                  @click="toggleProgress(activeLesson.id, 'favorited')"
                  title="Favoritar"
                >
                  <Bookmark class="icon-sm" />
                </button>

                <button 
                  class="btn-mark-watched-premium" 
                  :class="{ 'is-completed-btn': isLessonWatched(activeLesson.id) }"
                  @click="toggleProgress(activeLesson.id, 'watched')"
                >
                  <CheckCircle2 class="icon-sm" />
                  {{ isLessonWatched(activeLesson.id) ? 'Aula assistida' : 'Marcar como assistida' }}
                </button>
              </div>
            </div>

            <div class="tab-content-area" v-if="activeLesson">
              <Transition name="fade-tab" mode="out-in">
                <div v-if="activeTab === 'sobre'" class="tab-pane">
                  <div class="lesson-header-info">
                    <h1 class="lesson-primary-title">{{ activeLesson.title }}</h1>
                  </div>
                  
                  <p class="lesson-description-text">{{ activeLesson.content || 'Nenhuma descrição disponível para esta aula.' }}</p>
                </div>

                <!-- Aba Materiais -->
                <div v-else-if="activeTab === 'materiais'" class="tab-pane">
                  <div class="materials-grid" v-if="activeLesson.materials?.length">
                    <div v-for="(file, idx) in activeLesson.materials" :key="idx" class="material-card">
                      <div class="material-icon-box">
                        <FileText class="icon-md" />
                      </div>
                      <div class="material-info">
                        <span class="material-name">{{ file.name }}</span>
                        <span class="material-ext">{{ file.size || 'PDF' }}</span>
                      </div>
                      <a :href="file.url" target="_blank" class="btn-download-material">
                        <Download class="icon-sm" />
                      </a>
                    </div>
                  </div>
                  <div v-else class="empty-state-tab">
                    <FileText class="icon-xl-muted" />
                    <p>Não existem materiais extras para esta aula.</p>
                  </div>
                </div>

                <!-- Aba Transcrição -->
                <div v-else-if="activeTab === 'transcricao'" class="tab-pane">
                  <div class="transcription-timeline" v-if="activeLesson.transcription?.length">
                    <div v-for="(line, idx) in activeLesson.transcription" :key="idx" class="transcription-item">
                      <span class="time-stamp">{{ line.time }}</span>
                      <p class="transcript-text">{{ line.text }}</p>
                    </div>
                  </div>
                  <div v-else class="empty-state-tab">
                    <MessageSquare class="icon-xl-muted" />
                    <p>A transcrição será liberada em breve.</p>
                  </div>
                </div>

                <!-- Aba Comentários -->
                <div v-else-if="activeTab === 'comments'" class="tab-pane">
                  <div class="comments-section-premium">
                    <div class="comment-input-block">
                      <div class="user-avatar-container">
                        <div v-if="!currentUser?.avatar" class="avatar-placeholder-us">
                          {{ currentUser?.name?.substring(0, 2).toUpperCase() || 'US' }}
                        </div>
                        <img v-else :src="currentUser.avatar" class="avatar-img-blur" />
                      </div>
                      <div class="input-container-premium">
                        <input 
                          type="text" 
                          v-model="newCommentText"
                          placeholder="Dúvida ou comentário sobre a aula..." 
                          class="forum-input" 
                          @keyup.enter="sendComment"
                        />
                        <button class="btn-send-comment" @click="sendComment" :disabled="!newCommentText.trim()">
                          <ArrowRight class="icon-xs" />
                        </button>
                      </div>
                    </div>

                    <div class="comments-list-premium" v-if="activeLessonComments.length">
                      <div v-for="comment in activeLessonComments" :key="comment.id" class="comment-item-premium" :class="{ 'is-instructor': comment.author?.role === 'NUTRICIONISTA' }">
                        <div class="comment-author-avatar">
                          <div v-if="!comment.author?.avatar" class="avatar-placeholder-na">
                            {{ comment.author?.name?.substring(0, 2).toUpperCase() || 'NA' }}
                          </div>
                          <img v-else :src="comment.author.avatar" class="avatar-img-blur" />
                        </div>
                        <div class="comment-body-premium">
                          <div class="comment-meta-premium">
                            <div class="author-info-group">
                              <div class="name-badge-row">
                                <span class="author-name">{{ comment.author?.name }}</span>
                                <span v-if="comment.author?.role === 'NUTRICIONISTA'" class="badge-premium is-instructor-badge">Instrutora</span>
                                <span v-else class="badge-premium is-student-badge">Aluna Florescer</span>
                              </div>
                              <span class="comment-date">{{ timeAgo(comment.createdAt) }}</span>
                            </div>
                            
                            <div class="comment-header-actions">
                              <div class="comment-likes-counter" @click="toggleCommentLike(comment.id)" :class="{ 'has-liked': comment.likedBy?.some(u => u.id === currentUser?.id) }">
                                <Heart class="icon-xxs" :fill="comment.likedBy?.some(u => u.id === currentUser?.id) ? 'currentColor' : 'none'" />
                                <span>{{ comment.likesCount || 0 }}</span>
                              </div>
                              
                              <div class="comment-actions-btns" v-if="isAuthor(comment)">
                                <button class="btn-action-minimal" @click="startEdit(comment)" title="Editar">
                                  <Pencil class="icon-xxs" />
                                </button>
                                <button class="btn-action-minimal is-delete" @click="deleteComment(comment.id)" title="Excluir">
                                  <Trash2 class="icon-xxs" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div v-if="editingCommentId === comment.id" class="edit-comment-box">
                            <textarea 
                              v-model="editingContent" 
                              class="edit-input-premium" 
                              rows="3"
                              @keyup.esc="cancelEdit"
                            ></textarea>
                            <div class="edit-actions">
                              <button class="btn-cancel-edit" @click="cancelEdit">Cancelar</button>
                              <button class="btn-save-edit" @click="saveEdit(comment.id)">Salvar alterações</button>
                            </div>
                          </div>
                          <p v-else class="comment-text-premium">{{ comment.content }}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div v-else class="empty-state-tab">
                      <MessageSquare class="icon-xl-muted" />
                      <p>Seja o primeiro a comentar nesta aula!</p>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Sidebar (Playlist) - Ocultada se fechada ou em Modo Teatro -->
        <aside class="playlist-sidebar-premium" v-if="!isTheaterMode && isSidebarVisible">
          <div class="playlist-header-premium">
            <h2 class="playlist-title-premium">Conteúdo</h2>
            <button class="btn-close-playlist" @click="isSidebarVisible = false" title="Esconder navegação">
              <img src="/icons/close-list.svg" class="icon-custom" alt="Fechar lista" />
            </button>
          </div>
          
          <div class="playlist-course-card">
            <div class="side-course-thumb" v-if="moduleData.course?.thumbnail">
              <img :src="moduleData.course.thumbnail" class="img-side-course" />
            </div>
            <div class="side-course-info">
              <h3 class="side-course-name">{{ moduleData.title }}</h3>
              <div class="side-course-meta">
                <span>{{ moduleData.lessons?.length || 0 }} aulas</span>
                <span class="dot">•</span>
                <span>{{ totalDuration }}</span>
              </div>
            </div>
          </div>

          <div class="playlist-scroll-area">
            <div 
              v-for="lesson in moduleData.lessons" 
              :key="lesson.id"
              class="side-lesson-item"
              :class="{ 
                'is-active': activeLesson?.id === lesson.id,
                'is-done': isLessonWatched(lesson.id)
              }"
              @click="setActiveLesson(lesson)"
            >
              <div class="side-lesson-status">
                <div class="status-icon-wrapper-side">
                  <Video class="lesson-icon-side" />
                  <div class="hover-check-overlay" @click.stop="toggleProgress(lesson.id, 'watched')">
                    <CheckCircle2 v-if="!isLessonWatched(lesson.id)" class="icon-check-hover" />
                    <Circle v-else class="icon-uncheck-hover" />
                  </div>
                </div>
              </div>
              <div class="side-lesson-body">
                <span class="side-lesson-title">{{ lesson.title }}</span>
                <span class="side-lesson-duration">{{ lesson.duration || '0:00' }}</span>
              </div>
            </div>
          </div>
          
          <div class="side-playlist-footer" v-if="nextModule">
            <span class="next-label-side">Próximo conteúdo - módulo</span>
            <div class="next-module-card-side" @click="navigateTo('/modulos/' + nextModule.id)">
              <div class="next-play-icon"><PlayCircle class="icon-next-play" /></div>
              <div class="next-module-info"><span class="next-module-name-side">{{ nextModule.title }}</span></div>
              <ArrowRight class="icon-next-arrow" />
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- States: Loading -->
    <div v-else-if="loading" class="loading-full-page">
      <div class="spinner-premium"></div>
      <span>Carregando experiência premium...</span>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { 
  ChevronLeft, 
  SkipBack, 
  SkipForward, 
  Monitor, 
  PlayCircle, 
  Video, 
  CheckCircle2, 
  Circle,
  Settings2,
  ArrowRight,
  MessageSquare,
  Menu,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Download,
  Clock,
  Info,
  FileText,
  Pencil,
  Trash2
} from 'lucide-vue-next'
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRoute, navigateTo } from '#app'

const route = useRoute()
const moduleId = route.params.id
const moduleData = ref(null)
const loading = ref(true)
const activeLesson = ref(null)
const playerElement = ref(null)
const completedLessons = ref([])
const isTheaterMode = ref(false)
const isSidebarVisible = ref(true)
const isAutoplay = ref(true)
const activeTab = ref('sobre')
const showTheaterAlert = ref(false)

const tabs = [
  { id: 'sobre', label: 'Sobre a aula', icon: Info },
  { id: 'materiais', label: 'Materiais', icon: FileText },
  { id: 'transcricao', label: 'Transcrição', icon: MessageSquare },
  { id: 'comments', label: 'Comentários', icon: MessageSquare }
]

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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
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
})

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

    const res = await $fetch(`http://localhost:3001/api/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: payload
    })
    
    // Atualiza localmente no moduleData para refletir na UI
    if (!lesson.progress) lesson.progress = [{}]
    lesson.progress[0] = res
  } catch (err) { console.error(`Erro ao atualizar ${field}:`, err) }
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
  const idx = moduleData.value.course.modules.findIndex(m => m.id === moduleId)
  return idx < moduleData.value.course.modules.length - 1 ? moduleData.value.course.modules[idx + 1] : null
})

const totalDuration = computed(() => '45:00')
const handleVideoEnded = () => {
  if (isAutoplay.value && nextLesson.value) setActiveLesson(nextLesson.value)
}

const setActiveLesson = (lesson) => { 
  activeLesson.value = lesson
  fetchComments(lesson.id)
}

const activeLessonComments = ref([])
const newCommentText = ref('')

const fetchComments = async (lessonId) => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`http://localhost:3001/api/courses/lessons/${lessonId}/comments`, {
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
    
    const res = await $fetch(`http://localhost:3001/api/courses/lessons/${activeLesson.value.id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { content }
    })
    
    activeLessonComments.value.push(res)
  } catch (err) { 
    console.error('Erro ao enviar comentário:', err)
    alert('Erro ao enviar comentário. Tente novamente.')
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
    const res = await $fetch(`http://localhost:3001/api/courses/comments/${commentId}`, {
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
    const res = await $fetch(`http://localhost:3001/api/courses/comments/${commentId}/toggle-like`, {
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
    await $fetch(`http://localhost:3001/api/courses/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    activeLessonComments.value = activeLessonComments.value.filter(c => c.id !== commentId)
  } catch (err) { console.error('Erro ao excluir:', err) }
}

const fetchModule = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`http://localhost:3001/api/courses/modules/${moduleId}`, { headers: { Authorization: `Bearer ${token}` } })
    moduleData.value = data
    if (data.lessons?.length > 0) {
      activeLesson.value = data.lessons[0]
      fetchComments(data.lessons[0].id)
    }
  } catch (err) { console.error(err) } finally { loading.value = false }
}

// Usuário Atual
const currentUser = ref(null)

const fetchCurrentUser = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return
    const user = await $fetch('http://localhost:3001/api/auth/me', {
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
.player-wrapper {
  background-color: #f7f9f7;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: all 0.4s ease;
}

/* Context Bar */
.context-bar-premium { 
  height: 48px; 
  padding: 0 1.5rem; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background: #fff; 
  border-bottom: 1px solid #f1f3f1;
  transition: all 0.4s;
  margin-bottom: 0.5rem;
}

.theater-mode .context-bar-premium { 
  height: 64px;
  padding: 0 2rem;
  background: rgba(255, 255, 255, 0.95); 
  backdrop-filter: blur(10px);
  color: #111; 
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  z-index: 1000; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
}

.top-right { display: flex; align-items: center; gap: 2rem; }
.top-left { display: flex; align-items: center; gap: 1rem; }

.btn-back-square {
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #eef1ee;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #111;
  transition: all 0.2s;
}

.theater-mode .btn-back-square { background: #fff; border-color: #eef1ee; color: #111; }

.course-thumbnail-glow {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  padding: 2px;
  background: linear-gradient(135deg, #2d5a27, #6fb368);
  box-shadow: 0 0 15px rgba(45, 90, 39, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5rem;
}

.img-course-mini {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  background: #000;
}

.breadcrumb-mini { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; }
.course-breadcrumb-title { color: #9ca3af; }
.breadcrumb-separator { color: #d1d5db; }
.module-breadcrumb-title { color: #111; }
.theater-mode .module-breadcrumb-title { color: #111; }

.autoplay-control { display: flex; align-items: center; gap: 10px; }
.autoplay-label { font-size: 0.8rem; font-weight: 700; color: #9ca3af; }

.toggle-switch { width: 38px; height: 20px; background: #e5e7eb; border-radius: 20px; position: relative; cursor: pointer; transition: 0.3s; }
.toggle-switch.is-active { background: #2d5a27; }
.toggle-handler { width: 14px; height: 14px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: 0.3s; }
.is-active .toggle-handler { transform: translateX(18px); }

.btn-side-list-toggle { 
  background: white; 
  border: 1px solid #eef1ee; 
  color: #111; 
  padding: 6px 12px; 
  border-radius: 8px; 
  font-size: 0.75rem; 
  font-weight: 700; 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  cursor: pointer; 
  transition: all 0.2s;
}

.btn-side-list-toggle:hover {
  background: #f3f5f3;
  border-color: #d1d5d1;
}

.btn-side-list-toggle.is-theatre-btn {
  background: #fff; 
  border-color: #eef1ee; 
  color: #111;
}

/* Main Content Layout */
.player-main-container { 
  display: flex; 
  padding: 0 0 2rem; 
  gap: 1.5rem; 
  flex: 1; 
  transition: all 0.4s ease;
  width: 100%;
}

.theater-mode .player-main-container { padding: 64px 0 0; gap: 0; max-width: 100%; }

.content-view { flex: 1; display: flex; flex-direction: column; gap: 1.5rem; min-width: 0; }

.video-container-box { 
  background: white; 
  border-radius: 0 0 20px 20px; 
  overflow: hidden; 
  box-shadow: 0 4px 24px rgba(0,0,0,0.04); 
}

.theater-mode .video-container-box { border-radius: 0; box-shadow: none; }

.video-wrapper-premium { 
  background: #fff; 
  position: relative; 
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 260px;
  max-height: none;
  display: flex;
  flex-direction: column;
}

/* Mantém o vídeo inteiro visível sem recorte */
.video-wrapper-premium video { width: 100%; height: 100%; object-fit: contain; }
.native-video-player,
.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
}

.theater-mode .video-wrapper-premium { 
  height: auto;
  max-height: none;
}

.theater-alert { 
  position: absolute; 
  top: 1.5rem; 
  left: 50%; 
  transform: translateX(-50%); 
  background: rgba(124, 58, 237, 0.9); 
  color: white; 
  padding: 10px 20px; 
  border-radius: 12px; 
  font-size: 0.85rem; 
  font-weight: 700; 
  z-index: 100;
  backdrop-filter: blur(8px);
}

.video-nav-bar-premium { 
  background: #fff; 
  padding: 1.25rem 2rem; 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  border-top: 1px solid #f1f3f1;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-nav-control { 
  background: #f9fafb; 
  border: 1px solid #eef1ee; 
  color: #374151; 
  padding: 8px 16px; 
  border-radius: 10px; 
  font-size: 0.8rem; 
  font-weight: 700; 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  cursor: pointer; 
  transition: all 0.2s;
}

.btn-nav-control:hover:not(:disabled) { background: #f3f5f3; border-color: #d1d5d1; }

.btn-nav-control:disabled { opacity: 0.3; }

.btn-theater-mode { 
  width: 38px; 
  height: 38px; 
  background: #f9fafb; 
  border: 1px solid #eef1ee; 
  color: #374151; 
  border-radius: 10px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  transition: all 0.2s;
}

.btn-theater-mode:hover, .btn-theater-mode.is-active-btn { background: #2d5a27; border-color: transparent; color: white; }

/* Lesson Details Section */
.lesson-details-section { 
  background: white; 
  border-radius: 20px; 
  padding: 2.5rem; 
  margin: 0 1.5rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04); 
}

.tabs-header { display: flex; gap: 2rem; border-bottom: 2px solid #f8faf8; margin-bottom: 1.5rem; }

.tab-btn { 
  padding-bottom: 1rem; 
  background: none; 
  border: none; 
  font-size: 0.9rem; 
  font-weight: 700; 
  color: #9ca3af; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  position: relative;
}

.tab-btn.active-tab { color: #2d5a27; }
.tab-btn.active-tab::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 2px; background: #2d5a27; }

.lesson-primary-title { font-size: 1.5rem; font-weight: 800; color: #111; margin-bottom: 0.75rem; }
.lesson-description-text { font-size: 1rem; line-height: 1.6; color: #4b5563; margin-bottom: 2rem; }

.lesson-header-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.like-dislike-pair {
  display: flex;
  background: #f9fafb;
  border: 1px solid #eef1ee;
  border-radius: 10px;
  overflow: hidden;
}

.btn-action-icon {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-icon:hover { background: #f3f5f3; color: #111; }
.btn-action-icon.is-active-like { color: #2d5a27; background: #f1f8f1; }
.btn-action-icon.is-active-dislike { color: #4b5563; background: #f3f4f6; }
.btn-action-icon.is-active-fav, .btn-action-icon-card.is-active-fav { color: #fbbf24; background: #fffbeb; }

.btn-mark-watched-premium {
  background: white;
  border: 1.5px solid #2d5a27;
  color: #2d5a27;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mark-watched-premium.is-completed-btn {
  background: #f1f8f1;
  color: #2d5a27;
  border-color: #2d5a27;
}

/* Novo Layout de Abas + Ações */
.tabs-header-premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f3f5f3;
  margin-bottom: 2rem;
  padding-bottom: -2px;
}

.tabs-navigation-group {
  display: flex;
  gap: 2rem;
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.like-dislike-pair-premium {
  display: flex;
  background: #f9fbf9;
  border: 1.2px solid #eef1ee;
  border-radius: 12px;
  padding: 4px;
}

.btn-action-icon-card {
  width: 42px;
  height: 42px;
  background: white;
  border: 1.2px solid #eef1ee;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-icon-card:hover { background: #f3f5f3; color: #111; }
.btn-action-icon-card.is-active-fav { color: #fbbf24; background: #fffbeb; border-color: #fef3c7; }

.lesson-header-info { margin-bottom: 1.5rem; }

/* Materials & Transcription */
.materials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.material-card { display: flex; align-items: center; gap: 12px; background: #f9fafb; border: 1px solid #eef1ee; padding: 12px; border-radius: 12px; }
.material-icon-box { width: 40px; height: 40px; background: white; color: #2d5a27; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.material-info { flex: 1; display: flex; flex-direction: column; }
.material-name { font-size: 0.85rem; font-weight: 700; color: #111; }
.material-ext { font-size: 0.7rem; color: #9ca3af; }
.btn-download-material { color: #9ca3af; transition: 0.2s; }
.btn-download-material:hover { color: #2d5a27; }

.transcription-timeline { display: flex; flex-direction: column; gap: 1.5rem; }
.transcription-item { display: flex; gap: 2rem; }
.time-stamp { color: #2d5a27; font-weight: 700; font-size: 0.8rem; min-width: 50px; }
.transcript-text { font-size: 0.95rem; color: #4b5563; line-height: 1.6; }

.empty-state-tab { display: flex; flex-direction: column; align-items: center; padding: 4rem 0; color: #9ca3af; gap: 1rem; }
.icon-xl-muted { width: 48px; height: 48px; opacity: 0.4; }

/* Aba Comentários Premium */
.comments-section-premium { padding: 0.5rem 0 2rem; }
.comment-input-block { 
  display: flex; 
  gap: 1rem; 
  align-items: center; 
  margin-bottom: 2.5rem; 
  background: #f9fbf9;
  padding: 1.25rem;
  border-radius: 16px;
  border: 1px solid #eef1ee;
}

.user-avatar-container, .comment-author-avatar { 
  width: 50px; 
  height: 50px; 
  min-width: 50px;
  border-radius: 20px !important; 
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
}

.avatar-placeholder-us {
  width: 100%;
  height: 100%;
  background: #2d5a27;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder-na {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-container-premium { 
  flex: 1; 
  position: relative; 
  display: flex; 
  align-items: center; 
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  height: 44px;
}
.input-container-premium:focus-within {
  border-color: #2d5a27;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.1);
}
.forum-input { 
  width: 100%; 
  padding: 0 3.5rem 0 1rem; 
  background: transparent; 
  border: none;
  font-size: 0.9rem; 
  outline: none; 
}

.comments-list-premium { display: flex; flex-direction: column; gap: 1.25rem; }
.comment-item-premium { 
  display: flex; 
  gap: 1rem; 
  animation: commentSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
  align-items: flex-start;
}
.comment-body-premium { 
  flex: 1; 
  background: #ffffff; 
  padding: 1rem 1.4rem; 
  border-radius: 4px 20px 20px 20px; 
  border: 1px solid #f1f3f1;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02);
  min-height: 50px;
  position: relative;
}

.comment-item-premium.is-instructor .comment-body-premium {
  background: #fdfcf8;
  border-color: #fef3c7;
  box-shadow: 0 4px 20px rgba(217, 119, 6, 0.03);
}

.comment-meta-premium { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
.author-info-group { display: flex; flex-direction: column; gap: 4px; }
.name-badge-row { display: flex; align-items: center; gap: 10px; }
.author-name { font-weight: 800; color: #111; font-size: 0.9rem; letter-spacing: -0.2px; }

.badge-premium {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.is-instructor-badge {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fde68a;
}

.is-student-badge {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #dcfce7;
}

.comment-date { font-size: 0.7rem; color: #9ca3af; font-weight: 600; text-transform: capitalize; }

.comment-header-actions { display: flex; align-items: center; gap: 12px; }

.comment-likes-counter {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f9fafb;
  padding: 4px 10px;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
  color: #9ca3af;
  border: 1px solid transparent;
}

.comment-likes-counter span { font-size: 0.75rem; font-weight: 700; }
.comment-likes-counter:hover { background: #f3f4f6; color: #4b5563; }
.comment-likes-counter.has-liked { 
  background: #fff1f2; 
  color: #e11d48; 
  border-color: #ffe4e6;
}

.comment-actions-btns { display: flex; gap: 4px; }
.btn-action-minimal {
  background: none;
  border: none;
  color: #9ca3af;
  padding: 6px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-action-minimal:hover { background: #f3f4f6; color: #111; }
.btn-action-minimal.is-delete:hover { background: #fee2e2; color: #dc2626; }

.edit-comment-box { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 10px; }
.edit-input-premium {
  width: 100%;
  padding: 1rem;
  border: 1.5px solid #eef1ee;
  border-radius: 12px;
  font-size: 0.9rem;
  outline: none;
  background: #ffffff;
  resize: none;
  transition: all 0.2s;
}
.edit-input-premium:focus { border-color: #2d5a27; box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.05); }

.edit-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-cancel-edit { font-size: 0.75rem; color: #9ca3af; font-weight: 700; background: none; border: none; cursor: pointer; }
.btn-save-edit { font-size: 0.75rem; color: white; background: #2d5a27; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(45, 90, 39, 0.2); }

.comment-text-premium { font-size: 0.92rem; color: #4b5563; line-height: 1.6; margin: 0; }

/* Sidebar Playlist (CORREÇÃO DE LAYOUT) */
.playlist-sidebar-premium { 
  width: 380px; 
  min-width: 380px;
  background: #f9fafb; 
  border-radius: 20px; 
  box-shadow: 0 4px 24px rgba(0,0,0,0.04); 
  display: flex; 
  flex-direction: column; 
  overflow: hidden; 
  height: fit-content;
  max-height: calc(100vh - 100px);
}

.playlist-header-premium {
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0px; /* Removida margem para colar no header */
}

.btn-close-playlist {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  color: #9ca3af;
}

.btn-close-playlist:hover { background: #f9fafb; color: #111; }
.icon-custom { width: 18px; height: 18px; filter: grayscale(1); opacity: 0.6; transition: all 0.2s; }
.btn-close-playlist:hover .icon-custom { opacity: 1; filter: none; }

.btn-close-playlist:hover .icon-custom { opacity: 1; filter: none; }

.playlist-course-card { 
  margin: 0 1rem 1rem; 
  background: white; 
  padding: 0.75rem; 
  border-radius: 12px; 
  border: 1px solid #f1f3f1; 
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.side-course-thumb {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: #f9fafb;
}

.img-side-course {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.side-course-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.side-course-name { font-size: 0.85rem; font-weight: 800; color: #111; margin-bottom: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.side-course-meta { font-size: 0.7rem; color: #9ca3af; font-weight: 600; display: flex; gap: 4px; }

.playlist-scroll-area { 
  flex: 1; 
  overflow-y: auto; 
  padding: 0.75rem; 
  margin: 0 1rem 1.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0; /* Borda mais visível */
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

/* Grid para alinhar ícone e texto perfeitamente */
.side-lesson-item { 
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 12px;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.2s;
  align-items: flex-start;
}

.side-lesson-item:hover { background: #f9fafb; }
.side-lesson-item.is-active { background: #f1f8f1; }

.side-lesson-status { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  height: 20px;
  margin-top: 2px;
}

.status-icon-wrapper-side { position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
.lesson-icon-side { width: 16px; height: 16px; color: #d1d5db; }
.side-lesson-item.is-done .lesson-icon-side, 
.side-lesson-item.is-done .side-lesson-title { 
  color: #2d5a27; 
}

.side-lesson-item.is-active:not(.is-done) .lesson-icon-side {
  color: #111;
}

.side-lesson-item.is-active:not(.is-done) .side-lesson-title {
  color: #111;
  font-weight: 800;
}

.hover-check-overlay { 
  position: absolute; 
  inset: 0; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: white; 
  opacity: 0; 
  transition: opacity 0.2s;
}

.side-lesson-item:hover .hover-check-overlay { opacity: 1; }
.side-lesson-item.is-active:hover .hover-check-overlay { background: #f1f8f1; }
.icon-check-hover { width: 20px; height: 20px; color: #2d5a27; }

.side-lesson-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.side-lesson-title { font-size: 0.85rem; font-weight: 600; color: #374151; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.side-lesson-duration { font-size: 0.75rem; color: #9ca3af; font-weight: 600; margin-top: 4px; }

.side-playlist-footer { padding: 1rem; border-top: 1px solid #f1f3f1; }
.next-label-side { font-size: 0.7rem; color: #9ca3af; font-weight: 800; margin-bottom: 6px; display: block; }
.next-module-card-side { background: #f9fafb; border: 1px solid #e5e7eb; padding: 0.75rem; border-radius: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
.next-play-icon { width: 32px; height: 32px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.next-module-name-side { font-size: 0.8rem; font-weight: 800; color: #111; flex: 1; }

/* Transitions */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 20px); opacity: 0; }

:deep(.plyr), 
:deep(.plyr--video),
:deep(.plyr__video-wrapper),
:deep(.plyr__video-embed),
:deep(.plyr__poster),
:deep(.plyr__video-embed__container) { 
  background-color: #000 !important; 
  background: #000 !important; 
  height: 100% !important;
  max-width: 100% !important;
}

/* Garante visibilidade e estabilidade do menu de configurações */
:deep(.plyr__menu), 
:deep(.plyr__menu__container) {
  z-index: 1000 !important;
  position: static !important;
  bottom: auto !important;
  right: auto !important;
}

:deep(video),
:deep(iframe),
:deep(.plyr__video-embed iframe) { 
  background-color: #000 !important; 
  background: #000 !important; 
  object-fit: contain !important;
  width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
}

/* Remove gradientes escuros do Plyr durante o Play */
:deep(.plyr__video-wrapper::after) { display: none !important; }
:deep(.plyr__controls) { 
  background: rgba(7, 8, 14, 0.95) !important; 
  color: rgba(255, 255, 255, 0.9) !important; 
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
:deep(.plyr__control) { color: rgba(255, 255, 255, 0.9) !important; }
:deep(.plyr__control--overlaid) { background: rgba(32, 227, 194, 0.9) !important; color: #081018 !important; }
:deep(.plyr__progress--played), :deep(.plyr__volume--display) { color: #8b5cf6 !important; }

/* Patch de estabilidade visual dos controles do player */
::deep(.plyr__controls) {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 10px 12px !important;
  background: linear-gradient(0deg, rgba(4, 7, 14, 0.92), rgba(4, 7, 14, 0.72)) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
}

::deep(.plyr__control) {
  color: rgba(255, 255, 255, 0.88) !important;
}

::deep(.plyr__control:hover),
::deep(.plyr__control[aria-expanded="true"]) {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #fff !important;
}

::deep(.plyr--full-ui input[type="range"]) {
  color: #20e3c2 !important;
}

::deep(.plyr__progress__buffer) {
  color: rgba(255, 255, 255, 0.2) !important;
}

::deep(.plyr__menu__container) {
  position: absolute !important;
  right: 0 !important;
  bottom: calc(100% + 8px) !important;
  top: auto !important;
  left: auto !important;
  z-index: 1200 !important;
}

.icon-md { width: 24px; height: 24px; }
.icon-sm { width: 20px; height: 20px; }
.icon-xs { width: 18px; height: 18px; }
.icon-xxs { width: 14px; height: 14px; }

@media (max-width: 900px) {
  .video-wrapper-premium {
    aspect-ratio: 16 / 9;
    min-height: 200px;
  }
}

/* Override final dos controles Plyr no estilo da referência */
::deep(.plyr__controls) {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 12px 10px !important;
  background: rgba(7, 8, 14, 0.95) !important;
  color: #fff !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
}

::deep(.plyr__progress__container) {
  order: 1;
  width: 100%;
  margin: 0 0 4px 0 !important;
}

::deep(.plyr__controls .plyr__control),
::deep(.plyr__controls .plyr__time),
::deep(.plyr__controls .plyr__menu) {
  order: 2;
}

/* Ordem explícita para manter tempo + volume + engrenagem juntos */
::deep(.plyr__controls .plyr__control[data-plyr="play"]) { order: 2; }
::deep(.plyr__controls .plyr__control[data-plyr="rewind"]) { order: 3; }
::deep(.plyr__controls .plyr__control[data-plyr="fast-forward"]) { order: 4; }
::deep(.plyr__controls .plyr__time--current) { order: 5; }
::deep(.plyr__controls .plyr__control[data-plyr="mute"]) { order: 6; }
::deep(.plyr__controls .plyr__volume) { order: 7; }
::deep(.plyr__controls .plyr__menu) { order: 8; }
::deep(.plyr__controls .plyr__control[data-plyr="fullscreen"]) { order: 9; }

/* Corrige bug da engrenagem "solta" fora da barra de controles */
::deep(.plyr__controls .plyr__menu) {
  position: relative !important;
  inset: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  margin: 0 !important;
  transform: none !important;
  align-self: center !important;
}

::deep(.plyr__control) {
  color: rgba(255, 255, 255, 0.92) !important;
}

::deep(.plyr__control:hover),
::deep(.plyr__control[aria-expanded="true"]) {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #fff !important;
}

::deep(.plyr__control[data-plyr="play"]),
::deep(.plyr__control[data-plyr="rewind"]),
::deep(.plyr__control[data-plyr="fast-forward"]) {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
}

::deep(.plyr--full-ui input[type="range"]) {
  color: #8b5cf6 !important;
}

::deep(.plyr__progress__buffer) {
  color: rgba(255, 255, 255, 0.2) !important;
}
</style>
