<template>
  <div class="pawork">
    <header class="pawork-history-head">
      <div>
        <h2>Orientações</h2>
        <p>{{ orientacoes.length }} registro(s) · limite {{ ORIENTACAO_LIMIT }} por paciente</p>
      </div>
      <div class="pawork-history-actions">
        <button
          type="button"
          class="btn-primary pawork-btn"
          :disabled="orientacoes.length >= ORIENTACAO_LIMIT"
          @click="startNew"
        >
          + Nova orientação
        </button>
      </div>
    </header>

    <p v-if="listError" class="pawork-error">{{ listError }}</p>

    <div v-if="!orientacoes.length" class="pawork-empty">
      <PatientChartEmptyState
        :icon="NotebookPen"
        title="Crie orientações para seu paciente"
        description="Registre recomendações, orientações e pontos importantes para acompanhar a jornada do paciente."
        action-label="+ Nova orientação"
        :counter="`${orientacoes.length}/${ORIENTACAO_LIMIT}`"
        @action="startNew"
      />
    </div>

    <div v-else class="pawork-list">
      <article
        v-for="item in orientacoes"
        :key="item.id"
        class="pawork-card"
        :class="{ 'pawork-card--draft': item.status === 'draft' }"
      >
        <button type="button" class="pawork-card-main" @click="editItem(item)">
          <div class="pawork-card-top">
            <strong>{{ item.title || 'Orientação' }}</strong>
            <span class="pawork-status" :class="`pawork-status--${item.status || 'draft'}`">
              {{ orientacaoStatusLabel(item.status) }}
            </span>
          </div>
          <p class="pawork-card-preview">{{ orientacaoPreviewText(item) }}</p>
          <small>Atualizada {{ formatDate(item.updatedAt || item.createdAt) }}</small>
        </button>
        <div class="pawork-card-actions" @click.stop>
          <SharedCfTileActionsMenu :menu-key="`orientacao-${item.id}`" class="pawork-card-menu">
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

    <PatientOrientacaoEditorModal
      v-model:sheet-open="editorOpen"
      :user="user"
      :profile="profile"
      :orientacoes="orientacoes"
      :seed="editorSeed"
      @saved="onSaved"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { NotebookPen } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import PatientChartEmptyState from '~/components/patients/PatientChartEmptyState.vue'
import PatientOrientacaoEditorModal from '~/components/patients/PatientOrientacaoEditorModal.vue'
import {
  ORIENTACAO_LIMIT,
  orientacaoPreviewText,
  orientacaoStatusLabel,
} from '~/utils/orientacao-templates.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['saved'])

const apiBase = useApiBase()
const listError = ref('')
const editorOpen = ref(false)
const editorSeed = ref(null)

const orientacoes = computed(() => {
  const fromUser = props.user?.patientProfileData?.orientacoes
  const fromProfile = props.profile?.orientacoes
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
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
  if (orientacoes.value.length >= ORIENTACAO_LIMIT) {
    listError.value = `Limite de ${ORIENTACAO_LIMIT} orientações por paciente.`
    return
  }
  listError.value = ''
  editorSeed.value = { type: 'new', count: orientacoes.value.length }
  editorOpen.value = true
}

function editItem(item) {
  if (!item?.id) return
  listError.value = ''
  editorSeed.value = { type: 'edit', item }
  editorOpen.value = true
}

function nextOrientacoesList(nextItem, removeId = '') {
  const fromUser = props.user?.patientProfileData?.orientacoes
  const fromProfile = props.profile?.orientacoes
  const source = Array.isArray(fromUser) ? fromUser : fromProfile
  const current = Array.isArray(source) ? [...source] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, ORIENTACAO_LIMIT)
}

async function patchOrientacoes(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        orientacoes: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

async function removeItem(id) {
  if (!id || !props.user?.id) return
  if (!window.confirm('Excluir esta orientação?')) return
  listError.value = ''
  try {
    await patchOrientacoes(nextOrientacoesList(null, id))
  } catch (err) {
    listError.value = err?.data?.error || err?.data?.message || 'Erro ao excluir orientação.'
  }
}

function onSaved(updated) {
  emit('saved', updated)
}
</script>
