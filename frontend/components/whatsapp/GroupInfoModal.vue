<template>
  <aside v-if="open" class="group-info-panel">
    <header class="group-info-header">
      <button type="button" class="group-info-icon-btn" aria-label="Fechar" @click="$emit('close')">✕</button>
      <h3>Dados do grupo</h3>
      <span class="group-info-header-spacer" aria-hidden="true" />
    </header>

    <div class="group-info-body">
      <section class="group-info-hero">
        <div class="group-info-avatar">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
          <span v-else>{{ initial }}</span>
        </div>
        <h4 class="group-info-name-row">
          <span>{{ displayName }}</span>
          <button
            v-if="canManageMembers"
            type="button"
            class="group-info-inline-edit"
            aria-label="Editar nome do grupo"
            @click="$emit('request-edit-name')"
          >
            <PencilLine class="group-info-inline-edit-icon" />
          </button>
        </h4>
        <p class="group-info-subline">Grupo · {{ participantLabel }}</p>
      </section>

      <div class="group-info-actions-row">
        <button
          v-if="canManageMembers"
          type="button"
          class="group-info-action-chip"
          @click="$emit('request-members')"
        >
          <UserPlus2 class="group-info-action-icon" />
          Adicionar
        </button>
        <button type="button" class="group-info-action-chip" @click="$emit('request-search')">
          <Search class="group-info-action-icon" />
          Pesquisar
        </button>
      </div>

      <section v-if="descriptionText || canManageMembers" class="group-info-description-block">
        <div v-if="descriptionText" class="group-info-description-wrap">
          <p class="group-info-description" :class="{ 'group-info-description--collapsed': !descriptionExpanded }">
          <template v-for="(segment, idx) in descriptionSegments" :key="`desc-${idx}`">
            <a
              v-if="segment.type === 'link'"
              class="group-info-description-link"
              :href="segment.value"
              target="_blank"
              rel="noopener noreferrer"
            >{{ segment.value }}</a>
            <span v-else>{{ segment.value }}</span>
          </template>
          </p>
          <button
            v-if="descriptionNeedsToggle"
            type="button"
            class="group-info-read-more"
            @click="descriptionExpanded = !descriptionExpanded"
          >
            {{ descriptionExpanded ? 'Ler menos' : 'Ler mais' }}
          </button>
        </div>
        <button
          v-if="canManageMembers && !descriptionText"
          type="button"
          class="group-info-add-description"
          @click="$emit('request-description')"
        >
          Adicionar descrição do grupo
        </button>
        <button
          v-if="canManageMembers && descriptionText"
          type="button"
          class="group-info-inline-edit group-info-inline-edit--desc"
          aria-label="Editar descrição"
          @click="$emit('request-description')"
        >
          <PencilLine class="group-info-inline-edit-icon" />
        </button>
      </section>

      <p v-if="loading" class="group-info-status">Carregando dados do grupo...</p>
      <p v-else-if="errorMessage" class="group-info-status group-info-status--error">{{ errorMessage }}</p>

      <section class="group-info-block">
        <article class="group-info-row is-clickable" @click="$emit('request-media-docs')">
          <Images class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Mídia, links e docs</span>
          </div>
          <span v-if="mediaCount > 0" class="group-info-row-right">{{ mediaCount }}</span>
        </article>
        <div v-if="previewItems.length" class="group-info-media-strip">
          <button
            v-for="item in previewItems.slice(0, 4)"
            :key="item.id"
            type="button"
            class="group-info-media-thumb"
            @click="$emit('request-open-media', item)"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.label || 'Mídia'" />
            <span v-else>{{ item.label || 'Mídia' }}</span>
          </button>
        </div>
        <article class="group-info-row is-clickable" @click="$emit('request-starred-messages')">
          <Star class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Mensagens favoritas</span>
          </div>
        </article>
        <article class="group-info-row is-clickable" @click="$emit('request-toggle-mute')">
          <Bell class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Silenciar notificações</span>
            <small>{{ muted ? 'Sempre' : 'Desativada' }}</small>
          </div>
          <span class="group-info-toggle" :class="{ 'group-info-toggle--on': muted }" />
        </article>
        <article class="group-info-row">
          <Lock class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Criptografia</span>
            <small>As mensagens são protegidas com a criptografia de ponta a ponta.</small>
          </div>
        </article>
        <article class="group-info-row">
          <Clock3 class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Mensagens temporárias</span>
            <small>Desativadas</small>
          </div>
        </article>
        <article class="group-info-row" :class="{ 'group-info-row--last': !canManageMembers }">
          <Shield class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Privacidade avançada da conversa</span>
            <small>Desativada</small>
          </div>
        </article>
        <article
          v-if="canManageMembers"
          class="group-info-row is-clickable group-info-row--last"
          @click="$emit('request-group-permissions')"
        >
          <Settings class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Permissões do grupo</span>
          </div>
        </article>
      </section>

      <section class="group-info-block">
        <div class="group-info-members-head">
          <span>{{ participantLabel }}</span>
          <button type="button" class="group-info-members-search-btn" aria-label="Pesquisar membros" @click="$emit('request-search')">
            <Search class="group-info-members-search-icon" />
          </button>
        </div>
        <article v-if="canManageMembers" class="group-info-row is-clickable" @click="$emit('request-members')">
          <UserRoundPlus class="group-info-row-icon group-info-row-icon--accent" />
          <div class="group-info-row-main">
            <span>Adicionar membro</span>
          </div>
        </article>
        <article v-if="canManageMembers" class="group-info-row is-clickable" @click="$emit('request-invite-link')">
          <Link2 class="group-info-row-icon group-info-row-icon--accent" />
          <div class="group-info-row-main">
            <span>Convidar via link</span>
          </div>
        </article>

        <article
          v-for="member in visibleMembers"
          :key="member.id"
          class="group-info-member-row"
        >
          <img
            v-if="member.avatarUrl"
            class="group-info-member-avatar group-info-member-avatar--image"
            :src="member.avatarUrl"
            :alt="member.title"
          />
          <div v-else class="group-info-member-avatar">{{ member.initial }}</div>
          <div class="group-info-member-main">
            <strong>{{ member.title }}</strong>
            <small v-if="member.subtitle">{{ member.subtitle }}</small>
          </div>
          <div class="group-info-member-meta">
            <span v-if="member.isAdmin" class="group-info-admin-badge">Admin do grupo</span>
            <small v-if="member.phoneLine" class="group-info-member-phone">{{ member.phoneLine }}</small>
          </div>
        </article>

        <button
          v-if="hiddenMembersCount > 0 && !membersExpanded"
          type="button"
          class="group-info-show-all"
          @click="membersExpanded = true"
        >
          Ver tudo (mais {{ hiddenMembersCount }})
        </button>
        <button
          v-else-if="membersExpanded && participantsCount > memberPreviewLimit"
          type="button"
          class="group-info-show-all"
          @click="membersExpanded = false"
        >
          Mostrar menos
        </button>
      </section>

      <section class="group-info-block group-info-block--actions">
        <article class="group-info-row is-clickable" @click="$emit('request-member-changes')">
          <List class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>Mostrar mudanças de membros</span>
          </div>
        </article>
        <article class="group-info-row is-clickable" @click="$emit('request-toggle-favorite')">
          <Heart class="group-info-row-icon" />
          <div class="group-info-row-main">
            <span>{{ favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos' }}</span>
          </div>
        </article>
        <article class="group-info-row is-clickable group-info-row--danger">
          <Trash2 class="group-info-row-icon group-info-row-icon--danger" />
          <div class="group-info-row-main">
            <span>Limpar conversa</span>
          </div>
        </article>
        <article class="group-info-row is-clickable group-info-row--danger" @click="$emit('request-leave-group')">
          <LogOut class="group-info-row-icon group-info-row-icon--danger" />
          <div class="group-info-row-main">
            <span>Sair do grupo</span>
          </div>
        </article>
        <article class="group-info-row group-info-row--danger group-info-row--last">
          <ShieldAlert class="group-info-row-icon group-info-row-icon--danger" />
          <div class="group-info-row-main">
            <span>Denunciar grupo</span>
          </div>
        </article>
      </section>

      <p v-if="createdAtLabel" class="group-info-created">Grupo criado em {{ createdAtLabel }}</p>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  Bell, Clock3, Heart, Images, Link2, List, Lock, LogOut, PencilLine, Search, Settings, Shield, ShieldAlert,
  Star, Trash2, UserPlus2, UserRoundPlus
} from 'lucide-vue-next'
import { buildGroupMemberPanelItem } from '~/composables/whatsapp/useWhatsappContacts.js'
import { normalizeJid } from '~/composables/whatsapp/useWhatsappUtils.js'

const MEMBER_PREVIEW_LIMIT = 10

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  groupInfo: { type: Object, default: null },
  chat: { type: Object, default: null },
  participants: { type: Array, default: () => [] },
  memberContext: { type: Object, default: () => ({}) },
  muted: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  mediaCount: { type: Number, default: 0 },
  previewItems: { type: Array, default: () => [] },
  viewerIsAdmin: { type: Boolean, default: false }
})

defineEmits([
  'close',
  'request-members',
  'request-description',
  'request-edit-name',
  'request-search',
  'request-media-docs',
  'request-starred-messages',
  'request-toggle-mute',
  'request-group-permissions',
  'request-invite-link',
  'request-member-changes',
  'request-toggle-favorite',
  'request-leave-group',
  'request-open-media'
])

const descriptionExpanded = ref(false)
const membersExpanded = ref(false)
const memberPreviewLimit = MEMBER_PREVIEW_LIMIT

const canManageMembers = computed(() => Boolean(props.viewerIsAdmin))

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    descriptionExpanded.value = false
    membersExpanded.value = false
  }
})

const groupInfoJid = computed(() =>
  normalizeJid(props.groupInfo?.JID || props.groupInfo?.jid || props.groupInfo?.groupjid || '')
)

const chatJid = computed(() =>
  normalizeJid(props.chat?.chatJid || props.chat?.wa_chatid || props.chat?.chatid || '')
)

const infoMatchesChat = computed(() =>
  Boolean(groupInfoJid.value && chatJid.value && groupInfoJid.value === chatJid.value)
)

const displayName = computed(() => {
  if (infoMatchesChat.value) {
    return String(
      props.groupInfo?.Name || props.groupInfo?.name || props.chat?.pushName || props.chat?.name || 'Grupo'
    ).trim()
  }
  return String(props.chat?.pushName || props.chat?.name || 'Grupo').trim()
})

const avatarUrl = computed(() =>
  String(props?.chat?.avatarUrl || props?.groupInfo?.image || props?.groupInfo?.imagePreview || '').trim()
)

const initial = computed(() => String(displayName.value || '?').charAt(0).toUpperCase())

const participantsCount = computed(() => {
  if (!infoMatchesChat.value) return 0
  if (Array.isArray(props.participants) && props.participants.length) return props.participants.length
  const list = Array.isArray(props?.groupInfo?.Participants)
    ? props.groupInfo.Participants
    : (Array.isArray(props?.groupInfo?.participants) ? props.groupInfo.participants : [])
  return list.length
})

const participantLabel = computed(() => {
  if (props.loading && !infoMatchesChat.value) return 'Carregando...'
  const count = participantsCount.value
  if (!count) {
    return props.loading ? 'Carregando...' : 'Sem participantes identificados'
  }
  return `${count.toLocaleString('pt-BR')} membro${count > 1 ? 's' : ''}`
})

const descriptionText = computed(() => {
  if (!infoMatchesChat.value) return ''
  return String(props?.groupInfo?.Topic || props?.groupInfo?.topic || '').trim()
})

const descriptionNeedsToggle = computed(() => descriptionText.value.length > 180 || descriptionText.value.split(/\r?\n/).length > 4)

const urlRegex = /(https?:\/\/[^\s]+)/i
const descriptionSegments = computed(() => {
  const raw = descriptionText.value
  if (!raw) return []
  return raw.split(/\r?\n/).flatMap((line, lineIndex, lines) => {
    const trimmed = String(line || '').trim()
    const segments = []
    if (!trimmed) {
      if (lineIndex < lines.length - 1) segments.push({ type: 'text', value: '\n' })
      return segments
    }
    if (urlRegex.test(trimmed)) {
      segments.push({ type: 'link', value: trimmed })
    } else {
      segments.push({ type: 'text', value: trimmed })
    }
    if (lineIndex < lines.length - 1) segments.push({ type: 'text', value: '\n' })
    return segments
  })
})

const createdAtLabel = computed(() => {
  if (!infoMatchesChat.value) return ''
  const raw = props?.groupInfo?.GroupCreated || props?.groupInfo?.groupCreated || ''
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toLocaleString('pt-BR')
})

const normalizedMembers = computed(() => {
  if (!infoMatchesChat.value) return []
  const list = Array.isArray(props.participants) ? props.participants : []
  const limit = membersExpanded.value ? list.length : Math.min(list.length, memberPreviewLimit)
  const slice = list.slice(0, limit)
  return slice.map((participant, index) =>
    buildGroupMemberPanelItem(participant, index, props.memberContext || {})
  )
})

const visibleMembers = computed(() => normalizedMembers.value)

const hiddenMembersCount = computed(() => {
  const total = participantsCount.value
  if (total <= memberPreviewLimit) return 0
  return total - memberPreviewLimit
})
</script>

<style scoped>
.group-info-panel {
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
.group-info-header {
  min-height: 60px;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 0 8px;
  background: #f0f2f5;
  flex-shrink: 0;
}
.group-info-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #111b21;
  text-align: center;
}
.group-info-header-spacer { width: 40px; height: 40px; }
.group-info-icon-btn {
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
.group-info-icon-btn:hover { background: rgba(0, 0, 0, 0.05); }
.group-info-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  background: #ffffff;
}
.group-info-hero {
  padding: 28px 24px 16px;
  text-align: center;
  background: #ffffff;
}
.group-info-avatar {
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
.group-info-avatar img { width: 100%; height: 100%; object-fit: cover; }
.group-info-hero h4 {
  margin: 0 0 4px;
  font-size: 1.45rem;
  font-weight: 400;
  color: #111b21;
  line-height: 1.25;
  word-break: break-word;
}
.group-info-name-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.group-info-inline-edit {
  border: none;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  padding: 4px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
}
.group-info-inline-edit:hover { background: rgba(0, 0, 0, 0.05); }
.group-info-inline-edit-icon { width: 1rem; height: 1rem; }
.group-info-inline-edit--desc { margin-top: 4px; }
.group-info-description-wrap { position: relative; }
.group-info-add-description {
  border: none;
  background: transparent;
  color: #008069;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
}
.group-info-subline {
  margin: 0;
  color: #667781;
  font-size: 0.95rem;
}
.group-info-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 28px 16px;
}
.group-info-action-chip {
  border: none;
  background: transparent;
  color: #008069;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 8px;
}
.group-info-action-chip:hover { background: #f0f2f5; }
.group-info-action-icon { width: 18px; height: 18px; }
.group-info-description-block {
  padding: 0 28px 16px;
  border-bottom: 8px solid #f0f2f5;
}
.group-info-description {
  margin: 0;
  color: #111b21;
  font-size: 0.98rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.group-info-description--collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.group-info-description-link {
  color: #008069;
  text-decoration: none;
  word-break: break-all;
}
.group-info-description-link:hover { text-decoration: underline; }
.group-info-read-more {
  margin-top: 8px;
  border: none;
  background: transparent;
  color: #008069;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.group-info-status {
  margin: 0;
  padding: 12px 28px;
  color: #667781;
  font-size: 0.92rem;
}
.group-info-status--error { color: #ea0038; }
.group-info-block {
  border-top: 8px solid #f0f2f5;
}
.group-info-block--actions { margin-bottom: 12px; }
.group-info-row {
  min-height: 60px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 28px;
  align-items: center;
  padding: 0 28px;
  border-bottom: 1px solid #e9edef;
}
.group-info-row--last { border-bottom: none; }
.group-info-row.is-clickable { cursor: pointer; }
.group-info-row.is-clickable:hover { background: #f5f6f6; }
.group-info-row-icon {
  width: 24px;
  height: 24px;
  color: #54656f;
  flex-shrink: 0;
}
.group-info-row-icon--accent { color: #008069; }
.group-info-row-icon--danger { color: #ea0038; }
.group-info-row-main {
  min-width: 0;
  padding: 14px 0;
}
.group-info-row-main span {
  display: block;
  font-size: 1rem;
  color: #111b21;
  line-height: 1.3;
}
.group-info-row--danger .group-info-row-main span { color: #ea0038; }
.group-info-row-main small {
  display: block;
  margin-top: 3px;
  color: #667781;
  font-size: 0.82rem;
  line-height: 1.35;
}
.group-info-row-right {
  color: #667781;
  font-size: 0.88rem;
  padding: 14px 0;
}
.group-info-toggle {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  flex-shrink: 0;
}
.group-info-toggle--on { background: #008069; }
.group-info-toggle::after {
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
.group-info-toggle--on::after { left: 18px; }
.group-info-media-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 0 28px 14px;
  border-bottom: 1px solid #e9edef;
}
.group-info-media-thumb {
  border: none;
  padding: 0;
  height: 88px;
  border-radius: 4px;
  overflow: hidden;
  background: #dfe5e7;
  cursor: pointer;
}
.group-info-media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  image-rendering: auto;
}
.group-info-media-thumb span {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  color: #667781;
  padding: 4px;
  text-align: center;
}
.group-info-members-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px 8px;
  color: #667781;
  font-size: 0.88rem;
}
.group-info-members-search-btn {
  border: none;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 999px;
}
.group-info-members-search-btn:hover { background: #f0f2f5; }
.group-info-members-search-icon { width: 18px; height: 18px; }
.group-info-member-row {
  display: grid;
  grid-template-columns: 49px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 10px 28px;
  border-bottom: 1px solid #e9edef;
}
.group-info-member-avatar {
  width: 49px;
  height: 49px;
  border-radius: 999px;
  background: #dfe5e7;
  color: #54656f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 500;
  flex-shrink: 0;
}
.group-info-member-avatar--image { object-fit: cover; }
.group-info-member-main {
  min-width: 0;
  padding: 2px 0;
}
.group-info-member-main strong {
  display: block;
  font-size: 1rem;
  font-weight: 400;
  color: #111b21;
  line-height: 1.3;
  word-break: break-word;
}
.group-info-member-main small {
  display: block;
  margin-top: 2px;
  color: #667781;
  font-size: 0.82rem;
  line-height: 1.35;
  word-break: break-word;
}
.group-info-member-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  max-width: 42%;
}
.group-info-admin-badge {
  background: #f0f2f5;
  color: #667781;
  border: 1px solid #e9edef;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 500;
  white-space: nowrap;
}
.group-info-member-phone {
  color: #667781;
  font-size: 0.78rem;
  line-height: 1.2;
  text-align: right;
  word-break: break-all;
}
.group-info-show-all {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e9edef;
  background: transparent;
  color: #008069;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 16px 28px;
  text-align: left;
  cursor: pointer;
}
.group-info-show-all:hover { background: #f5f6f6; }
.group-info-created {
  margin: 0;
  padding: 8px 28px 24px;
  color: #8696a0;
  font-size: 0.82rem;
}
</style>
