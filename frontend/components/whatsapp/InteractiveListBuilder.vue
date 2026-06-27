<template>
  <section class="list-builder">
    <div class="list-builder-help">
      <span class="list-builder-help-badge">?</span>
      <span><b>REPLY</b>: responde no chat | <b>URL</b>: abre link | <b>COPY</b>: copia texto | <b>CALL</b>: inicia chamada</span>
    </div>

    <div class="list-builder-block">
      <div class="field field--float list-builder-field">
        <label for="list-section-title">Nova seção</label>
        <input
          id="list-section-title"
          v-model="sectionTitle"
          class="cf-squircle cf-squircle--control"
          type="text"
          placeholder="Ex: Serviços"
          :disabled="disabled"
          @keydown.enter.prevent="addSection"
        />
      </div>
      <button type="button" class="btn-primary list-builder-btn" :disabled="disabled || !sectionTitle.trim()" @click="addSection">
        Adicionar seção
      </button>
    </div>

    <div class="list-builder-block">
      <div class="list-builder-grid">
        <div class="field field--float list-builder-field">
          <label for="list-item-label">Título do item</label>
          <input id="list-item-label" v-model="itemLabel" class="cf-squircle cf-squircle--control" type="text" placeholder="Título do item" :disabled="disabled" />
        </div>
        <div class="field field--float list-builder-field">
          <label for="list-item-desc">Descrição</label>
          <input id="list-item-desc" v-model="itemDescription" class="cf-squircle cf-squircle--control" type="text" placeholder="Opcional" :disabled="disabled" />
        </div>
      </div>
      <div class="list-builder-row">
        <div class="field field--float list-builder-field">
          <label for="list-item-id">ID interno</label>
          <input id="list-item-id" v-model="itemId" class="cf-squircle cf-squircle--control" type="text" placeholder="Opcional" :disabled="disabled" />
        </div>
        <div class="field field--float list-builder-field list-builder-field--type">
          <label for="list-item-type">Tipo</label>
          <SharedCfSelect
            id="list-item-type"
            v-model="itemType"
            :options="actionTypeOptions"
            :disabled="disabled"
          />
        </div>
        <button type="button" class="btn-primary list-builder-btn" :disabled="disabled || !itemLabel.trim()" @click="addItem">
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
.list-builder { display: grid; gap: 12px; min-width: 0; }
.list-builder-help {
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
.list-builder-help-badge {
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
.list-builder-block {
  display: grid;
  gap: 10px;
  padding: 14px 12px 12px;
  background: #f4f7f6;
  border-radius: var(--cf-radius-md);
  border: 1.5px solid #e8ece9;
  min-width: 0;
}
.list-builder-field { margin-top: 0; min-width: 0; }
.list-builder-field :deep(label) { background: #f4f7f6; }
.list-builder-field--type :deep(.cf-select-trigger) { min-height: 2.75rem; }
.list-builder-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-width: 0;
  align-items: end;
}
@media (min-width: 640px) {
  .list-builder-row { grid-template-columns: 1fr 120px auto; }
}
.list-builder-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-width: 0;
}
@media (min-width: 520px) {
  .list-builder-grid { grid-template-columns: 1fr 1fr; }
}
.list-builder-btn { min-height: 2.5rem; font-size: 0.88rem; white-space: nowrap; }
.list-builder-preview {
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-md);
  padding: 10px 12px;
  background: #fff;
  max-height: 180px;
  overflow-y: auto;
}
.list-builder-preview-title { margin: 0 0 8px; font-weight: 700; color: #333d3b; font-size: 0.84rem; }
.list-builder-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.list-builder-list-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.list-builder-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: var(--cf-radius-sm);
  padding: 4px 10px;
  background: #f4f7f6;
  color: #333d3b;
  font-size: 0.8rem;
  word-break: break-word;
  min-width: 0;
}
.list-builder-chip.is-section {
  background: rgba(139, 150, 124, 0.15);
  color: var(--primary, #8B967C);
  font-weight: 700;
}
.list-builder-remove {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: #8696a0;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
}
.list-builder-remove:hover { color: #b3261e; }
.list-builder-empty { margin: 0; color: #8696a0; font-size: 0.84rem; }
</style>
