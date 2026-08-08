<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="sheetOpen"
        class="po-sheet-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="editingId ? 'Editar orientação' : 'Nova orientação'"
      >
        <div class="po-sheet" @click.stop>
          <header class="po-sheet-head">
            <div class="po-sheet-head-main">
              <input
                ref="titleRef"
                v-model="draft.title"
                class="po-sheet-title"
                type="text"
                maxlength="160"
                placeholder="Nova Orientação"
                aria-label="Título da orientação"
              >
              <div class="po-sheet-tools">
                <label class="po-template-field">
                  <span class="po-template-field__label">Modelo</span>
                  <select v-model="draft.templateId" class="po-template-select" @change="onTemplateChange">
                    <option
                      v-for="template in ORIENTACAO_TEMPLATES"
                      :key="template.id"
                      :value="template.id"
                    >
                      {{ template.label }}
                    </option>
                  </select>
                </label>
                <button type="button" class="btn-secondary po-tool-btn" disabled title="Em breve">
                  Salvar Modelo
                </button>
              </div>
            </div>
            <button type="button" class="po-close" aria-label="Fechar" @click="close">
              <X :size="18" />
            </button>
          </header>

          <div class="po-sheet-body">
            <div class="po-editor-col">
              <PatientAnamneseRichEditor
                ref="editorRef"
                v-model="draft.content"
                placeholder="Escreva aqui orientações nutricionais para o paciente"
                aria-label="Conteúdo da orientação"
              >
                <template #actions>
                  <button
                    type="button"
                    class="po-rewrite-btn"
                    disabled
                    title="Em breve"
                  >
                    <Sparkles :size="14" />
                    Rewrite
                  </button>
                </template>
              </PatientAnamneseRichEditor>
            </div>

            <aside class="po-preview-col">
              <label class="po-preview-model">
                <span>Visualização</span>
                <select v-model="draft.previewModelId">
                  <option
                    v-for="model in ORIENTACAO_PREVIEW_MODELS"
                    :key="model.id"
                    :value="model.id"
                  >
                    {{ model.label }}
                  </option>
                </select>
              </label>

              <PatientOrientacaoPreview
                ref="previewRef"
                :title="draft.title"
                :content="draft.content"
                :patient-name="patientName"
                :patient-cpf="patientCpf"
                :author-name="authorName"
              />
            </aside>
          </div>

          <footer class="po-sheet-foot">
            <div class="po-foot-left">
              <button type="button" class="btn-secondary po-foot-btn" @click="printPreview">
                <Printer :size="15" />
                Imprimir
              </button>
              <label class="po-blank-toggle">
                <input v-model="blankTemplateMode" type="checkbox">
                <span>Criar modelo em branco</span>
              </label>
            </div>

            <div class="po-foot-right">
              <p v-if="errorMessage" class="po-msg po-msg--error">{{ errorMessage }}</p>
              <p v-else-if="successMessage" class="po-msg po-msg--ok">{{ successMessage }}</p>
              <button type="button" class="btn-secondary po-foot-btn" @click="close">Cancelar</button>
              <button
                type="button"
                class="btn-primary po-foot-btn"
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
import PatientOrientacaoPreview from '~/components/patients/PatientOrientacaoPreview.vue'
import {
  ORIENTACAO_PREVIEW_MODELS,
  ORIENTACAO_TEMPLATES,
  findOrientacaoTemplate,
  htmlToPlainText,
} from '~/utils/orientacao-templates.js'

const props = defineProps({
  user: { type: Object, default: null },
  profile: { type: Object, default: () => ({}) },
  orientacoes: { type: Array, default: () => [] },
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
const blankTemplateMode = ref(false)
const skipTemplateApply = ref(false)

const draft = reactive({
  title: 'Nova Orientação',
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
  blankTemplateMode.value = false
  skipTemplateApply.value = true

  if (!seed || seed.type === 'new') {
    editingId.value = ''
    applyTemplate('blank', true)
    return
  }

  if (seed.type === 'edit' && seed.item) {
    editingId.value = seed.item.id
    draft.title = seed.item.title || 'Orientação'
    draft.content = seed.item.content || ''
    draft.templateId = seed.item.templateId || 'blank'
    draft.previewModelId = seed.item.previewModelId || 'florescer'
  }
}

function applyTemplate(templateId, force = false) {
  const template = findOrientacaoTemplate(templateId)
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

watch(blankTemplateMode, (enabled) => {
  if (!enabled) return
  applyTemplate('blank', true)
})

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

function nextOrientacoesList(nextItem, removeId = '') {
  const current = Array.isArray(props.orientacoes) ? [...props.orientacoes] : []
  if (removeId) return current.filter((item) => item.id !== removeId)
  const idx = current.findIndex((item) => item.id === nextItem.id)
  if (idx >= 0) {
    current[idx] = nextItem
    return current
  }
  return [nextItem, ...current].slice(0, 5)
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

async function saveDraft() {
  if (!canSave.value || !props.user?.id) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const now = new Date().toISOString()
    const existing = props.orientacoes.find((item) => item.id === editingId.value)
    const item = {
      id: editingId.value || crypto.randomUUID(),
      title: draft.title.trim() || 'Orientação',
      content: draft.content,
      templateId: draft.templateId,
      previewModelId: draft.previewModelId,
      status: 'published',
      authorName: authorName.value,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }
    await patchOrientacoes(nextOrientacoesList(item))
    editingId.value = item.id
    successMessage.value = 'Orientação salva com sucesso.'
  } catch (err) {
    errorMessage.value = err?.data?.error || err?.data?.message || 'Erro ao salvar orientação.'
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
        <title>${draft.title || 'Orientação'}</title>
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
.po-sheet-overlay {
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

.po-sheet {
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

.po-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.5rem 0.9rem;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
  flex-shrink: 0;
}

.po-sheet-head-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.po-sheet-title {
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

.po-sheet-title::placeholder {
  color: #9aa39a;
  font-weight: 500;
}

.po-sheet-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.45rem;
}

.po-template-field {
  display: grid;
  gap: 0.2rem;
}

.po-template-field__label,
.po-preview-model span {
  font-size: 0.68rem;
  font-weight: 500;
  color: #8a9288;
}

.po-template-select,
.po-preview-model select {
  min-height: 2.35rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  font-size: 0.82rem;
  color: #2c322c;
}

.po-tool-btn,
.po-foot-btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 500 !important;
}

.po-close {
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

.po-sheet-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem);
  gap: 1rem;
  padding: 1rem 1.5rem;
  overflow: hidden;
}

.po-editor-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.po-editor-col :deep(.pare) {
  height: 100%;
  min-height: 0;
}

.po-editor-col :deep(.pare-editor-shell) {
  min-height: 100%;
}

.po-preview-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow: auto;
}

.po-preview-model {
  display: grid;
  gap: 0.2rem;
}

.po-rewrite-btn {
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

.po-sheet-foot {
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

.po-foot-left,
.po-foot-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.po-foot-left .po-foot-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.po-blank-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: #5f675f;
  cursor: pointer;
}

.po-blank-toggle input {
  width: 0.95rem;
  height: 0.95rem;
  accent-color: #8b967c;
}

.po-msg {
  margin: 0;
  font-size: 0.78rem;
}

.po-msg--error {
  color: #b42318;
}

.po-msg--ok {
  color: #15803d;
}

@media (max-width: 980px) {
  .po-sheet-body {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .po-preview-col {
    order: -1;
  }
}
</style>
