<template>
  <Teleport to="body">
    <Transition name="drawer-backdrop">
      <div v-if="open" class="cf-drawer-backdrop" @click="$emit('close')" />
    </Transition>
    <Transition name="drawer-slide">
      <aside v-if="open" class="cf-drawer" aria-label="Menu">
        <div class="cf-drawer-inner">
          <div class="cf-drawer-head">
            <PatientBrandMark size="md" />
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
              <span class="cf-drawer-user-plan">Clube Florescer</span>
            </div>
            <ChevronRight class="cf-drawer-user-arrow" aria-hidden="true" />
          </NuxtLink>

          <nav class="cf-drawer-nav">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="cf-drawer-link"
              :class="{ 'cf-drawer-link--active': isActive(item.to) }"
              @click="$emit('close')"
            >
              <span class="cf-drawer-link-icon-wrap" :class="{ 'cf-drawer-link-icon-wrap--active': isActive(item.to) }">
                <component :is="item.icon" class="cf-drawer-link-icon" />
              </span>
              <span class="cf-drawer-link-label">{{ item.label }}</span>
              <span v-if="item.badge" class="cf-drawer-link-badge">{{ item.badge }}</span>
            </NuxtLink>
          </nav>

          <div class="cf-drawer-footer">
            <div class="cf-drawer-divider" />
            <button type="button" class="cf-drawer-logout" @click="logout">
              <span class="cf-drawer-link-icon-wrap cf-drawer-link-icon-wrap--danger">
                <LogOut class="cf-drawer-link-icon" />
              </span>
              <span class="cf-drawer-link-label">Sair da conta</span>
            </button>
            <p class="cf-drawer-version">Clube Florescer v1.0</p>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import {
  Bell,
  BookOpen,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  X,
} from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
})

defineEmits(['close'])

const route = useRoute()
const { clearPatientSession, userFullName, userInitials, userAvatar } = usePatientApp()
const { hasUnread } = usePatientNotifications()

const fullName = computed(() => userFullName())
const initials = computed(() => userInitials())
const avatarUrl = computed(() => userAvatar())

const navItems = computed(() => [
  { to: '/inicio', label: 'Inicio', icon: Home },
  { to: '/bella', label: 'Bella IA', icon: Sparkles },
  { to: '/dieta', label: 'Minha dieta', icon: UtensilsCrossed },
  { to: '/evolucao', label: 'Evolucao', icon: TrendingUp },
  { to: '/conteudo', label: 'Conteudo', icon: BookOpen },
  { to: '/perfil/notificacoes', label: 'Notificacoes', icon: Bell, badge: hasUnread.value ? 'Novo' : null },
  { to: '/perfil/configuracoes', label: 'Configuracoes', icon: Settings },
])

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function logout() {
  clearPatientSession()
  navigateTo('/')
}
</script>

<style scoped>
.cf-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 20, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
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
  box-shadow: 12px 0 48px rgba(0, 0, 0, 0.12), 2px 0 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cf-drawer-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: calc(1.25rem + env(safe-area-inset-top)) 1rem 1rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Header */
.cf-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding: 0 0.25rem;
  gap: 0.75rem;
}

.cf-drawer-head :deep(.cf-brand-mark) {
  min-width: 0;
  flex: 1;
  gap: 0.55rem;
}

.cf-drawer-head :deep(.cf-brand-mark__icon) {
  height: 1.85rem;
}

.cf-drawer-head :deep(.cf-brand-mark__text) {
  font-size: 1.02rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--cf-border);
  border-radius: 12px;
  background: var(--cf-bg, #f7f6f3);
  color: var(--cf-text-muted);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.cf-drawer-close:active {
  background: var(--cf-border);
  color: var(--cf-text);
}

.cf-drawer-close-icon {
  width: 1rem;
  height: 1rem;
}

/* User card */
.cf-drawer-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
  padding: 0.85rem;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--cf-pink-soft) 0%, #fdf5f6 100%);
  border: 1px solid rgba(193, 123, 128, 0.12);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cf-drawer-user:active {
  transform: scale(0.98);
  box-shadow: 0 2px 12px rgba(193, 123, 128, 0.15);
}

.cf-drawer-user-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cf-drawer-user-name {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--cf-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-drawer-user-plan {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--cf-pink);
  letter-spacing: 0.01em;
}

.cf-drawer-user-arrow {
  width: 0.95rem;
  height: 0.95rem;
  color: var(--cf-pink);
  flex-shrink: 0;
  opacity: 0.6;
}

/* Navigation */
.cf-drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
}

.cf-drawer-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  text-decoration: none;
  color: var(--cf-text);
  font-size: 0.88rem;
  font-weight: 500;
  transition: background 0.15s ease;
}

.cf-drawer-link:active {
  background: var(--cf-pink-soft);
}

.cf-drawer-link--active {
  background: var(--cf-pink-soft);
  font-weight: 600;
}

.cf-drawer-link--active .cf-drawer-link-label {
  color: var(--cf-pink-dark);
}

/* Icon wrap */
.cf-drawer-link-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 11px;
  background: #fdf2f3;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.15s ease;
}

.cf-drawer-link-icon-wrap--active {
  background: var(--cf-pink);
  box-shadow: 0 2px 8px rgba(193, 123, 128, 0.3);
}

.cf-drawer-link-icon-wrap--active .cf-drawer-link-icon {
  color: #fff;
}

.cf-drawer-link-icon-wrap--danger {
  background: #fff0f0;
}

.cf-drawer-link-icon-wrap--danger .cf-drawer-link-icon {
  color: #d64545;
}

.cf-drawer-link-icon {
  width: 1.05rem;
  height: 1.05rem;
  color: var(--cf-pink);
  stroke-width: 1.85;
}

.cf-drawer-link-label {
  flex: 1;
  min-width: 0;
  letter-spacing: -0.01em;
}

.cf-drawer-link-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--cf-green);
  color: #fff;
}

/* Footer */
.cf-drawer-footer {
  margin-top: auto;
  padding-top: 0.5rem;
}

.cf-drawer-divider {
  height: 1px;
  background: var(--cf-border);
  margin: 0 0.5rem 0.5rem;
}

.cf-drawer-logout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  color: #d64545;
  transition: background 0.15s ease;
}

.cf-drawer-logout:active {
  background: #fff0f0;
}

.cf-drawer-version {
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--cf-text-muted);
  opacity: 0.5;
  letter-spacing: 0.02em;
}

/* Transitions */
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-backdrop-enter-active,
  .drawer-backdrop-leave-active,
  .drawer-slide-enter-active,
  .drawer-slide-leave-active {
    transition: none;
  }
}
</style>
