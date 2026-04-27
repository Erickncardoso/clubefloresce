<template>
  <Teleport to="body">
    <div v-if="open" class="group-info-backdrop" @click.self="$emit('close')">
      <aside class="group-info-modal">
      <header class="group-info-header">
        <button class="group-info-close" @click="$emit('close')">✕</button>
        <h3>Dados do grupo</h3>
      </header>

      <div class="group-info-body">
        <section class="group-info-hero">
          <div class="group-info-avatar">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
            <span v-else>{{ initial }}</span>
          </div>
          <h4>{{ displayName }}</h4>
          <p class="group-info-subline">Grupo · {{ participantLabel }}</p>
          <button class="group-info-link-btn" @click="$emit('request-description')">Adicionar descrição ao grupo</button>
          <p class="group-info-created">Grupo criado por {{ createdByLabel }} em {{ createdAtLabel }}</p>
        </section>

        <div class="group-info-actions-row">
          <button class="group-info-chip" @click="$emit('request-members')">
            <UserPlus2 class="group-info-chip-icon" />Adicionar
          </button>
          <button class="group-info-chip" @click="$emit('request-search')">
            <Search class="group-info-chip-icon" />Pesquisar
          </button>
        </div>

        <section class="group-info-list">
          <article class="group-info-row is-clickable" @click="$emit('request-media-docs')">
            <FolderKanban class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Mídia, links e docs</strong>
            </div>
            <span class="group-info-row-right">{{ mediaCount }}</span>
          </article>
          <article class="group-info-row is-clickable" @click="$emit('request-starred-messages')">
            <Star class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Mensagens favoritas</strong>
            </div>
          </article>
          <article class="group-info-row is-clickable" @click="$emit('request-toggle-mute')">
            <Bell class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Silenciar notificações</strong>
            </div>
            <span class="group-info-toggle" :class="{ 'group-info-toggle--on': muted }" />
          </article>
          <article class="group-info-row">
            <Lock class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Criptografia</strong>
              <small>As mensagens são protegidas com a criptografia de ponta a ponta.</small>
            </div>
          </article>
          <article class="group-info-row">
            <Clock3 class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Mensagens temporárias</strong>
              <small>Desativadas</small>
            </div>
          </article>
          <article class="group-info-row">
            <Shield class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Privacidade avançada da conversa</strong>
              <small>Desativada</small>
            </div>
          </article>
          <article class="group-info-row is-clickable" @click="$emit('request-group-permissions')">
            <UserRoundCog class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Permissões do grupo</strong>
            </div>
          </article>
        </section>
        <section v-if="previewItems.length" class="group-info-list group-info-media-strip">
          <button
            v-for="item in previewItems"
            :key="item.id"
            class="group-info-media-item"
            type="button"
            @click="$emit('request-open-media', item)"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.label || 'Mídia do grupo'" />
            <div v-else class="group-info-media-item-fallback">{{ item.label || 'Mídia' }}</div>
          </button>
        </section>

        <section class="group-info-list">
          <article class="group-info-row group-info-row--community">
            <Users class="group-info-row-icon group-info-row-icon--accent" />
            <div class="group-info-row-main">
              <strong>Adicionar grupo a uma comunidade</strong>
              <small>Reúna pessoas em grupos de assuntos específicos</small>
            </div>
            <ChevronRight class="group-info-row-arrow" />
          </article>
        </section>

        <section class="group-info-list">
          <div class="group-info-members-head">
            <strong>{{ participantLabel }}</strong>
            <Search class="group-info-members-search" />
          </div>
          <article class="group-info-row is-clickable" @click="$emit('request-members')">
            <UserRoundPlus class="group-info-row-icon group-info-row-icon--accent" />
            <div class="group-info-row-main">
              <strong>Adicionar membro</strong>
            </div>
          </article>
          <article class="group-info-row is-clickable" @click="$emit('request-invite-link')">
            <Link2 class="group-info-row-icon group-info-row-icon--accent" />
            <div class="group-info-row-main">
              <strong>Convidar via link</strong>
            </div>
          </article>
          <article v-for="member in memberItems" :key="member.id" class="group-info-row">
            <img v-if="member.avatarUrl" class="group-info-user-avatar group-info-user-avatar--image" :src="member.avatarUrl" :alt="member.name" />
            <div v-else class="group-info-user-avatar">{{ member.initial }}</div>
            <div class="group-info-row-main">
              <strong>{{ member.name }}</strong>
              <small v-if="member.subtitle">{{ member.subtitle }}</small>
            </div>
            <span v-if="member.isAdmin" class="group-info-admin-badge">Admin do grupo</span>
          </article>
          <article class="group-info-row is-clickable" @click="$emit('request-member-changes')">
            <List class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>Mostrar mudanças de membros</strong>
            </div>
          </article>
          <article class="group-info-row is-clickable" @click="$emit('request-toggle-favorite')">
            <Heart class="group-info-row-icon" />
            <div class="group-info-row-main">
              <strong>{{ favorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos' }}</strong>
            </div>
          </article>
          <article class="group-info-row group-info-row--danger">
            <Trash2 class="group-info-row-icon group-info-row-icon--danger" />
            <div class="group-info-row-main">
              <strong>Limpar conversa</strong>
            </div>
          </article>
          <article class="group-info-row group-info-row--danger is-clickable" @click="$emit('request-leave-group')">
            <LogOut class="group-info-row-icon group-info-row-icon--danger" />
            <div class="group-info-row-main">
              <strong>Sair do grupo</strong>
            </div>
          </article>
          <article class="group-info-row group-info-row--danger">
            <ShieldAlert class="group-info-row-icon group-info-row-icon--danger" />
            <div class="group-info-row-main">
              <strong>Denunciar grupo</strong>
            </div>
          </article>
        </section>

        <section class="group-info-section">
          <p v-if="loading" class="group-info-muted">Carregando dados do grupo...</p>
          <p v-else-if="errorMessage" class="group-info-error">{{ errorMessage }}</p>
          <template v-else>
            <div v-if="descriptionSegments.length" class="group-info-description">
              <template v-for="(segment, idx) in descriptionSegments" :key="`desc-${idx}`">
                <a
                  v-if="segment.type === 'link'"
                  class="group-info-link"
                  :href="segment.value"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ segment.value }}
                </a>
                <span v-else>{{ segment.value }}</span>
              </template>
            </div>
            <a
              v-if="inviteLink"
              class="group-info-link"
              :href="inviteLink"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ inviteLink }}
            </a>
          </template>
        </section>
      </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Bell, ChevronRight, Clock3, FolderKanban, Heart, Link2, List, Lock, LogOut, Search, Shield, ShieldAlert, Star, Trash2, UserPlus2, UserRoundCog, UserRoundPlus, Users } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  groupInfo: { type: Object, default: null },
  chat: { type: Object, default: null },
  muted: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  mediaCount: { type: Number, default: 0 },
  previewItems: { type: Array, default: () => [] },
  memberItems: { type: Array, default: () => [] }
})

defineEmits([
  'close',
  'request-members',
  'request-description',
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

const displayName = computed(() =>
  String(props?.groupInfo?.Name || props?.chat?.pushName || props?.chat?.name || 'Grupo').trim()
)

const avatarUrl = computed(() =>
  String(props?.chat?.avatarUrl || props?.groupInfo?.image || props?.groupInfo?.imagePreview || '').trim()
)

const initial = computed(() => String(displayName.value || '?').charAt(0).toUpperCase())

const participantsCount = computed(() => {
  const list = Array.isArray(props?.groupInfo?.Participants)
    ? props.groupInfo.Participants
    : (Array.isArray(props?.groupInfo?.participants) ? props.groupInfo.participants : [])
  return list.length
})

const participantLabel = computed(() => {
  if (!participantsCount.value) return 'Sem participantes identificados'
  return `${participantsCount.value} membro${participantsCount.value > 1 ? 's' : ''}`
})

const description = computed(() => String(props?.groupInfo?.Topic || '').trim())

const createdAtLabel = computed(() => {
  const raw = props?.groupInfo?.GroupCreated || props?.groupInfo?.groupCreated || ''
  if (!raw) return 'data não disponível'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toLocaleString('pt-BR')
})

const inviteLink = computed(() =>
  String(props?.groupInfo?.invite_link || props?.groupInfo?.InviteLink || '').trim()
)

const participants = computed(() => {
  const list = Array.isArray(props?.groupInfo?.Participants)
    ? props.groupInfo.Participants
    : (Array.isArray(props?.groupInfo?.participants) ? props.groupInfo.participants : [])
  return list
})

const ownerJid = computed(() => String(props?.groupInfo?.OwnerJID || '').trim())

const primaryParticipant = computed(() => {
  const owner = participants.value.find((item) => {
    const jid = String(item?.JID || item?.jid || item?.id || '').trim()
    return ownerJid.value && jid === ownerJid.value
  })
  return owner || participants.value[0] || null
})

const createdByLabel = computed(() => {
  const owner = primaryParticipant.value
  const ownerName = String(
    owner?.Name ||
    owner?.name ||
    owner?.PushName ||
    owner?.pushName ||
    ''
  ).trim()
  if (ownerName) return ownerName
  const ownerNumber = String(ownerJid.value || '').split('@')[0].replace(/\D/g, '')
  return ownerNumber || 'criador desconhecido'
})

const urlRegex = /(https?:\/\/[^\s]+)/i
const descriptionSegments = computed(() => {
  const raw = String(description.value || '').trim()
  if (!raw) return []
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = String(line || '').trim()
      if (!trimmed) return { type: 'text', value: '' }
      if (urlRegex.test(trimmed)) return { type: 'link', value: trimmed }
      return { type: 'text', value: trimmed }
    })
})
</script>

<style scoped>
.group-info-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.58); z-index: 120; display: flex; justify-content: flex-end; }
.group-info-modal {
  width: min(500px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  background: #0b141a;
  color: #e9edef;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.group-info-header { min-height: 62px; display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.group-info-close { border: none; background: transparent; color: #d1d7db; font-size: 1.1rem; cursor: pointer; }
.group-info-header h3 { margin: 0; font-size: 1.75rem; font-weight: 700; }
.group-info-body {
  padding: 18px 16px 96px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.group-info-hero { background: #111b21; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 14px; padding: 20px 14px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.group-info-avatar { width: 124px; height: 124px; border-radius: 999px; overflow: hidden; display: grid; place-items: center; background: #1d2b34; font-weight: 700; font-size: 2rem; }
.group-info-avatar img { width: 100%; height: 100%; object-fit: cover; }
.group-info-hero h4 { margin: 14px 0 4px; font-size: 2.2rem; font-weight: 700; line-height: 1.1; }
.group-info-subline { margin: 0; color: #aebac1; font-size: 1rem; }
.group-info-link-btn { margin-top: 12px; border: none; background: transparent; color: #25d366; font-size: 1rem; font-weight: 700; cursor: pointer; }
.group-info-created { margin: 8px 0 0; color: #c3c9ce; font-size: 0.95rem; }
.group-info-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.group-info-chip { border: 1px solid rgba(255, 255, 255, 0.15); background: #111b21; color: #25d366; border-radius: 18px; height: 54px; font-size: 1.05rem; font-weight: 700; cursor: pointer; display: inline-flex; justify-content: center; align-items: center; gap: 8px; }
.group-info-chip-icon { width: 19px; height: 19px; }
.group-info-list { background: #111b21; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 14px; overflow: hidden; }
.group-info-row { display: flex; align-items: flex-start; gap: 14px; padding: 14px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.group-info-row:last-child { border-bottom: none; }
.group-info-row.is-clickable { cursor: pointer; }
.group-info-row.is-clickable:hover { background: rgba(255, 255, 255, 0.035); }
.group-info-row-icon { width: 21px; height: 21px; color: #aebac1; margin-top: 2px; flex-shrink: 0; }
.group-info-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.group-info-row-main strong { font-size: 1.02rem; font-weight: 600; color: #eef3f7; }
.group-info-row-main small { font-size: 0.92rem; color: #aebac1; line-height: 1.3; }
.group-info-row-right { color: #aebac1; font-size: 1rem; }
.group-info-toggle { width: 44px; height: 24px; border-radius: 999px; background: #2a3942; border: 1px solid rgba(255, 255, 255, 0.12); }
.group-info-toggle--on { background: #25d36633; border-color: #25d366; box-shadow: inset 0 0 0 1px #25d36666; }
.group-info-row--community { align-items: center; }
.group-info-row-icon--accent { color: #25d366; }
.group-info-row-arrow { width: 18px; height: 18px; color: #8696a0; flex-shrink: 0; }
.group-info-members-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 8px; }
.group-info-members-head strong { font-size: 0.95rem; color: #aebac1; }
.group-info-members-search { width: 18px; height: 18px; color: #aebac1; }
.group-info-user-avatar { width: 42px; height: 42px; border-radius: 999px; background: #203d2f; color: #e9edef; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.group-info-user-avatar--image { object-fit: cover; background: #1f2937; }
.group-info-admin-badge { background: rgba(37, 211, 102, 0.15); color: #86efac; border: 1px solid rgba(37, 211, 102, 0.35); padding: 2px 8px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; }
.group-info-row--danger .group-info-row-main strong { color: #fda4af; }
.group-info-row-icon--danger { color: #fb7185; }
.group-info-section { background: #111b21; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 14px; padding: 14px; }
.group-info-description { margin: 0 0 8px; color: #e9edef; font-size: 1rem; display: flex; flex-direction: column; gap: 4px; white-space: pre-wrap; }
.group-info-link { margin: 4px 0; color: #22c55e; word-break: break-all; font-size: 0.9rem; text-decoration: none; }
.group-info-link:hover { text-decoration: underline; }
.group-info-media-strip { padding: 10px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.group-info-media-item { border: none; padding: 0; height: 84px; border-radius: 10px; overflow: hidden; background: #0f172a; cursor: pointer; }
.group-info-media-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.group-info-media-item-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 0.75rem; text-align: center; padding: 6px; }
.group-info-muted { margin: 0; color: #aebac1; }
.group-info-error { margin: 0; color: #fca5a5; }
</style>
