<template>
  <header class="cf-header">
    <div class="cf-header-start">
      <button
        type="button"
        class="cf-header-btn"
        aria-label="Menu"
        @click="openMenu"
      >
        <Menu class="cf-header-icon" />
      </button>
      <PatientHeaderDailyChip />
    </div>

    <div class="cf-header-actions">
      <NuxtLink
        to="/perfil/configuracoes"
        class="cf-header-avatar"
        aria-label="Abrir configurações"
      >
        <PatientAvatar
          size="sm"
          :src="avatarUrl"
          :name="fullName"
        />
      </NuxtLink>
    </div>
  </header>
</template>

<script setup>
import { Menu } from 'lucide-vue-next'
import { releasePatientInteractionLock } from '~/utils/patient-interaction-lock.mjs'

const { userFullName, userAvatar } = usePatientApp()
const { bootstrapDailyHeader } = usePatientDailyHeader()
const { close: closeQuickDial } = usePatientQuickAccess()

const fullName = computed(() => userFullName())
const avatarUrl = computed(() => userAvatar())

function openMenu() {
  closeQuickDial()
  releasePatientInteractionLock()
  navigateTo('/menu')
}

onMounted(() => {
  if (!import.meta.client) return
  void bootstrapDailyHeader()
})
</script>

<style scoped>
.cf-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: calc(0.5rem + env(safe-area-inset-top)) 1rem 0.5rem;
  background: var(--cf-bg);
}

.cf-header-start {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
  z-index: 1;
  margin-left: -0.35rem;
}

.cf-header-btn {
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
  width: 1.35rem;
  height: 1.35rem;
  stroke-width: 1.75;
  color: var(--cf-text);
}

.cf-header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
  z-index: 1;
}

.cf-header-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.cf-header-avatar:focus-visible {
  outline: 2px solid var(--cf-pink);
  outline-offset: 2px;
}
</style>
