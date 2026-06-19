<template>
  <header class="cf-header">
    <button type="button" class="cf-header-btn" aria-label="Menu" @click="openMenu">
      <Menu class="cf-header-icon" />
    </button>

    <div class="cf-header-brand">
      <template v-if="title">
        <span class="cf-header-title">{{ title }}</span>
      </template>
      <template v-else>
        <PatientBrandMark size="sm" />
      </template>
    </div>

    <div class="cf-header-actions">
      <slot name="actions" />
      <button
        v-if="showBell"
        ref="notifAnchorRef"
        type="button"
        class="cf-header-btn"
        aria-label="Notificações"
        :aria-expanded="notifOpen"
        @click="toggleNotifications"
      >
        <Bell class="cf-header-icon" />
        <span
          v-if="badgeText"
          class="cf-header-badge"
          :class="{ 'cf-header-badge--wide': badgeText.length > 1 }"
          aria-hidden="true"
        >{{ badgeText }}</span>
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
    <PatientNotificationsPanel
      :open="notifOpen"
      :anchor-el="notifAnchorRef"
      @close="notifOpen = false"
    />
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
const notifOpen = ref(false)
const notifAnchorRef = ref(null)
const { unreadCount, fetchNotifications } = usePatientNotifications()

const badgeText = computed(() => {
  if (!props.hasNotifications && unreadCount.value <= 0) return ''
  const count = props.hasNotifications ? Math.max(unreadCount.value, 1) : unreadCount.value
  if (count <= 0) return ''
  return count > 9 ? '9+' : String(count)
})

function openMenu() {
  notifOpen.value = false
  menuOpen.value = true
}

function toggleNotifications() {
  menuOpen.value = false
  notifOpen.value = !notifOpen.value
}

function goBack() {
  if (props.backTo) {
    navigateTo(props.backTo)
    return
  }
  if (import.meta.client && window.history.length > 1) router.back()
  else navigateTo('/inicio')
}

onMounted(() => {
  if (!props.showBell || !import.meta.client) return
  void fetchNotifications()
})
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
  min-width: 0;
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

.cf-header-badge {
  position: absolute;
  top: 0.42rem;
  right: 0.38rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.8rem;
  height: 0.8rem;
  padding: 0;
  border-radius: 50%;
  background: var(--cf-green);
  color: #fff;
  font-size: 0.5rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  border: 1.5px solid var(--cf-bg);
  pointer-events: none;
  box-sizing: border-box;
}

.cf-header-badge--wide {
  width: auto;
  min-width: 0.8rem;
  height: 0.8rem;
  padding: 0 0.18rem;
  border-radius: 999px;
}
</style>
