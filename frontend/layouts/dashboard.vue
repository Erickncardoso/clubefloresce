<template>
  <div class="dashboard-layout" :class="{ 'patient-app-layout': isPatientApp }">
    <main class="main-content" :class="{ 'patient-courses-main': isPacienteCoursesPage }">
      <header
        class="top-nav"
        :class="{
          'patient-courses-top-nav': useCoursesOverlayNav,
          'header-scrolled': useCoursesOverlayNav && hasScrolledHeader
        }"
      >
        <div class="top-nav-left">
          <NuxtLink to="/cursos" class="top-nav-brand" aria-label="Ir para cursos">
            <img src="/logoflorescer.svg" alt="Logo Clube Florescer" class="top-nav-logo" />
          </NuxtLink>
          <nav v-if="!isPatientApp" class="top-nav-menu">
            <template v-for="item in menuItems" :key="item.path || item.label">
              <div v-if="item.children?.length" class="top-nav-mega-menu">
                <NuxtLink
                  :to="item.children[0].path"
                  class="top-nav-mega-trigger"
                  :class="{ active: isWhatsappMenuActive }"
                  :title="item.label"
                >
                  <component :is="item.icon" class="icon" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
                <div class="top-nav-mega-dropdown">
                  <NuxtLink
                    v-for="child in item.children"
                    :key="child.path"
                    :to="child.path"
                    class="top-nav-mega-item"
                    :class="{ active: $route.path === child.path }"
                  >
                    <component :is="child.icon" class="icon" />
                    <span>{{ child.label }}</span>
                  </NuxtLink>
                </div>
              </div>
              <NuxtLink
                v-else
                :to="item.path"
                :class="{ active: $route.path === item.path }"
                :title="item.label"
              >
                <component :is="item.icon" class="icon" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </template>
          </nav>
        </div>
        <div class="top-nav-actions">
          <button
            v-if="!isPatientApp"
            type="button"
            class="mobile-nav-toggle"
            :aria-expanded="mobileNavOpen"
            aria-controls="mobile-nav-drawer"
            :aria-label="mobileNavOpen ? 'Fechar menu' : 'Abrir menu'"
            @click="toggleMobileNav"
          >
            <X v-if="mobileNavOpen" class="mobile-nav-toggle-icon" />
            <Menu v-else class="mobile-nav-toggle-icon" />
          </button>
          <div
            ref="profileMenuRef"
            class="profile-menu"
            :class="{ 'profile-menu--desktop-only': !isPatientApp }"
          >
            <button
              ref="profileTriggerRef"
              type="button"
              class="profile-menu-trigger"
              :class="{ 'profile-menu-trigger-open': profileMenuOpen }"
              :aria-expanded="profileMenuOpen"
              aria-haspopup="menu"
              @click.stop="toggleProfileMenu"
              title="Abrir menu de perfil"
            >
              <PatientAvatar
                :src="sessionProfile.avatar"
                :name="sessionProfile.name"
                size="sm"
                :ring="false"
              />
              <ChevronDown class="profile-arrow-icon" :class="{ open: profileMenuOpen }" />
            </button>
          </div>
        </div>
      </header>

      <Teleport to="body">
        <div v-if="profileMenuOpen" class="profile-dropdown-layer">
          <div class="profile-dropdown-backdrop" aria-hidden="true" @click="closeProfileMenu" />
          <div
            class="profile-menu-dropdown"
            :style="profileDropdownStyle"
            role="menu"
            aria-label="Menu de perfil"
          >
            <div class="profile-menu-card">
              <PatientAvatar
                :src="sessionProfile.avatar"
                :name="sessionProfile.name"
                size="xl"
                :ring="false"
              />
              <p class="profile-menu-name">{{ sessionProfile.name }}</p>
              <p v-if="userEmail" class="profile-menu-email">{{ userEmail }}</p>
              <span v-if="roleLabel" class="profile-menu-role">{{ roleLabel }}</span>
            </div>
            <button type="button" class="profile-menu-logout" role="menuitem" @click="handleLogout">
              <LogOut class="profile-menu-logout-icon" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </Teleport>

      <Teleport v-if="!isPatientApp" to="body">
        <div
          v-if="mobileNavOpen"
          class="mobile-nav-backdrop"
          aria-hidden="true"
          @click="closeMobileNav"
        />
        <nav
          id="mobile-nav-drawer"
          class="mobile-nav-drawer"
          :class="{ open: mobileNavOpen }"
          :aria-hidden="!mobileNavOpen"
        >
          <div class="mobile-nav-profile">
            <PatientAvatar
              :src="sessionProfile.avatar"
              :name="sessionProfile.name"
              size="lg"
              :ring="false"
            />
            <div class="mobile-nav-profile-copy">
              <strong>{{ sessionProfile.name }}</strong>
              <span v-if="userEmail">{{ userEmail }}</span>
              <span v-if="roleLabel" class="mobile-nav-role">{{ roleLabel }}</span>
            </div>
          </div>

          <div class="mobile-nav-drawer-body">
            <template v-for="item in menuItems" :key="'mobile-' + (item.path || item.label)">
              <div v-if="item.children?.length" class="mobile-nav-group">
                <p class="mobile-nav-group-label">
                  <component :is="item.icon" class="icon" />
                  <span>{{ item.label }}</span>
                </p>
                <NuxtLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="mobile-nav-link mobile-nav-link--child"
                  :class="{ active: $route.path === child.path }"
                  @click="closeMobileNav"
                >
                  <component :is="child.icon" class="icon" />
                  <span>{{ child.label }}</span>
                </NuxtLink>
              </div>
              <NuxtLink
                v-else
                :to="item.path"
                class="mobile-nav-link"
                :class="{ active: $route.path === item.path }"
                @click="closeMobileNav"
              >
                <component :is="item.icon" class="icon" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </template>
          </div>

          <div class="mobile-nav-drawer-footer">
            <button type="button" class="mobile-nav-logout" @click="handleLogout">
              <LogOut class="icon" />
              <span>Sair</span>
            </button>
          </div>
        </nav>
      </Teleport>
      
      <div class="content-body" :class="{ 'patient-courses-content': isPacienteCoursesPage }">
        <slot />
      </div>
    </main>

    <AppToast />
    <CoursesVideoUploadQueuePanel v-if="!isPatientApp" />
  </div>
</template>

<script setup>
import { 
  BookOpen, 
  Users, 
  Settings, 
  FileText, 
  DollarSign, 
  Palette, 
  LogOut,
  ChevronDown,
  MessageCircle,
  Send,
  Menu,
  X,
  CalendarCheck,
  Sparkles
} from 'lucide-vue-next'

const role = ref('')
const menuItems = ref([])
const route = useRoute()
const isPacienteCoursesPage = computed(() => route.path.startsWith('/cursos'))
const config = useRuntimeConfig()
const isPatientApp = computed(() => Boolean(config.public.mobileApp))
const { hydrateProfile, persistSession, profile: sessionProfile } = usePatientApp()
const useCoursesOverlayNav = computed(() => isPatientApp.value && isPacienteCoursesPage.value)
const hasScrolledHeader = ref(false)
const isWhatsappMenuActive = computed(() => String(route.path || '').startsWith('/whatsapp/'))
const profileMenuOpen = ref(false)
const profileMenuRef = ref(null)
const profileTriggerRef = ref(null)
const profileDropdownStyle = ref({ top: '0px', right: '0px' })
const mobileNavOpen = ref(false)

const updateHeaderScrollState = () => {
  hasScrolledHeader.value = useCoursesOverlayNav.value && window.scrollY > 20
}

function updateProfileDropdownPosition() {
  const trigger = profileTriggerRef.value
  if (!trigger || !profileMenuOpen.value) return
  const rect = trigger.getBoundingClientRect()
  profileDropdownStyle.value = {
    top: `${rect.bottom + 10}px`,
    right: `${Math.max(12, window.innerWidth - rect.right)}px`,
  }
}

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value
  if (profileMenuOpen.value) {
    nextTick(updateProfileDropdownPosition)
  }
}

const closeProfileMenu = () => {
  profileMenuOpen.value = false
}

const toggleMobileNav = () => {
  mobileNavOpen.value = !mobileNavOpen.value
  if (mobileNavOpen.value) closeProfileMenu()
}

const closeMobileNav = () => {
  mobileNavOpen.value = false
}

const handleClickOutsideProfileMenu = (event) => {
  const container = profileMenuRef.value
  const panel = document.querySelector('.profile-menu-dropdown')
  if (!container) return
  if (container.contains(event.target)) return
  if (panel?.contains(event.target)) return
  closeProfileMenu()
}

const userEmail = ref('')

const roleLabel = computed(() => {
  if (role.value === 'NUTRICIONISTA') return 'Nutricionista'
  if (role.value === 'PACIENTE') return 'Aluna'
  return ''
})

async function loadSessionUser() {
  if (import.meta.server) return
  const token = localStorage.getItem('auth_token')
  if (!token) {
    hydrateProfile()
    return
  }

  try {
    const user = await $fetch(`${config.public.apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    persistSession({
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    })
    userEmail.value = user.email || ''
  } catch {
    hydrateProfile()
  }
}

const PACIENTE_MENU = [
  { label: 'Cursos', path: '/cursos', icon: BookOpen },
  { label: 'Comunidade', path: '/comunidade', icon: Users },
  { label: 'Check-in', path: '/check-in', icon: CalendarCheck },
  { label: 'BELLA', path: '/bella', icon: Sparkles },
]

onMounted(async () => {
  role.value = localStorage.getItem('user_role') || 'PACIENTE'
  await loadSessionUser()

  if (config.public.mobileApp) {
    menuItems.value = PACIENTE_MENU
    updateHeaderScrollState()
    window.addEventListener('scroll', updateHeaderScrollState, { passive: true })
    document.addEventListener('click', handleClickOutsideProfileMenu)
    return
  }
  
  const pacienteMenu = PACIENTE_MENU

  const commonMenu = [
    { label: 'Cursos', path: '/cursos', icon: BookOpen },
    { label: 'Comunidade', path: '/comunidade', icon: Users },
  ]

  const nutricionistaMenu = [
    ...commonMenu,
    { label: 'Check-ins', path: '/check-in', icon: CalendarCheck },
    { label: 'Financeiro', path: '/financeiro', icon: DollarSign },
    { label: 'Usuários', path: '/usuarios', icon: Users },
    { label: 'Personalizar', path: '/personalizar', icon: Palette },
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      children: [
        { label: 'Conexão', path: '/whatsapp/conexao', icon: MessageCircle },
        { label: 'Chat ao Vivo', path: '/whatsapp/chat', icon: MessageCircle },
        { label: 'Disparo em Massa', path: '/whatsapp/disparos', icon: Send },
      ]
    },
  ]

  menuItems.value = role.value === 'NUTRICIONISTA' ? nutricionistaMenu : pacienteMenu
  updateHeaderScrollState()
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true })
  document.addEventListener('click', handleClickOutsideProfileMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateHeaderScrollState)
  window.removeEventListener('resize', updateProfileDropdownPosition)
  window.removeEventListener('scroll', updateProfileDropdownPosition, true)
  document.removeEventListener('click', handleClickOutsideProfileMenu)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

watch(profileMenuOpen, (open) => {
  if (typeof window === 'undefined') return
  if (open) {
    nextTick(updateProfileDropdownPosition)
    window.addEventListener('resize', updateProfileDropdownPosition)
    window.addEventListener('scroll', updateProfileDropdownPosition, true)
  } else {
    window.removeEventListener('resize', updateProfileDropdownPosition)
    window.removeEventListener('scroll', updateProfileDropdownPosition, true)
  }
})

watch(() => route.path, () => {
  updateHeaderScrollState()
  closeProfileMenu()
  closeMobileNav()
})

watch(mobileNavOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

const handleLogout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_name')
  localStorage.removeItem('user_avatar')
  localStorage.removeItem('user_created_at')
  closeProfileMenu()
  closeMobileNav()
  navigateTo('/')
}

</script>

<style scoped>
.dashboard-layout {
  --nav-bg: #ffffff;
  --nav-surface: #ffffff;
  --nav-surface-hover: #f4f7f6;
  --nav-surface-muted: #f8f9f8;
  --nav-border: #e8ece9;
  --nav-text: #141414;
  --nav-text-muted: #66706e;
  --nav-pill: #f3f4f2;
  min-height: 100vh;
  overflow: visible;
}

.main-content {
  min-height: 100vh;
  background: var(--secondary);
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.top-nav {
  height: 64px;
  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.75rem;
  position: relative;
  z-index: 60;
}

.top-nav-left {
  display: flex;
  align-items: center;
  gap: 1.75rem;
  min-width: 0;
}

.top-nav-brand {
  display: inline-flex;
  flex-shrink: 0;
  text-decoration: none;
}

.top-nav-logo {
  width: 108px;
  height: 32px;
  object-fit: contain;
  object-position: left center;
}

.top-nav-menu {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex-wrap: wrap;
}

.top-nav-menu a {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--cf-radius-sm);
  text-decoration: none;
  color: var(--nav-text-muted);
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: -0.01em;
  transition: color 0.15s, background 0.15s;
}

.top-nav-menu a:hover {
  color: var(--primary, #2d5a27);
  background: var(--nav-surface-hover);
}

.top-nav-menu a.active {
  color: var(--primary, #2d5a27);
  background: transparent;
}

.top-nav-menu .icon {
  width: 16px;
  height: 16px;
  opacity: 0.9;
}

.top-nav-mega-menu {
  position: relative;
}

.top-nav-mega-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--cf-radius-sm);
  text-decoration: none;
  color: var(--nav-text-muted);
  font-weight: 700;
  font-size: 0.88rem;
  transition: color 0.15s, background 0.15s;
}

.top-nav-mega-trigger:hover,
.top-nav-mega-trigger.active {
  color: var(--primary, #2d5a27);
  background: var(--nav-surface-hover);
}

.top-nav-mega-dropdown {
  position: absolute;
  top: calc(100% + 0.45rem);
  left: 0;
  min-width: 240px;
  background: var(--nav-surface);
  border: 1px solid var(--nav-border);
  border-radius: var(--cf-radius-surface);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  padding: 0.45rem;
  display: grid;
  gap: 0.2rem;
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: all 0.2s ease;
  z-index: 80;
}

.top-nav-mega-menu:hover .top-nav-mega-dropdown,
.top-nav-mega-menu:focus-within .top-nav-mega-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.top-nav-mega-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: var(--cf-radius-control);
  color: var(--nav-text-muted);
  text-decoration: none;
  padding: 0.62rem 0.72rem;
  font-size: 0.86rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}

.top-nav-mega-item:hover {
  background: var(--nav-surface-hover);
  color: var(--primary, #2d5a27);
}

.top-nav-mega-item.active {
  background: #eef8f0;
  color: var(--primary, #2d5a27);
}

.top-nav-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.profile-menu {
  position: relative;
}

.profile-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--nav-border);
  background: #fff;
  border-radius: 999px;
  height: 40px;
  padding: 0 0.55rem 0 0.3rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.profile-menu-trigger :deep(.patient-avatar--sm) {
  width: 30px;
}

.profile-menu-trigger:hover,
.profile-menu-trigger.profile-menu-trigger-open {
  background: #fff;
  border-color: rgba(45, 90, 39, 0.28);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
}

.profile-arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--nav-text-muted);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.profile-arrow-icon.open {
  transform: rotate(180deg);
}

.profile-dropdown-layer {
  position: fixed;
  inset: 0;
  z-index: 9990;
  pointer-events: none;
}

.profile-dropdown-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: transparent;
}

.profile-menu-dropdown {
  position: fixed;
  pointer-events: auto;
  width: 300px;
  max-width: calc(100vw - 24px);
  background: #fff;
  border: 1px solid var(--nav-border);
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
  overflow: hidden;
  z-index: 9991;
}

.profile-menu-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.45rem;
  padding: 1.35rem 1.25rem 1.15rem;
  background: var(--nav-surface-muted);
  border-bottom: 1px solid var(--nav-border);
}

.profile-menu-name {
  margin: 0.35rem 0 0;
  display: block;
  width: 100%;
  color: var(--nav-text);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.profile-menu-email {
  margin: 0;
  display: block;
  width: 100%;
  color: var(--nav-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  word-break: break-word;
}

.profile-menu-role {
  display: inline-flex;
  margin-top: 0.25rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  background: #eef8f0;
  color: var(--primary, #2d5a27);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.profile-menu-logout {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  margin: 0;
  border: none;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.1rem;
  color: #dc2626;
  font: inherit;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.profile-menu-logout:hover {
  background: #fff5f5;
}

.profile-menu-logout-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.content-body {
  padding: 2rem;
  flex: 1 1 auto;
  min-height: auto;
  overflow: visible;
}

.main-content.patient-courses-main {
  background: #f7f9fc;
  position: relative;
  overflow: visible;
}

.content-body.patient-courses-content {
  padding: 0;
  margin-top: 0;
  background: transparent;
  flex: 1 1 auto;
  min-height: auto;
  overflow: visible;
}

.top-nav.patient-courses-top-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 64px;
  min-height: 64px;
  padding: 0 1.75rem;
  margin-bottom: -64px;
  background: transparent;
  border-bottom: none;
}

.top-nav.patient-courses-top-nav.header-scrolled {
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid var(--nav-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
}

.mobile-nav-toggle {
  display: none;
}

.mobile-nav-backdrop,
.mobile-nav-drawer {
  display: none;
}

@media (max-width: 900px) {
  .top-nav {
    height: 58px;
    min-height: 58px;
    padding: 0 1rem;
  }

  .top-nav-left {
    flex: 1;
    gap: 0.75rem;
  }

  .top-nav-logo {
    width: 92px;
    height: 28px;
  }

  .top-nav-menu {
    display: none;
  }

  .profile-menu--desktop-only {
    display: none;
  }

  .top-nav-actions {
    flex-shrink: 0;
  }

  .mobile-nav-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--nav-border);
    border-radius: 999px;
    background: #fff;
    color: var(--primary, #2d5a27);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .mobile-nav-toggle:hover {
    background: var(--nav-surface-hover);
    border-color: rgba(45, 90, 39, 0.22);
  }

  .mobile-nav-toggle-icon {
    width: 20px;
    height: 20px;
  }

  .mobile-nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.35);
    z-index: 200;
  }

  .mobile-nav-drawer {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    width: min(320px, 88vw);
    height: 100vh;
    height: 100dvh;
    background: #fff;
    z-index: 210;
    box-shadow: 8px 0 32px rgba(15, 23, 42, 0.1);
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    visibility: hidden;
  }

  .mobile-nav-drawer.open {
    transform: translateX(0);
    visibility: visible;
  }

  .mobile-nav-profile {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
    padding: 1.75rem 1.25rem 1.25rem;
    background: var(--nav-surface-muted);
    border-bottom: 1px solid var(--nav-border);
    flex-shrink: 0;
  }

  .mobile-nav-profile-copy {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .mobile-nav-profile-copy strong {
    color: var(--nav-text);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .mobile-nav-profile-copy span {
    color: var(--nav-text-muted);
    font-size: 0.84rem;
    word-break: break-word;
  }

  .mobile-nav-role {
    display: inline-block;
    margin-top: 0.15rem;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: #eef8f0;
    color: var(--primary, #2d5a27);
    font-size: 0.7rem !important;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-nav-drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.85rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .mobile-nav-link {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem 0.95rem;
    border-radius: 12px;
    text-decoration: none;
    color: var(--nav-text);
    font-weight: 700;
    font-size: 0.95rem;
    transition: background 0.15s;
  }

  .mobile-nav-link .icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    opacity: 0.9;
  }

  .mobile-nav-link:hover,
  .mobile-nav-link.active {
    background: var(--nav-surface-hover);
    color: var(--primary, #2d5a27);
  }

  .mobile-nav-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin-top: 0.35rem;
  }

  .mobile-nav-group-label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0;
    padding: 0.55rem 0.95rem 0.25rem;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
  }

  .mobile-nav-group-label .icon {
    width: 15px;
    height: 15px;
  }

  .mobile-nav-link--child {
    padding-left: 1.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--nav-text-muted);
  }

  .mobile-nav-link--child.active {
    color: var(--primary, #2d5a27);
  }

  .mobile-nav-drawer-footer {
    padding: 0.85rem 0.75rem 1.25rem;
    border-top: 1px solid var(--nav-border);
    flex-shrink: 0;
  }

  .mobile-nav-logout {
    width: 100%;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem 0.95rem;
    border-radius: 12px;
    color: #dc2626;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .mobile-nav-logout .icon {
    width: 20px;
    height: 20px;
  }

  .mobile-nav-logout:hover {
    background: #fff5f5;
  }

  .content-body {
    padding: 1rem;
  }

  .top-nav.patient-courses-top-nav {
    height: 58px;
    min-height: 58px;
    margin-bottom: -58px;
    padding: 0 1rem;
  }

  .content-body.patient-courses-content {
    padding-top: 58px;
  }
}
</style>
