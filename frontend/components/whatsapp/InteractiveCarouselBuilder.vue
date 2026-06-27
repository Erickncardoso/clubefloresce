<template>
  <section class="carousel-builder">
    <p class="carousel-builder-hint">Configure os cartões e os botões com tipo (REPLY/URL/COPY/CALL).</p>
    <div class="carousel-builder-help">
      <span class="carousel-builder-help-badge">?</span>
      <span><b>REPLY</b>: responde no chat | <b>URL</b>: abre link | <b>COPY</b>: copia texto | <b>CALL</b>: inicia chamada</span>
    </div>
    <div v-for="(card, cardIdx) in cards" :key="`card-${cardIdx}`" class="carousel-card-editor">
      <div class="carousel-card-head">
        <strong>Cartão {{ cardIdx + 1 }}</strong>
        <button type="button" class="carousel-remove-card" :disabled="disabled || cards.length === 1" @click="removeCard(cardIdx)">Remover</button>
      </div>
      <div class="field field--float carousel-field">
        <label :for="`carousel-text-${cardIdx}`">Texto do cartão</label>
        <input :id="`carousel-text-${cardIdx}`" v-model="card.text" class="cf-squircle cf-squircle--control" type="text" placeholder="Texto do cartão" :disabled="disabled" @input="syncOut" />
      </div>
      <div class="field field--float carousel-field">
        <label :for="`carousel-image-${cardIdx}`">URL da imagem</label>
        <input :id="`carousel-image-${cardIdx}`" v-model="card.image" class="cf-squircle cf-squircle--control" type="text" placeholder="Opcional" :disabled="disabled" @input="syncOut" />
      </div>

      <div class="carousel-actions">
        <div v-for="(btn, btnIdx) in card.buttons" :key="`btn-${cardIdx}-${btnIdx}`" class="carousel-action-row">
          <div class="field field--float carousel-field">
            <label :for="`carousel-btn-text-${cardIdx}-${btnIdx}`">Texto</label>
            <input :id="`carousel-btn-text-${cardIdx}-${btnIdx}`" v-model="btn.text" class="cf-squircle cf-squircle--control" type="text" placeholder="Texto do botão" :disabled="disabled" @input="syncOut" />
          </div>
          <div class="field field--float carousel-field carousel-field--type">
            <label :for="`carousel-btn-type-${cardIdx}-${btnIdx}`">Tipo</label>
            <SharedCfSelect
              :id="`carousel-btn-type-${cardIdx}-${btnIdx}`"
              v-model="btn.type"
              :options="actionTypeOptions"
              :disabled="disabled"
              @update:model-value="syncOut"
            />
          </div>
          <div class="field field--float carousel-field">
            <label :for="`carousel-btn-id-${cardIdx}-${btnIdx}`">Valor</label>
            <input :id="`carousel-btn-id-${cardIdx}-${btnIdx}`" v-model="btn.id" class="cf-squircle cf-squircle--control" type="text" placeholder="ID/URL/telefone" :disabled="disabled" @input="syncOut" />
          </div>
          <button type="button" class="carousel-remove-btn" :disabled="disabled || card.buttons.length === 1" @click="removeButton(cardIdx, btnIdx)">−</button>
        </div>
        <button type="button" class="btn-secondary carousel-add-btn" :disabled="disabled" @click="addButton(cardIdx)">+ Botão</button>
      </div>
    </div>
    <button type="button" class="btn-primary carousel-add-card" :disabled="disabled" @click="addCard">+ Cartão</button>
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

const makeButton = () => ({ text: '', id: '', type: 'REPLY' })
const makeCard = () => ({ text: '', image: '', buttons: [makeButton()] })
const cards = ref([makeCard()])

const parseModel = (raw) => {
  const blocks = String(raw || '').split(/\n\s*\n/g).map((b) => b.trim()).filter(Boolean)
  if (!blocks.length) return [makeCard()]
  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const card = { text: String(lines[0] || ''), image: String(lines[1] || ''), buttons: [] }
    lines.slice(2).forEach((line) => {
      const [text, id, type] = line.split('|').map((v) => String(v || '').trim())
      if (!text) return
      card.buttons.push({ text, id: id || '', type: (type || 'REPLY').toUpperCase() })
    })
    if (!card.buttons.length) card.buttons.push(makeButton())
    return card
  })
}

watch(() => props.modelValue, (value) => {
  const parsed = parseModel(value)
  if (JSON.stringify(parsed) !== JSON.stringify(cards.value)) cards.value = parsed
}, { immediate: true })

const syncOut = () => {
  const blocks = cards.value.map((card) => {
    const lines = [String(card.text || '').trim(), String(card.image || '').trim()].filter(Boolean)
    card.buttons.forEach((btn) => {
      const text = String(btn.text || '').trim()
      if (!text) return
      const id = String(btn.id || '').trim()
      const type = String(btn.type || 'REPLY').trim().toUpperCase() || 'REPLY'
      lines.push(`${text}|${id}|${type}`)
    })
    return lines.join('\n')
  }).filter(Boolean)
  emit('update:modelValue', blocks.join('\n\n'))
}

const addCard = () => { cards.value.push(makeCard()); syncOut() }
const removeCard = (idx) => { cards.value.splice(idx, 1); if (!cards.value.length) cards.value.push(makeCard()); syncOut() }
const addButton = (cardIdx) => { cards.value[cardIdx].buttons.push(makeButton()); syncOut() }
const removeButton = (cardIdx, btnIdx) => {
  cards.value[cardIdx].buttons.splice(btnIdx, 1)
  if (!cards.value[cardIdx].buttons.length) cards.value[cardIdx].buttons.push(makeButton())
  syncOut()
}
</script>

<style scoped>
.carousel-builder { display: grid; gap: 12px; min-width: 0; }
.carousel-builder-hint { margin: 0; color: #66706e; font-size: 0.82rem; }
.carousel-builder-help {
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
.carousel-builder-help-badge {
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
.carousel-card-editor {
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-md);
  padding: 14px 12px 12px;
  display: grid;
  gap: 10px;
  background: #f4f7f6;
  min-width: 0;
}
.carousel-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #333d3b;
  font-size: 0.88rem;
}
.carousel-field { margin-top: 0; min-width: 0; }
.carousel-field :deep(label) { background: #f4f7f6; }
.carousel-field--type :deep(.cf-select-trigger) { min-height: 2.75rem; }
.carousel-actions { display: grid; gap: 10px; min-width: 0; }
.carousel-action-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  align-items: end;
  padding: 12px 10px 10px;
  background: #fff;
  border-radius: var(--cf-radius-sm);
  border: 1.5px solid #e8ece9;
}
@media (min-width: 640px) {
  .carousel-action-row {
    grid-template-columns: 1fr 120px 1fr 34px;
    padding: 12px 10px 8px;
  }
}
.carousel-remove-btn {
  border: 0;
  background: transparent;
  color: #8696a0;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  height: 34px;
  align-self: center;
}
.carousel-remove-btn:hover:not(:disabled) { color: #b3261e; }
.carousel-add-btn,
.carousel-add-card { min-height: 2.5rem; font-size: 0.88rem; }
.carousel-add-card { width: 100%; }
.carousel-remove-card {
  border: 0;
  background: transparent;
  color: #8696a0;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 6px;
}
.carousel-remove-card:hover:not(:disabled) { color: #b3261e; }
</style>
