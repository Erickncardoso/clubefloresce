<template>
  <div class="pawork">
    <PatientsPatientAnamneseWizard
      v-if="mode === 'wizard'"
      :key="activeId || 'new-anamnese'"
      :user="user"
      :profile="profile"
      :anamnese="activeAnamnese"
      :last-completed="lastCompleted"
      :saving="saving"
      :save-error="listError"
      @save="onWizardSave"
      @open-history="mode = 'history'"
      @new-anamnese="startNew"
      @view-anamnese="openLegacyView"
    />

    <div v-else-if="mode === 'history'" class="pawork-history">
      <header class="pawork-history-head">
        <div>
          <h2>Histórico de anamnese</h2>
          <p>{{ anamneses.length }} registro(s) deste paciente.</p>
        </div>
        <div class="pawork-history-actions">
          <button type="button" class="btn-secondary pawork-btn" @click="backToWizard">
            Voltar ao formulário
          </button>
          <button type="button" class="btn-secondary pawork-btn" @click="openTranscriptionEditor">
            <Mic :size="15" />
            Transcrever
          </button>
          <button type="button" class="btn-primary pawork-btn" :disabled="anamneses.length >= 5" @click="startNew">
            Nova anamnese
          </button>
        </div>
      </header>

      <p v-if="listError" class="pawork-error">{{ listError }}</p>

      <div v-if="!anamneses.length" class="pawork-empty">
        <PatientChartEmptyState
          :icon="Stethoscope"
          title="Nenhuma anamnese registrada"
          description="Inicie a primeira anamnese passo a passo para documentar queixas, histórico e hábitos."
          action-label="Nova anamnese"
          counter="0/5"
          @action="startNew"
        />
      </div>

      <div v-else class="pawork-list">
        <article v-for="item in anamneses" :key="item.id" class="pawork-card">
          <button
            type="button"
            class="pawork-card-main"
            @click="openInWizard(item)"
          >
            <div class="pawork-card-top">
              <strong>{{ item.title || 'Anamnese' }}</strong>
              <span class="pawork-status" :class="`pawork-status--${item.status || 'completed'}`">
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <p class="pawork-card-preview">{{ preview(item) }}</p>
            <small>Atualizada {{ formatDate(item.updatedAt || item.createdAt) }}</small>
          </button>
          <div class="pawork-card-actions" @click.stop>
            <SharedCfTileActionsMenu :menu-key="`anamnese-${item.id}`" class="pawork-card-menu">
              <button
                type="button"
                class="cf-tile-actions-item"
                role="menuitem"
                @click="viewItem(item)"
              >
                Abrir
              </button>
              <button
                type="button"
                class="cf-tile-actions-item cf-tile-actions-item--edit"
                role="menuitem"
                @click="openLegacyView(item)"
              >
                Editar texto livre
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
    </div>

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Mic, Stethoscope } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import { useFloatingAnamnese } from '~/composables/useFloatingAnamnese.js'
import PatientChartEmptyState from '~/components/patients/PatientChartEmptyState.vue'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['saved'])

const apiBase = useApiBase()
const { verifiedUser } = useAuthSession()
const { openEditor } = useFloatingAnamnese()
const listError = ref('')
const saving = ref(false)
const mode = ref('history')
const activeId = ref('')

const anamneses = computed(() => {
  const fromUser = props.user?.patientProfileData?.anamneses
  const fromProfile = props.profile?.anamneses
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
})

const activeAnamnese = computed(() => {
  if (!activeId.value) return null
  return anamneses.value.find((item) => item.id === activeId.value) || null
})

const lastCompleted = computed(() => {
  return anamneses.value.find((item) => item.status === 'completed' && item.id !== activeId.value)
    || anamneses.value.find((item) => item.status !== 'draft' && item.id !== activeId.value)
    || null
})

function htmlToPlain(html) {
  const value = String(html || '')
  if (!value.trim()) return ''
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function preview(item) {
  const fromWizard = item?.formData?.chiefComplaint
  const value = String(fromWizard || htmlToPlain(item.content)).trim()
  if (!value) return 'Sem conteúdo ainda.'
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status) {
  if (status === 'draft') return 'Rascunho'
  return 'Concluída'
}

function backToWizard() {
  listError.value = ''
  if (!activeId.value) {
    const draft = anamneses.value.find((item) => item.status === 'draft')
    if (draft) activeId.value = draft.id
  }
  mode.value = 'wizard'
}

function startNew() {
  if (anamneses.value.length >= 5) {
    listError.value = 'Limite de 5 anamneses por paciente.'
    return
  }
  listError.value = ''
  activeId.value = ''
  mode.value = 'wizard'
}

function openInWizard(item) {
  if (!item?.id) return
  listError.value = ''
  activeId.value = item.id
  mode.value = 'wizard'
}

function viewItem(item) {
  openInWizard(item)
}

function editItem(item) {
  openInWizard(item)
}

function openLegacyView(item) {
  if (!props.user?.id) return
  openEditor(props.user.id, item?.id
    ? { type: 'edit', item }
    : { type: 'new', count: anamneses.value.length })
}

function openTranscriptionEditor() {
  if (anamneses.value.length >= 5) {
    listError.value = 'Limite de 5 anamneses por paciente.'
    return
  }
  listError.value = ''
  openLegacyView(null)
}

function nextAnamneseList(nextItem, removeId = '') {
  const fromUser = props.user?.patientProfileData?.anamneses
  const fromProfile = props.profile?.anamneses
  const source = Array.isArray(fromUser) ? fromUser : fromProfile
  const current = Array.isArray(source) ? [...source] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, 5)
}

async function patchAnamneses(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        anamneses: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

async function onWizardSave(payload) {
  if (!props.user?.id) {
    const message = 'Paciente não carregado. Recarregue a página.'
    listError.value = message
    payload.onError?.(message)
    return
  }
  saving.value = true
  listError.value = ''
  try {
    const now = new Date().toISOString()
    const existing = anamneses.value.find((item) => item.id === activeId.value)
    const id = activeId.value || crypto.randomUUID()
    const item = {
      id,
      title: payload.status === 'completed' ? 'Anamnese concluída' : 'Anamnese em andamento',
      content: payload.content || '',
      interpretation: existing?.interpretation || null,
      foodRestrictions: payload.foodRestrictions || null,
      formData: payload.formData,
      status: payload.status,
      authorName: verifiedUser.value?.name || existing?.authorName || 'Nutricionista',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    const updated = await patchAnamneses(nextAnamneseList(item))
    activeId.value = id
    payload.onSuccess?.(
      payload.status === 'completed' ? 'Anamnese concluída com sucesso.' : 'Rascunho salvo.',
    )
    return updated
  } catch (err) {
    const message = err?.data?.error || err?.data?.message || err?.message || 'Erro ao salvar anamnese.'
    listError.value = message
    payload.onError?.(message)
  } finally {
    saving.value = false
  }
}

async function removeItem(id) {
  if (!confirm('Excluir esta anamnese?')) return
  try {
    await patchAnamneses(nextAnamneseList(null, id))
    if (activeId.value === id) activeId.value = ''
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || 'Erro ao excluir.'
  }
}
</script>

<style scoped>
.pawork-card-menu :deep(.cf-tile-actions-dropdown) {
  min-width: 9.5rem;
  border-radius: var(--cf-radius-control) !important;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
}

.pawork-card-menu :deep(.cf-tile-actions-item) {
  font-weight: 500;
}

.pawork-card-menu :deep(.cf-tile-actions-item:first-child),
.pawork-card-menu :deep(.cf-tile-actions-item:last-child),
.pawork-card-menu :deep(.cf-tile-actions-item:only-child) {
  border-radius: 0;
}

.pawork-card-menu :deep(.cf-tile-actions-item--edit) {
  color: #374151;
}

.pawork-history-actions .pawork-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
</style>
