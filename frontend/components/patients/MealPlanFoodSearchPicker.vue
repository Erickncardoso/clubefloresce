<template>
  <div ref="rootEl" class="mpfs" :class="{ 'mpfs--open': open }">
    <input
      ref="inputEl"
      :value="modelValue"
      type="text"
      class="mpfs-input"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @keydown="onKeydown"
    >

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="mpfs-panel"
        :style="panelStyle"
        role="listbox"
      >
        <div class="mpfs-panel-head">
          <Clock aria-hidden="true" />
          <span>Itens encontrados</span>
          <small>{{ results.length }} opções</small>
        </div>

        <p v-if="loading" class="mpfs-status">Buscando…</p>
        <p v-else-if="searchError" class="mpfs-status mpfs-status--error">{{ searchError }}</p>
        <p v-else-if="!results.length" class="mpfs-status">
          <template v-if="searchQuery.trim()">
            Nenhum alimento encontrado.
            <small class="mpfs-status-hint">Tente termos da TBCA/TACO, ex.: <strong>pão forma glúten</strong> ou <strong>pão integral</strong>.</small>
          </template>
          <template v-else>Digite o nome do alimento.</template>
        </p>

        <ul v-else class="mpfs-list">
          <li
            v-for="(food, idx) in results"
            :key="food.id"
            role="option"
            :aria-selected="idx === activeIndex"
            class="mpfs-item"
            :class="{ 'mpfs-item--active': idx === activeIndex }"
            @mousedown.prevent
            @click="selectFood(food)"
            @mouseenter="activeIndex = idx"
          >
            <div class="mpfs-item-main">
              <button
                type="button"
                class="mpfs-item-star-btn"
                :class="{ 'mpfs-item-star-btn--active': isFavorite(food.id) }"
                :aria-label="isFavorite(food.id) ? 'Remover dos favoritos' : 'Favoritar alimento'"
                :title="isFavorite(food.id) ? 'Remover dos favoritos' : 'Favoritar alimento'"
                @mousedown.prevent
                @click.stop="toggleFavoriteItem(food)"
              >
                <Star aria-hidden="true" />
              </button>
              <div class="mpfs-item-copy">
                <strong>{{ food.displayName || food.name }}</strong>
                <span class="mpfs-item-meta">
                  <span class="mpfs-badge">{{ formatFoodSourceLabel(food.source) }}</span>
                  Gramas
                </span>
                <small v-if="food.displayName && food.displayName !== food.name" class="mpfs-item-subname">
                  {{ food.name }}
                </small>
              </div>
            </div>
            <div class="mpfs-item-macros">
              <span class="mpfs-kcal">{{ food.per100g?.caloriesKcal ?? '—' }} kcal</span>
              <span class="mpfs-macro-line">
                <span class="mpfs-macro mpfs-macro--c">C: {{ formatMacro(food.per100g?.carbsG) }}</span>
                <span class="mpfs-macro mpfs-macro--p">P: {{ formatMacro(food.per100g?.proteinG) }}</span>
                <span class="mpfs-macro mpfs-macro--f">L: {{ formatMacro(food.per100g?.fatG) }}</span>
              </span>
            </div>
          </li>
        </ul>

        <footer class="mpfs-shortcuts">
          <span><ArrowUpDown aria-hidden="true" /> Navegar</span>
          <span><CornerDownLeft aria-hidden="true" /> Enter Selecionar</span>
          <span>Esc Fechar</span>
        </footer>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ArrowUpDown, Clock, CornerDownLeft, Star } from 'lucide-vue-next'
import { formatFoodSourceLabel } from '~/utils/food-bank.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Digite para buscar na TBCA / TACO' },
})

const emit = defineEmits(['update:modelValue', 'select', 'recipe-trigger'])

const { searchFoods, getFoodById } = useFoodBank()
const { favoriteIds, isFavorite, toggleFavorite, sortWithFavorites } = useFoodFavorites()

const rootEl = ref(null)
const inputEl = ref(null)
const panelEl = ref(null)
const open = ref(false)
const searchQuery = ref('')
const results = ref([])
const loading = ref(false)
const searchError = ref('')
const activeIndex = ref(-1)
const panelStyle = ref({})

let debounceTimer = null

function formatMacro(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}g`
}

function updatePanelPosition() {
  const rect = inputEl.value?.getBoundingClientRect()
  if (!rect) return
  const width = Math.max(rect.width, 420)
  const maxLeft = Math.max(8, window.innerWidth - width - 8)
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${Math.min(rect.left, maxLeft)}px`,
    width: `${width}px`,
    zIndex: 10200,
  }
}

async function loadFavoriteFoods(limit = 10) {
  const ids = favoriteIds.value.slice(0, limit)
  if (!ids.length) return []
  const items = await Promise.all(ids.map((id) => getFoodById(id)))
  return items.filter(Boolean)
}

async function runSearch(query) {
  loading.value = true
  searchError.value = ''
  activeIndex.value = -1
  const q = String(query || '').trim()
  try {
    let items = await searchFoods(q, 20)
    if (!q) {
      const favorites = await loadFavoriteFoods(10)
      const seen = new Set(favorites.map((item) => item.id))
      items = [...favorites, ...items.filter((item) => !seen.has(item.id))].slice(0, 10)
    } else {
      const favorites = await loadFavoriteFoods(50)
      const qLower = q.toLowerCase()
      const matchingFavorites = favorites.filter((item) =>
        String(item.name || '').toLowerCase().includes(qLower),
      )
      const seen = new Set()
      const merged = []
      for (const item of [...matchingFavorites, ...items]) {
        if (!item?.id || seen.has(item.id)) continue
        seen.add(item.id)
        merged.push(item)
      }
      items = sortWithFavorites(merged).slice(0, 10)
    }
    results.value = items
  } catch {
    results.value = []
    searchError.value = 'Erro ao buscar alimentos.'
  } finally {
    loading.value = false
  }
}

function toggleFavoriteItem(food) {
  toggleFavorite(food.id)
  results.value = sortWithFavorites(results.value)
}

function scheduleSearch(query) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => runSearch(query), 260)
}

function openPanel() {
  open.value = true
  searchQuery.value = props.modelValue || ''
  scheduleSearch(searchQuery.value)
  nextTick(() => {
    updatePanelPosition()
    inputEl.value?.focus()
  })
}

function closePanel() {
  open.value = false
  activeIndex.value = -1
}

function onInput(event) {
  const value = event.target.value
  if (String(value).trimStart().startsWith('$')) {
    emit('update:modelValue', '')
    emit('recipe-trigger')
    closePanel()
    return
  }
  emit('update:modelValue', value)
  searchQuery.value = value
  if (!open.value) open.value = true
  scheduleSearch(value)
  nextTick(updatePanelPosition)
}

function onFocus() {
  openPanel()
}

function selectFood(food) {
  const label = food.displayName || food.name
  emit('update:modelValue', label)
  emit('select', food)
  searchQuery.value = label
  closePanel()
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
    openPanel()
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
    closePanel()
  }
}

function onDocumentPointer(event) {
  const target = event.target
  if (rootEl.value?.contains(target) || panelEl.value?.contains(target)) return
  closePanel()
}

function onViewportChange() {
  if (open.value) updatePanelPosition()
}

watch(
  () => props.modelValue,
  (value) => {
    if (!open.value) searchQuery.value = value || ''
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointer)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  clearTimeout(debounceTimer)
})
</script>

<style scoped>
.mpfs {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.mpfs-input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 2rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid #e2e8e4;
  border-radius: var(--cf-radius-sm);
  font-size: 0.8125rem;
  background: #fff;
  color: #2c322c;
  box-sizing: border-box;
}

.mpfs-input:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 2px rgba(45, 90, 39, 0.08);
}

@supports (corner-shape: squircle) {
  .mpfs-input {
    corner-shape: squircle;
  }
}

.mpfs--open .mpfs-input {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 2px rgba(45, 90, 39, 0.08);
}

.mpfs-panel {
  display: flex;
  flex-direction: column;
  max-height: min(360px, 50dvh);
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-sm);
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

@supports (corner-shape: squircle) {
  .mpfs-panel {
    corner-shape: squircle;
  }
}

.mpfs-panel-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  background: #f8faf9;
  border-bottom: 1px solid #eef1ee;
  font-size: 0.78rem;
  font-weight: 400;
  color: #4b5563;
  flex-shrink: 0;
}

.mpfs-panel-head svg {
  width: 0.9rem;
  height: 0.9rem;
}

.mpfs-panel-head small {
  margin-left: auto;
  color: #8a9288;
}

.mpfs-status {
  margin: 0;
  padding: 0.75rem;
  font-size: 0.78rem;
  color: #6b7368;
}

.mpfs-status--error {
  color: #b42318;
}

.mpfs-status-hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  color: #8a9288;
  line-height: 1.4;
}

.mpfs-status-hint strong {
  font-weight: 500;
  color: #5f675f;
}

.mpfs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.mpfs-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #f1f3f2;
  cursor: pointer;
}

.mpfs-item:last-child {
  border-bottom: none;
}

.mpfs-item--active,
.mpfs-item:hover {
  background: rgba(139, 150, 124, 0.12);
}

.mpfs-item--active strong,
.mpfs-item:hover strong {
  color: #5f7560;
}

.mpfs-item--active .mpfs-kcal,
.mpfs-item:hover .mpfs-kcal {
  color: #4a5f48;
}

.mpfs-item-main {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  min-width: 0;
}

.mpfs-item-star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  margin-top: 0.05rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #cbd5e1;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: var(--cf-radius-xs);
}

.mpfs-item-star-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mpfs-item-star-btn:hover {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.mpfs-item-star-btn--active,
.mpfs-item-star-btn--active:hover {
  color: #f59e0b;
}

.mpfs-item-star-btn--active svg {
  fill: currentColor;
}

@supports (corner-shape: squircle) {
  .mpfs-item-star-btn {
    corner-shape: squircle;
  }
}

.mpfs-item-copy strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.35;
  color: #2c322c;
}

.mpfs-item-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  color: #8a9288;
}

.mpfs-item-subname {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.62rem;
  font-weight: 400;
  color: #a3a9a3;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 14rem;
}

.mpfs-badge {
  display: inline-flex;
  padding: 0.05rem 0.35rem;
  border-radius: var(--cf-radius-pill);
  background: #eef0eb;
  font-weight: 500;
  font-size: 0.62rem;
  color: #5f675f;
}

.mpfs-item-macros {
  text-align: right;
  flex-shrink: 0;
}

.mpfs-kcal {
  display: block;
  font-size: 0.8125rem;
  font-weight: 400;
  color: #374151;
}

.mpfs-macro-line {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
  margin-top: 0.1rem;
  font-size: 0.62rem;
  font-weight: 400;
}

.mpfs-macro--c { color: #2563eb; }
.mpfs-macro--p { color: #dc2626; }
.mpfs-macro--f { color: #d97706; }

.mpfs-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  border-top: 1px solid #eef1ee;
  background: #fafbfa;
  font-size: 0.68rem;
  color: #8a9288;
  flex-shrink: 0;
}

.mpfs-shortcuts span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.mpfs-shortcuts svg {
  width: 0.8rem;
  height: 0.8rem;
}
</style>
