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
      :class="{
        'is-active': isItemActive(item),
        'patient-nav__item--bella': item.key === 'bella',
        'is-open': item.key === 'bella' && isItemActive(item),
      }"
      :aria-label="item.label"
      :aria-current="isItemActive(item) ? 'page' : undefined"
      @click="onItemClick(item)"
    >
      <span v-if="item.key === 'bella'" class="patient-nav__bella-icon" aria-hidden="true">
        <component :is="item.icon" />
      </span>
      <component v-else :is="item.icon" />
    </button>
  </nav>
</template>

<script setup>
import NavBellaIcon from '~/components/icons/nav/NavBellaIcon.vue'
import NavCommunityIcon from '~/components/icons/nav/NavCommunityIcon.vue'
import NavDietIcon from '~/components/icons/nav/NavDietIcon.vue'
import NavEvolutionIcon from '~/components/icons/nav/NavEvolutionIcon.vue'
import NavHomeIcon from '~/components/icons/nav/NavHomeIcon.vue'
import NavLibraryIcon from '~/components/icons/nav/NavLibraryIcon.vue'
import { usePatientMealPlan } from '~/composables/usePatientMealPlan'
import { usePatientNavigationLoading } from '~/composables/usePatientNavigationLoading'
import { isPatientFullAccessActive } from '~/utils/patient-access'

const route = useRoute()
const router = useRouter()
const { startNavigation, finishNavigation } = usePatientNavigationLoading()
const { planChecked } = usePatientMealPlan()
const { verifiedUser } = useAuthSession()
const navigating = ref(false)
const evolucaoLastTab = useState('evolucao-last-tab', () => 'metas')

const hasFullAccess = computed(() => {
  const user = verifiedUser.value
  if (!user) return true
  return isPatientFullAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
})

const navItems = computed(() => {
  const left = [
    { key: 'inicio', label: 'Início', to: '/inicio', icon: NavHomeIcon },
    { key: 'evolucao', label: 'Evolução', to: '/evolucao', icon: NavEvolutionIcon },
  ]
  const bella = { key: 'bella', label: 'Bella IA', to: '/bella', icon: NavBellaIcon }
  const right = hasFullAccess.value
    ? [
        { key: 'conteudo', label: 'Biblioteca', to: '/conteudo', icon: NavLibraryIcon },
        { key: 'comunidade', label: 'Comunidade', to: '/comunidade', icon: NavCommunityIcon },
      ]
    : [{ key: 'dieta', label: 'Dieta', to: '/dieta', icon: NavDietIcon }]

  return [...left, bella, ...right]
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
  if (item.key === 'bella') return route.path.startsWith('/bella')
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
  const skipNavLoader = item.key === 'dieta' && planChecked.value
  if (!skipNavLoader) startNavigation()

  try {
    await navigateTo(target)
  } finally {
    navigating.value = false
    if (!skipNavLoader) finishNavigation()
  }
}

function onItemClick(item) {
  goRoute(item)
}
</script>
