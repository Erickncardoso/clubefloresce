<template>
  <div class="comm-feed-root">
    <nav class="comm-tabs" aria-label="Seções da comunidade">
      <button
        v-for="tab in communityTabs"
        :key="tab.id"
        type="button"
        class="comm-tab"
        :class="{ active: activeTab === tab.id }"
        @click="$emit('update:activeTab', tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <template v-if="activeTab === 'feed'">
      <section class="comm-compose-card">
        <div class="comm-compose-input">
          <div class="comm-avatar">{{ userInitial }}</div>
          <input
            :value="newPostContent"
            type="text"
            placeholder="No que você está pensando?"
            @input="$emit('update:newPostContent', $event.target.value)"
            @keyup.enter="$emit('create-post')"
          />
          <input
            ref="imageInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="comm-file-input"
            @change="$emit('post-image-select', $event)"
          />
          <button
            type="button"
            class="comm-camera-btn"
            :class="{ 'comm-camera-btn--active': !!postImagePreviewUrl }"
            aria-label="Adicionar foto"
            :disabled="loading"
            @click="triggerImageUpload"
          >
            <Camera class="comm-camera-icon" />
          </button>
        </div>
        <div v-if="postImagePreviewUrl" class="comm-compose-preview">
          <img :src="postImagePreviewUrl" alt="Pré-visualização da foto" />
          <button type="button" class="comm-compose-preview-remove" aria-label="Remover foto" @click="$emit('clear-post-image')">
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
            @click="$emit('update:activePostType', chip.id)"
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
              <strong>
                {{ post.author?.name }}
                <img
                  v-if="isNutritionist(post.author)"
                  src="/icons/verificado.svg"
                  alt=""
                  class="comm-verified-inline"
                  aria-label="Nutricionista verificada"
                />
              </strong>
              <span>{{ formatDistance(post.createdAt) }}</span>
            </div>
            <div class="comm-post-menu-wrap">
              <button
                type="button"
                class="comm-post-menu"
                aria-label="Opções da publicação"
                @click.stop="$emit('toggle-post-menu', post.id)"
              >
                <MoreHorizontal class="comm-post-menu-icon" />
              </button>
              <div v-if="openMenuPostId === post.id" class="comm-post-menu-popover" @click.stop>
                <button
                  v-if="isMyPost(post) || isNutri"
                  type="button"
                  class="comm-post-menu-item comm-post-menu-item--danger"
                  @click="$emit('delete-post', post.id)"
                >
                  Excluir publicação
                </button>
                <button type="button" class="comm-post-menu-item" @click="$emit('copy-post', post)">
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
            @click="$emit('open-lightbox', post.imageUrl)"
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
              :disabled="likingPostId === post.id"
              @click="$emit('toggle-like', post)"
            >
              <Heart class="comm-action-icon" :fill="post.likedByMe ? 'currentColor' : 'none'" />
              <span>{{ post.likes ?? 0 }}</span>
            </button>
            <button type="button" class="comm-action" @click="$emit('toggle-comments', post.id)">
              <MessageCircle class="comm-action-icon" />
              <span>{{ post.comments?.length || 0 }}</span>
            </button>
          </div>

          <div v-if="expandedComments.includes(post.id)" class="comm-comments">
            <div v-if="post.comments?.length" class="comm-comments-list">
              <div v-for="comment in post.comments" :key="comment.id" class="comm-comment">
                <strong>
                  {{ comment.author?.name }}
                  <img
                    v-if="isNutritionist(comment.author)"
                    src="/icons/verificado.svg"
                    alt=""
                    class="comm-verified-inline"
                    aria-hidden="true"
                  />
                </strong>
                <p>{{ comment.content }}</p>
              </div>
            </div>
            <p v-else class="comm-comments-empty">Nenhum comentário ainda. Seja o primeiro!</p>
            <div class="comm-comment-input">
              <input
                :id="`comment-input-${post.id}`"
                :value="post.newComment"
                placeholder="Comentar..."
                @input="post.newComment = $event.target.value"
                @keyup.enter="$emit('add-comment', post)"
              />
              <button type="button" aria-label="Enviar comentário" @click="$emit('add-comment', post)">
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
</template>

<script setup>
import {
  Send,
  MessageCircle,
  Users,
  Heart,
  X,
  Camera,
  MoreHorizontal,
  Star,
  HelpCircle,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-vue-next'

const props = defineProps({
  isNutri: { type: Boolean, default: false },
  posts: { type: Array, default: () => [] },
  activeTab: { type: String, default: 'feed' },
  activePostType: { type: String, default: 'achievement' },
  newPostContent: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  postImagePreviewUrl: { type: String, default: '' },
  expandedComments: { type: Array, default: () => [] },
  openMenuPostId: { type: [String, Number, null], default: null },
  likingPostId: { type: [String, Number, null], default: null },
  userInitial: { type: String, default: 'U' },
  userId: { type: String, default: '' },
  formatDistance: { type: Function, required: true },
})

defineEmits([
  'update:activeTab',
  'update:activePostType',
  'update:newPostContent',
  'create-post',
  'post-image-select',
  'clear-post-image',
  'toggle-like',
  'toggle-comments',
  'add-comment',
  'delete-post',
  'toggle-post-menu',
  'copy-post',
  'open-lightbox',
])

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

const imageInputRef = ref(null)

const triggerImageUpload = () => {
  if (!imageInputRef.value) return
  imageInputRef.value.value = ''
  imageInputRef.value.click()
}

const isMyPost = (post) => post.authorId === props.userId || post.author?.id === props.userId

const isNutritionist = (author) => author?.role === 'NUTRICIONISTA'
</script>

<style scoped>
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
  border-radius: var(--cf-radius, 12px);
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
  border-radius: var(--cf-radius-sm, 10px);
  overflow: hidden;
  border: 1px solid var(--cf-border);
}

.comm-compose-preview img {
  display: block;
  width: 100%;
  max-height: 16rem;
  object-fit: cover;
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
  border-radius: var(--cf-radius, 12px);
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
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--cf-text);
  line-height: 1.2;
}

.comm-post-meta span {
  display: block;
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

.comm-verified-inline {
  display: inline-block;
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.comm-comment strong {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  color: var(--cf-text);
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
  border-radius: var(--cf-radius-sm, 10px);
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

.comm-post-image-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: #eef0f2;
  border-radius: var(--cf-radius-sm, 10px);
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
  min-width: 0;
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
  flex-shrink: 0;
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

@media (max-width: 480px) {
  .comm-tabs {
    margin-left: -0.25rem;
    margin-right: -0.25rem;
  }

  .comm-type-chips {
    margin-left: -0.15rem;
    margin-right: -0.15rem;
    padding-left: 0.15rem;
    padding-right: 0.15rem;
  }
}

@media (min-width: 769px) {
  .comm-tabs {
    margin-left: 0;
    margin-right: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .comm-post-image {
    max-height: 24rem;
  }

  .comm-compose-preview img {
    max-height: 20rem;
  }
}
</style>
