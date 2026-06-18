<template>
  <header class="cf-header">
    <button type="button" class="cf-header-btn" aria-label="Menu" @click="menuOpen = true">
      <Menu class="cf-header-icon" />
    </button>

    <div class="cf-header-brand">
      <template v-if="title">
        <span class="cf-header-title">{{ title }}</span>
      </template>
      <template v-else>
        <img
          src="/clube-florescer-logo.png"
          alt="Clube Florescer"
          class="cf-header-logo"
          width="160"
          height="32"
        >
      </template>
    </div>

    <div class="cf-header-actions">
      <slot name="actions" />
      <button
        v-if="showBell"
        type="button"
        class="cf-header-btn"
        aria-label="Notificações"
        @click="navigateTo('/perfil/notificacoes')"
      >
        <Bell class="cf-header-icon" />
        <span v-if="showNotificationDot" class="cf-header-dot" />
      </button>
      <button
        v-if="showBack"
        type="button"
        class="cf-header-btn"
        aria-label="Voltar"
        @click="goBack"
      >
        <ChevronLeft class="cf-header-icon" />
      </button>
    </div>

    <PatientMenuDrawer :open="menuOpen" @close="menuOpen = false" />
  </header>
</template>

<script setup>
import { Bell, ChevronLeft, Menu } from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  showBack: { type: Boolean, default: false },
  showBell: { type: Boolean, default: true },
  hasNotifications: { type: Boolean, default: false },
  backTo: { type: String, default: '' },
})

const router = useRouter()
const menuOpen = ref(false)
const { hasUnread } = usePatientNotifications()

const showNotificationDot = computed(() => props.hasNotifications || hasUnread.value)

function goBack() {
  if (props.backTo) {
    navigateTo(props.backTo)
    return
  }
  if (import.meta.client && window.history.length > 1) router.back()
  else navigateTo('/inicio')
}
</script>

<style scoped>
.cf-header {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  padding: calc(0.5rem + env(safe-area-inset-top)) 1rem 0.75rem;
  background: #ffffff;
}

.cf-header-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--cf-text);
  cursor: pointer;
  transition: background 0.15s ease;
}

.cf-header-btn:hover {
  background: var(--cf-border);
}

.cf-header-btn:focus-visible {
  outline: 2px solid var(--cf-pink);
  outline-offset: 2px;
}

.cf-header-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 1.75;
  color: var(--cf-text);
}

.cf-header-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-width: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  color: var(--cf-text);
}

.cf-header-logo {
  height: 1.75rem;
  width: auto;
  max-width: min(10.5rem, 42vw);
  object-fit: contain;
  object-position: center;
}

.cf-header-title {
  font-size: 0.95rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
}

.cf-header-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--cf-green);
  border: 2px solid var(--cf-bg);
}
</style>
