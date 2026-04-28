<template>
  <NuxtLayout name="dashboard">
    <div class="community-container">
      <div class="community-page">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1>Comunidade Florescer</h1>
            <p>Conecte-se, compartilhe e evolua com a nossa comunidade.</p>
          </div>
          <div class="community-stats" v-if="posts.length">
            <span class="stat-badge">
              <Users class="stat-icon" />
              {{ posts.length }} PublicaÃ§Ãµes
            </span>
          </div>
        </div>

        <div class="community-layout">
          <!-- Feed Principal -->
          <div class="feed-section">
            <!-- New Post area (Premium) -->
            <div class="new-post-card">
              <div class="post-input-wrapper">
                <div class="user-avatar-sm">
                  {{ userInitial }}
                </div>
                <textarea 
                  v-model="newPostContent" 
                  placeholder="No que vocÃª estÃ¡ pensando hoje?" 
                  rows="1"
                  @input="autoResize"
                  ref="postArea"
                ></textarea>
              </div>
              <div class="post-actions-row">
                <div class="post-options">
                  <button class="opt-btn"><ImageIcon class="opt-icon" /> Imagem</button>
                  <button class="opt-btn"><Hash class="opt-icon" /> Topic</button>
                </div>
                <button @click="handleCreatePost" :disabled="!newPostContent.trim() || loading" class="btn-post-submit">
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
                  <button v-if="isNutri || isMyPost(post)" class="btn-post-more" @click="handleDeletePost(post.id)">
                    <Trash2 />
                  </button>
                </div>

                <div class="post-body">
                  <p>{{ post.content }}</p>
                </div>

                <div class="post-interactions">
                  <button class="interaction-btn active">
                    <Heart class="inter-icon" />
                    <span>Lindo!</span>
                  </button>
                  <button class="interaction-btn" @click="toggleComments(post.id)">
                    <MessageCircle class="inter-icon" />
                    <span>{{ post.comments?.length || 0 }} ComentÃ¡rios</span>
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

                  <div class="add-comment-box">
                    <div class="user-avatar-xs">{{ userInitial }}</div>
                    <div class="comment-input-wrapper">
                      <input 
                        v-model="post.newComment" 
                        @keyup.enter="handleAddComment(post)" 
                        placeholder="Escreva um comentÃ¡rio..." 
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
              <p>Ainda nÃ£o hÃ¡ publicaÃ§Ãµes nesta comunidade. Seja o primeiro a compartilhar algo.</p>
            </div>
          </div>

          <!-- Sidebar da Comunidade (Opcional - Elite) -->
          <aside class="community-sidebar">
            <div class="sidebar-widget">
              <h3>Sobre a Comunidade</h3>
              <p>Um espaÃ§o seguro para compartilhar sua evoluÃ§Ã£o, tirar dÃºvidas sobre planos alimentares e se conectar com outros membros do Clube.</p>
            </div>
            
            <div class="sidebar-widget">
              <h3>Regras BÃ¡sicas</h3>
              <ul class="community-rules">
                <li>Respeito mÃºtuo sempre</li>
                <li>Compartilhe conquistas</li>
                <li>Tire dÃºvidas construtivas</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase

import { 
  User, 
  Send, 
  MessageCircle, 
  Users, 
  Heart, 
  Trash2, 
  Image as ImageIcon, 
  Hash,
  X
} from 'lucide-vue-next'

const posts = ref([])
const newPostContent = ref('')
const loading = ref(false)
const expandedComments = ref([])
const isNutri = ref(false)
const userId = ref('')
const userInitial = computed(() => (localStorage.getItem('user_name') || 'U').charAt(0).toUpperCase())

const fetchPosts = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`${apiBase}/posts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    posts.value = data.map(p => ({ ...p, newComment: '' }))
  } catch (err) {
    console.error('Erro ao carregar posts:', err)
  }
}

const handleCreatePost = async () => {
  if (!newPostContent.value.trim()) return
  loading.value = true
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: newPostContent.value }
    })
    newPostContent.value = ''
    fetchPosts()
  } catch (err) {
    alert('Erro ao publicar post.')
  } finally {
    loading.value = false
  }
}

const handleAddComment = async (post) => {
  if (!post.newComment?.trim()) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: post.newComment }
    })
    post.newComment = ''
    fetchPosts()
  } catch (err) {
    alert('Erro ao adicionar comentÃ¡rio.')
  }
}

const handleDeletePost = async (id) => {
  if (!confirm('Deseja excluir esta publicaÃ§Ã£o?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/posts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchPosts()
  } catch (err) {
    console.error(err)
  }
}

const toggleComments = (id) => {
  const index = expandedComments.value.indexOf(id)
  if (index > -1) expandedComments.value.splice(index, 1)
  else expandedComments.value.push(id)
}

const isMyPost = (post) => post.authorId === userId.value

const formatDistance = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const autoResize = (e) => {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

onMounted(() => {
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
  userId.value = localStorage.getItem('user_id') // Assumindo que guardamos o id
  fetchPosts()
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
  font-family: 'Figtree', sans-serif;
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
  align-items: center;
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
  margin-bottom: 1.8rem;
  white-space: pre-wrap;
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
  font-family: 'Figtree', sans-serif;
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

.community-rules li::before {
  content: "â€¢";
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
</style>


