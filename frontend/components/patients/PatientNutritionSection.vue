<template>
  <div class="patient-nutrition-section" :class="{ 'patient-nutrition-section--compact': compact }">
    <div class="patient-nutrition-tabs" role="tablist" aria-label="Nutrição do paciente">
      <button
        type="button"
        role="tab"
        class="patient-nutrition-tab"
        :class="{ 'patient-nutrition-tab--active': activeTab === 'fotos' }"
        :aria-selected="activeTab === 'fotos'"
        @click="activeTab = 'fotos'"
      >
        Fotos
      </button>
      <button
        type="button"
        role="tab"
        class="patient-nutrition-tab"
        :class="{ 'patient-nutrition-tab--active': activeTab === 'metas' }"
        :aria-selected="activeTab === 'metas'"
        @click="activeTab = 'metas'"
      >
        Metas
      </button>
      <button
        type="button"
        role="tab"
        class="patient-nutrition-tab"
        :class="{ 'patient-nutrition-tab--active': activeTab === 'desempenho' }"
        :aria-selected="activeTab === 'desempenho'"
        @click="activeTab = 'desempenho'"
      >
        Desempenho
      </button>
      <NuxtLink
        v-if="showLinks && profileLink"
        :to="profileLink"
        class="patient-nutrition-link"
      >
        {{ navigateLabel }}
      </NuxtLink>
    </div>

    <section
      v-show="activeTab === 'fotos'"
      class="patient-nutrition-panel"
      role="tabpanel"
      aria-label="Fotos de refeições"
    >
      <PatientsPatientPhotosPanel
        :patient-id="patientId"
        :compact="compact"
        :limit="photoLimit"
      />
    </section>

    <section
      v-show="activeTab === 'metas'"
      class="patient-nutrition-panel"
      role="tabpanel"
      aria-label="Metas do paciente"
    >
      <PatientsPatientGoalsPanel
        :patient-id="patientId"
        :compact="compact"
        :limit="compact ? 4 : 0"
      />
    </section>

    <section
      v-show="activeTab === 'desempenho'"
      class="patient-nutrition-panel"
      role="tabpanel"
      aria-label="Desempenho nutricional"
    >
      <EvolucaoNutritionMonthView :patient-id="patientId" :compact="compact" />
    </section>
  </div>
</template>

<script setup>
import { buildPatientEvolucaoLink } from '~/utils/patient-slug.js'

const props = defineProps({
  patientId: { type: String, required: true },
  patient: { type: Object, default: null },
  compact: { type: Boolean, default: false },
  showLinks: { type: Boolean, default: false },
  photoLimit: { type: Number, default: 60 },
})

const activeTab = defineModel('activeTab', { type: String, default: 'fotos' })

const evolucaoSubMap = {
  fotos: 'fotos',
  metas: 'metas',
  desempenho: 'nutricao',
}

const profileLink = computed(() => {
  if (!props.patient?.id && !props.patientId) return null
  const sub = evolucaoSubMap[activeTab.value] || 'checkins'
  return buildPatientEvolucaoLink(
    props.patient || { id: props.patientId },
    sub,
  )
})

const navigateLabel = computed(() => {
  if (activeTab.value === 'fotos') return 'Ver todas as fotos'
  if (activeTab.value === 'metas') return 'Ver todas as metas'
  return 'Ver detalhes'
})
</script>

<style scoped>
.patient-nutrition-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.patient-nutrition-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.patient-nutrition-tab {
  border: 1.5px solid #e8ece9;
  background: #fff;
  padding: 0.4rem 0.7rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7368;
  cursor: pointer;
}

.patient-nutrition-tab--active {
  border-color: #8b967c;
  background: rgba(139, 150, 124, 0.14);
  color: #2c322c;
}

.patient-nutrition-link {
  margin-left: auto;
  border: none;
  background: transparent;
  padding: 0.35rem 0.2rem;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: #8b967c;
  text-decoration: none;
  cursor: pointer;
}

.patient-nutrition-link:hover {
  color: #6f7a62;
}

.patient-nutrition-panel {
  min-width: 0;
}

.patient-nutrition-section--compact .patient-nutrition-tab {
  font-size: 0.76rem;
  padding: 0.35rem 0.55rem;
}
</style>
