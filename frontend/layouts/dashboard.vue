<template>
  <div class="dashboard-layout">
    <main class="main-content" :class="{ 'patient-courses-main': isPacienteCoursesPage }">
      <header
        class="top-nav"
        :class="{
          'patient-courses-top-nav': isPacienteCoursesPage,
          'header-scrolled': isPacienteCoursesPage && hasScrolledHeader
        }"
      >
        <div class="top-nav-left">
          <img src="/logoflorescer.svg" alt="Logo Clube Florescer" class="top-nav-logo" />
          <nav class="top-nav-menu">
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
          <div ref="profileMenuRef" class="profile-menu">
            <button
              type="button"
              class="profile-menu-trigger"
              :class="{ 'profile-menu-trigger-open': profileMenuOpen }"
              @click.stop="toggleProfileMenu"
              title="Abrir menu de perfil"
            >
              <img src="/user-avatar.svg" alt="Avatar do usuário" class="profile-avatar-image" />
              <ChevronDown class="profile-arrow-icon" :class="{ open: profileMenuOpen }" />
            </button>
            <div v-if="profileMenuOpen" class="profile-menu-dropdown">
              <button class="profile-menu-logout" @click="handleLogout">
                <LogOut class="icon" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div class="content-body" :class="{ 'patient-courses-content': isPacienteCoursesPage }">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import { 
  BookOpen, 
  Users, 
  Book, 
  Settings, 
  FileText, 
  DollarSign, 
  Palette, 
  LogOut,
  ChevronDown,
  MessageCircle,
  Send
} from 'lucide-vue-next'

const role = ref('')
const menuItems = ref([])
const route = useRoute()
const isPacienteCoursesPage = computed(() => route.path.startsWith('/cursos'))
const hasScrolledHeader = ref(false)
const isWhatsappMenuActive = computed(() => String(route.path || '').startsWith('/whatsapp/'))
const profileMenuOpen = ref(false)
const profileMenuRef = ref(null)

const updateHeaderScrollState = () => {
  hasScrolledHeader.value = isPacienteCoursesPage.value && window.scrollY > 20
}

const toggleProfileMenu = () => {
  profileMenuOpen.value = !profileMenuOpen.value
}

const closeProfileMenu = () => {
  profileMenuOpen.value = false
}

const handleClickOutsideProfileMenu = (event) => {
  const container = profileMenuRef.value
  if (!container) return
  if (!container.contains(event.target)) {
    closeProfileMenu()
  }
}

onMounted(() => {
  role.value = localStorage.getItem('user_role') || 'PACIENTE'
  
  const commonMenu = [
    { label: 'Cursos', path: '/cursos', icon: BookOpen },
    { label: 'Comunidade', path: '/comunidade', icon: Users },
  ]

  const nutricionistaMenu = [
    ...commonMenu,
    { label: 'Ebooks', path: '/ebooks', icon: Book },
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

  menuItems.value = role.value === 'NUTRICIONISTA' ? nutricionistaMenu : commonMenu
  updateHeaderScrollState()
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true })
  document.addEventListener('click', handleClickOutsideProfileMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateHeaderScrollState)
  document.removeEventListener('click', handleClickOutsideProfileMenu)
})

watch(() => route.path, () => {
  updateHeaderScrollState()
  closeProfileMenu()
})

const handleLogout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_role')
  closeProfileMenu()
  navigateTo('/')
}

</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
}

.main-content {
  min-height: 100vh;
  background: var(--secondary);
  display: flex;
  flex-direction: column;
}

.top-nav {
  height: 70px;
  background: var(--bg-app);
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}

.top-nav-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.top-nav-logo {
  width: 118px;
  height: 36px;
  object-fit: contain;
  object-position: left center;
}

.top-nav-menu {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.top-nav-menu a {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.48rem 0.8rem;
  border-radius: 10px;
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.top-nav-menu a:hover {
  background: var(--secondary);
  color: var(--primary);
}

.top-nav-menu a.active {
  background: transparent;
  color: var(--primary);
}

.top-nav-menu .icon {
  width: 16px;
  height: 16px;
}

.top-nav-mega-menu {
  position: relative;
}

.top-nav-mega-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.48rem 0.8rem;
  border-radius: 10px;
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.top-nav-mega-trigger:hover {
  background: var(--secondary);
  color: var(--primary);
}

.top-nav-mega-trigger.active {
  background: transparent;
  color: var(--primary);
}

.top-nav-mega-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  min-width: 250px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
  padding: 0.45rem;
  display: grid;
  gap: 0.3rem;
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
  gap: 0.5rem;
  border-radius: 9px;
  color: #334155;
  text-decoration: none;
  padding: 0.56rem 0.66rem;
  font-size: 0.86rem;
  font-weight: 600;
}

.top-nav-mega-item:hover {
  background: #f6faf7;
  color: var(--primary);
}

.top-nav-mega-item.active {
  background: #eef8f0;
  color: var(--primary);
}

.top-nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-menu {
  position: relative;
}

.profile-menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999px;
  height: 40px;
  padding: 0 0.45rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-menu-trigger:hover,
.profile-menu-trigger.profile-menu-trigger-open {
  border-color: rgba(17, 123, 56, 0.38);
  background: #ffffff;
}

.profile-avatar-image {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--primary);
  transition: transform 0.2s ease;
}

.profile-arrow-icon.open {
  transform: rotate(180deg);
}

.profile-menu-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  min-width: 140px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
  padding: 0.35rem;
  z-index: 95;
}

.profile-menu-logout {
  width: 100%;
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: #ef4444;
  border-radius: 8px;
  padding: 0.52rem 0.65rem;
  cursor: pointer;
  font-weight: 600;
}

.profile-menu-logout:hover {
  background: #fff5f5;
}

.content-body {
  padding: 2rem;
  flex: 1;
}

.main-content.patient-courses-main {
  background: #f7f9fc;
  position: relative;
}

.content-body.patient-courses-content {
  padding: 0;
  margin-top: 0;
  background: transparent;
}

.top-nav.patient-courses-top-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 70px;
  min-height: 70px;
  padding: 0 2rem;
  margin-bottom: -70px;
  background: transparent;
  border-bottom: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.top-nav.patient-courses-top-nav.header-scrolled {
  background: #ffffff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
}

.top-nav.patient-courses-top-nav.header-scrolled .top-nav-menu a {
  color: var(--primary);
  background: transparent;
}

.top-nav.patient-courses-top-nav.header-scrolled .top-nav-menu a:hover,
.top-nav.patient-courses-top-nav.header-scrolled .top-nav-menu a.active {
  color: var(--primary);
  background: transparent;
}

.top-nav.patient-courses-top-nav.header-scrolled .top-nav-mega-trigger {
  color: var(--primary);
  background: transparent;
}

.top-nav.patient-courses-top-nav.header-scrolled .top-nav-mega-trigger:hover,
.top-nav.patient-courses-top-nav.header-scrolled .top-nav-mega-trigger.active {
  color: var(--primary);
  background: transparent;
}

.top-nav.patient-courses-top-nav .top-nav-actions {
  height: 100%;
  display: flex;
  align-items: center;
}

.top-nav.patient-courses-top-nav .profile-menu-trigger {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(15, 23, 42, 0.14);
}

.top-nav.patient-courses-top-nav.header-scrolled .profile-menu-trigger {
  background: #fff;
  border-color: rgba(15, 23, 42, 0.12);
}

@media (max-width: 900px) {
  .top-nav {
    height: auto;
    min-height: 64px;
    padding: 0.8rem 1rem;
    align-items: flex-start;
    gap: 0.8rem;
    flex-direction: column;
  }

  .top-nav-left {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.65rem;
  }

  .top-nav-menu {
    width: 100%;
    gap: 0.45rem;
  }

  .top-nav-menu a {
    padding: 0.44rem 0.66rem;
    font-size: 0.84rem;
  }

  .top-nav-mega-trigger {
    padding: 0.44rem 0.66rem;
    font-size: 0.84rem;
  }

  .top-nav-mega-dropdown {
    min-width: 220px;
  }

  .top-nav-actions {
    width: 100%;
    justify-content: space-between;
  }

  .content-body {
    padding: 1rem;
  }

  .top-nav.patient-courses-top-nav {
    position: sticky;
    top: 0;
    min-height: 64px;
    margin-bottom: -64px;
    padding: 0.8rem 1rem;
  }

  .content-body.patient-courses-content {
    padding-top: 64px;
  }
}
</style>
