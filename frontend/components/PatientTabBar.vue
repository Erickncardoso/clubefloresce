<template>
  <nav
    class="patient-nav"
    role="navigation"
    aria-label="Navegação principal"
    :style="{ '--patient-nav-columns': navItems.length }"
  >
    <button
      v-for="item in navItems"
      :key="item.key"
      type="button"
      class="patient-nav__item"
      :class="{ 'is-active': isItemActive(item) }"
      :aria-label="item.label"
      :aria-current="isItemActive(item) ? 'page' : undefined"
      @click="onItemClick(item)"
    >
      <component
        :is="item.icon"
        class="patient-nav__icon"
        :size="23"
        :stroke-width="1.8"
        aria-hidden="true"
      />
      <span class="patient-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { BookOpen, Home, LineChart, UtensilsCrossed, Users } from 'lucide-vue-next'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'
import { isPatientFullAccessActive } from '~/utils/patient-access'

const route = useRoute()
const router = useRouter()
const { startNavigation, finishNavigation } = usePatientNavigationLoading()
const { verifiedUser } = useAuthSession()
const navigating = ref(false)
const evolucaoLastTab = useState('evolucao-last-tab', () => 'metas')

const hasFullAccess = computed(() => {
  const user = verifiedUser.value
  if (!user) return true
  return isPatientFullAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
})

const navItems = computed(() => {
  const items = [
    { key: 'inicio', label: 'Início', to: '/inicio', icon: Home },
    { key: 'evolucao', label: 'Evolução', to: '/evolucao', icon: LineChart },
  ]

  if (hasFullAccess.value) {
    items.push(
      { key: 'conteudo', label: 'Biblioteca', to: '/conteudo', icon: BookOpen },
      { key: 'comunidade', label: 'Comunidade', to: '/comunidade', icon: Users },
    )
  } else {
    items.push({ key: 'dieta', label: 'Dieta', to: '/dieta', icon: UtensilsCrossed })
  }

  return items
})

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

function routeTarget(item) {
  if (item.key === 'evolucao') return evolucaoTarget()
  return item.to
}

function isItemActive(item) {
  if (item.key === 'conteudo') {
    return route.path.startsWith('/conteudo') || route.path.startsWith('/cursos') || route.path.startsWith('/ebooks')
  }
  if (item.key === 'evolucao') return route.path.startsWith('/evolucao')
  if (item.key === 'comunidade') return route.path.startsWith('/comunidade')
  if (item.key === 'dieta') return route.path.startsWith('/dieta')
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

async function goRoute(item) {
  if (navigating.value) return

  const target = routeTarget(item)
  if (sameRoute(target)) return

  navigating.value = true
  startNavigation()

  try {
    await navigateTo(target)
  } finally {
    navigating.value = false
    finishNavigation()
  }
}

function onItemClick(item) {
  goRoute(item)
}
</script>
