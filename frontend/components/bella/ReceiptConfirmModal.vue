<template>
  <Teleport to="body">
    <Transition name="receipt-fade">
      <button
        v-if="open"
        type="button"
        class="receipt-backdrop"
        aria-label="Fechar confirmação do cupom"
        @click="emit('cancel')"
      />
    </Transition>

    <Transition name="receipt-slide">
      <section
        v-if="open"
        class="receipt-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-sheet-title"
      >
        <div class="receipt-handle" aria-hidden="true" />

        <header class="receipt-header">
          <div>
            <p class="receipt-kicker">Vínculo com a base</p>
            <h2 id="receipt-sheet-title" class="receipt-title">
              {{ draft?.storeName || 'Cupom / fatura' }}
            </h2>
            <p class="receipt-meta">
              {{ matchedCount }}/{{ items.length }} na base TBCA/TACO
            </p>
          </div>
          <button type="button" class="receipt-close" aria-label="Fechar" @click="emit('cancel')">
            <X class="receipt-close-icon" />
          </button>
        </header>

        <div v-if="draft?.imageUrl" class="receipt-photo">
          <img :src="draft.imageUrl" alt="Foto do cupom" />
        </div>

        <div v-if="unmatchedCount" class="receipt-alert" role="alert">
          <AlertTriangle class="receipt-alert-icon" aria-hidden="true" />
          <p>
            {{ unmatchedCount }} item(ns) sem correspondência. Toque para buscar na base.
          </p>
        </div>

        <ul class="receipt-list">
          <li
            v-for="(item, index) in items"
            :key="item.id || index"
            class="receipt-item"
            :class="{ 'receipt-item--open': editingIndex === index }"
          >
            <button type="button" class="receipt-item-main" @click="toggleEdit(index)">
              <span class="receipt-item-badge" :class="item.foodId ? 'is-ok' : 'is-warn'">
                {{ item.foodId ? 'Base' : 'Revisar' }}
              </span>
              <span class="receipt-item-text">
                <span class="receipt-item-name">{{ item.name || 'Sem nome' }}</span>
                <span v-if="item.originalName && item.originalName !== item.name" class="receipt-item-raw">
                  Cupom: {{ item.originalName }}
                </span>
              </span>
              <Pencil class="receipt-item-edit" aria-hidden="true" />
            </button>

            <div v-if="editingIndex === index" class="receipt-item-panel">
              <label class="receipt-field">
                <span>Alimento na base</span>
                <BellaFoodSearchPicker
                  :model-value="item.name"
                  placeholder="Buscar TBCA / TACO"
                  @update:model-value="updateName(index, $event)"
                  @select="selectFood(index, $event)"
                  @blur-commit="commitName(index, $event)"
                />
              </label>
              <button type="button" class="receipt-remove" @click="removeItem(index)">
                Remover item
              </button>
            </div>
          </li>
        </ul>

        <p v-if="error || localError" class="receipt-error" role="alert">
          {{ error || localError }}
        </p>

        <div class="receipt-actions">
          <button type="button" class="receipt-btn receipt-btn--ghost" :disabled="saving" @click="emit('cancel')">
            Cancelar
          </button>
          <button
            type="button"
            class="receipt-btn receipt-btn--primary"
            :disabled="saving || !items.length"
            @click="onConfirm"
          >
            {{ saving ? 'Salvando…' : 'Confirmar vínculos' }}
          </button>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, Pencil, X } from 'lucide-vue-next'
import { applyFoodMatch } from '~/utils/meal-diary.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const items = ref([])
const editingIndex = ref(-1)
const localError = ref('')
const { matchFoodByName } = useFoodBank()

const matchedCount = computed(() => items.value.filter((item) => Boolean(item.foodId)).length)
const unmatchedCount = computed(() => items.value.length - matchedCount.value)

watch(
  () => [props.open, props.draft],
  async ([open]) => {
    if (!open || !props.draft) return
    localError.value = ''
    editingIndex.value = -1
    items.value = (props.draft.items || []).map((item) => ({ ...item }))
  },
  { immediate: true },
)

function toggleEdit(index) {
  editingIndex.value = editingIndex.value === index ? -1 : index
}

function updateName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  items.value[index] = { ...current, name: rawValue }
}

function selectFood(index, food) {
  const current = items.value[index]
  if (!current || !food) return
  items.value[index] = applyFoodMatch(current, food.name, food)
}

async function commitName(index, rawValue) {
  const current = items.value[index]
  if (!current) return
  if (current.foodId && current.name === rawValue?.trim()) return
  const matched = rawValue?.trim() ? await matchFoodByName(rawValue) : null
  items.value[index] = applyFoodMatch(current, rawValue, matched)
}

function removeItem(index) {
  items.value.splice(index, 1)
  if (editingIndex.value === index) editingIndex.value = -1
}

function onConfirm() {
  if (!items.value.length) {
    localError.value = 'Inclua ao menos um alimento.'
    return
  }
  emit('confirm', items.value.map((item) => ({ ...item })))
}
</script>

<style scoped>
.receipt-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  border: 0;
  background: rgba(20, 16, 18, 0.42);
  cursor: pointer;
}

.receipt-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 81;
  max-height: min(88vh, 720px);
  overflow: auto;
  padding: 0.5rem 1rem calc(1rem + env(safe-area-inset-bottom));
  border-radius: 1.25rem 1.25rem 0 0;
  background: #fff;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
}

.receipt-handle {
  width: 2.5rem;
  height: 0.28rem;
  margin: 0.35rem auto 0.85rem;
  border-radius: 999px;
  background: #ddd;
}

.receipt-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.receipt-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted, #7a7276);
}

.receipt-title {
  margin: 0.15rem 0 0;
  font-size: 1.2rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--cf-text, #1f1a1c);
}

.receipt-meta {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--cf-text-muted, #7a7276);
}

.receipt-close {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: #f3f1f2;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.receipt-close-icon {
  width: 1rem;
  height: 1rem;
}

.receipt-photo {
  margin-bottom: 0.85rem;
  border-radius: 0.85rem;
  overflow: hidden;
  border: 1px solid var(--cf-border, #ebe6e8);
  max-height: 140px;
}

.receipt-photo img {
  display: block;
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.receipt-alert {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-radius: 0.75rem;
  background: #fff7ed;
  color: #9a3412;
  font-size: 0.82rem;
}

.receipt-alert-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.receipt-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.receipt-item {
  border: 1px solid var(--cf-border, #ebe6e8);
  border-radius: 0.85rem;
  overflow: hidden;
  background: #faf9fa;
}

.receipt-item-main {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 0.8rem;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.receipt-item-badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.22rem 0.45rem;
  border-radius: 999px;
}

.receipt-item-badge.is-ok {
  background: #ecfdf5;
  color: #047857;
}

.receipt-item-badge.is-warn {
  background: #fff7ed;
  color: #c2410c;
}

.receipt-item-text {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.15rem;
}

.receipt-item-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--cf-text, #1f1a1c);
}

.receipt-item-raw {
  font-size: 0.75rem;
  color: var(--cf-text-muted, #7a7276);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-item-edit {
  width: 0.95rem;
  height: 0.95rem;
  color: #9a9195;
  flex-shrink: 0;
}

.receipt-item-panel {
  padding: 0 0.8rem 0.85rem;
  display: grid;
  gap: 0.55rem;
}

.receipt-field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-text-muted, #7a7276);
}

.receipt-remove {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #b91c1c;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.receipt-error {
  margin: 0.75rem 0 0;
  color: #b91c1c;
  font-size: 0.85rem;
}

.receipt-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.55rem;
  margin-top: 1rem;
}

.receipt-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.85rem 1rem;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 650;
  cursor: pointer;
}

.receipt-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.receipt-btn--ghost {
  background: #f3f1f2;
  color: var(--cf-text, #1f1a1c);
}

.receipt-btn--primary {
  background: var(--cf-pink, #c17b80);
  color: #fff;
}

.receipt-fade-enter-active,
.receipt-fade-leave-active {
  transition: opacity 0.2s ease;
}

.receipt-fade-enter-from,
.receipt-fade-leave-to {
  opacity: 0;
}

.receipt-slide-enter-active,
.receipt-slide-leave-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
}

.receipt-slide-enter-from,
.receipt-slide-leave-to {
  transform: translateY(18%);
  opacity: 0;
}
</style>
