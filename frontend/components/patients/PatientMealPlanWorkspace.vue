<template>
  <div class="pawork">
    <p v-if="listError" class="pawork-error">{{ listError }}</p>
    <p v-if="listNotice" class="pawork-notice">{{ listNotice }}</p>

    <section v-if="(pendingDraft || activeId) && !editorOpen" class="pawork-banner">
      <span>{{ resumeBannerLabel }}</span>
      <button type="button" class="btn-secondary pawork-btn" @click="editorOpen = true">
        Continuar edição
      </button>
    </section>

    <section class="mpwork-table-card">
      <div class="mpwork-table-scroll">
        <table class="mpwork-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Criação</th>
              <th>Tipo de dieta</th>
              <th>Objetivo</th>
              <th>Média calórica</th>
              <th>Status</th>
              <th class="mpwork-table-actions-head" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!prescriptions.length">
              <td colspan="7" class="mpwork-table-empty">
                <PatientChartEmptyState
                  :icon="Salad"
                  title="Nenhum plano alimentar"
                  description="Crie uma prescrição ou importe um PDF para começar."
                  action-label="Novo plano alimentar"
                  counter="0/10"
                  @action="openNewModal"
                />
              </td>
            </tr>
            <tr
              v-for="item in paginatedPrescriptions"
              :key="item.id"
              class="mpwork-table-row"
              @click="openInEditor(item)"
            >
              <td class="mpwork-table-title">
                <span
                  :class="{ 'mpwork-table-title--draft': item.status === 'draft' }"
                >
                  {{ displayPlanTitle(item) }}
                </span>
              </td>
              <td>{{ formatCreationDate(item.createdAt) }}</td>
              <td>{{ dietTypeLabel(item) }}</td>
              <td class="mpwork-table-objective">{{ objectiveLabel(item) }}</td>
              <td>{{ averageCalories(item) }}</td>
              <td>
                <span class="mpwork-table-status" :class="`mpwork-table-status--${statusTone(item)}`">
                  <i v-if="statusTone(item) === 'active'" class="mpwork-table-status-dot" aria-hidden="true" />
                  {{ statusDisplayLabel(item) }}
                </span>
              </td>
              <td class="mpwork-table-actions" @click.stop>
                <SharedCfTileActionsMenu :menu-key="`meal-plan-${item.id}`" class="mpwork-table-menu">
                  <button type="button" class="cf-tile-actions-item" role="menuitem" @click="openInEditor(item)">
                    Abrir
                  </button>
                  <button
                    v-if="isImportedPlanRow(item) && mealPlan?.pdfUrl"
                    type="button"
                    class="cf-tile-actions-item"
                    role="menuitem"
                    @click="$emit('open-pdf')"
                  >
                    Ver PDF
                  </button>
                  <button type="button" class="cf-tile-actions-item cf-tile-actions-item--edit" role="menuitem" @click="editItem(item)">
                    Editar
                  </button>
                  <button type="button" class="cf-tile-actions-item" role="menuitem" @click="openDuplicateModal(item)">
                    Duplicar
                  </button>
                  <button type="button" class="cf-tile-actions-item cf-tile-actions-item--danger" role="menuitem" @click="removeItem(item.id)">
                    Excluir
                  </button>
                </SharedCfTileActionsMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="prescriptions.length" class="mpwork-table-foot">
        <div class="mpwork-table-foot-left">
          <button
            type="button"
            class="btn-primary mpwork-table-new"
            :disabled="prescriptions.length >= 10"
            @click="openNewModal"
          >
            Novo plano alimentar +
          </button>
          <span class="mpwork-table-meta">{{ prescriptions.length }}/10 · {{ importedPlanLabel }}</span>
        </div>
        <div v-if="totalPages > 1" class="mpwork-table-pagination">
          <button type="button" class="pawork-page-btn" :disabled="currentPage <= 1" @click="currentPage -= 1">
            ‹
          </button>
          <span>{{ currentPage }}</span>
          <button type="button" class="pawork-page-btn" :disabled="currentPage >= totalPages" @click="currentPage += 1">
            ›
          </button>
        </div>
      </footer>
    </section>

    <section class="pawork-panel mpwork-import">
      <strong>Importar plano (PDF)</strong>
      <p v-if="mealPlan?.plan?.meals?.length">
        {{ mealPlan?.title || 'Plano alimentar' }}
        · {{ mealPlan.plan.meals.length }} refeições
        <span v-if="mealPlan?.updatedAt"> · {{ formatDate(mealPlan.updatedAt) }}</span>
      </p>
      <p v-else>Nenhum PDF importado para este paciente.</p>
      <div class="pawork-panel-actions">
        <label class="pawork-upload-pick" :class="{ 'pawork-upload-pick--disabled': uploading }">
          <Upload aria-hidden="true" />
          <span>{{ planFile ? 'Trocar PDF' : 'Escolher PDF' }}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            class="pawork-upload-input"
            :disabled="uploading"
            @change="onPlanFileChange"
          >
        </label>
        <span class="pawork-upload-name">{{ planFile?.name || 'Nenhum arquivo' }}</span>
        <button type="button" class="btn-secondary pawork-btn" :disabled="!planFile || uploading" @click="submitUpload">
          {{ uploading ? 'Importando…' : 'Importar' }}
        </button>
      </div>
      <p v-if="uploadMessage" class="pawork-msg" :class="{ 'pawork-msg--error': uploadError }">
        {{ uploadMessage }}
      </p>
    </section>

    <PatientMealPlanNewModal v-model:open="newModalOpen" @submit="startFromModal" />

    <PatientMealPlanDuplicateModal
      v-model:open="duplicateModalOpen"
      :source="duplicateSource"
      :current-patient="user"
      @submit="onDuplicateSubmit"
    />

    <PatientMealPlanEditorModal
      v-model:open="editorOpen"
      :user="user"
      :profile="profile"
      :prescription="activePrescription"
      :saving="saving"
      :publishing="publishing"
      :save-message="saveMessage"
      :save-error="saveError"
      @save="onSave"
      @publish="onPublish"
      @new-plan="openNewFromEditor"
      @close="onEditorClose"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Salad, Upload } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import PatientChartEmptyState from '~/components/patients/PatientChartEmptyState.vue'
import PatientMealPlanEditorModal from '~/components/patients/PatientMealPlanEditorModal.vue'
import PatientMealPlanNewModal from '~/components/patients/PatientMealPlanNewModal.vue'
import PatientMealPlanDuplicateModal from '~/components/patients/PatientMealPlanDuplicateModal.vue'
import { duplicateMealPlanRecord } from '~/utils/meal-plan-duplicate.js'
import { useFoodBank } from '~/composables/useFoodBank.js'
import {
  buildPrescriptionFromParsedPlan,
  buildParsedMealPlanFromPrescription,
  createEmptyPrescription,
  enrichPrescriptionFoodItems,
  findImportedPrescription,
  importPrescriptionIdForMealPlan,
  shouldSyncImportedPrescription,
} from '~/utils/meal-plan-prescription.js'
import {
  clearMealPlanLocalDraftsForPlan,
  formatMealPlanDraftSavedAt,
  hasRecoverableMealPlanDraft,
} from '~/utils/meal-plan-local-draft.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  mealPlan: { type: Object, default: null },
  uploading: { type: Boolean, default: false },
})

const emit = defineEmits(['saved', 'open-pdf', 'upload'])

const apiBase = useApiBase()
const { verifiedUser } = useAuthSession()
const { matchFoodForMealPlan, matchFoodBatchForMealPlan } = useFoodBank()

const editorOpen = ref(false)
const activeId = ref('')
const newModalOpen = ref(false)
const duplicateModalOpen = ref(false)
const duplicateSource = ref(null)
const listError = ref('')
const listNotice = ref('')
const saving = ref(false)
const publishing = ref(false)
const saveMessage = ref('')
const saveError = ref(false)

const planFile = ref(null)
const uploadMessage = ref('')
const uploadError = ref(false)
const currentPage = ref(1)
const pageSize = 10

const prescriptions = computed(() => {
  const fromUser = props.user?.patientProfileData?.mealPlans
  const fromProfile = props.profile?.mealPlans
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
})

const totalPages = computed(() => Math.max(1, Math.ceil(prescriptions.value.length / pageSize)))

const paginatedPrescriptions = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return prescriptions.value.slice(start, start + pageSize)
})

watch(
  () => prescriptions.value.length,
  () => {
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  },
)

const activePrescription = computed(() => {
  if (!activeId.value) {
    return pendingDraft.value || null
  }
  return prescriptions.value.find((item) => item.id === activeId.value) || null
})

const pendingDraft = ref(null)
const syncingImport = ref(false)

const resumeBannerLabel = computed(() => {
  if (!props.user?.id) return 'Edição em andamento'
  const planId = activeId.value || 'new'
  const prescription = activePrescription.value
  const draft = hasRecoverableMealPlanDraft(props.user.id, planId, prescription)
  if (draft?.savedAt) {
    const when = formatMealPlanDraftSavedAt(draft.savedAt)
    return when
      ? `Rascunho local de ${when} — toque para continuar`
      : 'Rascunho local salvo — toque para continuar'
  }
  return 'Edição em andamento'
})

function clearLocalDraftForActivePlan(planId = '') {
  if (!props.user?.id) return
  const resolvedId = planId || activeId.value || 'new'
  clearMealPlanLocalDraftsForPlan(props.user.id, resolvedId)
}

const importedPlanLabel = computed(() => {
  if (props.mealPlan?.plan?.meals?.length) {
    return 'Plano ativo no app do paciente'
  }
  return 'Nenhum plano publicado ainda'
})

async function ensureImportedPrescription() {
  const mealPlan = props.mealPlan
  const parsed = mealPlan?.plan
  const importId = importPrescriptionIdForMealPlan(mealPlan)
  if (!props.user?.id || !parsed?.meals?.length || !importId || syncingImport.value) return

  const existing = findImportedPrescription(prescriptions.value, mealPlan)
  if (!shouldSyncImportedPrescription(mealPlan, existing)) return

  syncingImport.value = true
  try {
    let next = buildPrescriptionFromParsedPlan(parsed, {
      id: importId,
      status: 'active',
      fileName: mealPlan.fileName || parsed.fileName || '',
      updatedAt: mealPlan.updatedAt || null,
      authorName: verifiedUser.value?.name || 'Importado do PDF',
    })
    const enriched = await enrichPrescriptionFoodItems(next, matchFoodForMealPlan, {
      matchFoodBatch: matchFoodBatchForMealPlan,
    })
    if (enriched.changed) next = enriched.prescription
    await patchMealPlans(nextPrescriptionList(next))
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || err?.message || 'Erro ao montar prescrição do PDF.'
  } finally {
    syncingImport.value = false
  }
}

watch(
  () => [props.mealPlan?.id, props.mealPlan?.updatedAt, props.mealPlan?.plan?.meals?.length, props.user?.id],
  () => {
    void ensureImportedPrescription()
  },
  { immediate: true },
)

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCreationDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function displayPlanTitle(item) {
  const title = String(item?.title || '').trim() || 'Plano alimentar'
  if (item?.status === 'draft') return `Rascunho - ${title}`
  return title
}

function dietTypeLabel(item) {
  return String(item?.dietType || '').trim() || '—'
}

function objectiveLabel(item) {
  return String(item?.objective || '').trim() || '—'
}

function kcalValue(item) {
  const totals = item?.pdfNutritionTotals || item?.nutritionTotals || {}
  const kcal = Number(totals.caloriesKcal)
  return Number.isFinite(kcal) && kcal > 0 ? Math.round(kcal) : null
}

function averageCalories(item) {
  const kcal = kcalValue(item)
  return kcal ? `${kcal} kcal` : '—'
}

function statusTone(item) {
  if (item?.status === 'active') return 'active'
  if (item?.status === 'archived') return 'archived'
  return 'draft'
}

function statusDisplayLabel(item) {
  if (item?.status === 'active') return 'Ativo'
  if (item?.status === 'archived') return 'Arquivado'
  return 'Atualização'
}

function isImportedPlanRow(item) {
  const importId = importPrescriptionIdForMealPlan(props.mealPlan)
  return Boolean(importId && item?.id === importId)
}

function openNewModal() {
  if (prescriptions.value.length >= 10) {
    listError.value = 'Limite de 10 prescrições por paciente.'
    return
  }
  listError.value = ''
  newModalOpen.value = true
}

function openNewFromEditor() {
  editorOpen.value = false
  openNewModal()
}

function onEditorClose() {
  editorOpen.value = false
}

function startFromModal({ title, methodology }) {
  pendingDraft.value = createEmptyPrescription({ title, methodology })
  activeId.value = ''
  saveMessage.value = ''
  saveError.value = false
  editorOpen.value = true
}

function openInEditor(item) {
  if (!item?.id) return
  pendingDraft.value = null
  activeId.value = item.id
  saveMessage.value = ''
  saveError.value = false
  editorOpen.value = true
}

function editItem(item) {
  openInEditor(item)
}

function openDuplicateModal(item) {
  if (!item?.id) return
  listError.value = ''
  listNotice.value = ''
  duplicateSource.value = item
  duplicateModalOpen.value = true
}

function mealPlansForUser(userRecord) {
  const fromProfile = userRecord?.patientProfileData?.mealPlans ?? userRecord?.patientProfile?.mealPlans
  return Array.isArray(fromProfile) ? [...fromProfile] : []
}

async function patchMealPlansForPatient(patientId, nextList) {
  return $fetch(`${apiBase.value}/users/${patientId}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        mealPlans: nextList,
      },
    },
  }))
}

async function onDuplicateSubmit({ title, targetPatientId, onComplete, onError }) {
  const source = duplicateSource.value
  if (!source?.id) {
    onError?.('Plano de origem não encontrado.')
    return
  }

  try {
    listError.value = ''
    listNotice.value = ''

    let targetPlans = []
    let targetPatientName = props.user?.name || 'Paciente'

    if (targetPatientId === props.user?.id) {
      targetPlans = prescriptions.value
    } else {
      const targetUser = await $fetch(`${apiBase.value}/users/${targetPatientId}`, authFetchInit())
      targetPlans = mealPlansForUser(targetUser)
      targetPatientName = targetUser?.name || targetPatientName
    }

    if (targetPlans.length >= 10) {
      onError?.('A paciente destino já atingiu o limite de 10 planos.')
      return
    }

    const duplicate = duplicateMealPlanRecord(source, {
      title,
      authorName: verifiedUser.value?.name || 'Nutricionista',
    })

    const nextList = [duplicate, ...targetPlans].slice(0, 10)
    const updated = await patchMealPlansForPatient(targetPatientId, nextList)

    duplicateModalOpen.value = false
    duplicateSource.value = null

    if (targetPatientId === props.user?.id) {
      emit('saved', updated)
      activeId.value = duplicate.id
      pendingDraft.value = null
      saveMessage.value = 'Plano duplicado. Ajuste o que precisar e salve.'
      saveError.value = false
      editorOpen.value = true
      listNotice.value = 'Plano duplicado e aberto para edição.'
    } else {
      listNotice.value = `Plano duplicado para ${targetPatientName}.`
    }

    onComplete?.()
  } catch (err) {
    const message = err?.data?.error || err?.data?.message || err?.message || 'Erro ao duplicar plano.'
    listError.value = message
    onError?.(message)
  }
}

function nextPrescriptionList(nextItem, removeId = '') {
  const fromUser = props.user?.patientProfileData?.mealPlans
  const fromProfile = props.profile?.mealPlans
  const source = Array.isArray(fromUser) ? fromUser : fromProfile
  const current = Array.isArray(source) ? [...source] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, 10)
}

async function patchMealPlans(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        mealPlans: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

function buildRecord(formPayload, status) {
  const now = new Date().toISOString()
  const existing = prescriptions.value.find((item) => item.id === activeId.value)
  const id = activeId.value || crypto.randomUUID()
  return {
    id,
    title: formPayload.title?.trim() || existing?.title || 'Plano alimentar',
    methodology: formPayload.methodology || existing?.methodology || 'qualitative',
    status,
    objective: formPayload.objective || null,
    dietType: formPayload.dietType || null,
    startDate: formPayload.startDate || null,
    endDate: formPayload.indefinite ? null : (formPayload.endDate || null),
    indefinite: formPayload.indefinite !== false,
    editorText: formPayload.editorText || '',
    editorHtml: formPayload.editorHtml || '',
    finalNotes: formPayload.finalNotes || '',
    meals: formPayload.meals || [],
    nutritionTotals: formPayload.nutritionTotals || existing?.nutritionTotals || null,
    pdfNutritionTotals: formPayload.pdfNutritionTotals || existing?.pdfNutritionTotals || null,
    hydrationPrescription: formPayload.hydrationPrescription ?? existing?.hydrationPrescription ?? null,
    shoppingList: formPayload.shoppingList ?? existing?.shoppingList ?? null,
    authorName: verifiedUser.value?.name || existing?.authorName || 'Nutricionista',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

async function onSave(formPayload) {
  if (!props.user?.id) {
    listError.value = 'Paciente não carregado.'
    saveError.value = true
    saveMessage.value = listError.value
    return
  }
  saving.value = true
  saveError.value = false
  listError.value = ''
  try {
    const item = buildRecord(formPayload, 'draft')
    const updated = await patchMealPlans(nextPrescriptionList(item))
    activeId.value = item.id
    pendingDraft.value = null
    clearLocalDraftForActivePlan('new')
    clearLocalDraftForActivePlan(item.id)
    saveMessage.value = 'Rascunho salvo.'
    return updated
  } catch (err) {
    const message = err?.data?.error || err?.data?.message || err?.message || 'Erro ao salvar.'
    listError.value = message
    saveMessage.value = message
    saveError.value = true
  } finally {
    saving.value = false
  }
}

async function onPublish(formPayload) {
  if (!props.user?.id) {
    listError.value = 'Paciente não carregado.'
    saveError.value = true
    saveMessage.value = listError.value
    return
  }
  publishing.value = true
  saving.value = true
  saveError.value = false
  listError.value = ''
  try {
    const item = buildRecord(formPayload, 'active')
    let updated = await patchMealPlans(nextPrescriptionList(item))
    activeId.value = item.id
    pendingDraft.value = null
    clearLocalDraftForActivePlan('new')
    clearLocalDraftForActivePlan(item.id)

    const parsed = buildParsedMealPlanFromPrescription(item, props.user?.name || null)
    if (!parsed.meals.length) {
      const emptyMsg = item.methodology === 'qualitative'
        ? 'Escreva o plano qualitativo antes de publicar.'
        : 'Adicione ao menos uma refeição ou linha de alimento antes de publicar.'
      throw new Error(emptyMsg)
    }

    const publishResult = await $fetch(`${apiBase.value}/patients/${props.user.id}/meal-plan/save`, authFetchInit({
      method: 'POST',
      body: {
        title: item.title,
        plan: parsed,
      },
    }))

    if (publishResult?.user) {
      updated = publishResult.user
      emit('saved', updated)
    }

    saveMessage.value = 'Plano publicado para o paciente.'
  } catch (err) {
    const message = err?.data?.error || err?.data?.message || err?.message || 'Erro ao publicar.'
    listError.value = message
    saveMessage.value = message
    saveError.value = true
  } finally {
    publishing.value = false
    saving.value = false
  }
}

async function removeItem(id) {
  if (!confirm('Excluir esta prescrição?')) return
  try {
    await patchMealPlans(nextPrescriptionList(null, id))
    clearLocalDraftForActivePlan(id)
    clearLocalDraftForActivePlan('new')
    if (activeId.value === id) {
      activeId.value = ''
      pendingDraft.value = null
      editorOpen.value = false
    }
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || 'Erro ao excluir.'
  }
}

function onPlanFileChange(event) {
  planFile.value = event.target.files?.[0] || null
  uploadMessage.value = ''
  uploadError.value = false
}

function submitUpload() {
  if (!planFile.value) return
  uploadMessage.value = ''
  uploadError.value = false
  emit('upload', {
    file: planFile.value,
    onSuccess: async (message) => {
      uploadMessage.value = message || 'PDF importado com sucesso.'
      planFile.value = null
      await ensureImportedPrescription()
    },
    onError: (message) => {
      uploadMessage.value = message || 'Não foi possível importar o PDF.'
      uploadError.value = true
    },
  })
}
</script>
