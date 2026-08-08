<template>
  <div
    class="pc-sidebar-nav"
    :class="{ 'pc-sidebar-nav--mobile': mobile }"
  >
    <div v-if="showProfileBlock" class="pc-sidebar-profile">
      <div class="pc-sidebar-avatar-wrap">
        <PatientAvatar
          :src="patientUser?.avatar"
          :name="patientUser?.name || 'Paciente'"
          :user="patientUser"
          size="xl"
          :ring="false"
        />
      </div>

      <h2 class="pc-sidebar-name">{{ patientUser?.name || 'Carregando…' }}</h2>

      <div v-if="whatsappUrl" class="pc-sidebar-actions">
        <a
          :href="whatsappUrl"
          class="pc-sidebar-message"
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon class="pc-sidebar-message-icon" aria-hidden="true" />
          Enviar mensagem
        </a>
      </div>
    </div>

    <NuxtLink
      v-if="mobile"
      to="/usuarios"
      class="pc-sidebar-link pc-sidebar-link--back"
      @click="emitNavigate"
    >
      <ArrowLeft class="pc-sidebar-link-icon" />
      <span class="pc-sidebar-link-label">Voltar aos pacientes</span>
    </NuxtLink>

    <nav class="pc-sidebar-menu" aria-label="Seções da ficha">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tabLink(tab.id)"
        class="pc-sidebar-link"
        :class="{ 'pc-sidebar-link--active': isTabActive(tab.id) }"
        @click="emitNavigate"
      >
        <component :is="chartTabIcon(tab.id)" class="pc-sidebar-link-icon" />
        <span class="pc-sidebar-link-label">{{ tab.label }}</span>
      </NuxtLink>

      <div
        v-if="activeTab === 'evolucao'"
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
    </nav>
  </div>
</template>

<script setup>
import { ArrowLeft } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { usePatientChartNav } from '~/composables/usePatientChartNav.js'
import { usePatientRoute } from '~/composables/usePatientRoute.js'
import WhatsAppIcon from '~/components/WhatsAppIcon.vue'

const props = defineProps({
  mobile: { type: Boolean, default: false },
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

const showProfileBlock = computed(() => !props.mobile)

const whatsappUrl = computed(() => {
  const digits = String(patientUser.value?.phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
})

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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  padding: 1rem 0.75rem 1.1rem;
  box-sizing: border-box;
}

.pc-sidebar-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.5rem 0.5rem 0.9rem;
  border-bottom: 1px solid var(--nav-border, #e8ece9);
  margin-bottom: 0.35rem;
}

.pc-sidebar-avatar-wrap {
  margin-bottom: 0.55rem;
}

.pc-sidebar-avatar-wrap :deep(.patient-avatar--xl) {
  width: 5.5rem;
  height: 5.5rem;
}

.pc-sidebar-name {
  margin: 0;
  max-width: 100%;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--nav-text, #141414);
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.pc-sidebar-actions {
  width: 100%;
  margin-top: 0.85rem;
}

.pc-sidebar-message {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--nav-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: var(--nav-text, #141414);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease;
  box-sizing: border-box;
  overflow: hidden;
}

.pc-sidebar-message:hover {
  background: var(--nav-surface-hover, #f4f7f6);
  border-color: #d8deda;
}

.pc-sidebar-message-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.pc-sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-height: 0;
  flex: 0 0 auto;
  overflow: visible;
}

.pc-sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
  padding: 0.58rem 0.85rem;
  border-radius: var(--cf-radius-control);
  text-decoration: none;
  color: var(--nav-text-muted, #66706e);
  font-weight: 500;
  font-size: 0.8125rem;
  line-height: 1.35;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s ease, background 0.15s ease;
  box-sizing: border-box;
  overflow: hidden;
}

.pc-sidebar-link:hover {
  color: var(--primary, #8b967c);
  background: var(--nav-surface-hover, #f4f7f6);
}

.pc-sidebar-link--active {
  color: #fff;
  font-weight: 600;
  background: var(--primary, #8b967c);
}

.pc-sidebar-link--active:hover {
  color: #fff;
  background: #7a856e;
}

.pc-sidebar-link--back {
  margin-bottom: 0.15rem;
  color: #5f675f;
}

.pc-sidebar-link-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.88;
}

.pc-sidebar-link--active .pc-sidebar-link-icon {
  color: #fff;
  opacity: 1;
}

.pc-sidebar-link-label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-sidebar-evolucao {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  margin: 0.05rem 0 0.25rem 0.35rem;
  padding: 0.15rem 0 0.15rem 0.75rem;
  border-left: 1px solid rgba(139, 150, 124, 0.22);
}

.pc-sidebar-link--child {
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
}

.pc-sidebar-link--child.pc-sidebar-link--active {
  background: rgba(139, 150, 124, 0.18);
  color: var(--primary, #8b967c);
}

/* Mobile drawer */
.pc-sidebar-nav--mobile {
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 1rem;
}

.pc-sidebar-nav--mobile .pc-sidebar-link {
  padding: 0.72rem 0.85rem;
  font-size: 0.9rem;
}

.pc-sidebar-nav--mobile .pc-sidebar-evolucao {
  margin-left: 0.85rem;
}

@supports (corner-shape: squircle) {
  .pc-sidebar-message,
  .pc-sidebar-link {
    corner-shape: squircle;
  }
}
</style>
