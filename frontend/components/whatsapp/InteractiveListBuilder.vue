<template>
  <section class="list-builder">
    <div class="list-builder-help">
      <span class="list-builder-help-badge">?</span>
      <span><b>REPLY</b>: responde no chat | <b>URL</b>: abre link | <b>COPY</b>: copia texto | <b>CALL</b>: inicia chamada</span>
    </div>
    <div class="list-builder-block">
      <label class="list-builder-label">Nova seção</label>
      <div class="list-builder-row list-builder-row--item">
        <input
          v-model="sectionTitle"
          class="list-builder-input"
          type="text"
          placeholder="Ex: Serviços"
          :disabled="disabled"
          @keydown.enter.prevent="addSection"
        />
        <button type="button" class="list-builder-btn" :disabled="disabled || !sectionTitle.trim()" @click="addSection">
          Adicionar seção
        </button>
      </div>
    </div>

    <div class="list-builder-block">
      <label class="list-builder-label">Novo item da lista</label>
      <div class="list-builder-grid">
        <input v-model="itemLabel" class="list-builder-input" type="text" placeholder="Título do item" :disabled="disabled" />
        <input v-model="itemDescription" class="list-builder-input" type="text" placeholder="Descrição (opcional)" :disabled="disabled" />
      </div>
      <div class="list-builder-row">
        <input v-model="itemId" class="list-builder-input" type="text" placeholder="ID interno (opcional)" :disabled="disabled" />
        <select v-model="itemType" class="list-builder-input list-builder-select" :disabled="disabled">
          <option value="REPLY">REPLY</option>
          <option value="URL">URL</option>
          <option value="COPY">COPY</option>
          <option value="CALL">CALL</option>
        </select>
        <button type="button" class="list-builder-btn" :disabled="disabled || !itemLabel.trim()" @click="addItem">
          Adicionar item
        </button>
      </div>
    </div>

    <div class="list-builder-preview">
      <p class="list-builder-preview-title">Estrutura da lista</p>
      <ul v-if="rows.length" class="list-builder-list">
        <li v-for="(row, idx) in rows" :key="`row-${idx}`" class="list-builder-list-item">
          <span class="list-builder-chip" :class="{ 'is-section': row.type === 'section' }">{{ row.raw }}</span>
          <button type="button" class="list-builder-remove" :disabled="disabled" @click="removeRow(idx)">Remover</button>
        </li>
      </ul>
      <p v-else class="list-builder-empty">Adicione seções e itens para montar sua lista.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const sectionTitle = ref('')
const itemLabel = ref('')
const itemDescription = ref('')
const itemId = ref('')
const itemType = ref('REPLY')
const rows = ref([])

const normalizeIncoming = (rawText) => String(rawText || '')
  .split('\n')
  .map((line) => String(line || '').trim())
  .filter(Boolean)
  .map((line) => ({
    type: line.startsWith('[') && line.endsWith(']') ? 'section' : 'item',
    raw: line
  }))

const syncOut = () => {
  emit('update:modelValue', rows.value.map((row) => row.raw).join('\n'))
}

watch(
  () => props.modelValue,
  (value) => {
    const incoming = normalizeIncoming(value)
    const currentSignature = JSON.stringify(rows.value)
    const incomingSignature = JSON.stringify(incoming)
    if (currentSignature !== incomingSignature) rows.value = incoming
  },
  { immediate: true }
)

const toSafeId = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const addSection = () => {
  const label = String(sectionTitle.value || '').trim()
  if (!label) return
  rows.value.push({ type: 'section', raw: `[${label}]` })
  sectionTitle.value = ''
  syncOut()
}

const addItem = () => {
  const label = String(itemLabel.value || '').trim()
  if (!label) return
  const safeId = String(itemId.value || '').trim() || toSafeId(label) || `item_${Date.now()}`
  const description = String(itemDescription.value || '').trim()
  const type = String(itemType.value || 'REPLY').trim().toUpperCase() || 'REPLY'
  const raw = description ? `${label}|${safeId}|${type}|${description}` : `${label}|${safeId}|${type}`
  rows.value.push({ type: 'item', raw })
  itemLabel.value = ''
  itemDescription.value = ''
  itemId.value = ''
  itemType.value = 'REPLY'
  syncOut()
}

const removeRow = (index) => {
  rows.value.splice(index, 1)
  syncOut()
}
</script>

<style scoped>
.list-builder { margin-top: 8px; display: grid; gap: 14px; }
.list-builder-help {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.8rem;
}
.list-builder-help-badge {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  font-weight: 800;
}
.list-builder-block { display: grid; gap: 8px; }
.list-builder-label { font-weight: 600; color: #cbd5e1; }
.list-builder-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.list-builder-row--item { grid-template-columns: 1fr 130px auto; }
.list-builder-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.list-builder-input {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: transparent;
  color: #f3f4f6;
  padding: 0 10px;
  outline: none;
}
.list-builder-input:focus { border-color: #22c55e; }
.list-builder-select {
  padding-right: 8px;
  background: #0b1220;
  color: #f3f4f6;
}
.list-builder-select option {
  background: #f8fafc;
  color: #0f172a;
}
.list-builder-btn {
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  font-weight: 700;
  padding: 0 12px;
  cursor: pointer;
}
.list-builder-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.list-builder-preview {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 10px;
}
.list-builder-preview-title { margin: 0 0 8px; font-weight: 700; color: #e2e8f0; font-size: 0.9rem; }
.list-builder-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.list-builder-list-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.list-builder-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(15, 23, 32, 0.44);
  color: #cbd5e1;
  font-size: 0.82rem;
}
.list-builder-chip.is-section {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
}
.list-builder-remove {
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 0.8rem;
  cursor: pointer;
}
.list-builder-empty { margin: 0; color: #94a3b8; font-size: 0.85rem; }
</style>
