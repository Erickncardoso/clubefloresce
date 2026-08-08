<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="sheetOpen"
        class="pd-sheet-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="editingId ? 'Editar documento' : 'Novo documento'"
      >
        <div class="pd-sheet" @click.stop>
          <header class="pd-sheet-head">
            <div class="pd-sheet-head-main">
              <input
                ref="titleRef"
                v-model="draft.title"
                class="pd-sheet-title"
                type="text"
                maxlength="160"
                placeholder="Novo documento"
                aria-label="Título do documento"
              >
              <div class="pd-sheet-tools">
                <label class="pd-template-field">
                  <span class="pd-template-field__label">Tipo do documento</span>
                  <select v-model="draft.templateId" class="pd-template-select" @change="onTemplateChange">
                    <option
                      v-for="template in DOCUMENTO_TEMPLATES"
                      :key="template.id"
                      :value="template.id"
                    >
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <button type="button" class="btn-secondary pd-tool-btn" disabled title="Em breve">
                  Salvar Modelo
                </button>
              </div>
            </div>
            <button type="button" class="pd-close" aria-label="Fechar" @click="close">
              <X :size="18" />
            </button>
          </header>

          <div class="pd-sheet-body">
            <div class="pd-editor-col">
              <PatientAnamneseRichEditor
                ref="editorRef"
                v-model="draft.content"
                placeholder="Escreva aqui o conteúdo do documento"
                aria-label="Conteúdo do documento"
              >
                <template #actions>
                  <button type="button" class="pd-rewrite-btn" disabled title="Em breve">
                    <Sparkles :size="14" />
                    Rewrite
                  </button>
                </template>
              </PatientAnamneseRichEditor>
            </div>

            <aside class="pd-preview-col">
              <label class="pd-preview-model">
                <span>Visualização</span>
                <select v-model="draft.previewModelId">
                  <option
                    v-for="model in DOCUMENTO_PREVIEW_MODELS"
                    :key="model.id"
                    :value="model.id"
                  >
                    {{ model.label }}
                  </option>
                </select>
              </label>

              <PatientDocumentoPreview
                ref="previewRef"
                :title="draft.title"
                :content="draft.content"
                :patient-name="patientName"
                :patient-cpf="patientCpf"
                :author-name="authorName"
              />
            </aside>
          </div>

          <footer class="pd-sheet-foot">
            <div class="pd-foot-left">
              <button type="button" class="btn-secondary pd-foot-btn" @click="printPreview">
                <Printer :size="15" />
                Imprimir
              </button>
            </div>

            <div class="pd-foot-right">
              <p v-if="errorMessage" class="pd-msg pd-msg--error">{{ errorMessage }}</p>
              <p v-else-if="successMessage" class="pd-msg pd-msg--ok">{{ successMessage }}</p>
              <button type="button" class="btn-secondary pd-foot-btn" @click="close">Cancelar</button>
              <button
                type="button"
                class="btn-primary pd-foot-btn"
                :disabled="saving || !canSave"
                @click="saveDraft"
              >
                {{ saving ? 'Salvando…' : 'Salvar' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup>
import { computed, defineModel, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Printer, Sparkles, X } from 'lucide-vue-next'
import { authFetchInit, useAuthSession } from '~/composables/useAuthSession.js'
import { formatCpfMask } from '~/composables/useQuickAddPatient.js'
import PatientAnamneseRichEditor from '~/components/patients/PatientAnamneseRichEditor.vue'
import PatientDocumentoPreview from '~/components/patients/PatientDocumentoPreview.vue'
import {
  DOCUMENTO_LIMIT,
  DOCUMENTO_PREVIEW_MODELS,
  DOCUMENTO_TEMPLATES,
  findDocumentoTemplate,
  htmlToPlainText,
} from '~/utils/documento-templates.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  documentos: { type: Array, default: () => [] },
  seed: { type: Object, default: null },
})

const emit = defineEmits(['saved'])

const sheetOpen = defineModel('sheetOpen', { type: Boolean, default: false })

const apiBase = useApiBase()
const { verifiedUser } = useAuthSession()

const editorRef = ref(null)
const previewRef = ref(null)
const titleRef = ref(null)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const editingId = ref('')
const skipTemplateApply = ref(false)

const draft = reactive({
  title: 'Novo Documento',
  content: '',
  templateId: 'blank',
  previewModelId: 'florescer',
})

const patientName = computed(() => props.user?.name || '—')
const patientCpf = computed(() => formatCpfMask(props.profile?.cpf || '') || '—')
const authorName = computed(() => verifiedUser.value?.name || 'Nutricionista')

const canSave = computed(() => Boolean(String(draft.title || '').trim() || htmlToPlainText(draft.content)))

function lockScroll(active) {
  if (!import.meta.client) return
  document.body.style.overflow = active ? 'hidden' : ''
}

function applySeed() {
  const seed = props.seed
  errorMessage.value = ''
  successMessage.value = ''
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
  }
}

function applyTemplate(templateId, force = false) {
  const template = findDocumentoTemplate(templateId)
  draft.templateId = template.id
  if (!force && htmlToPlainText(draft.content)) return
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

watch(sheetOpen, (isOpen) => {
  if (isOpen) {
    applySeed()
    lockScroll(true)
    nextTick(() => {
      editorRef.value?.setHtml?.(draft.content || '')
      titleRef.value?.focus?.()
    })
    return
  }
  lockScroll(false)
})

function close() {
  sheetOpen.value = false
}

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
  if (!canSave.value || !props.user?.id) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const now = new Date().toISOString()
    const existing = props.documentos.find((item) => item.id === editingId.value)
    const item = {
      id: editingId.value || crypto.randomUUID(),
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
    successMessage.value = 'Documento salvo com sucesso.'
  } catch (err) {
    errorMessage.value = err?.data?.error || err?.data?.message || 'Erro ao salvar documento.'
  } finally {
    saving.value = false
  }
}

function printPreview() {
  const page = previewRef.value?.pageRef
  if (!page || !import.meta.client) return
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
        </style>
      </head>
      <body>${page.outerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function onKeydown(event) {
  if (event.key === 'Escape' && sheetOpen.value) close()
}

onMounted(() => {
  if (import.meta.client) window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  lockScroll(false)
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.pd-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 10100;
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
  width: 100vw;
  max-width: 100vw;
  height: 100dvh;
  margin: 0;
  padding: 0;
  background: rgba(28, 32, 28, 0.45);
  backdrop-filter: blur(2px);
  box-sizing: border-box;
}

.pd-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  height: min(96dvh, 100%);
  margin: 0;
  background: #f7f8f6;
  border-radius: var(--cf-radius-md, 1.25rem) var(--cf-radius-md, 1.25rem) 0 0;
  box-shadow: 0 -16px 48px rgba(28, 32, 28, 0.2);
  overflow: hidden;
  box-sizing: border-box;
}

.pd-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.5rem 0.9rem;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
  flex-shrink: 0;
}

.pd-sheet-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.pd-sheet-title {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c322c;
  outline: none;
}

.pd-sheet-title::placeholder {
  color: #9aa39a;
  font-weight: 500;
}

.pd-sheet-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.45rem;
}

.pd-template-field {
  display: grid;
  gap: 0.2rem;
}

.pd-template-field__label,
.pd-preview-model span {
  font-size: 0.68rem;
  font-weight: 500;
  color: #8a9288;
}

.pd-template-select,
.pd-preview-model select {
  min-height: 2.35rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  font-size: 0.82rem;
  color: #2c322c;
}

.pd-tool-btn,
.pd-foot-btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.pd-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  flex-shrink: 0;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: #6b7368;
  cursor: pointer;
}

.pd-sheet-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
  gap: 1rem;
  padding: 1rem 1.5rem;
  overflow: hidden;
}

.pd-editor-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pd-editor-col :deep(.pare) {
  height: 100%;
  min-height: 0;
}

.pd-editor-col :deep(.pare-editor-shell) {
  min-height: 100%;
}

.pd-preview-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow: auto;
}

.pd-preview-model {
  display: grid;
  gap: 0.2rem;
}

.pd-rewrite-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--cf-radius-control);
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #fbbf24, #a78bfa, #60a5fa) border-box;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  cursor: not-allowed;
  opacity: 0.72;
}

.pd-sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.85rem 1.5rem 1.1rem;
  background: #fff;
  border-top: 1px solid #e8ece9;
  flex-shrink: 0;
}

.pd-foot-left,
.pd-foot-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.pd-foot-left .pd-foot-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.pd-msg {
  margin: 0;
  font-size: 0.78rem;
}

.pd-msg--error {
  color: #b42318;
}

.pd-msg--ok {
  color: #15803d;
}

@media (max-width: 980px) {
  .pd-sheet-body {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .pd-preview-col {
    order: -1;
  }
}
</style>
