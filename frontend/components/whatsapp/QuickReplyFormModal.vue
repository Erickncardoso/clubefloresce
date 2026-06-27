<template>
  <Teleport to="body">
    <div v-if="open" class="quick-reply-form-overlay" @click.self="$emit('cancel')">
      <div class="quick-reply-form-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header class="quick-reply-form-header">
          <h2 class="quick-reply-form-title">{{ title }}</h2>
          <button type="button" class="quick-reply-form-close" aria-label="Fechar" @click="$emit('cancel')">
            <X class="quick-reply-form-close-icon" />
          </button>
        </header>

        <form class="quick-reply-form-body" @submit.prevent="onSubmit">
          <label class="quick-reply-form-field">
            <span class="quick-reply-form-label">Atalho</span>
            <div class="quick-reply-form-shortcut-row">
              <input
                v-model="localForm.shortCut"
                type="text"
                class="quick-reply-form-input"
                maxlength="25"
                required
                placeholder="saudacao"
              />
              <span class="quick-reply-form-counter">{{ localForm.shortCut.length }}</span>
            </div>
          </label>

          <label v-if="localForm.type !== 'text'" class="quick-reply-form-field">
            <span class="quick-reply-form-label">Tipo</span>
            <select v-model="localForm.type" class="quick-reply-form-input">
              <option value="text">Texto</option>
              <option value="image">Imagem</option>
              <option value="document">Documento</option>
              <option value="video">Vídeo</option>
              <option value="audio">Áudio</option>
            </select>
          </label>

          <label v-if="localForm.type !== 'text'" class="quick-reply-form-field">
            <span class="quick-reply-form-label">URL do arquivo</span>
            <input
              v-model="localForm.file"
              type="text"
              class="quick-reply-form-input"
              required
              placeholder="https://..."
            />
          </label>

          <label v-if="localForm.type === 'document'" class="quick-reply-form-field">
            <span class="quick-reply-form-label">Nome do arquivo (opcional)</span>
            <input v-model="localForm.docName" type="text" class="quick-reply-form-input" />
          </label>

          <label class="quick-reply-form-field">
            <span class="quick-reply-form-label">{{ localForm.type === 'text' ? 'Mensagem da resposta' : 'Legenda (opcional)' }}</span>
            <textarea
              v-model="localForm.text"
              class="quick-reply-form-textarea"
              rows="5"
              :required="localForm.type === 'text'"
              placeholder="Digite a mensagem..."
            />
          </label>

          <p v-if="error" class="quick-reply-form-error">{{ error }}</p>

          <footer class="quick-reply-form-footer">
            <button type="button" class="quick-reply-form-btn quick-reply-form-btn--ghost" @click="$emit('cancel')">
              Cancelar
            </button>
            <button type="submit" class="quick-reply-form-btn quick-reply-form-btn--primary" :disabled="saving">
              <Loader v-if="saving" class="spin quick-reply-form-btn-icon" />
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { X, Loader } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
  reply: { type: Object, default: null },
})

const emit = defineEmits(['cancel', 'save'])

const localForm = reactive({
  id: '',
  shortCut: '',
  type: 'text',
  text: '',
  file: '',
  docName: '',
})

const title = computed(() => (props.reply?.id ? 'Editar resposta rápida' : 'Adicionar resposta rápida'))

watch(
  () => [props.open, props.reply],
  () => {
    if (!props.open) return
    const reply = props.reply
    localForm.id = reply?.id ? String(reply.id) : ''
    localForm.shortCut = String(reply?.shortCut || '').trim()
    localForm.type = String(reply?.type || 'text').toLowerCase()
    localForm.text = String(reply?.text || '').trim()
    localForm.file = String(reply?.file || '').trim()
    localForm.docName = String(reply?.docName || '').trim()
  },
  { immediate: true },
)

const onSubmit = () => {
  emit('save', {
    id: localForm.id || undefined,
    shortCut: localForm.shortCut.trim(),
    type: localForm.type,
    text: localForm.text.trim(),
    file: localForm.file.trim(),
    docName: localForm.docName.trim(),
  })
}
</script>

<style scoped>
.quick-reply-form-overlay {
  position: fixed;
  inset: 0;
  z-index: 10080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(11, 20, 26, 0.45);
}

.quick-reply-form-modal {
  width: min(100%, 520px);
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(11, 20, 26, 0.18);
}

.quick-reply-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 12px;
}

.quick-reply-form-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: #111b21;
}

.quick-reply-form-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #54656f;
  cursor: pointer;
}

.quick-reply-form-close:hover {
  background: rgba(11, 20, 26, 0.06);
}

.quick-reply-form-close-icon {
  width: 20px;
  height: 20px;
}

.quick-reply-form-body {
  padding: 0 20px 20px;
}

.quick-reply-form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-reply-form-label {
  font-size: 0.875rem;
  color: #667781;
}

.quick-reply-form-shortcut-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-reply-form-input,
.quick-reply-form-textarea {
  width: 100%;
  border: 1px solid #e9edef;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  color: #111b21;
  background: #fff;
  box-sizing: border-box;
}

.quick-reply-form-input:focus,
.quick-reply-form-textarea:focus {
  outline: none;
  border-color: #00a884;
}

.quick-reply-form-textarea {
  resize: vertical;
  min-height: 120px;
}

.quick-reply-form-counter {
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: #8696a0;
}

.quick-reply-form-error {
  margin: 0 0 12px;
  color: #ea0038;
  font-size: 0.875rem;
}

.quick-reply-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
}

.quick-reply-form-btn {
  min-width: 96px;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}

.quick-reply-form-btn--ghost {
  background: transparent;
  color: #00a884;
}

.quick-reply-form-btn--primary {
  background: #111b21;
  color: #fff;
}

.quick-reply-form-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-reply-form-btn-icon {
  width: 16px;
  height: 16px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
