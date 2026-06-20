<template>
  <Teleport to="body">
    <Transition name="notif-backdrop">
      <div
        v-if="open"
        class="notif-panel-backdrop"
        aria-hidden="true"
        @click="$emit('close')"
      />
    </Transition>

    <Transition name="notif-panel">
      <section
        v-if="open"
        ref="panelRef"
        class="notif-panel"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        aria-label="Notificações"
      >
        <header class="notif-panel-head">
          <h2>
            Notificações
            <span v-if="unreadCount > 0" class="notif-panel-count">{{ unreadCount }} não lidas</span>
          </h2>
          <div class="notif-panel-head-actions">
            <button
              v-if="hasUnread"
              type="button"
              class="notif-panel-mark-all"
              :disabled="markingAll"
              @click="handleMarkAllRead"
            >
              {{ markingAll ? '…' : 'Marcar lidas' }}
            </button>
            <button type="button" class="notif-panel-close" aria-label="Fechar" @click="$emit('close')">
              <X class="notif-panel-close-icon" />
            </button>
          </div>
        </header>

        <div class="notif-panel-body">
          <div v-if="loading && !items.length" class="notif-panel-loading">
            <span class="notif-panel-spinner" aria-hidden="true" />
            <p>Carregando…</p>
          </div>

          <p v-else-if="error" class="notif-panel-empty">{{ error }}</p>

          <p v-else-if="!previewGrouped.length" class="notif-panel-empty">
            Nenhuma notificação por enquanto.
          </p>

          <template v-else>
            <div v-for="group in previewGrouped" :key="group.label" class="notif-panel-group">
              <h3>{{ group.label }}</h3>
              <button
                v-for="n in group.items"
                :key="n.id"
                type="button"
                class="notif-panel-item"
                :class="{ unread: !n.read }"
                @click="handleOpen(n)"
              >
                <div class="notif-panel-icon-wrap" :class="`notif-panel-icon-wrap--${n.type}`">
                  <component :is="n.icon" class="notif-panel-icon" />
                </div>
                <div class="notif-panel-copy">
                  <strong>{{ n.title }}</strong>
                  <p>{{ n.text }}</p>
                  <span>{{ n.time }}</span>
                </div>
                <span v-if="!n.read" class="notif-panel-dot" />
              </button>
            </div>
          </template>
        </div>

        <footer class="notif-panel-foot">
          <NuxtLink to="/perfil/notificacoes" class="notif-panel-link" @click="$emit('close')">
            Ver todas
          </NuxtLink>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next'
import { mapNotificationItem } from '~/composables/usePatientNotifications'

const props = defineProps({
  open: { type: Boolean, default: false },
  anchorEl: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const {
  items,
  unreadCount,
  hasUnread,
  loading,
  error,
  fetchNotifications,
  markAllRead,
  openNotification,
} = usePatientNotifications()

const markingAll = ref(false)
const panelRef = ref(null)
const anchorRect = ref(null)

const previewGrouped = computed(() => {
  const labels = ['HOJE', 'ONTEM', 'ESTA SEMANA', 'ANTERIORES']
  const mapped = items.value.slice(0, 30).map(mapNotificationItem)
  return labels
    .map((label) => ({
      label,
      items: mapped.filter((entry) => entry.group === label),
    }))
    .filter((group) => group.items.length > 0)
})

const panelStyle = computed(() => {
  const rect = anchorRect.value
  if (!rect || !import.meta.client) {
    return {
      top: 'calc(0.5rem + env(safe-area-inset-top))',
      right: '0.75rem',
      width: 'min(22rem, calc(100vw - 1.5rem))',
      maxHeight: 'min(70dvh, 28rem)',
    }
  }

  const gap = 10
  const margin = 12
  const width = Math.min(360, window.innerWidth - margin * 2)
  const right = Math.max(margin, window.innerWidth - rect.right)
  const top = rect.bottom + gap
  const maxHeight = Math.min(420, window.innerHeight - top - margin)

  return {
    top: `${top}px`,
    right: `${right}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(160, maxHeight)}px`,
  }
})

function updateAnchorRect() {
  const raw = props.anchorEl
  const el = raw?.value ?? raw
  if (!el?.getBoundingClientRect) {
    anchorRect.value = null
    return
  }
  anchorRect.value = el.getBoundingClientRect()
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.open) emit('close')
}

function onViewportChange() {
  if (!props.open) return
  updateAnchorRect()
}

watch(() => props.open, (isOpen) => {
  if (!import.meta.client) return

  if (isOpen) {
    updateAnchorRect()
    void fetchNotifications()
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    document.addEventListener('keydown', onKeydown)
    return
  }

  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  document.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  document.removeEventListener('keydown', onKeydown)
})

async function handleMarkAllRead() {
  if (markingAll.value || !hasUnread.value) return
  markingAll.value = true
  try {
    await markAllRead()
  } finally {
    markingAll.value = false
  }
}

async function handleOpen(notification) {
  emit('close')
  await openNotification(notification)
}
</script>

<style scoped>
.notif-panel-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 320;
}

.notif-panel {
  position: fixed;
  z-index: 330;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: var(--cf-surface, #fff);
  border: 1px solid var(--pa-border, #ece8e4);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.14),
    0 4px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.notif-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem 0.7rem;
  border-bottom: 1px solid var(--pa-border, #ece8e4);
}

.notif-panel-head h2 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--pa-text, #1f1f1f);
  line-height: 1.3;
}

.notif-panel-count {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--pa-text-muted, #6b7280);
}

.notif-panel-head-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.notif-panel-mark-all {
  border: none;
  background: transparent;
  color: var(--pa-green, #8B967C);
  font-size: 0.72rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0;
  white-space: nowrap;
}

.notif-panel-mark-all:disabled {
  opacity: 0.5;
  cursor: default;
}

.notif-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--pa-border, #ece8e4);
  border-radius: 10px;
  background: var(--cf-bg, #f7f6f3);
  color: var(--pa-text-muted, #6b7280);
  cursor: pointer;
}

.notif-panel-close-icon {
  width: 1rem;
  height: 1rem;
}

.notif-panel-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0.15rem 0;
}

.notif-panel-loading,
.notif-panel-empty {
  margin: 0;
  padding: 1.75rem 1rem;
  text-align: center;
  color: var(--pa-text-muted, #6b7280);
  font-size: 0.84rem;
}

.notif-panel-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.notif-panel-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--pa-border, #ece8e4);
  border-top-color: var(--pa-green, #8B967C);
  border-radius: 50%;
  animation: notif-spin 0.7s linear infinite;
}

@keyframes notif-spin {
  to { transform: rotate(360deg); }
}

.notif-panel-group h3 {
  margin: 0;
  padding: 0.55rem 0.9rem 0.3rem;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--pa-text-muted, #6b7280);
}

.notif-panel-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: none;
  border-bottom: 1px solid var(--pa-border, #ece8e4);
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.notif-panel-item.unread {
  background: rgba(45, 90, 39, 0.04);
}

.notif-panel-item:focus-visible {
  outline: 2px solid var(--pa-green, #8B967C);
  outline-offset: -2px;
}

.notif-panel-icon-wrap {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-panel-icon-wrap--bella { background: #eef0eb; color: var(--pa-green, #8B967C); }
.notif-panel-icon-wrap--checkin { background: #eff6ff; color: #2563eb; }
.notif-panel-icon-wrap--community { background: #fdf4ff; color: #9333ea; }
.notif-panel-icon-wrap--content { background: #fff7ed; color: #ea580c; }
.notif-panel-icon-wrap--general { background: #f3f4f6; color: #4b5563; }

.notif-panel-icon {
  width: 1rem;
  height: 1rem;
}

.notif-panel-copy {
  flex: 1;
  min-width: 0;
}

.notif-panel-copy strong {
  display: block;
  font-size: 0.82rem;
  color: var(--pa-text, #1f1f1f);
}

.notif-panel-copy p {
  margin: 0.1rem 0;
  font-size: 0.76rem;
  color: var(--pa-text-muted, #6b7280);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-panel-copy span {
  font-size: 0.7rem;
  color: #6b7280;
  font-weight: 500;
}

.notif-panel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pa-green, #8B967C);
  flex-shrink: 0;
  margin-top: 0.3rem;
}

.notif-panel-foot {
  padding: 0.65rem 0.9rem 0.75rem;
  border-top: 1px solid var(--pa-border, #ece8e4);
}

.notif-panel-link {
  display: block;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--pa-green, #8B967C);
  text-decoration: none;
}

.notif-backdrop-enter-active,
.notif-backdrop-leave-active {
  transition: opacity 0.15s ease;
}

.notif-backdrop-enter-from,
.notif-backdrop-leave-to {
  opacity: 0;
}

.notif-panel-enter-active,
.notif-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.2s ease;
}

.notif-panel-enter-from,
.notif-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
