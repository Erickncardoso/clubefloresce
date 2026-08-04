<template>
  <NuxtLayout name="dashboard">
    <div class="mplan-route">
      <PatientChartPageSkeleton v-if="loading || resolvingRoute" />

      <div v-else-if="routeError || error" class="mplan-route-state">
        <p>{{ routeError || error }}</p>
        <NuxtLink :to="backToListUrl" class="btn-secondary">Voltar para planos</NuxtLink>
      </div>

      <template v-else-if="user && prescription">
        <nav class="mplan-crumbs" aria-label="Você está em">
          <NuxtLink :to="backToListUrl" class="mplan-crumbs__back">
            <ArrowLeft aria-hidden="true" />
            Planos alimentares
          </NuxtLink>
          <span class="mplan-crumbs__sep" aria-hidden="true">/</span>
          <span class="mplan-crumbs__current">{{ prescription.title || 'Nova prescrição' }}</span>
        </nav>

        <PatientsPatientMealPlanEditor
          ref="editorRef"
          :key="editorKey"
          :user="user"
          :profile="profile"
          :prescription="prescription"
          :saving="saving"
          :publishing="publishing"
          :save-message="saveMessage"
          :save-error="saveError"
          @save="onSave"
          @publish="onPublish"
          @new-plan="goToNewPlan"
        />
      </template>

      <div v-else class="mplan-route-state">
        <p>Plano alimentar não encontrado.</p>
        <NuxtLink :to="backToListUrl" class="btn-secondary">Voltar para planos</NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ArrowLeft } from 'lucide-vue-next'
import PatientChartPageSkeleton from '~/components/patients/PatientChartPageSkeleton.vue'
import { usePatientChart } from '~/composables/usePatientChart.js'
import { usePatientRoute } from '~/composables/usePatientRoute.js'
import { useMealPlanPersistence } from '~/composables/useMealPlanPersistence.js'
import { createEmptyPrescription } from '~/utils/meal-plan-prescription.js'

definePageMeta({
  layout: false,
  middleware: 'nutri-only',
})

const route = useRoute()
const editorRef = ref(null)

const {
  patientId,
  resolvingRoute,
  routeError,
  syncCanonicalPatientUrl,
  buildPatientPath,
} = usePatientRoute()

const {
  loading,
  error,
  user,
  profile,
  loadAll,
} = usePatientChart(patientId)

const planoId = computed(() => String(route.params.planoId || '').trim())
const isNewPlan = computed(() => planoId.value === 'novo')

const backToListUrl = computed(() =>
  buildPatientPath(user.value || { id: patientId.value }, { query: { tab: 'planos' } }),
)

const plans = computed(() => {
  const fromUser = user.value?.patientProfileData?.mealPlans
  const fromProfile = profile.value?.mealPlans
  return Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
})

// Prescrição nova só existe em memória até o primeiro save; o nome e o método
// vêm da query porque são escolhidos na lista, antes de entrar no editor.
const draftPrescription = ref(null)

const prescription = computed(() => {
  if (isNewPlan.value) return draftPrescription.value
  return plans.value.find((item) => item.id === planoId.value) || null
})

// Só remonta o editor quando muda de plano de verdade — salvar um rascunho
// novo troca a rota de "novo" para o id e não pode zerar o formulário.
const editorKey = computed(() => (isNewPlan.value ? 'novo' : planoId.value))

watch(
  [isNewPlan, () => route.query.title, () => route.query.methodology],
  ([isNew, title, methodology]) => {
    if (!isNew) {
      draftPrescription.value = null
      return
    }
    if (draftPrescription.value) return
    draftPrescription.value = createEmptyPrescription({
      title: String(title || '').trim() || 'Nova prescrição',
      methodology: String(methodology || 'foods'),
    })
  },
  { immediate: true },
)

const {
  saving,
  publishing,
  saveMessage,
  saveError,
  saveDraft,
  publish,
} = useMealPlanPersistence(user, {
  onUserUpdated: (updated) => {
    if (updated) user.value = updated
  },
})

function currentPlanId() {
  return isNewPlan.value ? '' : planoId.value
}

// Depois de salvar um plano novo, a URL passa a apontar para o registro real
// para que F5 ou compartilhar o link continue funcionando.
async function adoptSavedPlan(item) {
  if (!item?.id || !isNewPlan.value) return
  draftPrescription.value = null
  await navigateTo(
    buildPatientPath(user.value || { id: patientId.value }, { suffix: `/planos/${item.id}` }),
    { replace: true },
  )
}

async function onSave(formPayload) {
  const item = await saveDraft(formPayload, currentPlanId())
  if (item) await adoptSavedPlan(item)
}

async function onPublish(formPayload) {
  const item = await publish(formPayload, currentPlanId())
  if (item) await adoptSavedPlan(item)
}

function goToNewPlan() {
  void navigateTo(
    buildPatientPath(user.value || { id: patientId.value }, { query: { tab: 'planos', novo: '1' } }),
  )
}

onBeforeRouteLeave(() => {
  const editor = editorRef.value
  if (!editor?.confirmLeave) return true
  return editor.confirmLeave()
})

watch(
  [patientId, resolvingRoute],
  ([id, resolving]) => {
    if (!id || resolving) return
    loadAll()
  },
  { immediate: true },
)

watch(user, (nextUser) => {
  if (nextUser?.id) void syncCanonicalPatientUrl(nextUser)
})

useHead({
  title: computed(() => {
    const patientName = user.value?.name || 'Paciente'
    const title = prescription.value?.title
    return title ? `${title} · ${patientName}` : `Plano alimentar · ${patientName}`
  }),
})
</script>

<style scoped>
.mplan-route {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1 1 auto;
  min-height: 0;
  padding: clamp(0.85rem, 2vw, 1.5rem);
}

.mplan-crumbs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  font-size: 0.8125rem;
}

.mplan-crumbs__back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: #6b7368;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.mplan-crumbs__back svg {
  width: 0.9rem;
  height: 0.9rem;
}

.mplan-crumbs__back:hover {
  color: var(--primary, #8b967c);
}

.mplan-crumbs__sep {
  color: #c3cac2;
}

.mplan-crumbs__current {
  min-width: 0;
  color: #2c322c;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mplan-route-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 3rem 1rem;
  text-align: center;
  color: #6b7368;
}
</style>
