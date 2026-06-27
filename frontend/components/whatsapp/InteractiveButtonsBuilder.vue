<template>
  <section class="btn-builder">
    <div class="btn-builder-help">
      <span class="btn-builder-help-badge">?</span>
      <span><b>REPLY</b>: responde no chat | <b>URL</b>: abre link | <b>COPY</b>: copia texto | <b>CALL</b>: inicia chamada</span>
    </div>
    <div v-for="(row, idx) in rows" :key="`btn-row-${idx}`" class="btn-builder-row">
      <div class="field field--float btn-builder-field">
        <label :for="`btn-text-${idx}`">Texto</label>
        <input
          :id="`btn-text-${idx}`"
          v-model="row.text"
          class="cf-squircle cf-squircle--control"
          type="text"
          placeholder="Texto do botão"
          :disabled="disabled"
          @input="syncOut"
        />
      </div>
      <div class="field field--float btn-builder-field btn-builder-field--type">
        <label :for="`btn-type-${idx}`">Tipo</label>
        <SharedCfSelect
          :id="`btn-type-${idx}`"
          v-model="row.type"
          :options="actionTypeOptions"
          :disabled="disabled"
          @update:model-value="syncOut"
        />
      </div>
      <div class="field field--float btn-builder-field">
        <label :for="`btn-id-${idx}`">Valor</label>
        <input
          :id="`btn-id-${idx}`"
          v-model="row.id"
          class="cf-squircle cf-squircle--control"
          type="text"
          :placeholder="idPlaceholder(row.type)"
          :disabled="disabled"
          @input="syncOut"
        />
      </div>
      <button type="button" class="btn-builder-remove" :disabled="disabled || rows.length === 1" @click="removeRow(idx)">Remover</button>
    </div>
    <button type="button" class="btn-secondary btn-builder-add" :disabled="disabled" @click="addButton">+ Botão</button>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

const actionTypeOptions = [
  { value: 'REPLY', label: 'REPLY' },
  { value: 'URL', label: 'URL' },
  { value: 'COPY', label: 'COPY' },
  { value: 'CALL', label: 'CALL' }
]

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const rows = ref([{ text: '', id: '', type: 'REPLY' }])
const idPlaceholder = (type) => {
  const safeType = String(type || 'REPLY').toUpperCase()
  if (safeType === 'URL') return 'https://exemplo.com'
  if (safeType === 'CALL') return '5511999999999'
  if (safeType === 'COPY') return 'Texto para copiar'
  return 'ID/valor de resposta'
}

watch(() => props.modelValue, (value) => {
  const parsed = String(value || '').split('\n')
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .map((line) => {
      const [text, id, type] = line.split('|').map((v) => String(v || '').trim())
      return { text, id, type: (type || 'REPLY').toUpperCase() }
    })
    .filter((row) => row.text)
  if (JSON.stringify(parsed) !== JSON.stringify(rows.value)) {
    rows.value = parsed.length ? parsed : [{ text: '', id: '', type: 'REPLY' }]
  }
}, { immediate: true })

const syncOut = () => {
  const serialized = rows.value
    .map((r) => {
      const text = String(r.text || '').trim()
      if (!text) return ''
      const type = String(r.type || 'REPLY').trim().toUpperCase() || 'REPLY'
      const id = String(r.id || '').trim()
      return `${text}|${id}|${type}`
    })
    .filter(Boolean)
    .join('\n')
  emit('update:modelValue', serialized)
}

const addButton = () => {
  rows.value.push({ text: '', id: '', type: 'REPLY' })
}

const removeRow = (idx) => {
  rows.value.splice(idx, 1)
  if (!rows.value.length) rows.value.push({ text: '', id: '', type: 'REPLY' })
  syncOut()
}
</script>

<style scoped>
.btn-builder { display: grid; gap: 10px; min-width: 0; }
.btn-builder-help {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #66706e;
  font-size: 0.78rem;
  line-height: 1.4;
  padding: 10px 12px;
  background: #f4f7f6;
  border-radius: var(--cf-radius-md);
  border: 1.5px solid #e8ece9;
}
.btn-builder-help-badge {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 150, 124, 0.18);
  color: var(--primary, #8B967C);
  font-weight: 700;
  font-size: 0.72rem;
}
.btn-builder-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 14px 12px 12px;
  background: #f4f7f6;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-md);
  min-width: 0;
}
@media (min-width: 640px) {
  .btn-builder-row {
    grid-template-columns: 1fr 120px 1fr auto;
    align-items: end;
    padding: 14px 12px 10px;
  }
}
.btn-builder-field { margin-top: 0; min-width: 0; }
.btn-builder-field :deep(label) { background: #f4f7f6; }
.btn-builder-field--type :deep(.cf-select-trigger) {
  min-height: 2.75rem;
  padding-top: 0.85rem;
}
.btn-builder-remove {
  border: 0;
  background: transparent;
  color: #8696a0;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 8px 6px;
  white-space: nowrap;
  align-self: center;
}
.btn-builder-remove:hover:not(:disabled) { color: #b3261e; }
.btn-builder-add { width: 100%; min-height: 2.5rem; font-size: 0.88rem; }
</style>
