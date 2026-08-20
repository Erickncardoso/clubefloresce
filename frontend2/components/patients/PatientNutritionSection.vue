<template>
  <div class="pns" :class="{ 'pns--compact': compact }">
    <div class="pns-toolbar">
      <div class="pns-segment" role="tablist" aria-label="Nutrição do paciente">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="pns-tab"
          :class="{ 'pns-tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" class="pns-tab-icon" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </div>

      <NuxtLink
        v-if="showLinks && profileLink"
        :to="profileLink"
        class="pns-link"
      >
        {{ navigateLabel }}
        <ArrowRight class="pns-link-icon" aria-hidden="true" />
      </NuxtLink>
    </div>

    <section
      v-show="activeTab === 'fotos'"
      class="pns-panel"
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
      class="pns-panel"
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
      class="pns-panel"
      role="tabpanel"
      aria-label="Desempenho nutricional"
    >
      <EvolucaoNutritionMonthView :patient-id="patientId" :compact="compact" />
    </section>
  </div>
</template>

<script setup>
import { ArrowRight, LineChart, Target } from 'lucide-vue-next'
import Camera from '~/components/icons/CameraIcon.vue'
import { buildPatientEvolucaoLink } from '~/utils/patient-slug.js'

const props = defineProps({
  patientId: { type: String, required: true },
  patient: { type: Object, default: null },
  compact: { type: Boolean, default: false },
  showLinks: { type: Boolean, default: false },
  photoLimit: { type: Number, default: 60 },
})

const activeTab = defineModel('activeTab', { type: String, default: 'fotos' })

const tabs = [
  { id: 'fotos', label: 'Fotos', icon: Camera },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'desempenho', label: 'Desempenho', icon: LineChart },
]

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
.pns {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.pns-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pns-segment {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem;
  background: #f4f6f5;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  overflow: hidden;
}

.pns-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: calc(var(--cf-radius-control) - 3px);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6b7368;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.pns-tab-icon {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  opacity: 0.85;
}

.pns-tab:hover {
  color: #374151;
}

.pns-tab--active {
  background: #fff;
  color: #1f2937;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.pns-tab--active .pns-tab-icon {
  color: var(--primary, #8b967c);
  opacity: 1;
}

.pns-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.15rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary, #8b967c);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.pns-link:hover {
  color: #6f7a62;
}

.pns-link-icon {
  width: 0.85rem;
  height: 0.85rem;
}

.pns-panel {
  min-width: 0;
}

.pns--compact .pns-tab {
  font-size: 0.76rem;
  padding: 0.38rem 0.6rem;
}

@supports (corner-shape: squircle) {
  .pns-segment,
  .pns-tab {
    corner-shape: squircle;
  }
}

@media (max-width: 640px) {
  .pns-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .pns-segment {
    width: 100%;
    justify-content: stretch;
  }

  .pns-tab {
    flex: 1 1 0;
    justify-content: center;
    padding-inline: 0.45rem;
  }

  .pns-link {
    align-self: flex-end;
  }
}
</style>
