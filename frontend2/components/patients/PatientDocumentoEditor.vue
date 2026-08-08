<template>
  <div class="pdoc-page">
    <div class="pdoc-split">
      <section class="pdoc-editor-col">
        <nav class="pdoc-breadcrumb" aria-label="Navegação">
          <NuxtLink to="/dashboard" class="pdoc-crumb">Página inicial</NuxtLink>
          <span class="pdoc-crumb-sep" aria-hidden="true">›</span>
          <NuxtLink to="/usuarios" class="pdoc-crumb">Pacientes</NuxtLink>
          <span class="pdoc-crumb-sep" aria-hidden="true">›</span>
          <NuxtLink :to="patientProfileUrl" class="pdoc-crumb">{{ user?.name || 'Paciente' }}</NuxtLink>
          <span class="pdoc-crumb-sep" aria-hidden="true">›</span>
          <span class="pdoc-crumb pdoc-crumb--current" aria-current="page">Documentos</span>
        </nav>

        <header class="pdoc-editor-head">
          <input
            ref="categoryRef"
            v-model="draft.category"
            class="pdoc-editor-head__category"
            type="text"
            maxlength="80"
            placeholder="Tipo do documento"
            aria-label="Tipo do documento"
          >
          <input
            ref="titleRef"
            v-model="draft.title"
            class="pdoc-editor-head__title"
            type="text"
            maxlength="160"
            placeholder="Novo documento"
            aria-label="Título do documento"
          >
          <div class="pdoc-editor-head__controls">
            <PatientDocumentoTemplatePicker
              v-model="draft.templateId"
              :templates="templateOptions"
              @change="onTemplateChange"
            />
            <button type="button" class="btn-secondary pdoc-toolbar-btn" @click="saveAsTemplate">
              Salvar Modelo
            </button>
          </div>
        </header>

        <div class="pdoc-editor-body">
        <PatientAnamneseRichEditor
          ref="editorRef"
          v-model="draft.content"
          placeholder="Escreva aqui o conteúdo do documento"
          aria-label="Conteúdo do documento"
        >
          <template #actions>
            <div ref="rewriteMenuRef" class="pdoc-rewrite-wrap">
              <button
                type="button"
                class="pdoc-rewrite-btn"
                :class="{ 'pdoc-rewrite-btn--loading': rewriting }"
                :disabled="rewriting"
                @click="rewriteOpen = !rewriteOpen"
              >
                <Sparkles :size="14" />
                {{ rewriting ? 'Reescrevendo…' : 'Rewrite' }}
              </button>
              <div v-if="rewriteOpen" class="pdoc-rewrite-menu">
                <button type="button" class="pdoc-rewrite-option" @click="rewriteSelection('formal')">
                  Mais formal
                </button>
                <button type="button" class="pdoc-rewrite-option" @click="rewriteSelection('simple')">
                  Mais simples
                </button>
                <div class="pdoc-rewrite-custom">
                  <textarea
                    v-model="rewriteInstruction"
                    rows="2"
                    placeholder="Instrução personalizada…"
                  />
                  <button type="button" class="pdoc-rewrite-option" @click="rewriteSelection('custom')">
                    Aplicar instrução
                  </button>
                </div>
              </div>
            </div>
          </template>
        </PatientAnamneseRichEditor>
        </div>

        <footer class="pdoc-editor-foot">
          <div class="pdoc-editor-foot-left">
            <button type="button" class="pdoc-link-btn" @click="downloadPdf">Baixar PDF</button>
            <span class="pdoc-foot-dot" aria-hidden="true">·</span>
            <button type="button" class="pdoc-link-btn" @click="printPreview">Imprimir</button>
            <p v-if="errorMessage" class="pdoc-msg pdoc-msg--error">{{ errorMessage }}</p>
            <p v-else-if="successMessage" class="pdoc-msg pdoc-msg--ok">{{ successMessage }}</p>
          </div>
          <div class="pdoc-editor-foot-actions">
            <NuxtLink :to="documentsListUrl" class="btn-secondary pdoc-action-btn">Cancelar</NuxtLink>
            <button
              type="button"
              class="btn-primary pdoc-action-btn"
              :disabled="saving || !canSave"
              @click="saveDraft"
            >
              {{ saving ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </footer>
      </section>

      <aside class="pdoc-preview-col">
        <div class="pdoc-preview-toolbar">
          <label class="pdoc-preview-model">
            <select v-model="draft.previewModelId" aria-label="Modelo de visualização">
              <option
                v-for="model in DOCUMENTO_PREVIEW_MODELS"
                :key="model.id"
                :value="model.id"
              >
                {{ model.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="pdoc-preview-stage">
        <PatientDocumentoPreview
          ref="previewRef"
          variant="large"
          :kicker="draft.category || activeTemplate.category"
          :title="draft.title"
          :content="draft.content"
          :patient-name="patientName"
          :patient-cpf="patientCpf"
          :author-name="authorName"
          :author-crn="crn"
        />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import { useNutriProfessionalProfile } from '~/composables/useNutriProfessionalProfile.js'
import { formatCpfMask } from '~/composables/useQuickAddPatient.js'
import PatientAnamneseRichEditor from '~/components/patients/PatientAnamneseRichEditor.vue'
import PatientDocumentoPreview from '~/components/patients/PatientDocumentoPreview.vue'
import PatientDocumentoTemplatePicker from '~/components/patients/PatientDocumentoTemplatePicker.vue'
import { downloadDocumentoPdf } from '~/utils/documento-pdf.js'
import { buildPatientPath } from '~/utils/patient-slug.js'
import {
  DOCUMENTO_LIMIT,
  DOCUMENTO_PREVIEW_MODELS,
  findDocumentoTemplate,
  getAllDocumentoTemplates,
  htmlToPlainText,
  saveCustomDocumentoTemplate,
} from '~/utils/documento-templates.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  documentos: { type: Array, default: () => [] },
  seed: { type: Object, default: null },
  documentoRouteId: { type: String, default: '' },
})

const emit = defineEmits(['save', 'cancel', 'saved'])

const apiBase = useApiBase()
const { verifiedUser } = useAuthSession()
const { crn } = useNutriProfessionalProfile()

const editorRef = ref(null)
const previewRef = ref(null)
const titleRef = ref(null)
const categoryRef = ref(null)
const rewriteMenuRef = ref(null)
const saving = ref(false)
const rewriting = ref(false)
const rewriteOpen = ref(false)
const rewriteInstruction = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editingId = ref('')
const skipTemplateApply = ref(false)
const templateOptions = ref(getAllDocumentoTemplates())

const draft = reactive({
  category: 'Documento',
  title: 'Novo documento',
  content: '',
  templateId: 'blank',
  previewModelId: 'florescer',
})

const patientName = computed(() => props.user?.name || '—')
const patientProfileUrl = computed(() => {
  if (!props.user?.id) return '/usuarios'
  return buildPatientPath(props.user)
})
const documentsListUrl = computed(() => {
  if (!props.user?.id) return '/usuarios'
  return buildPatientPath(props.user, { query: { tab: 'documentos' } })
})
const patientCpf = computed(() => formatCpfMask(props.profile?.cpf || '') || '—')
const authorName = computed(() => verifiedUser.value?.name || 'Nutricionista')
const activeTemplate = computed(() => findDocumentoTemplate(draft.templateId))

const canSave = computed(() => Boolean(String(draft.title || '').trim() || htmlToPlainText(draft.content)))

function applySeed() {
  const seed = props.seed
  successMessage.value = ''
  errorMessage.value = ''
  skipTemplateApply.value = true

  if (!seed || seed.type === 'new') {
    editingId.value = ''
    applyTemplate('blank', true)
    return
  }

  if (seed.type === 'edit' && seed.item) {
    editingId.value = seed.item.id
    draft.title = seed.item.title || 'Documento'
    draft.content = seed.item.content || ''
    draft.templateId = seed.item.templateId || 'blank'
    draft.previewModelId = seed.item.previewModelId || 'florescer'
    draft.category = seed.item.category
      || findDocumentoTemplate(seed.item.templateId || 'blank').category
      || 'Documento'
    nextTick(() => editorRef.value?.setHtml?.(draft.content))
  }
}

function applyTemplate(templateId, force = false) {
  const template = findDocumentoTemplate(templateId)
  draft.templateId = template.id
  if (!force && htmlToPlainText(draft.content)) return
  draft.category = template.category
  draft.title = template.title
  draft.content = template.content
  nextTick(() => editorRef.value?.setHtml?.(draft.content))
}

function onTemplateChange() {
  if (skipTemplateApply.value) {
    skipTemplateApply.value = false
    return
  }
  if (htmlToPlainText(draft.content) && !window.confirm('Substituir o conteúdo atual pelo modelo selecionado?')) {
    skipTemplateApply.value = true
    draft.templateId = props.seed?.item?.templateId || 'blank'
    return
  }
  applyTemplate(draft.templateId, true)
}

watch(() => props.seed, () => {
  applySeed()
  templateOptions.value = getAllDocumentoTemplates()
  nextTick(() => {
    editorRef.value?.setHtml?.(draft.content || '')
    titleRef.value?.focus?.()
  })
}, { immediate: true, deep: true })

function refreshTemplateOptions() {
  templateOptions.value = getAllDocumentoTemplates()
}

function saveAsTemplate() {
  const label = window.prompt('Nome do modelo:', draft.title || 'Meu modelo')
  if (!label?.trim()) return
  try {
    const saved = saveCustomDocumentoTemplate({
      label: label.trim(),
      title: draft.title,
      content: draft.content,
    })
    refreshTemplateOptions()
    draft.templateId = saved.id
    successMessage.value = 'Modelo salvo e disponível no seletor.'
    errorMessage.value = ''
  } catch (err) {
    errorMessage.value = err?.message || 'Erro ao salvar modelo.'
  }
}

async function rewriteSelection(mode) {
  rewriteOpen.value = false
  const html = editorRef.value?.getSelectedHtml?.()
  if (!html) {
    errorMessage.value = 'Selecione um trecho de texto no editor para reescrever.'
    return
  }

  rewriting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const data = await $fetch(
      `${apiBase.value}/patients/${props.user.id}/documentos/rewrite`,
      authFetchInit({
        method: 'POST',
        body: {
          html,
          mode,
          instruction: rewriteInstruction.value,
          documentTitle: draft.title,
        },
      }),
    )
    editorRef.value?.replaceSelectedHtml?.(String(data?.html || ''))
    successMessage.value = 'Trecho reescrito. Revise antes de salvar.'
  } catch (err) {
    errorMessage.value = err?.data?.message || err?.message || 'Falha ao reescrever trecho.'
  } finally {
    rewriting.value = false
  }
}

function pdfPayload() {
  return {
    kicker: draft.category || activeTemplate.value.category,
    title: draft.title,
    content: draft.content,
    patientName: patientName.value,
    patientCpf: patientCpf.value,
    authorName: authorName.value,
    authorCrn: crn.value,
  }
}

async function downloadPdf() {
  if (!htmlToPlainText(draft.content)) {
    errorMessage.value = 'Escreva o conteúdo antes de gerar o PDF.'
    return
  }
  try {
    await downloadDocumentoPdf(pdfPayload())
    successMessage.value = 'PDF baixado.'
    errorMessage.value = ''
  } catch {
    errorMessage.value = 'Erro ao gerar PDF.'
  }
}

function onDocumentClick(event) {
  if (rewriteOpen.value && !rewriteMenuRef.value?.contains(event.target)) {
    rewriteOpen.value = false
  }
}

onMounted(() => {
  if (import.meta.client) document.addEventListener('mousedown', onDocumentClick)
})

onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('mousedown', onDocumentClick)
})

function nextDocumentosList(nextItem, removeId = '') {
  const current = Array.isArray(props.documentos) ? [...props.documentos] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, DOCUMENTO_LIMIT)
}

async function patchDocumentos(nextList) {
  const updated = await $fetch(`${apiBase.value}/users/${props.user.id}`, authFetchInit({
    method: 'PATCH',
    body: {
      patientProfile: {
        documentos: nextList,
      },
    },
  }))
  emit('saved', updated)
  return updated
}

async function saveDraft() {
  if (!canSave.value || !props.user?.id || saving.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const now = new Date().toISOString()
    const existing = props.documentos.find((item) => item.id === editingId.value)
    const item = {
      id: editingId.value || crypto.randomUUID(),
      category: draft.category.trim() || activeTemplate.value.category || 'Documento',
      title: draft.title.trim() || 'Documento',
      content: draft.content,
      templateId: draft.templateId,
      previewModelId: draft.previewModelId,
      status: 'published',
      authorName: authorName.value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    await patchDocumentos(nextDocumentosList(item))
    editingId.value = item.id
    emit('save', item)
    try {
      await downloadDocumentoPdf(pdfPayload())
      successMessage.value = 'Documento salvo e PDF gerado.'
    } catch {
      successMessage.value = 'Documento salvo. Não foi possível gerar o PDF automaticamente.'
    }
  } catch (err) {
    errorMessage.value = err?.data?.error || err?.data?.message || 'Erro ao salvar documento.'
  } finally {
    saving.value = false
  }
}

function printPreview() {
  const page = previewRef.value?.pageRef
  const pageEl = page?.$el ?? page
  if (!pageEl?.outerHTML || !import.meta.client) return
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${draft.title || 'Documento'}</title>
        <style>
          body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
          @page { size: A4; margin: 16mm; }
          .popreview-bg__logo { opacity: 0.07 !important; }
        </style>
      </head>
      <body>${pageEl.outerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
</script>

<style scoped>
.pdoc-page {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.pdoc-split {
  container-type: inline-size;
  container-name: pdoc-split;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  overflow: hidden;
}

.pdoc-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  padding: 0.55rem 1.15rem 0;
  font-size: 0.72rem;
  color: #9aa39a;
  flex-shrink: 0;
}

.pdoc-crumb {
  color: inherit;
  text-decoration: none;
}

.pdoc-crumb--btn {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.pdoc-crumb--btn:hover,
.pdoc-crumb:hover {
  color: #2c322c;
}

.pdoc-crumb--current {
  color: #8b6bb8;
  font-weight: 500;
}

.pdoc-crumb-sep {
  color: #c5cbc6;
}

.pdoc-editor-col {
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-shadow: 6px 0 22px rgba(15, 23, 42, 0.07);
}

.pdoc-editor-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.18rem;
  flex-shrink: 0;
  padding: 2.35rem 1.15rem 0.9rem;
  border-bottom: none;
}

.pdoc-editor-head__category,
.pdoc-editor-head__title {
  width: 100%;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  min-height: auto !important;
  padding: 0 !important;
  margin: 0;
  font: inherit;
  line-height: 1.35;
  color: #8a9288 !important;
  outline: none;
  cursor: text;
}

.pdoc-editor-head__category {
  font-size: 0.72rem !important;
  font-weight: 500 !important;
}

.pdoc-editor-head__category:not(:placeholder-shown) {
  color: #9aa39a !important;
}

.pdoc-editor-head__category::placeholder {
  color: #9aa39a;
  opacity: 1;
}

.pdoc-editor-head__title {
  font-size: 0.95rem !important;
  font-weight: 500 !important;
}

.pdoc-editor-head__title:not(:placeholder-shown) {
  color: #6b7368 !important;
  font-weight: 600 !important;
}

.pdoc-editor-head__title::placeholder {
  color: #9aa39a;
  opacity: 1;
}

.pdoc-editor-head__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  width: 100%;
  margin-top: 0.95rem;
}

.pdoc-editor-head__controls :deep(.pdoc-picker) {
  flex: 1 1 auto;
  width: auto;
  min-width: 10rem;
  max-width: 22rem;
}

.pdoc-editor-head__controls :deep(.pdoc-picker-trigger) {
  min-height: 2.1rem;
  padding: 0.35rem 0.65rem;
}

.pdoc-editor-head__controls :deep(.pdoc-picker-trigger__text) {
  font-size: 0.8125rem;
  font-weight: 500;
}

.pdoc-toolbar-btn,
.pdoc-action-btn {
  min-height: 2.1rem !important;
  padding: 0.35rem 0.85rem !important;
  font-size: 0.8125rem !important;
  font-weight: 500 !important;
  text-decoration: none !important;
}

.pdoc-editor-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 1.15rem 0.65rem;
}

.pdoc-editor-body :deep(.pare) {
  flex: 1 1 auto;
  min-height: 0 !important;
  height: 100% !important;
  max-height: none !important;
  display: flex;
  flex-direction: column;
  border: 1px solid #e8ece9 !important;
  border-radius: var(--cf-radius-control) !important;
  corner-shape: squircle;
  background: #fff;
  overflow: hidden;
}

.pdoc-editor-body :deep(.pare-toolbar) {
  flex-shrink: 0;
  padding: 0.35rem 0.65rem;
  border-bottom: 1px solid #ecefed;
  background: #fff;
}

.pdoc-editor-body :deep(.pare-size-btn),
.pdoc-editor-body :deep(.pare-icon-btn) {
  min-height: 1.85rem;
  font-size: 0.72rem;
}

.pdoc-editor-body :deep(.pare-icon-btn) {
  width: 1.85rem;
}

.pdoc-editor-body :deep(.pare-shell),
.pdoc-editor-body :deep(.pare-editor-shell) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pdoc-editor-body :deep(.pare-editor) {
  flex: 1 1 auto;
  min-height: 0 !important;
  max-height: none !important;
  height: auto;
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-y: auto;
}

.pdoc-editor-body :deep(.pare-editor p) {
  margin: 0 0 0.45rem;
}

.pdoc-editor-body :deep(.pare-editor p:last-child) {
  margin-bottom: 0;
}

.pdoc-editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 0.7rem 1.15rem 0.85rem;
  border-top: 1px solid #ecefed;
  background: #fff;
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.06);
  position: relative;
  z-index: 2;
}

.pdoc-editor-foot-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}

.pdoc-link-btn {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7368;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.12em;
}

.pdoc-link-btn:hover {
  color: #2c322c;
}

.pdoc-foot-dot {
  color: #c5cbc6;
  font-size: 0.8125rem;
}

.pdoc-editor-foot-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-left: auto;
}

.pdoc-preview-col {
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #eef0f2;
  border-top: 1px solid #e4e7ea;
  overflow: hidden;
}

.pdoc-preview-toolbar {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.75rem 1rem 0.35rem;
}

.pdoc-preview-model {
  display: block;
}

.pdoc-preview-model select {
  min-height: 2rem;
  padding: 0.3rem 1.85rem 0.3rem 0.65rem;
  border: 1px solid #dfe3e6;
  border-radius: var(--cf-radius-control);
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7368' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 0.5rem center;
  appearance: none;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.pdoc-preview-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.25rem 1.25rem;
  overflow-y: auto;
}

.pdoc-preview-stage :deep(.popreview-wrap--large) {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdoc-preview-stage :deep(.popreview-wrap--large .popreview-page) {
  width: auto;
  height: 100%;
  max-height: 100%;
  max-width: min(100%, 36rem);
  aspect-ratio: 210 / 297;
}

@container pdoc-split (max-width: 680px) {
  .pdoc-split {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .pdoc-preview-col {
    order: -1;
    min-height: 20rem;
  }

  .pdoc-editor-col {
    min-height: 24rem;
  }
}

.pdoc-rewrite-wrap {
  position: relative;
}

.pdoc-rewrite-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.85rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid transparent;
  border-radius: var(--cf-radius-control);
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #fbbf24, #a78bfa, #60a5fa) border-box;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.pdoc-rewrite-btn:disabled {
  cursor: wait;
  opacity: 0.72;
}

.pdoc-rewrite-btn--loading {
  opacity: 0.85;
}

.pdoc-rewrite-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 50;
  width: min(16rem, 70vw);
  padding: 0.35rem;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-shadow: 0 12px 32px rgba(28, 32, 28, 0.12);
}

.pdoc-rewrite-option {
  display: block;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: none;
  border-radius: calc(var(--cf-radius-control) - 0.15rem);
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 0.8125rem;
  color: #2c322c;
  cursor: pointer;
}

.pdoc-rewrite-option:hover {
  background: #f3f5f3;
}

.pdoc-rewrite-custom {
  display: grid;
  gap: 0.35rem;
  padding: 0.35rem 0.15rem 0.15rem;
  border-top: 1px solid #eef1ee;
  margin-top: 0.25rem;
}

.pdoc-rewrite-custom textarea {
  width: 100%;
  min-height: 3rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  font: inherit;
  font-size: 0.8125rem;
  resize: vertical;
}

.pdoc-msg {
  margin: 0;
  font-size: 0.8125rem;
}

.pdoc-msg--error {
  color: #b42318;
}

.pdoc-msg--ok {
  color: #15803d;
}
</style>
