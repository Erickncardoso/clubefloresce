<template>
  <div class="pawork">
    <PatientAntropometriaEditor
      v-if="mode === 'editor'"
      :user="user"
      :profile="profile"
      :seed="editorSeed"
      :saving="saving"
      :error-message="listError"
      :draft-saved-at="draftSavedAt"
      @save="onSave"
      @cancel="backToList"
    />

    <template v-else>
      <header class="pawork-history-head">
        <div>
          <h2>Avaliações Antropométricas</h2>
          <p>{{ assessments.length }} registro(s)</p>
        </div>
        <div class="pawork-history-actions">
          <button type="button" class="btn-primary pawork-btn" @click="startNew">
            + Nova avaliação
          </button>
        </div>
      </header>

      <p v-if="listError && mode === 'list'" class="pawork-error">{{ listError }}</p>

      <div v-if="!assessments.length" class="pawork-empty">
        <PatientChartEmptyState
          :icon="Scale"
          title="Registre a primeira avaliação antropométrica"
          description="Adicione as medidas do paciente para acompanhar o progresso físico, calcular a composição corporal e personalizar as metas."
          action-label="+ Nova avaliação"
          @action="startNew"
        />
      </div>

      <div v-else class="pawork-list">
        <article
          v-for="item in assessments"
          :key="item.id"
          class="pawork-card"
          :class="{ 'pawork-card--draft': item.status === 'draft' }"
        >
          <button type="button" class="pawork-card-main" @click="editItem(item)">
            <div class="pawork-card-top">
              <strong>{{ item.title || 'Avaliação Antropométrica' }}</strong>
              <span class="pawork-status" :class="`pawork-status--${item.status || 'draft'}`">
                {{ antropometriaStatusLabel(item.status) }}
              </span>
            </div>
            <p class="pawork-card-preview">{{ antropometriaPreviewText(item, profile?.birthDate) }}</p>
            <small>Atualizada {{ formatDate(item.updatedAt || item.createdAt) }}</small>
          </button>
          <div class="pawork-card-actions" @click.stop>
            <SharedCfTileActionsMenu :menu-key="`antropometria-${item.id}`" class="pawork-card-menu">
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
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Scale } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import PatientChartEmptyState from '~/components/patients/PatientChartEmptyState.vue'
import PatientAntropometriaEditor from '~/components/patients/PatientAntropometriaEditor.vue'
import {
  ANTROPOMETRIA_LIMIT,
  antropometriaPreviewText,
  antropometriaStatusLabel,
  normalizeAntropometria,
} from '~/utils/antropometria.js'

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
const editorSeed = ref(null)
const editingId = ref('')
const draftSavedAt = ref('')

const assessments = computed(() => {
  const fromUser = props.user?.patientProfileData?.antropometrias
  const fromProfile = props.profile?.antropometrias
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || b.measuredAt || '').localeCompare(String(a.updatedAt || a.measuredAt || '')))
})

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function startNew() {
  if (assessments.value.length >= ANTROPOMETRIA_LIMIT) {
    listError.value = `Limite de ${ANTROPOMETRIA_LIMIT} avaliações por paciente.`
    return
  }
  listError.value = ''
  editingId.value = ''
  editorSeed.value = { type: 'new' }
  mode.value = 'editor'
}

function editItem(item) {
  if (!item?.id) return
  listError.value = ''
  editingId.value = item.id
  editorSeed.value = { type: 'edit', item }
  mode.value = 'editor'
}

function backToList() {
  mode.value = 'list'
  listError.value = ''
}

function nextAssessmentsList(nextItem, removeId = '') {
  const fromUser = props.user?.patientProfileData?.antropometrias
  const fromProfile = props.profile?.antropometrias
  const source = Array.isArray(fromUser) ? fromUser : fromProfile
  const current = Array.isArray(source) ? [...source] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, ANTROPOMETRIA_LIMIT)
}

async function patchAssessments(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        antropometrias: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

async function onSave(payload) {
  if (!props.user?.id) return
  saving.value = true
  listError.value = ''
  try {
    const now = new Date().toISOString()
    const existing = assessments.value.find((item) => item.id === editingId.value)
    const item = normalizeAntropometria({
      ...payload,
      id: editingId.value || crypto.randomUUID(),
      title: payload.title || 'Avaliação Antropométrica',
      status: 'completed',
      authorName: verifiedUser.value?.name || null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    })
    await patchAssessments(nextAssessmentsList(item))
    editingId.value = item.id
    draftSavedAt.value = now
    mode.value = 'list'
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || 'Erro ao salvar avaliação.'
  } finally {
    saving.value = false
  }
}

async function removeItem(id) {
  if (!id || !props.user?.id) return
  if (!window.confirm('Excluir esta avaliação antropométrica?')) return
  listError.value = ''
  try {
    await patchAssessments(nextAssessmentsList(null, id))
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || 'Erro ao excluir avaliação.'
  }
}
</script>
