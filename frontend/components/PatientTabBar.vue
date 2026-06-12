<template>
  <div class="cf-tab-bar-wrap">
    <nav class="cf-tab-bar" aria-label="Navegação principal">
      <NuxtLink
        v-for="item in sideTabs"
        :key="item.path"
        :to="item.path"
        class="cf-tab"
        :class="{ active: isActive(item.path) }"
      >
        <component :is="item.icon" class="cf-tab-icon" />
        <span class="cf-tab-label">{{ item.label }}</span>
      </NuxtLink>

      <span class="cf-tab-fab-spacer" aria-hidden="true" />

      <NuxtLink
        v-for="item in rightTabs"
        :key="item.path"
        :to="item.path"
        class="cf-tab"
        :class="{ active: isActive(item.path) }"
      >
        <component :is="item.icon" class="cf-tab-icon" />
        <span class="cf-tab-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <button
      type="button"
      class="cf-tab-fab"
      :class="{ 'cf-tab-fab--open': bellaMenuOpen }"
      :aria-label="bellaMenuOpen ? 'Fechar menu da Bella' : 'Abrir menu da Bella'"
      :aria-expanded="bellaMenuOpen"
      @click="bellaMenuOpen = !bellaMenuOpen"
    >
      <Plus class="cf-tab-fab-icon" />
    </button>

    <BellaActionSheet v-model="bellaMenuOpen" />
  </div>
</template>

<script setup>
import { BookOpen, CalendarCheck, Home, Plus, Users } from 'lucide-vue-next'

const route = useRoute()
const bellaMenuOpen = ref(false)

const sideTabs = [
  { label: 'Início', path: '/inicio', icon: Home },
  { label: 'Check-in', path: '/check-in', icon: CalendarCheck },
]

const rightTabs = [
  { label: 'Biblioteca', path: '/conteudo', icon: BookOpen },
  { label: 'Comunidade', path: '/comunidade', icon: Users },
]

function isActive(path) {
  if (path === '/conteudo') {
    return route.path.startsWith('/conteudo') || route.path.startsWith('/cursos') || route.path.startsWith('/ebooks')
  }
  if (path === '/check-in') return route.path.startsWith('/check-in')
  if (path === '/comunidade') return route.path.startsWith('/comunidade')
  return route.path === path || route.path.startsWith(`${path}/`)
}

watch(() => route.fullPath, () => {
  bellaMenuOpen.value = false
})
</script>

<style scoped>
.cf-tab-bar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  box-sizing: border-box;
  padding-top: var(--cf-tab-fab-rise);
  padding-bottom: 0;
  background: var(--cf-surface);
  border-top: 1px solid var(--cf-border);
  pointer-events: none;
}

.cf-tab-bar {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 1fr 1fr var(--cf-fab-size) 1fr 1fr;
  align-items: end;
  width: 100%;
  max-width: 430px;
  margin-inline: auto;
  padding: 0.125rem 0.5rem 0.25rem;
  box-sizing: border-box;
}

.cf-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.125rem;
  min-width: 0;
  padding: 0;
  color: var(--cf-text-muted);
  text-decoration: none;
  font-family: var(--cf-font);
  -webkit-tap-highlight-color: transparent;
}

.cf-tab:focus-visible {
  outline: 2px solid var(--cf-pink);
  outline-offset: 2px;
  border-radius: 8px;
}

.cf-tab-icon {
  width: 1.2rem;
  height: 1.2rem;
  stroke-width: 1.75;
  flex-shrink: 0;
}

.cf-tab-label {
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1;
}

.cf-tab.active {
  color: var(--cf-pink);
}

.cf-tab-fab-spacer {
  width: var(--cf-fab-size);
  height: 0;
}

.cf-tab-fab {
  pointer-events: auto;
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--cf-fab-size);
  height: var(--cf-fab-size);
  border: none;
  border-radius: 50%;
  background: var(--cf-pink);
  color: #fff;
  box-shadow: 0 2px 8px rgba(193, 123, 128, 0.35);
  cursor: pointer;
  transform: translateX(-50%);
  transition: transform 0.15s ease, background 0.15s ease;
}

.cf-tab-fab:focus-visible {
  outline: 2px solid var(--cf-pink-dark);
  outline-offset: 3px;
}

.cf-tab-fab:active {
  transform: translateX(-50%) scale(0.96);
  background: var(--cf-pink-dark);
}

.cf-tab-fab--open:active {
  transform: translateX(-50%) rotate(45deg) scale(0.96);
}

.cf-tab-fab--open {
  background: var(--cf-pink-dark);
  transform: translateX(-50%) rotate(45deg);
}

.cf-tab-fab-icon {
  width: 1.45rem;
  height: 1.45rem;
  stroke-width: 2.5;
}

@media (prefers-reduced-motion: reduce) {
  .cf-tab-fab {
    transition: none;
  }

  .cf-tab-fab:active,
  .cf-tab-fab--open:active {
    transform: translateX(-50%);
  }

  .cf-tab-fab--open {
    transform: translateX(-50%) rotate(45deg);
  }
}
</style>
