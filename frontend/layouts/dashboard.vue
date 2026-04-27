<template>
  <div class="dashboard-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container">
          <img src="/logoflorescer.svg" alt="Logo Clube Florescer" class="sidebar-logo" />
        </div>
        <button @click="isCollapsed = !isCollapsed" class="btn-toggle">
          <ChevronLeft v-if="!isCollapsed" />
          <ChevronRight v-else />
        </button>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li v-for="item in menuItems" :key="item.path || item.label">
            <template v-if="item.children?.length">
              <button
                type="button"
                class="sidebar-group-btn"
                :class="{ active: isWhatsappMenuActive }"
                :title="item.label"
                @click="toggleWhatsappMenu"
              >
                <component :is="item.icon" class="icon" />
                <span v-if="!isCollapsed">{{ item.label }}</span>
                <ChevronDown v-if="!isCollapsed" class="sidebar-group-chevron" :class="{ open: whatsappMenuOpen }" />
              </button>
              <ul v-if="!isCollapsed && whatsappMenuOpen" class="sidebar-submenu">
                <li v-for="child in item.children" :key="child.path">
                  <NuxtLink :to="child.path" :class="{ 'active': $route.path === child.path }" :title="child.label">
                    <component :is="child.icon" class="icon" />
                    <span>{{ child.label }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </template>
            <NuxtLink v-else :to="item.path" :class="{ 'active': $route.path === item.path }" :title="item.label">
              <component :is="item.icon" class="icon" />
              <span v-if="!isCollapsed">{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer">
        <button @click="handleLogout" class="btn-logout" :title="'Sair'">
          <LogOut class="icon" />
          <span v-if="!isCollapsed">Sair</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Top Header -->
    <header class="mobile-topbar">
      <img src="/logoflorescer.svg" alt="Logo Clube Florescer" class="mobile-topbar-logo" />
      <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Abrir menu">
        <Menu v-if="!mobileMenuOpen" class="icon" />
        <X v-else class="icon" />
      </button>
    </header>

    <!-- Mobile Drawer -->
    <Transition name="fade">
      <div v-if="mobileMenuOpen" class="mobile-drawer-backdrop" @click="mobileMenuOpen = false"></div>
    </Transition>

    <aside class="mobile-drawer" :class="{ open: mobileMenuOpen }">
      <nav class="mobile-drawer-nav">
        <ul>
          <li v-for="item in menuItems" :key="`mobile-${item.path || item.label}`">
            <template v-if="item.children?.length">
              <button
                type="button"
                class="mobile-drawer-group-btn"
                :class="{ active: isWhatsappMenuActive }"
                @click="mobileWhatsappMenuOpen = !mobileWhatsappMenuOpen"
              >
                <component :is="item.icon" class="icon" />
                <span>{{ item.label }}</span>
                <ChevronDown class="sidebar-group-chevron" :class="{ open: mobileWhatsappMenuOpen }" />
              </button>
              <ul v-if="mobileWhatsappMenuOpen" class="mobile-drawer-submenu">
                <li v-for="child in item.children" :key="`mobile-child-${child.path}`">
                  <NuxtLink :to="child.path" :class="{ 'active': $route.path === child.path }" @click="mobileMenuOpen = false">
                    <component :is="child.icon" class="icon" />
                    <span>{{ child.label }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </template>
            <NuxtLink v-else :to="item.path" :class="{ 'active': $route.path === item.path }" @click="mobileMenuOpen = false">
              <component :is="item.icon" class="icon" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <button @click="handleLogout" class="mobile-drawer-logout">
        <LogOut class="icon" />
        <span>Sair</span>
      </button>
    </aside>

    <!-- Main Content -->
    <main class="main-content" :class="{ 'patient-courses-main': isPacienteCoursesPage }">
      <header class="top-nav" :class="{ 'patient-courses-top-nav': isPacienteCoursesPage }">
        <div class="top-nav-actions">
          <div class="user-info" :class="{ 'patient-courses-user-info': isPacienteCoursesPage }">
            <span>{{ role === 'NUTRICIONISTA' ? 'Nutricionista' : 'Paciente' }}</span>
          </div>
          <button class="btn-top-logout" :class="{ 'patient-courses-btn-logout': isPacienteCoursesPage }" @click="handleLogout" title="Sair">
            <LogOut class="icon" />
            <span>Sair</span>
          </button>
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
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Book, 
  Settings, 
  FileText, 
  DollarSign, 
  Palette, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  MessageCircle,
  Send
} from 'lucide-vue-next'

const role = ref('')
const isCollapsed = ref(false)
const menuItems = ref([])
const mobileMenuOpen = ref(false)
const whatsappMenuOpen = ref(false)
const mobileWhatsappMenuOpen = ref(false)
const route = useRoute()
const isPacienteCoursesPage = computed(() => route.path.startsWith('/cursos'))
const isWhatsappMenuActive = computed(() => String(route.path || '').startsWith('/whatsapp/'))

onMounted(() => {
  role.value = localStorage.getItem('user_role') || 'PACIENTE'
  
  const commonMenu = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
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
  whatsappMenuOpen.value = isWhatsappMenuActive.value
})

const toggleWhatsappMenu = () => {
  if (isCollapsed.value) {
    isCollapsed.value = false
    whatsappMenuOpen.value = true
    return
  }
  whatsappMenuOpen.value = !whatsappMenuOpen.value
}

const handleLogout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_role')
  navigateTo('/')
}

watch(() => route.path, () => {
  mobileMenuOpen.value = false
  if (isWhatsappMenuActive.value) {
    whatsappMenuOpen.value = true
    mobileWhatsappMenuOpen.value = true
  }
})
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.mobile-topbar,
.mobile-drawer,
.mobile-drawer-backdrop {
  display: none;
}

.sidebar {
  width: 260px;
  background: var(--bg-app);
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.sidebar.collapsed {
  width: 80px;
  padding: 1.5rem 0.8rem;
}

.sidebar-header {
  margin-bottom: 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  width: 100%;
}

.sidebar-logo {
  width: 128px;
  height: 40px;
  object-fit: contain;
  object-position: center;
  display: block;
}

.collapsed .sidebar-logo {
  width: 34px;
  height: 34px;
  object-position: center;
}

.btn-toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: var(--transition);
}

.btn-toggle:hover {
  background: var(--secondary);
  color: var(--primary);
}

.sidebar-nav ul {
  list-style: none;
  flex: 1;
}

.sidebar-group-btn {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  text-decoration: none;
  color: var(--text-muted);
  border-radius: 12px;
  transition: all 0.2s ease;
  font-weight: 500;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
  border: 0;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.sidebar-group-btn:hover {
  background: var(--secondary);
  color: var(--primary);
}

.sidebar-group-btn.active {
  background: var(--primary);
  color: #fff;
}

.sidebar-group-chevron {
  width: 16px;
  height: 16px;
  margin-left: auto;
  transition: transform 0.2s ease;
}

.sidebar-group-chevron.open {
  transform: rotate(180deg);
}

.sidebar-submenu {
  list-style: none;
  margin: -0.15rem 0 0.4rem;
  padding: 0 0 0 0.9rem;
  border-left: 2px solid rgba(17, 123, 56, 0.15);
}

.sidebar-submenu a {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  text-decoration: none;
  color: var(--text-muted);
  border-radius: 12px;
  transition: all 0.2s ease;
  font-weight: 500;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
  overflow: hidden;
  white-space: nowrap;
}

.collapsed .sidebar-nav a {
  justify-content: center;
  padding: 0.8rem;
}

.sidebar-nav a:hover {
  background: var(--secondary);
  color: var(--primary);
}

.sidebar-nav a.active {
  background: var(--primary);
  color: white;
}

.sidebar-nav .icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar:not(.collapsed) .icon {
  margin-right: 12px;
}

.sidebar-footer {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.btn-logout {
  width: 100%;
  padding: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: white;
  border: 1px solid #f0f0f0;
  color: var(--error);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  overflow: hidden;
  white-space: nowrap;
}

.collapsed .btn-logout {
  gap: 0;
}

.btn-logout:hover {
  background: #fff5f5;
  border-color: var(--error);
  transform: scale(1.02);
}

.main-content {
  flex: 1;
  overflow-y: auto;
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
  padding: 0 3rem;
  justify-content: flex-end;
}

.top-nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.btn-top-logout {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  color: var(--error);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-top-logout:hover {
  background: #fff5f5;
  border-color: var(--error);
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
  padding: 0 3rem;
  margin-bottom: -70px;
  background: transparent;
  border-bottom: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.top-nav.patient-courses-top-nav .top-nav-actions {
  height: 100%;
  display: flex;
  align-items: center;
}

.user-info.patient-courses-user-info {
  color: #0f172a;
}

.btn-top-logout.patient-courses-btn-logout {
  background: rgba(255, 255, 255, 0.82);
  color: #0f172a;
  border-color: rgba(15, 23, 42, 0.14);
}

.btn-top-logout.patient-courses-btn-logout:hover {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.24);
}

@media (max-width: 900px) {
  .sidebar,
  .top-nav {
    display: none;
  }

  .mobile-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    z-index: 70;
  }

  .mobile-topbar-logo {
    width: 116px;
    height: 36px;
    object-fit: contain;
    object-position: left center;
  }

  .mobile-menu-btn {
    border: 1px solid #e5e7eb;
    background: #fff;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0f172a;
  }

  .mobile-drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.34);
    z-index: 75;
  }

  .mobile-drawer {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 64px;
    right: -280px;
    width: 280px;
    height: calc(100vh - 64px);
    background: #fff;
    border-left: 1px solid #e5e7eb;
    z-index: 80;
    transition: right 0.25s ease;
    padding: 1rem 0.8rem;
  }

  .mobile-drawer.open {
    right: 0;
  }

  .mobile-drawer-nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .mobile-drawer-nav a {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem 0.8rem;
    border-radius: 10px;
    color: #334155;
    text-decoration: none;
    margin-bottom: 0.35rem;
    font-weight: 600;
  }

  .mobile-drawer-group-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem 0.8rem;
    border-radius: 10px;
    color: #334155;
    text-decoration: none;
    margin-bottom: 0.35rem;
    font-weight: 600;
    border: 0;
    background: transparent;
  }

  .mobile-drawer-group-btn.active {
    background: var(--primary);
    color: #fff;
  }

  .mobile-drawer-submenu {
    list-style: none;
    margin: -0.15rem 0 0.35rem;
    padding: 0 0 0 0.75rem;
    border-left: 2px solid rgba(17, 123, 56, 0.15);
  }

  .mobile-drawer-submenu a {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    color: #334155;
    text-decoration: none;
    margin-bottom: 0.25rem;
    font-weight: 600;
    font-size: 0.92rem;
  }

  .mobile-drawer-submenu a.active {
    background: var(--primary);
    color: #fff;
  }

  .mobile-drawer-nav a.active {
    background: var(--primary);
    color: #fff;
  }

  .mobile-drawer-logout {
    margin-top: auto;
    border: 1px solid #fecaca;
    color: #ef4444;
    background: #fff;
    border-radius: 10px;
    padding: 0.75rem 0.9rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    font-weight: 700;
  }

  .main-content {
    width: 100%;
  }

  .content-body {
    padding-top: calc(64px + 1rem);
  }

  .content-body.patient-courses-content {
    padding-top: 64px;
  }
}
</style>
