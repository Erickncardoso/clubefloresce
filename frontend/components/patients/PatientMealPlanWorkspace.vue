<template>
  <div class="pawork">
    <header class="mpwork-head">
      <div class="mpwork-head-meta">
        <span class="mpwork-count">
          <strong>{{ prescriptions.length }}</strong> de {{ MAX_PLANS }} planos
        </span>
        <span class="mpwork-published" :class="{ 'mpwork-published--on': hasPublishedPlan }">
          <i class="mpwork-published-dot" aria-hidden="true" />
          {{ importedPlanLabel }}
        </span>
      </div>

      <div class="mpwork-head-actions">
        <button
          type="button"
          class="btn-secondary mpwork-head-btn"
          :aria-expanded="importOpen"
          aria-controls="mpwork-import-panel"
          @click="importOpen = !importOpen"
        >
          <Upload aria-hidden="true" />
          Importar PDF
        </button>
        <button
          type="button"
          class="btn-primary mpwork-head-btn"
          :disabled="planLimitReached"
          :title="planLimitReached ? `Limite de ${MAX_PLANS} planos atingido` : ''"
          @click="openNewModal"
        >
          <Plus aria-hidden="true" />
          Novo plano alimentar
        </button>
      </div>
    </header>

    <p v-if="listError" class="mpwork-alert mpwork-alert--error" role="alert">
      <AlertCircle aria-hidden="true" />
      {{ listError }}
    </p>
    <p v-if="listNotice" class="mpwork-alert mpwork-alert--ok" role="status">
      <CheckCircle2 aria-hidden="true" />
      {{ listNotice }}
    </p>

    <section v-if="(pendingDraft || activeId) && !editorOpen" class="mpwork-resume">
      <FileClock class="mpwork-resume-icon" aria-hidden="true" />
      <span class="mpwork-resume-copy">{{ resumeBannerLabel }}</span>
      <button type="button" class="btn-secondary mpwork-resume-btn" @click="editorOpen = true">
        Continuar edição
      </button>
    </section>

    <Transition name="mpwork-collapse">
      <section
        v-if="importOpen"
        id="mpwork-import-panel"
        class="mpwork-import"
      >
        <div class="mpwork-import-head">
          <div>
            <strong>Importar plano em PDF</strong>
            <p v-if="mealPlan?.plan?.meals?.length">
              Atual: {{ mealPlan?.title || 'Plano alimentar' }}
              · {{ mealPlan.plan.meals.length }} refeições
              <span v-if="mealPlan?.updatedAt"> · {{ formatDate(mealPlan.updatedAt) }}</span>
            </p>
            <p v-else>
              O PDF vira uma prescrição editável e é publicado no app do paciente.
            </p>
          </div>
          <button type="button" class="mpwork-import-close" aria-label="Fechar importação" @click="importOpen = false">
            <X aria-hidden="true" />
          </button>
        </div>

        <label
          class="mpwork-drop"
          :class="{
            'mpwork-drop--over': dragOver,
            'mpwork-drop--filled': !!planFile,
            'mpwork-drop--disabled': uploading,
          }"
          @dragover.prevent="dragOver = true"
          @dragenter.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onPlanFileDrop"
        >
          <component :is="planFile ? FileText : Upload" class="mpwork-drop-icon" aria-hidden="true" />
          <span class="mpwork-drop-copy">
            <strong>{{ planFile ? planFile.name : 'Arraste o PDF aqui ou clique para escolher' }}</strong>
            <small>{{ planFile ? formatFileSize(planFile.size) : 'Apenas arquivos .pdf' }}</small>
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            class="mpwork-drop-input"
            :disabled="uploading"
            @change="onPlanFileChange"
          >
        </label>

        <div class="mpwork-import-actions">
          <button
            v-if="planFile"
            type="button"
            class="btn-secondary mpwork-import-btn"
            :disabled="uploading"
            @click="clearPlanFile"
          >
            Remover arquivo
          </button>
          <button
            type="button"
            class="btn-primary mpwork-import-btn"
            :disabled="!planFile || uploading"
            @click="submitUpload"
          >
            {{ uploading ? 'Importando…' : 'Importar PDF' }}
          </button>
        </div>

        <p v-if="uploadMessage" class="mpwork-alert" :class="uploadError ? 'mpwork-alert--error' : 'mpwork-alert--ok'">
          <component :is="uploadError ? AlertCircle : CheckCircle2" aria-hidden="true" />
          {{ uploadMessage }}
        </p>
      </section>
    </Transition>

    <PatientChartEmptyState
      v-if="!prescriptions.length"
      :icon="Salad"
      title="Nenhum plano alimentar ainda"
      description="Monte a primeira prescrição escolhendo o método (Inteligente, Tradicional ou Qualitativo) — ou importe um PDF pronto e ele vira um plano editável."
      action-label="Criar primeiro plano"
      @action="openNewModal"
    >
      <template #actions>
        <button type="button" class="btn-secondary mpwork-empty-btn" @click="importOpen = true">
          Importar PDF
        </button>
      </template>
    </PatientChartEmptyState>

    <section v-else class="mpwork-table-card">
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
            <tr
              v-for="item in paginatedPrescriptions"
              :key="item.id"
              class="mpwork-table-row"
              @click="openInEditor(item)"
            >
              <td class="mpwork-table-title">
                <button
                  type="button"
                  class="mpwork-table-link"
                  :class="{ 'mpwork-table-link--draft': item.status === 'draft' }"
                  @click.stop="openInEditor(item)"
                >
                  {{ displayPlanTitle(item) }}
                </button>
                <span v-if="isImportedPlanRow(item)" class="mpwork-table-tag">PDF</span>
              </td>
              <td>{{ formatCreationDate(item.createdAt) }}</td>
              <td>{{ dietTypeLabel(item) }}</td>
              <td class="mpwork-table-objective" :title="objectiveLabel(item)">{{ objectiveLabel(item) }}</td>
              <td class="mpwork-table-kcal">{{ averageCalories(item) }}</td>
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
                  <button type="button" class="cf-tile-actions-item cf-tile-actions-item--danger" role="menuitem" @click="askRemoveItem(item)">
                    Excluir
                  </button>
                </SharedCfTileActionsMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="totalPages > 1" class="mpwork-table-foot">
        <span class="mpwork-table-meta">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        <div class="mpwork-table-pagination">
          <button
            type="button"
            class="pawork-page-btn"
            aria-label="Página anterior"
            :disabled="currentPage <= 1"
            @click="currentPage -= 1"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            class="pawork-page-btn"
            aria-label="Próxima página"
            :disabled="currentPage >= totalPages"
            @click="currentPage += 1"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </footer>
    </section>

    <SharedCfConfirmDialog
      v-model:open="deleteModalOpen"
      title="Excluir esta prescrição?"
      :description="deleteDescription"
      confirm-label="Excluir plano"
      busy-label="Excluindo…"
      :busy="deleting"
      tone="danger"
      @confirm="confirmRemoveItem"
    />

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
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileClock,
  FileText,
  Plus,
  Salad,
  Upload,
  X,
} from 'lucide-vue-next'
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
const MAX_PLANS = 10

const importOpen = ref(false)
const dragOver = ref(false)
const deleteModalOpen = ref(false)
const deleting = ref(false)
const pendingDeleteItem = ref(null)

const prescriptions = computed(() => {
  const fromUser = props.user?.patientProfileData?.mealPlans
  const fromProfile = props.profile?.mealPlans
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
})

const totalPages = computed(() => Math.max(1, Math.ceil(prescriptions.value.length / pageSize)))

const planLimitReached = computed(() => prescriptions.value.length >= MAX_PLANS)

const hasPublishedPlan = computed(() => Boolean(props.mealPlan?.plan?.meals?.length))

const deleteDescription = computed(() => {
  const title = String(pendingDeleteItem.value?.title || '').trim() || 'Este plano'
  return `“${title}” será removido da ficha do paciente. Esta ação não pode ser desfeita.`
})

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
  if (hasPublishedPlan.value) return 'Publicado no app do paciente'
  return 'Nada publicado no app'
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
  // O estado do plano já aparece na coluna Status — não repetir no título.
  return String(item?.title || '').trim() || 'Plano alimentar'
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
  return 'Rascunho'
}

function isImportedPlanRow(item) {
  const importId = importPrescriptionIdForMealPlan(props.mealPlan)
  return Boolean(importId && item?.id === importId)
}

function openNewModal() {
  if (planLimitReached.value) {
    listError.value = `Limite de ${MAX_PLANS} prescrições por paciente. Exclua um plano antigo para criar outro.`
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

    if (targetPlans.length >= MAX_PLANS) {
      onError?.(`A paciente destino já atingiu o limite de ${MAX_PLANS} planos.`)
      return
    }

    const duplicate = duplicateMealPlanRecord(source, {
      title,
      authorName: verifiedUser.value?.name || 'Nutricionista',
    })

    const nextList = [duplicate, ...targetPlans].slice(0, MAX_PLANS)
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
  return [nextItem, ...current].slice(0, MAX_PLANS)
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

function askRemoveItem(item) {
  if (!item?.id) return
  listError.value = ''
  listNotice.value = ''
  pendingDeleteItem.value = item
  deleteModalOpen.value = true
}

async function confirmRemoveItem() {
  const id = pendingDeleteItem.value?.id
  if (!id) return
  deleting.value = true
  try {
    await patchMealPlans(nextPrescriptionList(null, id))
    clearLocalDraftForActivePlan(id)
    clearLocalDraftForActivePlan('new')
    if (activeId.value === id) {
      activeId.value = ''
      pendingDraft.value = null
      editorOpen.value = false
    }
    deleteModalOpen.value = false
    pendingDeleteItem.value = null
    listNotice.value = 'Plano excluído.'
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || 'Erro ao excluir.'
    deleteModalOpen.value = false
  } finally {
    deleting.value = false
  }
}

function isPdfFile(file) {
  if (!file) return false
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
}

function setPlanFile(file) {
  if (!file) return
  if (!isPdfFile(file)) {
    planFile.value = null
    uploadMessage.value = 'Selecione um arquivo PDF.'
    uploadError.value = true
    return
  }
  planFile.value = file
  uploadMessage.value = ''
  uploadError.value = false
}

function onPlanFileChange(event) {
  const file = event.target.files?.[0] || null
  if (!file) {
    planFile.value = null
    return
  }
  setPlanFile(file)
  event.target.value = ''
}

function onPlanFileDrop(event) {
  dragOver.value = false
  if (props.uploading) return
  setPlanFile(event.dataTransfer?.files?.[0] || null)
}

function clearPlanFile() {
  planFile.value = null
  uploadMessage.value = ''
  uploadError.value = false
}

function formatFileSize(bytes) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return 'PDF selecionado'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
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
