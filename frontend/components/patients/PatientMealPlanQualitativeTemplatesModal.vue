<template>
  <Teleport to="body">
    <Transition name="mpqt-pop">
      <div v-if="open" class="modal-overlay mpqt-overlay" @click.self="close">
        <div
          class="modal-card mpqt-modal admin-shell admin-shell-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mpqt-title"
          @click.stop
        >
          <header class="mpqt-head">
            <div>
              <h2 id="mpqt-title">Biblioteca de modelos qualitativos</h2>
              <p>Busque pelo nome e aplique em um clique na prescrição atual.</p>
            </div>
            <button type="button" class="mpqt-close" aria-label="Fechar" @click="close">
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="field field--float mpqt-search">
            <label for="mpqt-search">Buscar modelo</label>
            <input
              id="mpqt-search"
              ref="searchRef"
              v-model="query"
              type="search"
              placeholder="Ex.: comportamental, low carb…"
            >
          </div>

          <p v-if="loading" class="mpqt-status">Carregando modelos…</p>
          <p v-else-if="error" class="mpqt-status mpqt-status--error">{{ error }}</p>
          <p v-else-if="!filtered.length" class="mpqt-status">Nenhum modelo encontrado.</p>

          <ul v-else class="mpqt-list">
            <li v-for="item in filtered" :key="item.id" class="mpqt-item">
              <button type="button" class="mpqt-item__main" @click="apply(item)">
                <strong>{{ item.title }}</strong>
                <span>{{ preview(item) }}</span>
                <small v-if="item.builtin">Modelo do sistema</small>
              </button>
              <button
                v-if="!item.builtin"
                type="button"
                class="mpqt-item__delete"
                aria-label="Excluir modelo"
                @click="remove(item)"
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Trash2, X } from 'lucide-vue-next'
import { useMealPlanQualitativeTemplates } from '~/composables/useMealPlanQualitativeTemplates.js'
import {
  filterQualitativeTemplates,
  previewQualitativeTemplate,
} from '~/utils/meal-plan-qualitative-templates.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'apply'])

const { listAllTemplates, deleteTemplate } = useMealPlanQualitativeTemplates()

const searchRef = ref(null)
const query = ref('')
const loading = ref(false)
const error = ref('')
const templates = ref([])

const filtered = computed(() => filterQualitativeTemplates(query.value, templates.value))

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    detachEscListener()
    return
  }
  query.value = ''
  error.value = ''
  attachEscListener()
  await loadTemplates()
  await nextTick()
  searchRef.value?.focus?.()
})

async function loadTemplates() {
  loading.value = true
  error.value = ''
  try {
    templates.value = await listAllTemplates()
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Erro ao carregar modelos.'
    templates.value = []
  } finally {
    loading.value = false
  }
}

function preview(item) {
  return previewQualitativeTemplate(item)
}

function apply(item) {
  emit('apply', item)
  close()
}

async function remove(item) {
  if (!item?.id || item.builtin) return
  if (!confirm(`Excluir o modelo "${item.title}"?`)) return
  try {
    await deleteTemplate(item.id)
    templates.value = templates.value.filter((row) => row.id !== item.id)
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Erro ao excluir modelo.'
  }
}

function onEscKey(event) {
  if (event.key === 'Escape') close()
}

function attachEscListener() {
  if (!import.meta.client) return
  document.addEventListener('keydown', onEscKey)
}

function detachEscListener() {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onEscKey)
}

onBeforeUnmount(detachEscListener)

function close() {
  emit('update:open', false)
}
</script>

<style scoped>
.modal-overlay.mpqt-overlay {
  position: fixed;
  inset: 0;
  z-index: 1250;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
}

.mpqt-modal {
  width: min(100%, 36rem);
  max-height: min(88vh, 42rem);
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}

.mpqt-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.mpqt-head h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
}

.mpqt-head p {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #6b7368;
}

.mpqt-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid #e8ece9;
  background: #fff;
  color: #6b7368;
  cursor: pointer;
}

.mpqt-close svg {
  width: 1rem;
  height: 1rem;
}

.mpqt-search {
  margin-bottom: 0.75rem;
}

.mpqt-status {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7368;
}

.mpqt-status--error {
  color: #b42318;
}

.mpqt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.mpqt-item {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
}

.mpqt-item__main {
  flex: 1;
  min-width: 0;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e2e8e4;
  background: #f8faf8;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.mpqt-item__main:hover {
  border-color: #cfe3cb;
  background: #fff;
}

.mpqt-item__main strong {
  font-size: 0.84rem;
  color: #2c322c;
}

.mpqt-item__main span {
  font-size: 0.74rem;
  color: #6b7368;
  line-height: 1.35;
}

.mpqt-item__main small {
  font-size: 0.66rem;
  color: #8b967c;
}

.mpqt-item__delete {
  width: 2.25rem;
  border: 1px solid #e2e8e4;
  background: #fff;
  color: #b42318;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mpqt-item__delete svg {
  width: 0.95rem;
  height: 0.95rem;
}

.mpqt-pop-enter-active,
.mpqt-pop-leave-active {
  transition: opacity 0.2s ease;
}

.mpqt-pop-enter-from,
.mpqt-pop-leave-to {
  opacity: 0;
}
</style>
