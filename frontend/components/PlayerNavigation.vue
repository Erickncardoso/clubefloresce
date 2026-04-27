<script setup>
import { 
  Home, 
  PlaySquare, 
  Layout, 
  MessageSquare, 
  HelpCircle,
  LogOut,
  ArrowLeft
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  courseTitle: String,
  moduleTitle: String,
  courseThumbnail: String
})

const emit = defineEmits(['close'])

const menuItems = [
  { group: 'Geral', items: [
    { label: 'Início', icon: Home, link: '/cursos' },
    { label: 'Meus Conteúdos', icon: PlaySquare, link: '#' },
    { label: 'Catálogo', icon: Layout, link: '/index_cursos' }
  ]},
  { group: 'Suporte', items: [
    { label: 'Comunidade', icon: MessageSquare, link: '#' },
    { label: 'Ajuda e Suporte', icon: HelpCircle, link: '#' },
    { label: 'Sair da Conta', icon: LogOut, link: '/' }
  ]}
]
</script>

<template>
  <div class="nav-wrapper" :class="{ 'is-active': isOpen }">
    <!-- Overlay (No Blur) -->
    <Transition name="fade">
      <div v-if="isOpen" class="nav-overlay" @click="emit('close')"></div>
    </Transition>

    <!-- Floating Popout Menu -->
    <Transition name="popout">
      <aside v-if="isOpen" class="nav-sidebar">
        <div class="nav-scroll-area">
          <!-- Back Button -->
          <button class="btn-back-nav" @click="navigateTo('/cursos')">
            <ArrowLeft class="icon-xs" /> Voltar
          </button>

          <!-- Current Course Card -->
          <div class="current-course-card">
            <div class="course-avatar">
              <img v-if="courseThumbnail" :src="courseThumbnail" class="img-nav-course" />
              <Layout v-else class="icon-md" />
            </div>
            <div class="course-info">
              <h4 class="course-name">{{ courseTitle || 'Curso Atual' }}</h4>
              <p class="module-name">{{ moduleTitle || 'Módulo' }}</p>
            </div>
          </div>

          <!-- Navigation Menu -->
          <div v-for="(group, idx) in menuItems" :key="idx" class="nav-group">
            <h5 class="group-title">{{ group.group }}</h5>
            <div class="group-list">
              <a 
                v-for="item in group.items" 
                :key="item.label" 
                :href="item.link"
                class="nav-item"
                @click.prevent="navigateTo(item.link); emit('close')"
              >
                <component :is="item.icon" class="icon-sm" />
                <span>{{ item.label }}</span>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.nav-wrapper {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

.nav-wrapper.is-active {
  pointer-events: all;
}

/* Background Overlay - Optimized to not blur */
.nav-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.3s ease;
}

/* Floating Sidebar (Popout Style) */
.nav-sidebar {
  position: absolute;
  top: 80px; /* Below Header */
  left: 24px;
  width: 340px;
  max-height: calc(100vh - 120px);
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

/* Scroll Area */
.nav-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.btn-back-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #888;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  margin-bottom: 1.25rem;
}

/* Course Card */
.current-course-card {
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}

.course-avatar {
  width: 44px;
  height: 44px;
  background: #f3f4f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.img-nav-course {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.module-name {
  font-size: 0.75rem;
  color: #888;
  margin: 1px 0 0;
}

/* Navigation Groups */
.nav-group {
  margin-bottom: 1.25rem;
}

.group-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  color: #4b5563;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #111;
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.popout-enter-active, .popout-leave-active { 
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.popout-enter-from { 
  opacity: 0; 
  transform: translateY(-8px) scale(0.98); 
}
.popout-leave-to { 
  opacity: 0; 
  transform: translateY(-8px) scale(0.98); 
}

.icon-md { width: 22px; height: 22px; }
.icon-sm { width: 18px; height: 18px; color: #9ca3af; }
.icon-xs { width: 14px; height: 14px; }
</style>
