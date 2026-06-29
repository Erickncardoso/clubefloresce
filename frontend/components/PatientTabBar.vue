<template>
  <div class="cf-tab-bar-wrap">
    <nav class="cf-tab-bar" aria-label="Navegação principal">
      <button
        v-for="item in leftTabs"
        :key="item.key"
        type="button"
        class="cf-tab"
        :class="{ active: isTabActive(item) }"
        :aria-label="item.label"
        :aria-current="isTabActive(item) ? 'page' : undefined"
        @click="goTab(item)"
      >
        <span class="cf-tab-pill">
          <component :is="item.icon" class="cf-tab-icon" aria-hidden="true" />
          <span class="cf-tab-label" :class="{ 'cf-tab-label--open': isTabActive(item) }">
            <span class="cf-tab-label-text">{{ item.label }}</span>
          </span>
        </span>
      </button>

      <button
        type="button"
        class="cf-tab cf-tab--fab"
        :class="{ 'cf-tab--fab-open': bellaMenuOpen }"
        :aria-label="bellaMenuOpen ? 'Fechar menu da Bella' : 'Abrir menu da Bella'"
        :aria-expanded="bellaMenuOpen"
        @click="toggleBellaMenu"
      >
        <span class="cf-tab-pill cf-tab-pill--fab">
          <CirclePlus class="cf-tab-icon cf-tab-icon--fab" aria-hidden="true" />
        </span>
      </button>

      <button
        v-for="item in rightTabs"
        :key="item.key"
        type="button"
        class="cf-tab"
        :class="{ active: isTabActive(item) }"
        :aria-label="item.label"
        :aria-current="isTabActive(item) ? 'page' : undefined"
        @click="goTab(item)"
      >
        <span class="cf-tab-pill">
          <component :is="item.icon" class="cf-tab-icon" aria-hidden="true" />
          <span class="cf-tab-label" :class="{ 'cf-tab-label--open': isTabActive(item) }">
            <span class="cf-tab-label-text">{{ item.label }}</span>
          </span>
        </span>
      </button>
    </nav>

    <BellaActionSheet v-model="bellaMenuOpen" />
  </div>
</template>

<script setup>
import { BookOpen, CirclePlus, Home, LineChart, Users } from 'lucide-vue-next'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'

const route = useRoute()
const router = useRouter()
const { startNavigation, finishNavigation } = usePatientNavigationLoading()
const bellaMenuOpen = ref(false)
const navigating = ref(false)
const evolucaoLastTab = useState('evolucao-last-tab', () => 'metas')

const leftTabs = [
  { key: 'inicio', label: 'Início', to: '/inicio', icon: Home },
  { key: 'evolucao', label: 'Evolução', to: '/evolucao', icon: LineChart },
]

const rightTabs = [
  { key: 'conteudo', label: 'Biblioteca', to: '/conteudo', icon: BookOpen },
  { key: 'comunidade', label: 'Comunidade', to: '/comunidade', icon: Users },
]

function normalizeEvoTab(tab) {
  if (tab === 'peso' || tab === 'metas') return tab
  return 'metas'
}

watch(
  () => [route.path, route.query.tab],
  () => {
    if (route.path.startsWith('/evolucao')) {
      evolucaoLastTab.value = normalizeEvoTab(String(route.query.tab || 'metas'))
    }
  },
  { immediate: true },
)

function evolucaoTarget() {
  const tab = evolucaoLastTab.value
  return tab === 'metas' ? '/evolucao' : `/evolucao?tab=${tab}`
}

function tabTarget(item) {
  if (item.key === 'evolucao') return evolucaoTarget()
  return item.to
}

function isTabActive(item) {
  if (item.key === 'conteudo') {
    return route.path.startsWith('/conteudo') || route.path.startsWith('/cursos') || route.path.startsWith('/ebooks')
  }
  if (item.key === 'evolucao') {
    return route.path.startsWith('/evolucao')
  }
  if (item.key === 'comunidade') return route.path.startsWith('/comunidade')
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

function sameRoute(target) {
  const resolved = router.resolve(target)
  if (resolved.path !== route.path) return false

  if (resolved.path.startsWith('/evolucao')) {
    const targetTab = normalizeEvoTab(String(resolved.query.tab || 'metas'))
    const currentTab = normalizeEvoTab(String(route.query.tab || 'metas'))
    return targetTab === currentTab
  }

  return JSON.stringify(resolved.query || {}) === JSON.stringify(route.query || {})
}

async function goTab(item) {
  if (navigating.value) return

  const target = tabTarget(item)
  if (sameRoute(target)) return

  bellaMenuOpen.value = false
  navigating.value = true
  startNavigation()

  try {
    await navigateTo(target)
  } finally {
    navigating.value = false
    finishNavigation()
  }
}

function toggleBellaMenu() {
  bellaMenuOpen.value = !bellaMenuOpen.value
}

watch(() => route.fullPath, () => {
  bellaMenuOpen.value = false
})
</script>

<style scoped>
.cf-tab-bar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.1875rem;
  width: fit-content;
  max-width: min(24.5rem, calc(100vw - 2rem));
  margin-inline: auto;
  margin-bottom: calc(var(--cf-tab-float-margin-bottom) + env(safe-area-inset-bottom, 0px));
  padding: 0.5rem 0.625rem;
  border-radius: 999px;
  background: #ffffff;
  box-shadow:
    0 12px 36px rgba(20, 20, 20, 0.14),
    0 2px 8px rgba(20, 20, 20, 0.08),
    0 0 0 1px rgba(20, 20, 20, 0.04);
  box-sizing: border-box;
  touch-action: manipulation;
}

.cf-tab {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #a3a3a3;
  font-family: var(--cf-font);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf-tab.active {
  width: auto;
  min-width: 2.75rem;
}

.cf-tab:active:not(.active) {
  opacity: 0.72;
}

.cf-tab:focus-visible {
  outline: none;
}

.cf-tab:focus-visible .cf-tab-pill {
  outline: 2px solid var(--cf-pink);
  outline-offset: 1px;
}

.cf-tab-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  max-width: 100%;
  min-height: 2.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
  border: 1.5px solid transparent;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    padding 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    gap 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.cf-tab.active .cf-tab-pill {
  gap: 0.4rem;
  padding-inline: 0.8rem;
  background: var(--cf-pink-soft);
  color: var(--cf-pink-dark);
  border-color: transparent;
  box-shadow: none;
}

.cf-tab.active .cf-tab-icon {
  color: var(--cf-pink);
}

.cf-tab-icon {
  width: 1.4375rem;
  height: 1.4375rem;
  flex-shrink: 0;
  stroke-width: 1.85;
  transition: color 0.2s ease;
}

.cf-tab-label {
  display: grid;
  grid-template-columns: 0fr;
  min-width: 0;
  opacity: 0;
  transition:
    grid-template-columns 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}

.cf-tab-label--open {
  grid-template-columns: 1fr;
  opacity: 1;
}

.cf-tab-label-text {
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.3;
  white-space: nowrap;
}

.cf-tab--fab {
  flex: 0 0 2.75rem;
  width: 2.75rem;
  transition: none;
}

.cf-tab-pill--fab {
  padding: 0.375rem;
  min-height: 2.5rem;
}

.cf-tab-icon--fab {
  width: 1.5rem;
  height: 1.5rem;
  color: #a3a3a3;
  stroke-width: 1.75;
  transition: transform 0.2s ease, color 0.2s ease;
}

.cf-tab--fab-open .cf-tab-pill--fab {
  background: var(--cf-pink-soft);
  border-color: transparent;
  box-shadow: none;
}

.cf-tab--fab-open .cf-tab-icon--fab {
  color: var(--cf-pink);
  transform: rotate(45deg);
}

@media (max-width: 360px) {
  .cf-tab.active .cf-tab-pill {
    padding-inline: 0.625rem;
  }

  .cf-tab-label-text {
    font-size: 0.6875rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cf-tab,
  .cf-tab-pill,
  .cf-tab-icon,
  .cf-tab-icon--fab,
  .cf-tab-label {
    transition: none;
  }
}
</style>
