<template>
  <Teleport to="body">
    <div v-if="open" class="cf-drawer-backdrop" @click="$emit('close')" />
    <aside v-if="open" class="cf-drawer" aria-label="Menu">
      <div class="cf-drawer-head">
        <img src="/logoflorescer.svg" alt="Clube Florescer" class="cf-drawer-logo" width="110" height="32">
        <button type="button" class="cf-drawer-close" aria-label="Fechar menu" @click="$emit('close')">
          <X class="cf-drawer-close-icon" />
        </button>
      </div>

      <NuxtLink to="/perfil" class="cf-drawer-user" @click="$emit('close')">
        <PatientAvatar
          size="md"
          :src="avatarUrl"
          :name="fullName"
          :initials="initials"
        />
        <div class="cf-drawer-user-copy">
          <span class="cf-drawer-user-name">{{ fullName }}</span>
          <span class="cf-drawer-user-link">Ver perfil</span>
        </div>
        <ChevronRight class="cf-drawer-user-arrow" aria-hidden="true" />
      </NuxtLink>

      <nav class="cf-drawer-nav">
        <NuxtLink to="/perfil" class="cf-drawer-link" @click="$emit('close')">
          <User class="cf-drawer-link-icon" />
          Meu perfil
        </NuxtLink>
        <NuxtLink to="/bella" class="cf-drawer-link" @click="$emit('close')">
          <Sparkles class="cf-drawer-link-icon" />
          Bella IA
        </NuxtLink>
        <NuxtLink to="/dieta" class="cf-drawer-link" @click="$emit('close')">
          <UtensilsCrossed class="cf-drawer-link-icon" />
          Minha dieta
        </NuxtLink>
        <NuxtLink to="/perfil/notificacoes" class="cf-drawer-link" @click="$emit('close')">
          <Bell class="cf-drawer-link-icon" />
          Notificações
        </NuxtLink>
        <NuxtLink to="/perfil/configuracoes" class="cf-drawer-link" @click="$emit('close')">
          <Settings class="cf-drawer-link-icon" />
          Ajuda e suporte
        </NuxtLink>
      </nav>
      <button type="button" class="cf-drawer-logout" @click="logout">
        <LogOut class="cf-drawer-link-icon" />
        Sair
      </button>
    </aside>
  </Teleport>
</template>

<script setup>
import { Bell, ChevronRight, LogOut, Settings, Sparkles, User, UtensilsCrossed, X } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
})

defineEmits(['close'])

const { clearPatientSession, userFullName, userInitials, userAvatar } = usePatientApp()

const fullName = computed(() => userFullName())
const initials = computed(() => userInitials())
const avatarUrl = computed(() => userAvatar())

function logout() {
  clearPatientSession()
  navigateTo('/')
}
</script>

<style scoped>
.cf-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(61, 61, 61, 0.35);
  z-index: 300;
}

.cf-drawer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 310;
  width: min(300px, 84vw);
  height: 100vh;
  height: 100dvh;
  background: var(--cf-surface, #fff);
  box-shadow: 8px 0 32px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  padding: calc(1rem + env(safe-area-inset-top)) 1rem 1rem;
}

.cf-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.cf-drawer-logo {
  object-fit: contain;
}

.cf-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 10px;
  background: var(--cf-bg, #f7f6f3);
  color: var(--cf-text);
  cursor: pointer;
}

.cf-drawer-close-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.cf-drawer-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: var(--cf-radius-sm, 14px);
  background: var(--cf-green-soft, #edf3eb);
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
}

.cf-drawer-user:active {
  background: color-mix(in srgb, var(--cf-green-soft, #edf3eb) 70%, var(--cf-green) 30%);
}

.cf-drawer-user-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.cf-drawer-user-name {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--cf-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-drawer-user-link {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--cf-green-dark);
}

.cf-drawer-user-arrow {
  width: 1rem;
  height: 1rem;
  color: var(--cf-text-muted);
  flex-shrink: 0;
}

.cf-drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.cf-drawer-link,
.cf-drawer-logout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.75rem;
  border-radius: var(--cf-radius-sm, 14px);
  text-decoration: none;
  color: var(--cf-text);
  font-size: 0.92rem;
  font-weight: 500;
  font-family: inherit;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.cf-drawer-link:hover,
.cf-drawer-logout:hover {
  background: var(--cf-pink-soft, #f3e4e5);
}

.cf-drawer-link-icon {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--cf-pink);
  flex-shrink: 0;
}

.cf-drawer-logout {
  color: #d64545;
  margin-top: auto;
}

.cf-drawer-logout .cf-drawer-link-icon {
  color: #d64545;
}
</style>
