<template>
  <div ref="rootEl" class="food-picker" :class="{ 'food-picker--open': open }">
    <div class="food-picker-input-wrap">
      <input
        ref="inputEl"
        :value="modelValue"
        type="text"
        class="food-picker-input"
        :placeholder="placeholder"
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="food-picker-toggle"
        :aria-expanded="open"
        aria-label="Buscar na base de alimentos"
        @mousedown.prevent
        @click="toggleOpen"
      >
        <ChevronDown class="food-picker-chevron" :class="{ 'food-picker-chevron--open': open }" />
      </button>
    </div>

    <div v-if="open" class="food-picker-panel" role="listbox">
      <div class="food-picker-panel-head">
        <Search class="food-picker-search-icon" />
        <input
          ref="searchEl"
          v-model="searchQuery"
          type="search"
          class="food-picker-search"
          placeholder="Digite para buscar (TBCA / TACO)…"
          autocomplete="off"
          @keydown="onSearchKeydown"
        />
      </div>

      <p v-if="loading" class="food-picker-status">Buscando…</p>
      <p v-else-if="searchError" class="food-picker-status food-picker-status--error">{{ searchError }}</p>
      <p v-else-if="!results.length" class="food-picker-status">
        {{ searchQuery.trim() ? 'Nenhum alimento encontrado.' : 'Digite o nome do alimento.' }}
      </p>

      <ul v-else class="food-picker-results">
        <li
          v-for="(food, idx) in results"
          :key="food.id"
          role="option"
          :aria-selected="idx === activeIndex"
          class="food-picker-option"
          :class="{ 'food-picker-option--active': idx === activeIndex }"
          @mousedown.prevent
          @click="selectFood(food)"
          @mouseenter="activeIndex = idx"
        >
          <span class="food-picker-option-name">{{ food.name }}</span>
          <span class="food-picker-option-meta">
            <span class="food-picker-badge">{{ food.source }}</span>
            {{ food.per100g?.caloriesKcal ?? '—' }} kcal / 100 g
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, Search } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Ex.: Frango grelhado' },
})

const emit = defineEmits(['update:modelValue', 'select', 'blur-commit'])

const { searchFoods } = useFoodBank()

const rootEl = ref(null)
const inputEl = ref(null)
const searchEl = ref(null)
const open = ref(false)
const searchQuery = ref('')
const results = ref([])
const loading = ref(false)
const searchError = ref('')
const activeIndex = ref(-1)

let debounceTimer = null
let skipSearchSync = false

function syncSearchFromModel() {
  if (!skipSearchSync) {
    searchQuery.value = props.modelValue || ''
  }
}

async function runSearch(query) {
  const q = String(query || '').trim()
  loading.value = true
  searchError.value = ''
  activeIndex.value = -1

  try {
    results.value = await searchFoods(q, 25)
  } catch {
    results.value = []
    searchError.value = 'Erro ao buscar alimentos.'
  } finally {
    loading.value = false
  }
}

function scheduleSearch(query) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => runSearch(query), 280)
}

function openPanel(focusSearch = false) {
  open.value = true
  syncSearchFromModel()
  scheduleSearch(searchQuery.value)
  nextTick(() => {
    if (focusSearch) searchEl.value?.focus()
  })
}

function closePanel(commit = false) {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  if (commit) emit('blur-commit', props.modelValue)
}

function toggleOpen() {
  if (open.value) {
    closePanel(true)
  } else {
    openPanel(true)
  }
}

function onInput(event) {
  const value = event.target.value
  emit('update:modelValue', value)
  searchQuery.value = value
  openPanel(false)
  scheduleSearch(value)
}

function onFocus() {
  openPanel(false)
}

function selectFood(food) {
  skipSearchSync = true
  emit('update:modelValue', food.name)
  emit('select', food)
  searchQuery.value = food.name
  skipSearchSync = false
  closePanel(false)
  inputEl.value?.blur()
}

function moveActive(delta) {
  if (!results.value.length) return
  const next = activeIndex.value + delta
  if (next < 0) activeIndex.value = results.value.length - 1
  else if (next >= results.value.length) activeIndex.value = 0
  else activeIndex.value = next
}

function onKeydown(event) {
  if (!open.value && (event.key === 'ArrowDown' || event.key === 'Enter')) {
    openPanel(true)
    event.preventDefault()
    return
  }

  if (!open.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    selectFood(results.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePanel(false)
  }
}

function onSearchKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    selectFood(results.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePanel(false)
  }
}

watch(
  () => searchQuery.value,
  (q) => {
    if (open.value) scheduleSearch(q)
  },
)

watch(
  () => props.modelValue,
  () => syncSearchFromModel(),
)

function onDocumentPointer(event) {
  if (!rootEl.value?.contains(event.target)) {
    closePanel(true)
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  clearTimeout(debounceTimer)
})
</script>

<style scoped>
.food-picker {
  position: relative;
  width: 100%;
}

.food-picker-input-wrap {
  display: flex;
  align-items: stretch;
  border: 1.5px solid var(--pa-border);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.food-picker--open .food-picker-input-wrap {
  border-color: var(--pa-green, #8B967C);
  box-shadow: 0 0 0 2px rgba(45, 138, 78, 0.12);
}

.food-picker-input {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.55rem;
  border: none;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--pa-text);
  background: transparent;
}

.food-picker-input:focus {
  outline: none;
}

.food-picker-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  flex-shrink: 0;
  border: none;
  border-left: 1px solid var(--pa-border);
  background: #f8faf9;
  color: var(--pa-text-muted);
  cursor: pointer;
}

.food-picker-chevron {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s ease;
}

.food-picker-chevron--open {
  transform: rotate(180deg);
}

.food-picker-panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: min(240px, 40dvh);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--pa-border);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.food-picker-panel-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid var(--pa-border);
  background: #f8faf9;
  flex-shrink: 0;
}

.food-picker-search-icon {
  width: 0.95rem;
  height: 0.95rem;
  color: var(--pa-text-muted);
  flex-shrink: 0;
}

.food-picker-search {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0;
  border: none;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--pa-text);
  background: transparent;
}

.food-picker-search:focus {
  outline: none;
}

.food-picker-search::-webkit-search-cancel-button {
  -webkit-appearance: none;
}

.food-picker-status {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.78rem;
  color: var(--pa-text-muted);
}

.food-picker-status--error {
  color: var(--pa-red, #dc2626);
}

.food-picker-results {
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
  overflow-y: auto;
  flex: 1;
}

.food-picker-option {
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
}

.food-picker-option:last-child {
  border-bottom: none;
}

.food-picker-option--active,
.food-picker-option:hover {
  background: var(--cf-green-soft, #eef0eb);
}

.food-picker-option-name {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pa-text);
  line-height: 1.35;
}

.food-picker-option-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  color: var(--pa-text-muted);
}

.food-picker-badge {
  display: inline-block;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background: #e2e8f0;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.02em;
  color: #475569;
}
</style>
