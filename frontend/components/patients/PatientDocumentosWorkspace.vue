<template>
  <div class="pawork">
    <header class="pawork-history-head">
      <div>
        <h2>Documentos</h2>
        <p>{{ documentos.length }} registro(s) · limite {{ DOCUMENTO_LIMIT }} por paciente</p>
      </div>
      <div class="pawork-history-actions">
        <NuxtLink
          v-if="canCreateDocument"
          :to="documentEditorPath('novo')"
          class="btn-primary pawork-btn pawork-btn-link"
        >
          + Novo documento
        </NuxtLink>
        <button
          v-else
          type="button"
          class="btn-primary pawork-btn"
          disabled
          :title="createBlockedReason"
        >
          + Novo documento
        </button>
      </div>
    </header>

    <p v-if="listError" class="pawork-error">{{ listError }}</p>

    <div v-if="!documentos.length" class="pawork-empty">
      <PatientChartEmptyState
        :icon="ScrollText"
        title="Crie documentos para seu paciente"
        description="Atestados, declarações, encaminhamentos e outros documentos com cabeçalho personalizável, prontos para imprimir ou enviar."
        action-label="+ Novo documento"
        :action-to="canCreateDocument ? documentEditorPath('novo') : null"
        :counter="`${documentos.length}/${DOCUMENTO_LIMIT}`"
      />
    </div>

    <div v-else class="pawork-list">
      <article
        v-for="item in documentos"
        :key="item.id"
        class="pawork-card"
        :class="{ 'pawork-card--draft': item.status === 'draft' }"
      >
        <NuxtLink :to="documentEditorPath(item.id)" class="pawork-card-main pawork-card-main-link">
          <div class="pawork-card-top">
            <strong>{{ item.title || 'Documento' }}</strong>
            <span class="pawork-status" :class="`pawork-status--${item.status || 'draft'}`">
              {{ documentoStatusLabel(item.status) }}
            </span>
          </div>
          <p class="pawork-card-preview">{{ documentoPreviewText(item) }}</p>
          <small>Atualizado {{ formatDate(item.updatedAt || item.createdAt) }}</small>
        </NuxtLink>
        <div class="pawork-card-actions" @click.stop>
          <SharedCfTileActionsMenu :menu-key="`documento-${item.id}`" class="pawork-card-menu">
            <NuxtLink :to="documentEditorPath(item.id)" class="cf-tile-actions-item" role="menuitem">
              Editar
            </NuxtLink>
            <button type="button" class="cf-tile-actions-item" role="menuitem" @click="downloadItemPdf(item)">
              Baixar PDF
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
</template>

<script setup>
import { computed, ref } from 'vue'
import { ScrollText } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import { useNutriProfessionalProfile } from '~/composables/useNutriProfessionalProfile.js'
import { formatCpfMask } from '~/composables/useQuickAddPatient.js'
import PatientChartEmptyState from '~/components/patients/PatientChartEmptyState.vue'
import { downloadDocumentoPdf } from '~/utils/documento-pdf.js'
import {
  DOCUMENTO_LIMIT,
  documentoPreviewText,
  documentoStatusLabel,
  findDocumentoTemplate,
} from '~/utils/documento-templates.js'
import { buildPatientPath } from '~/utils/patient-slug.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['saved'])

const route = useRoute()
const apiBase = useApiBase()
const listError = ref('')
const { verifiedUser } = useAuthSession()
const { crn } = useNutriProfessionalProfile()

const patientId = computed(() => String(props.user?.id || route.params.id || ''))

const documentos = computed(() => {
  const fromUser = props.user?.patientProfileData?.documentos
  const fromProfile = props.profile?.documentos
  const list = Array.isArray(fromUser) ? fromUser : (Array.isArray(fromProfile) ? fromProfile : [])
  return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
})

const canCreateDocument = computed(() =>
  Boolean(patientId.value) && documentos.value.length < DOCUMENTO_LIMIT,
)

const createBlockedReason = computed(() => {
  if (!patientId.value) return 'Paciente não identificado.'
  if (documentos.value.length >= DOCUMENTO_LIMIT) return `Limite de ${DOCUMENTO_LIMIT} documentos por paciente.`
  return ''
})

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function patientLinkTarget() {
  return {
    id: patientId.value,
    name: props.user?.name,
    urlSlug: props.user?.urlSlug,
  }
}

function documentEditorPath(documentoId) {
  return buildPatientPath(patientLinkTarget(), { suffix: `/documentos/${documentoId}` })
}

async function removeItem(id) {
  if (!id || !patientId.value) return
  if (!confirm('Excluir este documento?')) return
  listError.value = ''
  try {
    const next = documentos.value.filter((item) => item.id !== id)
    const updated = await $fetch(`${apiBase.value}/users/${patientId.value}`, authFetchInit({
      method: 'PATCH',
      body: { patientProfile: { documentos: next } },
    }))
    emit('saved', updated)
  } catch (err) {
    listError.value = err?.data?.message || 'Não foi possível excluir o documento.'
  }
}

async function downloadItemPdf(item) {
  if (!item) return
  listError.value = ''
  try {
    await downloadDocumentoPdf({
      title: item.title || 'Documento',
      content: item.content || '',
      templateId: item.templateId || item.previewModelId || 'blank',
      previewModelId: item.previewModelId || item.templateId || 'florescer',
      patientName: props.user?.name || 'Paciente',
      patientCpf: formatCpfMask(props.profile?.cpf || ''),
      authorName: verifiedUser.value?.name || 'Nutricionista',
      authorCrn: crn.value || '',
      template: findDocumentoTemplate(item.templateId || 'blank'),
    })
  } catch (err) {
    listError.value = err?.message || 'Não foi possível gerar o PDF.'
  }
}
</script>

<style scoped>
.pawork-btn-link {
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pawork-card-main-link {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.pawork-card-main-link:hover {
  color: inherit;
}

.cf-tile-actions-item {
  text-decoration: none;
}
</style>
