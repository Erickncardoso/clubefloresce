<template>
  <Teleport to="body">
    <Transition name="mpqs-pop">
      <div v-if="open" class="modal-overlay mpqs-overlay" @click.self="close">
        <div
          class="modal-card mpqs-modal admin-shell admin-shell-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mpqs-title"
          @click.stop
        >
          <header class="mpqs-head">
            <h2 id="mpqs-title">Salvar como modelo qualitativo</h2>
            <button type="button" class="mpqs-close" aria-label="Fechar" @click="close">
              <X aria-hidden="true" />
            </button>
          </header>

          <p class="mpqs-hint">
            O texto formatado e as anotações finais serão salvos na sua biblioteca para reutilizar com outras pacientes.
          </p>

          <div class="field field--float">
            <label for="mpqs-name">Nome do modelo</label>
            <input
              id="mpqs-name"
              ref="nameRef"
              v-model="name"
              type="text"
              maxlength="120"
              placeholder="Ex.: Plano comportamental base"
              @keydown.enter.prevent="submit"
            >
          </div>

          <label class="mpqs-check">
            <input v-model="includeNotes" type="checkbox">
            <span>Incluir anotações finais no modelo</span>
          </label>

          <p v-if="error" class="mpqs-error">{{ error }}</p>

          <div class="mpqs-actions">
            <button type="button" class="btn-secondary mpqs-btn" @click="close">Cancelar</button>
            <button type="button" class="btn-primary mpqs-btn" :disabled="saving" @click="submit">
              {{ saving ? 'Salvando…' : 'Salvar modelo' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useMealPlanQualitativeTemplates } from '~/composables/useMealPlanQualitativeTemplates.js'
import { htmlToQualitativeText } from '~/utils/meal-plan-qualitative-html.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  editorHtml: { type: String, default: '' },
  finalNotes: { type: String, default: '' },
  defaultName: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const { saveTemplate } = useMealPlanQualitativeTemplates()

const nameRef = ref(null)
const name = ref('')
const includeNotes = ref(true)
const saving = ref(false)
const error = ref('')

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    detachEscListener()
    return
  }
  name.value = props.defaultName?.trim() || ''
  includeNotes.value = true
  error.value = ''
  attachEscListener()
  await nextTick()
  nameRef.value?.focus?.()
})

function onEscKey(event) {
  if (event.key === 'Escape') close()
}

function attachEscListener() {
  if (!import.meta.client) return
  document.addEventListener('keydown', onEscKey)
}

function detachEscListener() {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onEscKey)
}

onBeforeUnmount(detachEscListener)

function close() {
  emit('update:open', false)
}

async function submit() {
  const title = name.value.trim()
  const editorHtml = String(props.editorHtml || '').trim()
  const editorText = htmlToQualitativeText(editorHtml)
  if (!title) {
    error.value = 'Informe um nome para o modelo.'
    return
  }
  if (!editorHtml && !editorText) {
    error.value = 'Escreva o plano qualitativo antes de salvar o modelo.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const item = await saveTemplate({
      title,
      editorHtml,
      editorText,
      finalNotes: includeNotes.value ? String(props.finalNotes || '').trim() : '',
    })
    emit('saved', item)
    close()
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Erro ao salvar modelo.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay.mpqs-overlay {
  position: fixed;
  inset: 0;
  z-index: 1260;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
}

.mpqs-modal {
  width: min(100%, 28rem);
  padding: 1.25rem;
}

.mpqs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.mpqs-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c322c;
}

.mpqs-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
  background: #fff;
  color: #6b7368;
  cursor: pointer;
}

.mpqs-close svg {
  width: 1rem;
  height: 1rem;
}

.mpqs-hint {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  color: #6b7368;
  line-height: 1.4;
}

.mpqs-check {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.75rem 0;
  font-size: 0.8rem;
  color: #374151;
}

.mpqs-error {
  margin: 0 0 0.75rem;
  font-size: 0.82rem;
  color: #b42318;
}

.mpqs-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.mpqs-btn {
  min-height: 2.5rem !important;
}

.mpqs-pop-enter-active,
.mpqs-pop-leave-active {
  transition: opacity 0.2s ease;
}

.mpqs-pop-enter-from,
.mpqs-pop-leave-to {
  opacity: 0;
}
</style>
