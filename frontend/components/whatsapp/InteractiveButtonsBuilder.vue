<template>
  <section class="btn-builder">
    <div class="btn-builder-help">
      <span class="btn-builder-help-badge">?</span>
      <span><b>REPLY</b>: responde no chat | <b>URL</b>: abre link | <b>COPY</b>: copia texto | <b>CALL</b>: inicia chamada</span>
    </div>
    <div v-for="(row, idx) in rows" :key="`btn-row-${idx}`" class="btn-builder-row">
      <input
        v-model="row.text"
        class="btn-builder-input"
        type="text"
        placeholder="Texto do botão"
        :disabled="disabled"
        @input="syncOut"
      />
      <select v-model="row.type" class="btn-builder-input btn-builder-select" :disabled="disabled" @change="syncOut">
        <option value="REPLY">REPLY</option>
        <option value="URL">URL</option>
        <option value="COPY">COPY</option>
        <option value="CALL">CALL</option>
      </select>
      <input
        v-model="row.id"
        class="btn-builder-input"
        type="text"
        :placeholder="idPlaceholder(row.type)"
        :disabled="disabled"
        @input="syncOut"
      />
      <button type="button" class="btn-builder-remove" :disabled="disabled || rows.length === 1" @click="removeRow(idx)">Remover</button>
    </div>
    <button type="button" class="btn-builder-add" :disabled="disabled" @click="addButton">+ Botão</button>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

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
  if (JSON.stringify(parsed) !== JSON.stringify(rows.value)) rows.value = parsed
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
.btn-builder { display: grid; gap: 10px; margin-top: 8px; }
.btn-builder-help {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.8rem;
}
.btn-builder-help-badge {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(34,197,94,.2);
  color: #22c55e;
  font-weight: 800;
}
.btn-builder-row { display: grid; grid-template-columns: 1fr 120px 1fr auto; gap: 8px; }
.btn-builder-input {
  width: 100%; height: 40px; border: 1px solid rgba(255,255,255,.18); border-radius: 10px;
  background: transparent; color: #f3f4f6; padding: 0 10px; outline: none;
}
.btn-builder-input:focus { border-color: #22c55e; }
.btn-builder-select {
  background: #0b1220;
  color: #f3f4f6;
}
.btn-builder-select option {
  background: #f8fafc;
  color: #0f172a;
}
.btn-builder-add {
  height: 40px; border: 0; border-radius: 10px; padding: 0 12px;
  background: rgba(34,197,94,.2); color: #22c55e; font-weight: 700; cursor: pointer;
}
.btn-builder-remove { border: 0; background: rgba(148,163,184,.2); color: #cbd5e1; cursor: pointer; font-size: .8rem; border-radius: 8px; padding: 0 10px; }
</style>
