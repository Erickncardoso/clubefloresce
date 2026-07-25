<template>
  <div class="pawork">
    <header class="pawork-history-head">
      <div>
        <h2>Exames laboratoriais</h2>
        <p>{{ exames.length }} registro(s) · compare tendências e insights clínicos</p>
      </div>
      <div class="pawork-history-actions">
        <button
          type="button"
          class="btn-secondary pawork-btn"
          :disabled="!canCompareSelected"
          @click="mode = 'compare'"
        >
          Comparar selecionados
        </button>
        <button type="button" class="btn-primary pawork-btn" @click="startNew">
          + Registro de exame
        </button>
      </div>
    </header>

    <p v-if="listError" class="pawork-error">{{ listError }}</p>

    <PatientExameComparisonPanel
      v-if="mode === 'compare' && canCompareSelected"
      :exames="exames"
      :selected-ids="selectedIds"
      class="pex-workspace-compare"
    />

    <button
      v-if="mode === 'compare'"
      type="button"
      class="btn-secondary pawork-btn pex-back-list"
      @click="mode = 'list'"
    >
      Voltar para registros
    </button>

    <div v-if="mode === 'list'">
      <div v-if="!exames.length" class="pawork-empty">
        <PatientChartEmptyState
          :icon="FlaskConical"
          title="Centralize os exames laboratoriais"
          description="Registre biomarcadores com faixas de referência e compare a evolução entre consultas."
          action-label="+ Registro de exame"
          @action="startNew"
        />
      </div>

      <div v-else class="pawork-list">
        <article
          v-for="item in exames"
          :key="item.id"
          class="pawork-card"
          :class="{ 'pawork-card--draft': item.status === 'draft', 'pawork-card--selected': selectedIds.includes(item.id) }"
        >
          <label class="pex-select">
            <input
              type="checkbox"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelected(item.id)"
            >
            <span class="sr-only">Selecionar para comparação</span>
          </label>
          <button type="button" class="pawork-card-main" @click="editItem(item)">
            <div class="pawork-card-top">
              <strong>{{ item.title }}</strong>
              <span class="pawork-status" :class="`pawork-status--${item.status || 'completed'}`">
                {{ exameStatusLabel(item.status) }}
              </span>
            </div>
            <p class="pawork-card-preview">
              {{ formatExameDate(item.collectedAt) }} · {{ examePreviewText(item) }}
            </p>
            <small>Atualizado {{ formatDateTime(item.updatedAt || item.createdAt) }}</small>
          </button>
          <div class="pawork-card-actions" @click.stop>
            <SharedCfTileActionsMenu :menu-key="`exame-${item.id}`" class="pawork-card-menu">
              <button type="button" class="cf-tile-actions-item" role="menuitem" @click="editItem(item)">
                Editar
              </button>
              <button
                type="button"
                class="cf-tile-actions-item cf-tile-actions-item--danger"
                role="menuitem"
                @click="removeItem(item.id)"
              >
                Excluir
              </button>
            </SharedCfTileActionsMenu>
          </div>
        </article>
      </div>

      <p v-if="exames.length && selectedIds.length === 1" class="pex-hint">
        Selecione mais um registro para comparar biomarcadores lado a lado.
      </p>
    </div>

    <PatientExameEditorModal
      v-model:open="editorOpen"
      :seed="editorSeed"
      :saving="saving"
      @save="onSave"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { FlaskConical } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import PatientChartEmptyState from '~/components/patients/PatientChartEmptyState.vue'
import PatientExameComparisonPanel from '~/components/patients/PatientExameComparisonPanel.vue'
import PatientExameEditorModal from '~/components/patients/PatientExameEditorModal.vue'
import { canCompare } from '~/utils/lab-exam-comparison.js'
import {
  EXAMES_LIMIT,
  examePreviewText,
  exameStatusLabel,
  formatExameDate,
  normalizeExame,
  sortExamesByDate,
} from '~/utils/lab-exams.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['saved'])

const apiBase = useApiBase()
const { verifiedUser } = useAuthSession()

const mode = ref('list')
const listError = ref('')
const saving = ref(false)
const editorOpen = ref(false)
const editorSeed = ref(null)
const selectedIds = ref([])

const exames = computed(() => {
  const fromUser = props.user?.patientProfileData?.exames
  const fromProfile = props.profile?.exames
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return sortExamesByDate(list).reverse()
})

const canCompareSelected = computed(() => canCompare(selectedIds.value))

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toggleSelected(id) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
    return
  }
  selectedIds.value = [...selectedIds.value, id]
}

function startNew() {
  if (exames.value.length >= EXAMES_LIMIT) {
    listError.value = `Limite de ${EXAMES_LIMIT} registros de exame por paciente.`
    return
  }
  listError.value = ''
  editorSeed.value = { type: 'new' }
  editorOpen.value = true
}

function editItem(item) {
  if (!item?.id) return
  listError.value = ''
  editorSeed.value = { type: 'edit', item }
  editorOpen.value = true
}

function nextExamesList(nextItem, removeId = '') {
  const fromUser = props.user?.patientProfileData?.exames
  const fromProfile = props.profile?.exames
  const source = Array.isArray(fromUser) ? fromUser : fromProfile
  const current = Array.isArray(source) ? [...source] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, EXAMES_LIMIT)
}

async function patchExames(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        exames: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

async function onSave(payload) {
  if (!props.user?.id) {
    listError.value = 'Paciente não carregado.'
    return
  }
  saving.value = true
  listError.value = ''
  try {
    const item = {
      ...normalizeExame(payload),
      authorName: verifiedUser.value?.name || payload.authorName || 'Nutricionista',
      updatedAt: new Date().toISOString(),
      createdAt: payload.createdAt || new Date().toISOString(),
    }
    await patchExames(nextExamesList(item))
    editorOpen.value = false
    if (!selectedIds.value.includes(item.id)) {
      selectedIds.value = [...selectedIds.value, item.id]
    }
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || err?.message || 'Erro ao salvar exame.'
  } finally {
    saving.value = false
  }
}

async function removeItem(id) {
  if (!confirm('Excluir este registro de exame?')) return
  try {
    await patchExames(nextExamesList(null, id))
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
  } catch (err) {
    listError.value = err?.data?.error || err?.message || 'Erro ao excluir.'
  }
}
</script>

<style scoped>
.pex-workspace-compare {
  margin-bottom: 0.85rem;
}

.pex-back-list {
  margin-bottom: 0.85rem;
}

.pawork-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.35rem;
  align-items: stretch;
}

.pawork-card--selected {
  outline: 2px solid rgba(139, 150, 124, 0.35);
}

.pex-select {
  display: inline-flex;
  align-items: center;
  padding: 0 0.35rem 0 0.65rem;
}

.pex-select input {
  width: 1rem;
  height: 1rem;
}

.pex-hint {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: #6b7368;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
