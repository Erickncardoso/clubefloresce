<template>
  <div v-if="isPatientApp" class="patient-page comm-page">
    <PatientHeader title="Comunidade" show-back back-to="/inicio">
      <template #actions>
        <button type="button" class="comm-header-btn" aria-label="Buscar">
          <Search class="comm-header-icon" />
        </button>
      </template>
    </PatientHeader>

    <PatientPageSkeleton v-if="pageLoading" layout="feed" />

    <CommunityFeed
      v-else
      v-model:active-tab="activeTab"
      v-model:active-post-type="activePostType"
      v-model:new-post-content="newPostContent"
      :is-nutri="isNutri"
      :posts="posts"
      :loading="loading"
      :post-image-preview-url="postImagePreviewUrl"
      :expanded-comments="expandedComments"
      :open-menu-post-id="openMenuPostId"
      :liking-post-id="likingPostId"
      :user-initial="userInitial"
      :user-id="userId"
      :format-distance="formatDistance"
      @create-post="handleCreatePost"
      @post-image-select="handlePostImageSelect"
      @clear-post-image="clearPostImage"
      @toggle-like="handleToggleLike"
      @toggle-comments="toggleComments"
      @add-comment="handleAddComment"
      @delete-post="handleDeletePost"
      @toggle-post-menu="togglePostMenu"
      @copy-post="copyPostContent"
      @open-lightbox="openImageLightbox"
    />
  </div>

  <NuxtLayout v-else name="dashboard">
    <div class="comm-web-shell admin-shell">
      <CommunityFeed
        v-model:active-tab="activeTab"
        v-model:active-post-type="activePostType"
        v-model:new-post-content="newPostContent"
        :is-nutri="isNutri"
        :posts="posts"
        :loading="loading"
        :post-image-preview-url="postImagePreviewUrl"
        :expanded-comments="expandedComments"
        :open-menu-post-id="openMenuPostId"
        :liking-post-id="likingPostId"
        :user-initial="userInitial"
        :user-id="userId"
        :format-distance="formatDistance"
        @create-post="handleCreatePost"
        @post-image-select="handlePostImageSelect"
        @clear-post-image="clearPostImage"
        @toggle-like="handleToggleLike"
        @toggle-comments="toggleComments"
        @add-comment="handleAddComment"
        @delete-post="handleDeletePost"
        @toggle-post-menu="togglePostMenu"
        @copy-post="copyPostContent"
        @open-lightbox="openImageLightbox"
      />
    </div>
  </NuxtLayout>

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
</template>

<script setup>
import { Search, X } from 'lucide-vue-next'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const config = useRuntimeConfig()
const isPatientApp = computed(() => Boolean(config.public.mobileApp))
const apiBase = config.public.apiBase

const posts = ref([])
const newPostContent = ref('')
const loading = ref(false)
const pageLoading = ref(true)
const expandedComments = ref([])
const openMenuPostId = ref(null)
const likingPostId = ref(null)
const isNutri = useVerifiedRole().isNutricionista
const userId = ref('')
const activeTab = ref('feed')
const activePostType = ref('achievement')
const selectedPostImageFile = ref(null)
const postImagePreviewUrl = ref('')
const lightboxImageUrl = ref('')

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
  } finally {
    pageLoading.value = false
  }
}

const handleToggleLike = async (post) => {
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
}

const handleAddComment = async (post) => {
  if (!post.newComment?.trim()) return
  try {
    await $fetch(`${apiBase}/posts/${post.id}/comments`, {
      method: 'POST',
      headers: authHeaders(),
      body: { content: post.newComment },
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
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir publicação',
    message: 'Deseja excluir esta publicação? Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
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

const openImageLightbox = (url) => {
  if (!url) return
  lightboxImageUrl.value = url
  if (import.meta.client) lockPatientScroll()
}

const closeImageLightbox = () => {
  lightboxImageUrl.value = ''
  if (import.meta.client) unlockPatientScroll()
}

const handleLightboxKeydown = (event) => {
  if (event.key === 'Escape') closeImageLightbox()
}

onBeforeRouteLeave(() => {
  closeImageLightbox()
  openMenuPostId.value = null
})

onMounted(() => {
  if (import.meta.client) {
    void verifyAuthSession()
    userId.value = localStorage.getItem('user_id') || ''
    const { hydrateProfile } = usePatientApp()
    hydrateProfile()
    document.addEventListener('click', closePostMenu)
    document.addEventListener('keydown', handleLightboxKeydown)
  }
  fetchPosts()
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', closePostMenu)
    document.removeEventListener('keydown', handleLightboxKeydown)
    unlockPatientScroll()
    clearPostImage()
  }
})
</script>

<style scoped>
.comm-page {
  padding-top: 0;
  padding-inline: 1.25rem;
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

.comm-web-shell {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
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

@media (max-width: 768px) {
  .comm-web-shell.admin-shell {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (min-width: 769px) {
  .comm-web-shell :deep(.comm-tabs) {
    margin-left: 0;
    margin-right: 0;
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
