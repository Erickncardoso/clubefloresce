<template>
  <div ref="rootRef" class="ptp" :class="{ 'ptp--open': menuOpen }">
    <div
      class="ptp-field cf-squircle cf-squircle--control"
      :class="{ 'ptp-field--open': menuOpen }"
      @click="toggleMenu"
    >
      <div class="ptp-selected">
        <span
          v-for="tag in modelValue"
          :key="tag.id || tag.name"
          class="ptp-chip"
          :style="{ background: softColor(tag.color), color: tag.color || '#64748B' }"
          @click.stop
        >
          {{ tag.name }}
          <button type="button" aria-label="Remover tag" @click.stop="removeTag(tag)">
            <X :size="12" />
          </button>
        </span>
        <span v-if="!modelValue.length" class="ptp-placeholder">{{ placeholder }}</span>
      </div>

      <button
        type="button"
        class="ptp-trigger"
        :aria-expanded="menuOpen"
        :aria-label="modelValue.length ? 'Adicionar tag' : placeholder"
        @click.stop="toggleMenu"
      >
        <ChevronDown :size="16" />
      </button>
    </div>

    <div v-if="menuOpen" class="ptp-menu" role="listbox" @click.stop>
      <div class="ptp-menu-head">Selecionar Tags</div>

      <div class="ptp-search">
        <Search :size="14" class="ptp-search-icon" />
        <input
          ref="searchRef"
          v-model="search"
          type="search"
          placeholder="Buscar tags..."
          @keydown.esc.prevent="closeMenu"
        >
      </div>

      <div class="ptp-menu-body">
        <p v-if="loading" class="ptp-empty">Carregando…</p>
        <p v-else-if="!filteredCatalog.length" class="ptp-empty">Nenhuma tag criada.</p>
        <div
          v-for="tag in filteredCatalog"
          :key="tag.id"
          class="ptp-option"
          :class="{ 'ptp-option--active': isSelected(tag) }"
          role="option"
          :aria-selected="isSelected(tag)"
          @click="toggleTag(tag)"
        >
          <span class="ptp-dot" :style="{ background: tag.color }" />
          <span class="ptp-option-name">{{ tag.name }}</span>
          <span class="ptp-option-actions">
            <Check v-if="isSelected(tag)" :size="14" class="ptp-check" />
            <button
              type="button"
              class="ptp-option-delete"
              :aria-label="`Excluir tag ${tag.name}`"
              :disabled="deletingId === tag.id"
              @click.stop="deleteCatalogTag(tag)"
            >
              <Trash2 :size="14" />
            </button>
          </span>
        </div>
      </div>

      <p v-if="menuError" class="ptp-menu-error">{{ menuError }}</p>

      <button type="button" class="ptp-create-row" @click="openCreate">
        <Plus :size="15" />
        Criar tag
      </button>
    </div>

    <Teleport to="body">
      <div v-if="createOpen" class="ptp-create-overlay" @click.self="createOpen = false">
        <div class="ptp-create-modal" role="dialog" aria-modal="true" aria-label="Criar Tag">
          <header class="ptp-create-header">
            <div>
              <h3>Criar Tag</h3>
              <button type="button" class="ptp-back" @click="createOpen = false">
                <ChevronLeft :size="14" />
                Voltar
              </button>
            </div>
          </header>

          <div class="field field--float">
            <label for="ptp-name">Nome</label>
            <input
              id="ptp-name"
              v-model="createName"
              maxlength="40"
              placeholder="Ex: VIP"
              @keydown.enter.prevent="submitCreate"
            >
          </div>

          <div class="ptp-colors">
            <span class="ptp-colors-label">Cor</span>
            <div class="ptp-swatches">
              <button
                v-for="color in TAG_COLORS"
                :key="color"
                type="button"
                class="ptp-swatch"
                :class="{ 'ptp-swatch--active': createColor === color }"
                :style="{ background: color }"
                :aria-label="`Cor ${color}`"
                @click="createColor = color"
              />
            </div>
          </div>

          <p v-if="createError" class="ptp-create-error">{{ createError }}</p>

          <button
            type="button"
            class="btn-primary ptp-create-submit"
            :disabled="creating || !createName.trim()"
            @click="submitCreate"
          >
            {{ creating ? 'Criando…' : 'Criar Tag' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { Check, ChevronDown, ChevronLeft, Plus, Search, Trash2, X } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'

const TAG_COLORS = [
  '#8B967C',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#0891B2',
  '#2563EB',
  '#4F46E5',
  '#DB2777',
  '#64748B',
  '#92400E',
]

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Pesquise/Selecione' },
})

const emit = defineEmits(['update:modelValue'])

const apiBase = useApiBase()
const rootRef = ref(null)
const searchRef = ref(null)
const menuOpen = ref(false)
const createOpen = ref(false)
const loading = ref(false)
const creating = ref(false)
const deletingId = ref('')
const createError = ref('')
const menuError = ref('')
const search = ref('')
const catalog = ref([])
const createName = ref('')
const createColor = ref(TAG_COLORS[0])

const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return catalog.value
  return catalog.value.filter((tag) => tag.name.toLowerCase().includes(q))
})

function softColor(hex) {
  const color = String(hex || '#64748B')
  return `${color}22`
}

function normalizeTagColor(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw
  return TAG_COLORS[0]
}

function toTagItem(tag) {
  return {
    id: tag.id,
    name: tag.name,
    color: normalizeTagColor(tag.color),
  }
}

function isSelected(tag) {
  return props.modelValue.some(
    (item) => item.id === tag.id || item.name.toLowerCase() === tag.name.toLowerCase(),
  )
}

function removeTag(tag) {
  emit(
    'update:modelValue',
    props.modelValue.filter(
      (item) => !(item.id === tag.id || item.name.toLowerCase() === tag.name.toLowerCase()),
    ),
  )
}

function toggleTag(tag) {
  if (isSelected(tag)) {
    removeTag(tag)
    return
  }
  if (props.modelValue.length >= 20) return
  emit('update:modelValue', [...props.modelValue, toTagItem(tag)])
}

async function deleteCatalogTag(tag) {
  if (!tag?.id || deletingId.value) return
  const ok = window.confirm(`Excluir a tag "${tag.name}"?`)
  if (!ok) return

  deletingId.value = tag.id
  menuError.value = ''
  try {
    await $fetch(`${apiBase.value}/users/patient-tags/${encodeURIComponent(tag.id)}`, authFetchInit({
      method: 'DELETE',
    }))
    catalog.value = catalog.value.filter((item) => item.id !== tag.id)
    removeTag(tag)
  } catch (err) {
    menuError.value = err?.data?.error || 'Erro ao excluir tag.'
  } finally {
    deletingId.value = ''
  }
}

async function loadCatalog() {
  loading.value = true
  try {
    const data = await $fetch(`${apiBase.value}/users/patient-tags`, authFetchInit())
    catalog.value = Array.isArray(data?.tags) ? data.tags : []
  } catch {
    catalog.value = []
  } finally {
    loading.value = false
  }
}

async function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) {
    search.value = ''
    menuError.value = ''
    await loadCatalog()
    nextTick(() => searchRef.value?.focus())
  }
}

function closeMenu() {
  menuOpen.value = false
}

function openCreate() {
  createName.value = search.value.trim()
  createColor.value = TAG_COLORS[0]
  createError.value = ''
  createOpen.value = true
  menuOpen.value = false
}

async function submitCreate() {
  const name = createName.value.trim()
  if (!name) return
  creating.value = true
  createError.value = ''
  try {
    const data = await $fetch(`${apiBase.value}/users/patient-tags`, authFetchInit({
      method: 'POST',
      body: { name, color: normalizeTagColor(createColor.value) },
    }))
    const tag = data?.tag
    if (tag) {
      const saved = toTagItem(tag)
      catalog.value = [...catalog.value.filter((item) => item.id !== saved.id), saved]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      if (!isSelected(saved) && props.modelValue.length < 20) {
        emit('update:modelValue', [...props.modelValue, saved])
      }
    }
    createOpen.value = false
  } catch (err) {
    const status = err?.statusCode || err?.status || err?.response?.status
    const apiError = err?.data?.error || err?.response?._data?.error
    if (status === 401 || status === 403) {
      createError.value = 'Sessão expirada. Faça login novamente.'
    } else if (apiError) {
      createError.value = apiError
    } else if (!status || status === 0 || status >= 500) {
      createError.value = 'Servidor indisponível. Tente novamente em instantes.'
    } else {
      createError.value = 'Erro ao criar tag.'
    }
  } finally {
    creating.value = false
  }
}

function onDocumentClick(event) {
  if (!rootRef.value?.contains(event.target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})

async function openMenu() {
  if (!menuOpen.value) await toggleMenu()
}

defineExpose({ openMenu })
</script>

<style scoped>
.ptp {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.ptp-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.75rem;
  width: 100%;
  padding: 0 0.75rem 0 0.9rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.ptp-field--open {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.08);
}

.ptp-field:hover {
  border-color: #b8d4b4;
}

.ptp-field--open .ptp-trigger {
  color: #6b8f64;
}

.ptp-field--open .ptp-trigger :deep(svg) {
  transform: rotate(180deg);
  transition: transform 0.15s ease;
}

.ptp-selected {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  min-height: 1.25rem;
}

.ptp-placeholder {
  color: #9ca3af;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1;
}

.ptp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  padding: 0.28rem 0.55rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.ptp-chip button {
  border: none;
  background: transparent;
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  opacity: 0.75;
  flex-shrink: 0;
}

.ptp-trigger {
  display: grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  margin-right: -0.05rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s ease, background 0.15s ease;
}

.ptp-trigger :deep(svg) {
  transition: transform 0.15s ease;
}

.ptp-trigger:hover {
  color: #6b8f64;
  background: rgba(139, 150, 124, 0.08);
}

.ptp-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 120;
  width: 100%;
  background: #fff;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 12px 28px rgba(28, 32, 28, 0.12);
  overflow: hidden;
  box-sizing: border-box;
}

.ptp-menu-head {
  padding: 0.75rem 0.75rem 0.4rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #111827;
}

.ptp-search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0.75rem 0.65rem;
  padding: 0 0.75rem;
  min-height: 2.5rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  box-sizing: border-box;
}

.ptp-search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.ptp-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  color: #111827;
  padding: 0.65rem 0;
}

.ptp-search input::-webkit-search-cancel-button {
  display: none;
}

.ptp-menu-body {
  max-height: 12rem;
  overflow-x: hidden;
  overflow-y: auto;
  border-top: 1px solid #eef1ee;
  border-bottom: 1px solid #eef1ee;
}

.ptp-empty {
  margin: 0;
  padding: 0.85rem 0.75rem 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

.ptp-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  padding: 0.7rem 0.75rem 0.7rem 0.9rem;
  font: inherit;
  font-size: 0.88rem;
  color: #2c322c;
  cursor: pointer;
  text-align: left;
}

.ptp-option:hover,
.ptp-option--active {
  background: rgba(139, 150, 124, 0.12);
}

.ptp-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 0.3rem;
  flex-shrink: 0;
}

.ptp-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.ptp-option-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.ptp-check {
  color: #6b8f64;
  flex-shrink: 0;
}

.ptp-option-delete {
  display: grid;
  place-items: center;
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.ptp-option-delete:hover:not(:disabled) {
  color: #c53030;
  background: rgba(197, 48, 48, 0.1);
}

.ptp-option-delete:disabled {
  opacity: 0.45;
  cursor: wait;
}

.ptp-menu-error {
  margin: 0;
  padding: 0.55rem 0.9rem 0;
  color: #c53030;
  font-size: 0.82rem;
}

.ptp-create-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  padding: 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}

.ptp-create-row:hover {
  background: rgba(139, 150, 124, 0.1);
}

.ptp-create-overlay {
  position: fixed;
  inset: 0;
  z-index: 6200;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.4);
}

.ptp-create-modal {
  width: min(420px, 100%);
  background: #fff;
  border-radius: min(var(--cf-radius-surface), 1.25rem);
  padding: 1.25rem 1.35rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.ptp-create-modal .field--float {
  position: relative;
  margin-top: 0.35rem;
}

.ptp-create-modal .field--float > label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 600;
  color: #6b7368;
}

.ptp-create-modal .field input {
  width: 100%;
  min-height: 3.1rem;
  padding: 0.95rem 0.9rem 0.85rem;
  border: 1.5px solid #e8ece9;
  border-radius: 0.85rem !important;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #fff;
  box-shadow: none;
}

.ptp-create-modal .field input:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: none;
}

.ptp-create-modal .btn-primary.ptp-create-submit {
  min-height: 3.1rem;
  border-radius: 0.85rem !important;
}

.ptp-create-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #2c322c;
}

.ptp-back {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  margin-top: 0.35rem;
  border: none;
  background: transparent;
  color: #6b7368;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.ptp-colors-label {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7368;
}

.ptp-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.ptp-swatch {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: min(var(--cf-radius-control), 0.55rem);
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.ptp-swatch--active {
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.35);
  border-color: #fff;
}

.ptp-create-error {
  margin: 0;
  color: #c53030;
  font-size: 0.86rem;
}

.ptp-create-submit {
  width: 100%;
  justify-content: center;
}

@supports (corner-shape: squircle) {
  .ptp-field.cf-squircle--control,
  .ptp-menu,
  .ptp-search {
    corner-shape: squircle;
  }
}
</style>
