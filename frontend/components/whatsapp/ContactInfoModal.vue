<template>
  <aside v-if="open" class="contact-info-panel">
    <header class="contact-info-header">
      <button type="button" class="contact-info-icon-btn" aria-label="Fechar" @click="$emit('close')">✕</button>
      <h3>Dados do contato</h3>
      <button type="button" class="contact-info-icon-btn" aria-label="Editar notas" @click="$emit('request-edit-notes')">
        <Pencil class="contact-info-header-icon" />
      </button>
    </header>

    <div class="contact-info-body">
      <section class="contact-info-hero">
        <div class="contact-info-avatar">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
          <span v-else>{{ initial }}</span>
        </div>
        <h4>{{ displayName }}</h4>
        <p v-if="phoneLabel" class="contact-info-subline">{{ phoneLabel }}</p>
        <button type="button" class="contact-info-search-btn" @click="$emit('request-search')">
          <Search class="contact-info-search-icon" />
          Pesquisar
        </button>
      </section>

      <section v-if="aboutLabel" class="contact-info-about">
        <p class="contact-info-about-label">Recado</p>
        <p class="contact-info-about-text">{{ aboutLabel }}</p>
      </section>

      <section class="contact-info-block">
        <article class="contact-info-row is-clickable" @click="$emit('request-media-docs')">
          <Images class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>Mídia, links e docs</span>
          </div>
          <span v-if="mediaCount > 0" class="contact-info-row-right">{{ mediaCount }}</span>
        </article>
        <div v-if="previewItems.length" class="contact-info-media-strip">
          <button
            v-for="item in previewItems.slice(0, 4)"
            :key="item.id"
            type="button"
            class="contact-info-media-thumb"
            @click="$emit('request-open-media', item)"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.label || 'Mídia'" loading="lazy" />
            <span v-else>{{ item.label || 'Mídia' }}</span>
          </button>
        </div>
        <article class="contact-info-row is-clickable" @click="$emit('request-starred-messages')">
          <Star class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>Mensagens favoritas</span>
          </div>
        </article>
        <article class="contact-info-row is-clickable" @click="$emit('request-toggle-mute')">
          <Bell class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>Silenciada</span>
            <small v-if="muteSubtitle">{{ muteSubtitle }}</small>
          </div>
          <span class="contact-info-toggle" :class="{ 'contact-info-toggle--on': isMuted }" />
        </article>
        <article class="contact-info-row">
          <Clock3 class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>Mensagens temporárias</span>
            <small>{{ ephemeralLabel }}</small>
          </div>
        </article>
        <article class="contact-info-row">
          <Shield class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>Privacidade avançada da conversa</span>
            <small>Desativada</small>
          </div>
        </article>
        <article class="contact-info-row contact-info-row--last">
          <Lock class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>Criptografia</span>
            <small>As mensagens são protegidas com a criptografia de ponta a ponta.</small>
          </div>
        </article>
      </section>

      <section v-if="commonGroups.length" class="contact-info-block">
        <p class="contact-info-block-title">Grupos em comum</p>
        <article
          v-for="group in commonGroups"
          :key="group.jid || group.name"
          class="contact-info-row is-clickable"
          :class="{ 'contact-info-row--last': group === commonGroups[commonGroups.length - 1] }"
          @click="$emit('request-open-group', group)"
        >
          <Users class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>{{ group.name }}</span>
          </div>
          <ChevronRight class="contact-info-row-chevron" />
        </article>
      </section>

      <section class="contact-info-block contact-info-block--actions">
        <article class="contact-info-row is-clickable" @click="$emit('request-toggle-favorite')">
          <Heart class="contact-info-row-icon" />
          <div class="contact-info-row-main">
            <span>{{ favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos' }}</span>
          </div>
        </article>
        <article class="contact-info-row is-clickable contact-info-row--danger" @click="$emit('request-clear-chat')">
          <CircleMinus class="contact-info-row-icon contact-info-row-icon--danger" />
          <div class="contact-info-row-main">
            <span>Limpar conversa</span>
          </div>
        </article>
        <article class="contact-info-row is-clickable contact-info-row--danger" @click="$emit('request-toggle-block')">
          <Ban class="contact-info-row-icon contact-info-row-icon--danger" />
          <div class="contact-info-row-main">
            <span>{{ details?.isBlocked ? `Desbloquear ${displayName}` : `Bloquear ${displayName}` }}</span>
          </div>
        </article>
        <article class="contact-info-row is-clickable contact-info-row--danger" @click="$emit('request-report')">
          <ThumbsDown class="contact-info-row-icon contact-info-row-icon--danger" />
          <div class="contact-info-row-main">
            <span>Denunciar {{ displayName }}</span>
          </div>
        </article>
        <article class="contact-info-row is-clickable contact-info-row--danger contact-info-row--last" @click="$emit('request-delete-chat')">
          <Trash2 class="contact-info-row-icon contact-info-row-icon--danger" />
          <div class="contact-info-row-main">
            <span>Apagar conversa</span>
          </div>
        </article>
      </section>

      <p v-if="loading" class="contact-info-footer-msg">Carregando detalhes do contato...</p>
      <p v-else-if="errorMessage" class="contact-info-footer-msg contact-info-footer-msg--error">{{ errorMessage }}</p>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import {
  Ban, Bell, ChevronRight, CircleMinus, Clock3, Heart, Images, Lock,
  Pencil, Search, Shield, Star, ThumbsDown, Trash2, Users
} from 'lucide-vue-next'
import { formatEphemeralLabel, formatMuteEndLabel } from '~/composables/whatsapp/useWhatsappChatDetails.js'
import { formatJidAsPhoneLine } from '~/composables/whatsapp/useWhatsappUtils.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  details: { type: Object, default: null },
  chat: { type: Object, default: null },
  muted: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  mediaCount: { type: Number, default: 0 },
  previewItems: { type: Array, default: () => [] }
})

defineEmits([
  'close',
  'request-search',
  'request-edit-notes',
  'request-media-docs',
  'request-open-media',
  'request-starred-messages',
  'request-toggle-mute',
  'request-toggle-favorite',
  'request-toggle-block',
  'request-clear-chat',
  'request-report',
  'request-delete-chat',
  'request-open-group'
])

const displayName = computed(() =>
  String(props.details?.displayName || props.chat?.pushName || props.chat?.name || 'Contato').trim()
)

const avatarUrl = computed(() =>
  String(props.details?.avatarUrl || props.chat?.avatarUrl || '').trim()
)

const initial = computed(() => String(displayName.value || '?').charAt(0).toUpperCase())

const phoneLabel = computed(() => {
  const phone = String(props.details?.phone || '').trim()
  if (phone) return formatJidAsPhoneLine(phone) || phone
  const jid = String(props.details?.chatJid || props.chat?.chatJid || '').trim()
  return formatJidAsPhoneLine(jid) || jid.replace('@s.whatsapp.net', '').replace('@lid', '')
})

const aboutLabel = computed(() => String(props.details?.about || '').trim())

const commonGroups = computed(() => Array.isArray(props.details?.commonGroups) ? props.details.commonGroups : [])

const isMutedByApi = computed(() => {
  const end = Number(props.details?.muteEndTime || 0)
  if (end === -1) return true
  if (!Number.isFinite(end) || end <= 0) return false
  const ms = end > 1e12 ? end : end * 1000
  return ms > Date.now()
})

const isMuted = computed(() => props.muted || isMutedByApi.value)

const muteSubtitle = computed(() => {
  if (!isMuted.value) return ''
  const apiLabel = formatMuteEndLabel(props.details?.muteEndTime)
  if (apiLabel) return apiLabel
  return props.muted ? 'Silenciada' : ''
})

const ephemeralLabel = computed(() => formatEphemeralLabel(props.details?.ephemeralExpiration))
</script>

<style scoped>
.contact-info-panel {
  width: min(420px, 42vw);
  min-width: 320px;
  flex-shrink: 0;
  height: 100%;
  background: #ffffff;
  color: #111b21;
  border-left: 1px solid #e9edef;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.contact-info-header {
  min-height: 60px;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 0 8px;
  background: #f0f2f5;
  flex-shrink: 0;
}
.contact-info-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  text-align: center;
}
.contact-info-icon-btn {
  border: none;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 1.15rem;
}
.contact-info-icon-btn:hover { background: rgba(0, 0, 0, 0.05); }
.contact-info-header-icon { width: 20px; height: 20px; }
.contact-info-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: #ffffff;
}
.contact-info-hero {
  padding: 28px 24px 20px;
  text-align: center;
  background: #ffffff;
}
.contact-info-avatar {
  width: 200px;
  height: 200px;
  max-width: 55%;
  aspect-ratio: 1;
  margin: 0 auto 16px;
  border-radius: 999px;
  overflow: hidden;
  background: #dfe5e7;
  color: #54656f;
  display: grid;
  place-items: center;
  font-size: 3rem;
  font-weight: 400;
}
.contact-info-avatar img { width: 100%; height: 100%; object-fit: cover; }
.contact-info-hero h4 {
  margin: 0 0 4px;
  font-size: 1.45rem;
  font-weight: 400;
  color: #111b21;
  line-height: 1.25;
}
.contact-info-subline {
  margin: 0 0 18px;
  color: #667781;
  font-size: 0.95rem;
}
.contact-info-search-btn {
  border: none;
  background: transparent;
  color: #008069;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
}
.contact-info-search-btn:hover { background: #f0f2f5; }
.contact-info-search-icon { width: 18px; height: 18px; }
.contact-info-about {
  padding: 16px 28px 20px;
  border-top: 1px solid #e9edef;
}
.contact-info-about-label {
  margin: 0 0 6px;
  color: #008069;
  font-size: 0.88rem;
  font-weight: 500;
}
.contact-info-about-text {
  margin: 0;
  color: #111b21;
  font-size: 1rem;
  line-height: 1.4;
  word-break: break-word;
}
.contact-info-block {
  border-top: 8px solid #f0f2f5;
}
.contact-info-block-title {
  margin: 0;
  padding: 14px 28px 6px;
  color: #008069;
  font-size: 0.82rem;
  font-weight: 600;
}
.contact-info-row {
  min-height: 60px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 28px;
  align-items: center;
  padding: 0 28px;
  border-bottom: 1px solid #e9edef;
}
.contact-info-row--last { border-bottom: none; }
.contact-info-row.is-clickable { cursor: pointer; }
.contact-info-row.is-clickable:hover { background: #f5f6f6; }
.contact-info-row-icon {
  width: 24px;
  height: 24px;
  color: #54656f;
  flex-shrink: 0;
}
.contact-info-row-icon--danger { color: #ea0038; }
.contact-info-row-main {
  min-width: 0;
  padding: 14px 0;
}
.contact-info-row-main span {
  display: block;
  font-size: 1rem;
  color: #111b21;
  line-height: 1.3;
}
.contact-info-row--danger .contact-info-row-main span { color: #ea0038; }
.contact-info-row-main small {
  display: block;
  margin-top: 3px;
  color: #667781;
  font-size: 0.82rem;
  line-height: 1.35;
}
.contact-info-row-right {
  color: #667781;
  font-size: 0.88rem;
  padding: 14px 0;
}
.contact-info-media-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 0 28px 14px;
}
.contact-info-media-thumb {
  border: none;
  padding: 0;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  background: #dfe5e7;
  cursor: pointer;
}
.contact-info-media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.contact-info-media-thumb span {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 0.72rem;
  color: #54656f;
}
.contact-info-row-chevron {
  width: 18px;
  height: 18px;
  color: #8696a0;
}
.contact-info-toggle {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  flex-shrink: 0;
}
.contact-info-toggle--on { background: #008069; }
.contact-info-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: left 0.15s ease;
}
.contact-info-toggle--on::after { left: 18px; }
.contact-info-block--actions { margin-bottom: 24px; }
.contact-info-footer-msg {
  margin: 0;
  padding: 12px 28px 24px;
  color: #667781;
  font-size: 0.82rem;
}
.contact-info-footer-msg--error { color: #ea0038; }
</style>
