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
      <input v-model="card.text" class="carousel-input" type="text" placeholder="Texto do cartão" :disabled="disabled" @input="syncOut" />
      <input v-model="card.image" class="carousel-input" type="text" placeholder="URL da imagem (opcional)" :disabled="disabled" @input="syncOut" />

      <div class="carousel-actions">
        <div v-for="(btn, btnIdx) in card.buttons" :key="`btn-${cardIdx}-${btnIdx}`" class="carousel-action-row">
          <input v-model="btn.text" class="carousel-input" type="text" placeholder="Texto do botão" :disabled="disabled" @input="syncOut" />
          <select v-model="btn.type" class="carousel-input carousel-select" :disabled="disabled" @change="syncOut">
            <option value="REPLY">REPLY</option>
            <option value="URL">URL</option>
            <option value="COPY">COPY</option>
            <option value="CALL">CALL</option>
          </select>
          <input v-model="btn.id" class="carousel-input" type="text" placeholder="ID/URL/telefone" :disabled="disabled" @input="syncOut" />
          <button type="button" class="carousel-remove-btn" :disabled="disabled || card.buttons.length === 1" @click="removeButton(cardIdx, btnIdx)">-</button>
        </div>
        <button type="button" class="carousel-add-btn" :disabled="disabled" @click="addButton(cardIdx)">+ Botão</button>
      </div>
    </div>
    <button type="button" class="carousel-add-card" :disabled="disabled" @click="addCard">+ Cartão</button>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'

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
.carousel-builder { display: grid; gap: 12px; margin-top: 8px; }
.carousel-builder-hint { margin: 0; color: #94a3b8; font-size: .82rem; }
.carousel-builder-help {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.8rem;
}
.carousel-builder-help-badge {
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
.carousel-card-editor { border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 10px; display: grid; gap: 8px; }
.carousel-card-head { display: flex; align-items: center; justify-content: space-between; }
.carousel-input { width: 100%; height: 40px; border: 1px solid rgba(255,255,255,.18); border-radius: 10px; background: transparent; color: #f3f4f6; padding: 0 10px; outline: none; }
.carousel-input:focus { border-color: #22c55e; }
.carousel-select {
  max-width: 120px;
  background: #0b1220;
  color: #f3f4f6;
}
.carousel-select option {
  background: #f8fafc;
  color: #0f172a;
}
.carousel-actions { display: grid; gap: 8px; }
.carousel-action-row { display: grid; grid-template-columns: 1fr 120px 1fr 34px; gap: 8px; align-items: center; }
.carousel-remove-btn,.carousel-add-btn,.carousel-add-card,.carousel-remove-card {
  border: 0; border-radius: 8px; cursor: pointer; padding: 0 10px; height: 34px;
  background: rgba(34,197,94,.2); color: #22c55e; font-weight: 700;
}
.carousel-remove-btn,.carousel-remove-card { background: rgba(148,163,184,.2); color: #cbd5e1; }
</style>
