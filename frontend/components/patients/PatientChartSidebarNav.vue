<template>
  <div
    class="pc-sidebar-nav"
    :class="{
      'pc-sidebar-nav--mobile': mobile,
      'pc-sidebar-nav--collapsed': collapsed && !mobile,
    }"
  >
    <NuxtLink
      to="/usuarios"
      class="pc-sidebar-link pc-sidebar-link--back"
      :title="collapsed && !mobile ? 'Voltar aos pacientes' : undefined"
      @click="emitNavigate"
    >
      <ArrowLeft class="pc-sidebar-link-icon" />
      <span class="pc-sidebar-link-label">Voltar aos pacientes</span>
    </NuxtLink>

    <div v-if="showPatientHeader" class="pc-sidebar-patient">
      <PatientAvatar
        :src="patientUser?.avatar"
        :name="patientUser?.name || 'Paciente'"
        size="sm"
        :ring="false"
      />
      <div class="pc-sidebar-patient-copy">
        <strong>{{ patientUser?.name || 'Carregando…' }}</strong>
        <small>Ficha do paciente</small>
      </div>
    </div>

    <div class="pc-sidebar-sections">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tabLink(tab.id)"
        class="pc-sidebar-link"
        :class="{ 'pc-sidebar-link--active': isTabActive(tab.id) }"
        :title="collapsed && !mobile ? tab.label : undefined"
        @click="emitNavigate"
      >
        <component :is="chartTabIcon(tab.id)" class="pc-sidebar-link-icon" />
        <span class="pc-sidebar-link-label">{{ tab.label }}</span>
      </NuxtLink>

      <div
        v-if="activeTab === 'evolucao' && (!collapsed || mobile)"
        class="pc-sidebar-evolucao"
      >
        <NuxtLink
          v-for="sub in evolucaoSubs"
          :key="sub.id"
          :to="evolucaoSubLink(sub.id)"
          class="pc-sidebar-link pc-sidebar-link--child"
          :class="{ 'pc-sidebar-link--active': activeEvolucaoSub === sub.id }"
          @click="emitNavigate"
        >
          <span class="pc-sidebar-link-label">{{ sub.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeft } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { usePatientChartNav } from '~/composables/usePatientChartNav.js'
import { usePatientRoute } from '~/composables/usePatientRoute.js'

const props = defineProps({
  mobile: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})

const emit = defineEmits(['navigate'])

const apiBase = useApiBase()
const { patientId } = usePatientRoute()
const {
  tabs,
  evolucaoSubs,
  activeTab,
  activeEvolucaoSub,
  tabLink,
  evolucaoSubLink,
  isTabActive,
  chartTabIcon,
} = usePatientChartNav()

const patientUser = ref(null)

const showPatientHeader = computed(() => !props.collapsed || props.mobile)

watch(
  patientId,
  async (id) => {
    if (!id) {
      patientUser.value = null
      return
    }
    try {
      patientUser.value = await $fetch(
        `${apiBase.value}/users/${encodeURIComponent(id)}`,
        authFetchInit(),
      )
    } catch {
      patientUser.value = null
    }
  },
  { immediate: true },
)

function emitNavigate() {
  emit('navigate')
}
</script>

<style scoped>
.pc-sidebar-nav {
  --pc-sidebar-text: #66706e;
  --pc-sidebar-text-active: #141414;
  --pc-sidebar-hover-bg: #f4f7f6;
  --pc-sidebar-active-bg: #eef8f0;
  --pc-sidebar-border: #e8ece9;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
  height: 100%;
}

.pc-sidebar-link {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
  padding: 0.52rem 0.72rem;
  border-radius: var(--cf-radius-control, 10px);
  text-decoration: none;
  color: var(--pc-sidebar-text);
  font-weight: 500;
  font-size: 0.8125rem;
  line-height: 1.35;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s ease, background 0.15s ease;
  box-sizing: border-box;
}

.pc-sidebar-link:hover {
  color: var(--primary, #8b967c);
  background: var(--pc-sidebar-hover-bg);
}

.pc-sidebar-link--active {
  color: var(--pc-sidebar-text-active);
  font-weight: 600;
  background: var(--pc-sidebar-active-bg);
}

.pc-sidebar-link--back {
  margin-bottom: 0.1rem;
  color: #5f675f;
}

.pc-sidebar-link-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 0.08rem;
  opacity: 0.88;
}

.pc-sidebar-link-label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.pc-sidebar-patient {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.72rem;
  margin: 0.05rem 0 0.4rem;
  border-radius: var(--cf-radius-control, 10px);
  background: rgba(139, 150, 124, 0.08);
  border: 1px solid rgba(139, 150, 124, 0.12);
}

.pc-sidebar-patient-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.pc-sidebar-patient-copy strong {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2c322c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-sidebar-patient-copy small {
  font-size: 0.68rem;
  color: #7a847c;
}

.pc-sidebar-sections {
  display: flex;
  flex-direction: column;
  gap: 0.14rem;
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 0.1rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 150, 124, 0.35) transparent;
}

.pc-sidebar-evolucao {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0.05rem 0 0.25rem 0.35rem;
  padding: 0.15rem 0 0.15rem 0.75rem;
  border-left: 1px solid rgba(139, 150, 124, 0.2);
}

.pc-sidebar-link--child {
  padding: 0.42rem 0.65rem;
  font-size: 0.78rem;
}

.pc-sidebar-nav--collapsed .pc-sidebar-link-label,
.pc-sidebar-nav--collapsed .pc-sidebar-patient {
  display: none;
}

.pc-sidebar-nav--collapsed .pc-sidebar-link {
  justify-content: center;
  padding-left: 0.55rem;
  padding-right: 0.55rem;
}

.pc-sidebar-nav--collapsed .pc-sidebar-evolucao {
  display: none;
}

/* Mobile drawer */
.pc-sidebar-nav--mobile {
  gap: 0.5rem;
}

.pc-sidebar-nav--mobile .pc-sidebar-link {
  align-items: center;
  padding: 0.72rem 0.85rem;
  font-size: 0.9rem;
  border-radius: var(--cf-radius-control, 10px);
}

.pc-sidebar-nav--mobile .pc-sidebar-link-icon {
  margin-top: 0;
}

.pc-sidebar-nav--mobile .pc-sidebar-link-label {
  -webkit-line-clamp: 1;
}

.pc-sidebar-nav--mobile .pc-sidebar-patient {
  margin: 0.25rem 0 0.35rem;
}

.pc-sidebar-nav--mobile .pc-sidebar-evolucao {
  margin-left: 0.85rem;
}
</style>
