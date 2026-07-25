<template>
  <NuxtLayout name="dashboard">
    <div class="pdoc-route">
      <PatientChartPageSkeleton v-if="loading || resolvingRoute" />

      <div v-else-if="routeError || error" class="pdoc-route-state pdoc-route-state--error">
        <p>{{ routeError || error }}</p>
        <NuxtLink :to="backToListUrl" class="btn-secondary">Voltar para documentos</NuxtLink>
      </div>

      <PatientsPatientDocumentoEditor
        v-else-if="user && editorSeed"
        :user="user"
        :profile="profile"
        :documentos="documentosList"
        :seed="editorSeed"
        :documento-route-id="documentoId"
        @save="goBackToList"
        @saved="onSaved"
      />

      <div v-else class="pdoc-route-state pdoc-route-state--error">
        <p>Documento não encontrado.</p>
        <NuxtLink :to="backToListUrl" class="btn-secondary">Voltar para documentos</NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import PatientChartPageSkeleton from '~/components/patients/PatientChartPageSkeleton.vue'
import { usePatientChart } from '~/composables/usePatientChart.js'
import { usePatientRoute } from '~/composables/usePatientRoute.js'

definePageMeta({
  layout: false,
  middleware: 'nutri-only',
})

const route = useRoute()

const {
  patientId,
  resolvingRoute,
  routeError,
  syncCanonicalPatientUrl,
  buildPatientPath,
} = usePatientRoute()
const documentoId = computed(() => String(route.params.documentoId || '').trim())

const {
  loading,
  error,
  user,
  profile,
  loadAll,
} = usePatientChart(patientId)

const backToListUrl = computed(() =>
  buildPatientPath(user.value || { id: patientId.value }, { query: { tab: 'documentos' } }),
)

const documentosList = computed(() => {
  const fromUser = user.value?.patientProfileData?.documentos
  const fromProfile = profile.value?.documentos
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
})

const editorSeed = computed(() => {
  if (!documentoId.value) return null
  if (documentoId.value === 'novo') {
    return { type: 'new', count: documentosList.value.length }
  }
  const item = documentosList.value.find((doc) => doc.id === documentoId.value)
  return item ? { type: 'edit', item } : null
})

function goBackToList() {
  void navigateTo(backToListUrl.value)
}

function onSaved(updated) {
  if (updated) user.value = updated
}

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
    if (documentoId.value === 'novo') return 'Novo documento'
    const item = documentosList.value.find((doc) => doc.id === documentoId.value)
    const patientName = user.value?.name || 'Paciente'
    if (item?.title) return `${item.title} · ${patientName}`
    return `Documento · ${patientName}`
  }),
})
</script>

<style scoped>
.pdoc-route {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.pdoc-route-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7368;
}

.pdoc-route-state--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  color: #c53030;
}
</style>
