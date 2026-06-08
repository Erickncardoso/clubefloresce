<template>
  <NuxtLayout :name="layoutName">
    <!-- App paciente -->
    <div v-if="config.public.mobileApp" class="patient-page comm-page">
      <PatientHeader title="Comunidade" :has-notifications="true">
        <template #actions>
          <button type="button" class="comm-header-btn" aria-label="Buscar">
            <Search class="comm-header-icon" />
          </button>
        </template>
      </PatientHeader>

      <nav class="comm-tabs" aria-label="Seções da comunidade">
        <button
          v-for="tab in communityTabs"
          :key="tab.id"
          type="button"
          class="comm-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <template v-if="activeTab === 'feed'">
        <section v-if="!isNutri" class="comm-compose-card">
          <div class="comm-compose-input">
            <div class="comm-avatar">{{ userInitial }}</div>
            <input
              v-model="newPostContent"
              type="text"
              placeholder="No que você está pensando?"
              @keyup.enter="handleCreatePost"
            />
            <input
              ref="postImageInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="comm-file-input"
              @change="handlePostImageSelect"
            />
            <button
              type="button"
              class="comm-camera-btn"
              :class="{ 'comm-camera-btn--active': !!postImagePreviewUrl }"
              aria-label="Adicionar foto"
              :disabled="loading"
              @click="triggerPostImageUpload"
            >
              <Camera class="comm-camera-icon" />
            </button>
          </div>
          <div v-if="postImagePreviewUrl" class="comm-compose-preview">
            <img :src="postImagePreviewUrl" alt="Pré-visualização da foto" />
            <button type="button" class="comm-compose-preview-remove" aria-label="Remover foto" @click="clearPostImage">
              <X class="comm-compose-preview-remove-icon" />
            </button>
          </div>
          <div class="comm-type-chips">
            <button
              v-for="chip in composeChips"
              :key="chip.id"
              type="button"
              class="comm-type-chip"
              :class="{ active: activePostType === chip.id }"
              @click="activePostType = chip.id"
            >
              <component :is="chip.icon" class="comm-type-chip-icon" />
              {{ chip.label }}
            </button>
          </div>
        </section>

        <h2 class="comm-section-title">Publicações</h2>

        <div v-if="posts.length" class="comm-feed">
          <article v-for="post in posts" :key="post.id" class="comm-post-card">
            <div class="comm-post-head">
              <div class="comm-avatar">{{ post.author?.name?.charAt(0).toUpperCase() || 'U' }}</div>
              <div class="comm-post-meta">
                <strong>{{ post.author?.name }}</strong>
                <span>{{ formatDistance(post.createdAt) }}</span>
              </div>
              <div class="comm-post-menu-wrap">
                <button
                  type="button"
                  class="comm-post-menu"
                  aria-label="Opções da publicação"
                  @click.stop="togglePostMenu(post.id)"
                >
                  <MoreHorizontal class="comm-post-menu-icon" />
                </button>
                <div v-if="openMenuPostId === post.id" class="comm-post-menu-popover" @click.stop>
                  <button
                    v-if="isMyPost(post) || isNutri"
                    type="button"
                    class="comm-post-menu-item comm-post-menu-item--danger"
                    @click="handleDeletePost(post.id)"
                  >
                    Excluir publicação
                  </button>
                  <button type="button" class="comm-post-menu-item" @click="copyPostContent(post)">
                    Copiar texto
                  </button>
                </div>
              </div>
            </div>

            <p v-if="post.content" class="comm-post-text">{{ post.content }}</p>
            <button
              v-if="post.imageUrl"
              type="button"
              class="comm-post-image-btn"
              aria-label="Abrir imagem em tela cheia"
              @click="openImageLightbox(post.imageUrl)"
            >
              <img
                :src="post.imageUrl"
                alt="Imagem da publicação"
                class="comm-post-image"
                loading="lazy"
              />
            </button>

            <div class="comm-post-actions">
              <button
                type="button"
                class="comm-action"
                :class="{ 'comm-action--liked': post.likedByMe }"
                :disabled="isNutri || likingPostId === post.id"
                @click="handleToggleLike(post)"
              >
                <Heart class="comm-action-icon" :fill="post.likedByMe ? 'currentColor' : 'none'" />
                <span>{{ post.likes ?? 0 }}</span>
              </button>
              <button type="button" class="comm-action" @click="toggleComments(post.id)">
                <MessageCircle class="comm-action-icon" />
                <span>{{ post.comments?.length || 0 }}</span>
              </button>
            </div>

            <div v-if="expandedComments.includes(post.id)" class="comm-comments">
              <div v-if="post.comments?.length" class="comm-comments-list">
                <div v-for="comment in post.comments" :key="comment.id" class="comm-comment">
                  <strong>{{ comment.author?.name }}</strong>
                  <p>{{ comment.content }}</p>
                </div>
              </div>
              <p v-else class="comm-comments-empty">Nenhum comentário ainda. Seja o primeiro!</p>
              <div v-if="!isNutri" class="comm-comment-input">
                <input
                  :id="`comment-input-${post.id}`"
                  v-model="post.newComment"
                  placeholder="Comentar..."
                  @keyup.enter="handleAddComment(post)"
                />
                <button type="button" aria-label="Enviar comentário" @click="handleAddComment(post)">
                  <Send class="comm-send-icon" />
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="comm-empty">
          <MessageCircle class="comm-empty-icon" />
          <p>Seja a primeira a compartilhar algo na comunidade.</p>
        </div>
      </template>

      <div v-else class="comm-tab-placeholder">
        <Users class="comm-empty-icon" />
        <p>{{ activeTab === 'groups' ? 'Grupos em breve.' : 'Amigas em breve.' }}</p>
      </div>
    </div>

    <!-- Portal web -->
    <div v-else class="community-container">
      <div class="community-page">
        <!-- Header -->
        <div class="page-header" :class="{ 'patient-app-header': config.public.mobileApp }">
          <div>
            <h1>{{ config.public.mobileApp ? 'Comunidade' : 'Comunidade Florescer' }}</h1>
            <p v-if="!config.public.mobileApp">Espaço exclusivo para pacientes trocarem experiências e se apoiarem.</p>
          </div>
          <div class="community-stats" v-if="posts.length">
            <span class="stat-badge">
              <Users class="stat-icon" />
              {{ posts.length }} Publicações
            </span>
          </div>
        </div>

        <div class="community-layout">
          <!-- Feed Principal -->
          <div class="feed-section">
            <div v-if="isNutri" class="nutri-readonly-banner">
              Você está em modo de moderação. Apenas pacientes publicam e comentam aqui.
            </div>

            <!-- Nova publicação (somente pacientes) -->
            <div v-if="!isNutri" class="new-post-card">
              <div class="post-input-wrapper">
                <div class="user-avatar-sm">
                  {{ userInitial }}
                </div>
                <textarea 
                  v-model="newPostContent" 
                  placeholder="No que você está pensando hoje?" 
                  rows="1"
                  @input="autoResize"
                  ref="postArea"
                ></textarea>
              </div>
              <div v-if="postImagePreviewUrl" class="comm-compose-preview web-compose-preview">
                <img :src="postImagePreviewUrl" alt="Pré-visualização da foto" />
                <button type="button" class="comm-compose-preview-remove" aria-label="Remover foto" @click="clearPostImage">
                  <X class="comm-compose-preview-remove-icon" />
                </button>
              </div>
              <input
                ref="postImageInputWeb"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="comm-file-input"
                @change="handlePostImageSelect"
              />
              <div class="post-actions-row">
                <div class="post-options">
                  <button type="button" class="opt-btn" :disabled="loading" @click="triggerPostImageUpload">
                    <ImageIcon class="opt-icon" /> Imagem
                  </button>
                  <button class="opt-btn"><Hash class="opt-icon" /> Topic</button>
                </div>
                <button
                  @click="handleCreatePost"
                  :disabled="(!newPostContent.trim() && !selectedPostImageFile) || loading"
                  class="btn-post-submit"
                >
                  <span v-if="loading">Publicando...</span>
                  <template v-else>
                    <Send class="btn-icon-xs" /> Publicar
                  </template>
                </button>
              </div>
            </div>

            <!-- Posts List -->
            <div class="posts-feed" v-if="posts.length">
              <div v-for="post in posts" :key="post.id" class="post-card">
                <div class="post-header">
                  <div class="post-user-info">
                    <div class="user-avatar">
                      {{ post.author?.name?.charAt(0).toUpperCase() || 'U' }}
                    </div>
                    <div class="post-meta">
                      <h4>{{ post.author?.name }}</h4>
                      <span>{{ formatDistance(post.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="comm-post-menu-wrap web-post-menu-wrap">
                    <button
                      type="button"
                      class="btn-post-more"
                      aria-label="Opções da publicação"
                      @click.stop="togglePostMenu(post.id)"
                    >
                      <MoreHorizontal />
                    </button>
                    <div v-if="openMenuPostId === post.id" class="comm-post-menu-popover" @click.stop>
                      <button
                        v-if="isMyPost(post) || isNutri"
                        type="button"
                        class="comm-post-menu-item comm-post-menu-item--danger"
                        @click="handleDeletePost(post.id)"
                      >
                        Excluir publicação
                      </button>
                      <button type="button" class="comm-post-menu-item" @click="copyPostContent(post)">
                        Copiar texto
                      </button>
                    </div>
                  </div>
                </div>

                <div class="post-body">
                  <p v-if="post.content">{{ post.content }}</p>
                  <button
                    v-if="post.imageUrl"
                    type="button"
                    class="comm-post-image-btn post-image-btn"
                    aria-label="Abrir imagem em tela cheia"
                    @click="openImageLightbox(post.imageUrl)"
                  >
                    <img
                      :src="post.imageUrl"
                      alt="Imagem da publicação"
                      class="post-image"
                      loading="lazy"
                    />
                  </button>
                </div>

                <div class="post-interactions">
                  <button
                    type="button"
                    class="interaction-btn"
                    :class="{ active: post.likedByMe }"
                    :disabled="isNutri || likingPostId === post.id"
                    @click="handleToggleLike(post)"
                  >
                    <Heart class="inter-icon" :fill="post.likedByMe ? 'currentColor' : 'none'" />
                    <span>{{ post.likedByMe ? 'Curtido' : 'Curtir' }} · {{ post.likes ?? 0 }}</span>
                  </button>
                  <button type="button" class="interaction-btn" @click="toggleComments(post.id)">
                    <MessageCircle class="inter-icon" />
                    <span>{{ post.comments?.length || 0 }} Comentários</span>
                  </button>
                </div>

                <!-- Comments Area (Recessed) -->
                <div class="comments-area" v-if="expandedComments.includes(post.id)">
                  <div class="comments-list">
                    <div v-for="comment in post.comments" :key="comment.id" class="comment-item">
                      <div class="comment-avatar">
                        {{ comment.author?.name?.charAt(0).toUpperCase() || 'U' }}
                      </div>
                      <div class="comment-content">
                        <div class="comment-bubble">
                          <h5>{{ comment.author?.name }}</h5>
                          <p>{{ comment.content }}</p>
                        </div>
                        <span class="comment-time">{{ formatDistance(comment.createdAt) }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="!isNutri" class="add-comment-box">
                    <div class="user-avatar-xs">{{ userInitial }}</div>
                    <div class="comment-input-wrapper">
                      <input 
                        :id="`comment-input-${post.id}`"
                        v-model="post.newComment" 
                        @keyup.enter="handleAddComment(post)" 
                        placeholder="Escreva um comentário..." 
                      />
                      <button @click="handleAddComment(post)" :disabled="!post.newComment?.trim()">
                        <Send class="send-comment-icon" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
              <div class="empty-circle">
                <MessageCircle class="empty-icon" />
              </div>
              <h3>Comece a conversa!</h3>
              <p>Ainda não há publicações nesta comunidade. Seja o primeiro a compartilhar algo.</p>
            </div>
          </div>

          <!-- Sidebar da Comunidade (Opcional - Elite) -->
          <aside class="community-sidebar">
            <div class="sidebar-widget">
              <h3>Sobre a Comunidade</h3>
              <p>Um espaço seguro para pacientes compartilharem evolução, dúvidas e conquistas com outros membros do Clube.</p>
            </div>
            
            <div class="sidebar-widget">
              <h3>Regras básicas</h3>
              <ul class="community-rules">
                <li>Respeito mútuo sempre</li>
                <li>Compartilhe conquistas</li>
                <li>Tire dúvidas construtivas</li>
                <li>Apenas pacientes publicam</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="lightboxImageUrl"
        class="comm-image-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Visualização da imagem"
        @click.self="closeImageLightbox"
      >
        <button type="button" class="comm-image-lightbox-close" aria-label="Fechar" @click="closeImageLightbox">
          <X class="comm-image-lightbox-close-icon" />
        </button>
        <img :src="lightboxImageUrl" alt="Imagem ampliada" class="comm-image-lightbox-img" />
      </div>
    </Teleport>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const layoutName = computed(() => (config.public.mobileApp ? 'patient' : 'dashboard'))
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase

import { 
  User, 
  Send, 
  MessageCircle, 
  Users, 
  Heart, 
  Image as ImageIcon, 
  Hash,
  X,
  Search,
  Camera,
  MoreHorizontal,
  Star,
  HelpCircle,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-vue-next'

const posts = ref([])
const newPostContent = ref('')
const loading = ref(false)
const expandedComments = ref([])
const openMenuPostId = ref(null)
const likingPostId = ref(null)
const isNutri = ref(false)
const userId = ref('')
const activeTab = ref('feed')
const activePostType = ref('achievement')
const postImageInput = ref(null)
const postImageInputWeb = ref(null)
const selectedPostImageFile = ref(null)
const postImagePreviewUrl = ref('')
const lightboxImageUrl = ref('')

const communityTabs = [
  { id: 'feed', label: 'Feed' },
  { id: 'groups', label: 'Grupos' },
  { id: 'friends', label: 'Amigas' },
]

const composeChips = [
  { id: 'achievement', label: 'Conquista', icon: Star },
  { id: 'question', label: 'Dúvida', icon: HelpCircle },
  { id: 'recipe', label: 'Receita', icon: UtensilsCrossed },
  { id: 'inspiration', label: 'Inspiração', icon: Sparkles },
]

const { userInitials } = usePatientApp()
const userInitial = computed(() => userInitials().charAt(0))

const authHeaders = () => {
  if (import.meta.server) return {}
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const fetchPosts = async () => {
  if (import.meta.server) return
  try {
    const data = await $fetch(`${apiBase}/posts`, {
      headers: authHeaders(),
    })
    posts.value = data.map((p) => ({
      ...p,
      likes: p.likes ?? p.likesCount ?? 0,
      likedByMe: Boolean(p.likedByMe),
      newComment: '',
    }))
  } catch (err) {
    console.error('Erro ao carregar posts:', err)
  }
}

const handleToggleLike = async (post) => {
  if (isNutri.value) return
  if (likingPostId.value === post.id) return
  likingPostId.value = post.id
  try {
    const result = await $fetch(`${apiBase}/posts/${post.id}/toggle-like`, {
      method: 'POST',
      headers: authHeaders(),
    })
    post.likes = result.likes
    post.likedByMe = result.likedByMe
  } catch (err) {
    alert(err.data?.message || 'Erro ao curtir publicação.')
  } finally {
    likingPostId.value = null
  }
}

const handleCreatePost = async () => {
  if (isNutri.value) return
  if (!newPostContent.value.trim() && !selectedPostImageFile.value) return
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('content', newPostContent.value.trim())
    if (selectedPostImageFile.value) {
      formData.append('image', selectedPostImageFile.value)
    }
    await $fetch(`${apiBase}/posts`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    newPostContent.value = ''
    clearPostImage()
    fetchPosts()
  } catch (err) {
    alert(err.data?.message || 'Erro ao publicar post.')
  } finally {
    loading.value = false
  }
}

const resolvePostImageInput = () => postImageInput.value || postImageInputWeb.value

const triggerPostImageUpload = () => {
  const input = resolvePostImageInput()
  if (!input) return
  input.value = ''
  input.click()
}

const handlePostImageSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Selecione uma imagem (JPG, PNG, WEBP ou GIF).')
    event.target.value = ''
    return
  }

  if (file.size > 8 * 1024 * 1024) {
    alert('A imagem deve ter no máximo 8MB.')
    event.target.value = ''
    return
  }

  if (postImagePreviewUrl.value) {
    URL.revokeObjectURL(postImagePreviewUrl.value)
  }

  selectedPostImageFile.value = file
  postImagePreviewUrl.value = URL.createObjectURL(file)
}

const clearPostImage = () => {
  selectedPostImageFile.value = null
  if (postImagePreviewUrl.value) {
    URL.revokeObjectURL(postImagePreviewUrl.value)
    postImagePreviewUrl.value = ''
  }
  const input = resolvePostImageInput()
  if (input) input.value = ''
}

const handleAddComment = async (post) => {
  if (isNutri.value) return
  if (!post.newComment?.trim()) return
  try {
    await $fetch(`${apiBase}/posts/${post.id}/comments`, {
      method: 'POST',
      headers: authHeaders(),
      body: { content: post.newComment }
    })
    post.newComment = ''
    if (!expandedComments.value.includes(post.id)) {
      expandedComments.value.push(post.id)
    }
    await fetchPosts()
  } catch (err) {
    alert(err.data?.message || 'Erro ao adicionar comentário.')
  }
}

const handleDeletePost = async (id) => {
  openMenuPostId.value = null
  if (!confirm('Deseja excluir esta publicação?')) return
  try {
    await $fetch(`${apiBase}/posts/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    expandedComments.value = expandedComments.value.filter((postId) => postId !== id)
    await fetchPosts()
  } catch (err) {
    alert(err.data?.message || 'Erro ao excluir publicação.')
  }
}

const togglePostMenu = (postId) => {
  openMenuPostId.value = openMenuPostId.value === postId ? null : postId
}

const closePostMenu = () => {
  openMenuPostId.value = null
}

const copyPostContent = async (post) => {
  openMenuPostId.value = null
  if (!import.meta.client || !post.content) return
  try {
    await navigator.clipboard.writeText(post.content)
  } catch {
    /* ignore */
  }
}

const toggleComments = async (id) => {
  const index = expandedComments.value.indexOf(id)
  if (index > -1) {
    expandedComments.value.splice(index, 1)
    return
  }
  expandedComments.value.push(id)
  await nextTick()
  if (import.meta.client) {
    document.getElementById(`comment-input-${id}`)?.focus()
  }
}

const isMyPost = (post) => post.authorId === userId.value || post.author?.id === userId.value

const formatDistance = (date) => {
  const diffMs = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const autoResize = (e) => {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

const openImageLightbox = (url) => {
  if (!url) return
  lightboxImageUrl.value = url
  if (import.meta.client) {
    document.body.style.overflow = 'hidden'
  }
}

const closeImageLightbox = () => {
  lightboxImageUrl.value = ''
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
}

const handleLightboxKeydown = (event) => {
  if (event.key === 'Escape') closeImageLightbox()
}

onMounted(() => {
  if (import.meta.client) {
    isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
    userId.value = localStorage.getItem('user_id') || ''
    document.addEventListener('click', closePostMenu)
    document.addEventListener('keydown', handleLightboxKeydown)
  }
  fetchPosts()
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', closePostMenu)
    document.removeEventListener('keydown', handleLightboxKeydown)
    document.body.style.overflow = ''
    clearPostImage()
  }
})
</script>

<style scoped>
.community-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.community-page {
  padding: 3rem;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3.5rem;
}

.page-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

.community-stats {
  display: flex;
  gap: 1rem;
}

.stat-badge {
  background: white;
  border: 1px solid #eee;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon { width: 16px; height: 16px; }

/* Layout Feed + Sidebar */
.community-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 3rem;
  align-items: start;
}

.feed-section {
  max-width: 760px;
  width: 100%;
}

/* NEW POST CARD ELITE */
.new-post-card {
  background: white;
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
  border: 1px solid #f0f0f0;
  margin-bottom: 2.5rem;
}

.post-input-wrapper {
  display: flex;
  gap: 1.2rem;
  margin-bottom: 1.5rem;
}

.user-avatar-sm, .user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.new-post-card textarea {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.5rem 0;
  font-size: 1.1rem;
  font-family: inherit;
  color: #222;
  resize: none;
  outline: none;
  min-height: 44px;
  line-height: 1.5;
}

.post-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.2rem;
  border-top: 1px solid #f8f8f8;
}

.post-options {
  display: flex;
  gap: 1rem;
}

.opt-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fdfdfd;
  border: 1px solid #f0f0f0;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.opt-btn:hover {
  background: #f8fbf8;
  border-color: var(--primary-light);
  color: var(--primary);
}

.btn-post-submit {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.7rem 1.8rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: 0.3s;
}

.btn-post-submit:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}

.btn-post-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* POST CARDS */
.posts-feed {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.post-card {
  background: white;
  border-radius: 24px;
  padding: 1.8rem;
  border: 1px solid #f5f5f5;
  transition: all 0.3s ease;
}

.post-card:hover {
  border-color: #eee;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.post-user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.post-meta h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 2px;
}

.post-meta span {
  font-size: 0.8rem;
  color: #bbb;
  font-weight: 600;
  text-transform: uppercase;
}

.web-post-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.btn-post-more {
  background: transparent;
  border: none;
  color: #ddd;
  cursor: pointer;
  padding: 5px;
  transition: 0.2s;
}

.btn-post-more:hover { color: #e63946; }

.post-body p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #333;
  margin-bottom: 1rem;
  white-space: pre-wrap;
}

.post-image {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: 12px;
}

.post-image-btn {
  margin-bottom: 1.8rem;
}

.post-body p:last-child {
  margin-bottom: 1.8rem;
}

.post-interactions {
  display: flex;
  gap: 2rem;
  padding-top: 1.2rem;
  border-top: 1px solid #f8f8f8;
}

.interaction-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: #888;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: 0.2s;
}

.interaction-btn:hover { color: #555; }
.interaction-btn.active { color: var(--primary); }

.inter-icon { width: 18px; height: 18px; }

/* COMMENTS AREA */
.comments-area {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #fdfdfd;
  border-radius: 18px;
  border: 1px solid #f8f8f8;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-bottom: 1.5rem;
}

.comment-item {
  display: flex;
  gap: 1rem;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #eee;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.comment-bubble {
  background: #fff;
  padding: 0.8rem 1.2rem;
  border-radius: 0 16px 16px 16px;
  border: 1px solid #f0f0f0;
}

.comment-bubble h5 { font-size: 0.85rem; font-weight: 800; margin-bottom: 4px; }
.comment-bubble p { font-size: 0.92rem; color: #555; line-height: 1.4; }
.comment-time { font-size: 0.75rem; color: #ccc; font-weight: 700; margin-top: 4px; display: block; margin-left: 4px;}

.add-comment-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar-xs {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
}

.comment-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 0 1rem;
  transition: 0.2s;
}

.comment-input-wrapper:focus-within { border-color: var(--primary-light); }

.comment-input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.8rem 0;
  outline: none;
  font-family: inherit;
  font-size: 0.9rem;
}

.comment-input-wrapper button {
  background: transparent;
  border: none;
  color: var(--primary);
  cursor: pointer;
  display: flex;
  opacity: 0.4;
  transition: 0.2s;
}

.comment-input-wrapper button:not(:disabled) { opacity: 1; }

.send-comment-icon { width: 18px; height: 18px; }

/* SIDEBAR WIDGETS */
.community-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sidebar-widget {
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid #f0f0f0;
}

.sidebar-widget h3 {
  font-size: 1rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 1rem;
}

.sidebar-widget p {
  font-size: 0.9rem;
  color: #777;
  line-height: 1.6;
}

.community-rules {
  list-style: none;
  font-size: 0.88rem;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nutri-readonly-banner {
  background: #fff8e6;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.community-rules li::before {
  content: "•";
  color: var(--primary);
  font-weight: 900;
  margin-right: 10px;
}

.empty-state {
  text-align: center;
  padding: 6rem 0;
}

.empty-circle {
  width: 80px;
  height: 80px;
  background: #f8fbf8;
  color: #eee;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.empty-icon { width: 36px; height: 36px; }

.patient-app-header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.patient-app-header {
  margin-bottom: 1rem;
  padding-top: 0.5rem;
}

/* App paciente — comunidade */
.comm-page {
  padding-top: 0;
  padding-inline: 1.25rem;
  padding-bottom: calc(var(--cf-tab-h) + env(safe-area-inset-bottom, 0px) + 0.5rem);
}

.comm-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.comm-header-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--cf-text);
}

.comm-tabs {
  display: flex;
  gap: 0;
  margin: 0 -1rem 1.15rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--cf-border);
}

.comm-tab {
  flex: 1;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 0.7rem 0.5rem;
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.comm-tab.active {
  color: var(--cf-pink);
  border-bottom-color: var(--cf-pink);
  font-weight: 600;
}

.comm-compose-card {
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius);
  padding: 1rem;
  margin-bottom: 1.35rem;
  box-shadow: var(--cf-shadow);
}

.comm-compose-input {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.comm-compose-input input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--cf-text);
  outline: none;
}

.comm-compose-input input::placeholder {
  color: #a3a3a3;
}

.comm-camera-btn {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.comm-camera-btn--active {
  box-shadow: 0 0 0 2px var(--cf-pink);
}

.comm-camera-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.comm-file-input {
  display: none;
}

.comm-compose-preview {
  position: relative;
  margin-top: 0.85rem;
  border-radius: var(--cf-radius-sm);
  overflow: hidden;
  border: 1px solid var(--cf-border);
}

.comm-compose-preview img {
  display: block;
  width: 100%;
  max-height: 16rem;
  object-fit: cover;
}

.web-compose-preview {
  margin: 0 0 1rem;
}

.comm-compose-preview-remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.comm-compose-preview-remove-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.comm-post-image-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: #eef0f2;
  border-radius: var(--cf-radius-sm);
  cursor: zoom-in;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.comm-post-image-btn:focus-visible {
  outline: 2px solid var(--cf-pink);
  outline-offset: 2px;
}

.comm-post-image {
  display: block;
  width: 100%;
  max-height: 18rem;
  object-fit: contain;
  pointer-events: none;
}

.comm-image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.92);
}

.comm-image-lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.comm-image-lightbox-close-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.comm-image-lightbox-img {
  max-width: min(100%, 960px);
  max-height: calc(100vh - 2.5rem);
  object-fit: contain;
  border-radius: 8px;
  user-select: none;
}

.comm-camera-icon {
  width: 1.05rem;
  height: 1.05rem;
  color: var(--cf-pink);
}

.comm-type-chips {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.85rem;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 0.1rem;
}

.comm-type-chips::-webkit-scrollbar {
  display: none;
}

.comm-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  padding: 0.38rem 0.75rem;
  background: var(--cf-surface);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.comm-type-chip.active {
  background: var(--cf-pink-soft);
  border-color: rgba(193, 123, 128, 0.35);
  color: var(--cf-pink-dark);
}

.comm-type-chip-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.comm-section-title {
  margin: 0 0 0.85rem;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--cf-text);
}

.comm-feed {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.comm-post-card {
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius);
  padding: 1rem;
  box-shadow: var(--cf-shadow);
}

.comm-post-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.comm-post-meta {
  flex: 1;
  min-width: 0;
}

.comm-post-meta strong {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--cf-text);
  line-height: 1.2;
}

.comm-post-meta span {
  font-size: 0.75rem;
  color: var(--cf-text-muted);
}

.comm-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.comm-post-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.comm-post-menu {
  border: none;
  background: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--cf-text-muted);
}

.comm-post-menu-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.comm-post-menu-popover {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 20;
  min-width: 10.5rem;
  padding: 0.35rem;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-sm);
  box-shadow: var(--cf-shadow-lg);
}

.comm-post-menu-item {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.55rem 0.65rem;
  text-align: left;
  font-family: inherit;
  font-size: 0.8125rem;
  color: var(--cf-text);
  border-radius: 8px;
  cursor: pointer;
}

.comm-post-menu-item:hover,
.comm-post-menu-item:active {
  background: var(--cf-green-soft);
}

.comm-post-menu-item--danger {
  color: #c53030;
}

.comm-post-menu-item--danger:hover,
.comm-post-menu-item--danger:active {
  background: #fef2f2;
}

.comm-post-text {
  margin: 0 0 0.85rem;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--cf-text);
  white-space: pre-wrap;
}

.comm-post-actions {
  display: flex;
  align-items: center;
  gap: 1.15rem;
  padding-top: 0.15rem;
}

.comm-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  cursor: pointer;
  padding: 0;
}

.comm-action:disabled {
  opacity: 0.6;
  cursor: default;
}

.comm-action--liked {
  color: var(--cf-pink-dark);
}

.comm-action--liked .comm-action-icon {
  color: var(--cf-pink);
}

.comm-action-icon {
  width: 1rem;
  height: 1rem;
  color: var(--cf-pink);
}

.comm-comments {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--cf-border);
}

.comm-comments-list {
  margin-bottom: 0.65rem;
}

.comm-comments-empty {
  margin: 0 0 0.65rem;
  font-size: 0.8125rem;
  color: var(--cf-text-muted);
}

.comm-comment {
  margin-bottom: 0.55rem;
  font-size: 0.8125rem;
}

.comm-comment strong {
  color: var(--cf-text);
}

.comm-comment p {
  margin: 0.15rem 0 0;
  color: var(--cf-text-muted);
  line-height: 1.45;
}

.comm-comment-input {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.65rem;
}

.comm-comment-input input {
  flex: 1;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  font-family: inherit;
  font-size: 0.8125rem;
  outline: none;
}

.comm-comment-input input:focus {
  border-color: var(--cf-pink);
}

.comm-comment-input button {
  border: none;
  background: none;
  color: var(--cf-pink);
  cursor: pointer;
  padding: 0.25rem;
}

.comm-send-icon {
  width: 1rem;
  height: 1rem;
}

.comm-empty,
.comm-tab-placeholder {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--cf-text-muted);
}

.comm-empty-icon {
  width: 2rem;
  height: 2rem;
  color: var(--cf-pink);
  opacity: 0.45;
  margin: 0 auto 0.75rem;
  display: block;
}

.comm-empty p,
.comm-tab-placeholder p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}
</style>


