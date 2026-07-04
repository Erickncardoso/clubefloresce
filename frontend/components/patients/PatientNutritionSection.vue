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
      <button
        v-if="showLinks"
        type="button"
        class="patient-nutrition-link"
        @click="$emit('navigate', navigateTarget)"
      >
        {{ navigateLabel }}
      </button>
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
defineProps({
  patientId: { type: String, required: true },
  compact: { type: Boolean, default: false },
  showLinks: { type: Boolean, default: false },
  photoLimit: { type: Number, default: 60 },
})

defineEmits(['navigate'])

const activeTab = defineModel('activeTab', { type: String, default: 'fotos' })

const navigateTarget = computed(() => {
  if (activeTab.value === 'fotos') return 'fotos'
  if (activeTab.value === 'metas') return 'metas'
  return 'nutricao'
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

.patient-nutrition-section--compact {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  gap: 0.75rem;
}

.patient-nutrition-section--compact .patient-nutrition-tabs {
  padding-bottom: 0.6rem;
  margin-bottom: 0;
}

.patient-nutrition-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid #e8ece9;
  flex-wrap: wrap;
}

.patient-nutrition-tab {
  padding: 0.45rem 0.85rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.patient-nutrition-tab--active {
  background: #f0fdf4;
  border-color: #d1e7d4;
  color: var(--primary, #8B967C);
}

.patient-nutrition-link {
  margin-left: auto;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--primary, #8B967C);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}

.patient-nutrition-panel {
  min-height: 0;
}

.patient-nutrition-section--compact .patient-nutrition-tab {
  font-size: 0.76rem;
  padding: 0.4rem 0.7rem;
}
</style>
