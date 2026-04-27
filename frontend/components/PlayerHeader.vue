<script setup>
import { ref, computed } from 'vue'
import { 
  Menu, 
  Search, 
  Bell,
  X 
} from 'lucide-vue-next'

const props = defineProps({
  courseTitle: String,
  moduleTitle: String,
  courseThumbnail: String
})

const searchQuery = ref('')
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <header class="premium-header">
    <div class="header-left">
      <button class="btn-icon-menu" @click="toggleMenu">
        <component :is="isMenuOpen ? X : Menu" class="icon-md" />
      </button>
      <div class="logo-area" @click="navigateTo('/cursos')">
        <span class="logo-text">CLUBE</span>
        <span class="logo-accent">FLORESCER</span>
      </div>
    </div>

    <div class="header-center">
      <div class="search-bar">
        <Search class="search-icon" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Busque por assuntos e aulas"
        />
        <div class="search-shortcut">/</div>
      </div>
    </div>

    <div class="header-right">
      <div class="notifications">
        <div class="notification-trigger">
          <Bell class="icon-md" />
          <span class="notification-badge">9+</span>
        </div>
      </div>

      <div class="user-profile">
        <div class="avatar-wrapper">
          <img src="https://ui-avatars.com/api/?name=Admin&background=2d5a27&color=fff" alt="User" class="user-avatar" />
        </div>
      </div>
    </div>

    <!-- Floating Navigation Menu -->
    <PlayerNavigation 
      :is-open="isMenuOpen" 
      :course-title="courseTitle"
      :module-title="moduleTitle"
      :course-thumbnail="courseThumbnail"
      @close="isMenuOpen = false" 
    />
  </header>
</template>

<style scoped>
.premium-header {
  height: 72px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid #eaeaea;
  position: relative;
  z-index: 3000;
  color: #111;
}

/* Left Section */
.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.btn-icon-menu {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-menu:hover {
  background: #f5f5f5;
  color: #111;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.logo-text {
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.5px;
  color: #111;
}

.logo-accent {
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.5px;
  color: #2d5a27;
}

/* Center Section (Search) */
.header-center {
  flex: 1;
  max-width: 480px;
  margin: 0 2rem;
}

.search-bar {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 0.75rem;
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: #2d5a27;
  background: #ffffff;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #9ca3af;
}

.search-bar input {
  background: none;
  border: none;
  color: #111;
  font-size: 0.95rem;
  width: 100%;
  outline: none;
}

.search-bar input::placeholder {
  color: #9ca3af;
}

.search-shortcut {
  background: #e5e7eb;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Right Section */
.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.notification-trigger {
  position: relative;
  width: 38px;
  height: 38px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #737380;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-trigger:hover {
  color: #111;
  background: #e5e7eb;
  border-color: #d1d5db;
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #8257e5;
  color: white;
  font-size: 10px;
  font-weight: 800;
  min-width: 22px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 3px solid #ffffff;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-profile:hover {
  background: #f5f5f5;
}

.avatar-wrapper {
  width: 50px;
  height: 50px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.user-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-md { width: 24px; height: 24px; }
.icon-sm { width: 18px; height: 18px; }
.icon-xs { width: 14px; height: 14px; color: #999; }
</style>
