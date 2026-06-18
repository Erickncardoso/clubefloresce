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
        <span>{{ item.label }}</span>
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
        <span>{{ item.label }}</span>
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
import { BookOpen, Home, LineChart, Plus, Users } from 'lucide-vue-next'

const route = useRoute()
const bellaMenuOpen = ref(false)

const sideTabs = [
  { label: 'Início', path: '/inicio', icon: Home },
  { label: 'Evolução', path: '/evolucao', icon: LineChart },
]

const rightTabs = [
  { label: 'Biblioteca', path: '/conteudo', icon: BookOpen },
  { label: 'Comunidade', path: '/comunidade', icon: Users },
]

function isActive(path) {
  if (path === '/conteudo') {
    return route.path.startsWith('/conteudo') || route.path.startsWith('/cursos') || route.path.startsWith('/ebooks')
  }
  if (path === '/evolucao') {
    return route.path.startsWith('/evolucao') || route.path.startsWith('/dieta')
  }
  if (path === '/comunidade') return route.path.startsWith('/comunidade')
  return route.path === path || route.path.startsWith(`${path}/`)
}

watch(() => route.fullPath, () => {
  bellaMenuOpen.value = false
})
</script>

<style scoped>
.cf-tab-bar {
  display: grid;
  grid-template-columns: 1fr 1fr var(--cf-fab-size) 1fr 1fr;
  align-items: end;
  width: 100%;
  max-width: 430px;
  margin-inline: auto;
  padding: 0.15rem 0.625rem 0.2rem;
  box-sizing: border-box;
  min-height: calc(var(--cf-tab-nav-h) + var(--cf-tab-nav-pad-y));
}

.cf-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 2.75rem;
  padding: 0.2rem 0.15rem 0.1rem;
  color: var(--cf-text-muted);
  text-decoration: none;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: var(--cf-font);
  letter-spacing: -0.01em;
  transition: color 0.15s ease;
}

.cf-tab::before {
  content: '';
  position: absolute;
  top: 0.05rem;
  left: 50%;
  width: 2.75rem;
  height: 2rem;
  border-radius: 0.75rem;
  background: transparent;
  transform: translateX(-50%);
  transition: background 0.15s ease;
  z-index: -1;
}

.cf-tab:focus-visible {
  outline: 2px solid var(--cf-pink);
  outline-offset: 2px;
  border-radius: 8px;
}

.cf-tab-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 1.75;
  transition: transform 0.15s ease, color 0.15s ease;
}

.cf-tab.active {
  color: var(--cf-pink-dark);
  font-weight: 600;
}

.cf-tab.active::before {
  background: var(--cf-pink-soft);
}

.cf-tab.active .cf-tab-icon {
  color: var(--cf-pink);
  transform: translateY(-1px);
}

.cf-tab-fab-spacer {
  width: var(--cf-fab-size);
}

.cf-tab-fab {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--cf-fab-size);
  height: var(--cf-fab-size);
  border: 3px solid #fff;
  border-radius: 50%;
  background: linear-gradient(145deg, #c98a8f 0%, var(--cf-pink) 48%, var(--cf-pink-dark) 100%);
  color: #fff;
  box-shadow:
    0 4px 14px rgba(193, 123, 128, 0.38),
    0 1px 3px rgba(20, 20, 20, 0.08);
  cursor: pointer;
  transform: translateX(-50%);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cf-tab-fab:focus-visible {
  outline: 2px solid var(--cf-pink-dark);
  outline-offset: 3px;
}

.cf-tab-fab:active {
  transform: translateX(-50%) scale(0.96);
  background: var(--cf-pink-dark);
}

.cf-tab-fab--open {
  background: linear-gradient(145deg, var(--cf-pink-dark) 0%, #8f4f54 100%);
  transform: translateX(-50%) rotate(45deg);
  box-shadow:
    0 4px 16px rgba(160, 98, 103, 0.42),
    0 1px 3px rgba(20, 20, 20, 0.1);
}

.cf-tab-fab--open:active {
  transform: translateX(-50%) rotate(45deg) scale(0.96);
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
}
</style>
