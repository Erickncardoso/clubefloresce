<template>
  <Teleport to="body">
    <div v-if="open" class="mpsl-modal" role="dialog" aria-modal="true" aria-labelledby="mpsl-title">
      <div class="mpsl-modal__backdrop" aria-hidden="true" @click="close" />
      <div class="modal-card mpsl-modal__panel admin-shell admin-shell-card" @click.stop>
        <header class="mpsl-modal__head">
          <div class="mpsl-modal__title-wrap">
            <ShoppingCart aria-hidden="true" />
            <h2 id="mpsl-title">Lista de Compras</h2>
          </div>
          <button type="button" class="mpsl-modal__close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="mpsl-modal__body">
          <div class="field field--float mpsl-field">
            <label for="mpsl-title-input">Título</label>
            <input id="mpsl-title-input" v-model="draft.title" type="text" maxlength="80">
          </div>

          <div class="mpsl-period">
            <span class="mpsl-period__label">Período</span>
            <div class="mpsl-period__pills" role="group" aria-label="Período da lista">
              <button
                v-for="period in SHOPPING_LIST_PERIODS"
                :key="period.id"
                type="button"
                class="mpsl-period__btn"
                :class="{ 'mpsl-period__btn--active': draft.periodDays === period.id }"
                @click="setPeriod(period.id)"
              >
                {{ period.label }}
              </button>
            </div>
            <p class="mpsl-period__hint">
              Escala a lista para planos de {{ draft.periodDays }} dias (base: 1 semana do plano).
            </p>
          </div>

          <div class="mpsl-toolbar">
            <button type="button" class="btn-secondary mpsl-toolbar__btn" @click="regenerateFromPlan">
              Atualizar a partir do plano
            </button>
            <button type="button" class="btn-secondary mpsl-toolbar__btn" @click="copyList">
              Copiar lista
            </button>
          </div>

          <div class="field field--float mpsl-field mpsl-field--list">
            <label for="mpsl-items">Itens da lista</label>
            <textarea
              id="mpsl-items"
              v-model="draft.customText"
              rows="10"
              placeholder="Um item por linha. Use ## Categoria para seções."
            />
          </div>

          <p v-if="notice" class="mpsl-notice">{{ notice }}</p>
          <p v-if="errorMessage" class="mpsl-error">{{ errorMessage }}</p>

          <div class="mpsl-smart-wrap">
            <button
              type="button"
              class="mpsl-smart-btn"
              :disabled="smartLoading || !remainingUses"
              @click="runSmartList"
            >
              <Sparkles v-if="!smartLoading" aria-hidden="true" />
              <span>{{ smartLoading ? 'Organizando…' : 'Lista Inteligente' }}</span>
            </button>
            <span class="mpsl-smart-meta">
              {{ remainingUses }}/{{ SHOPPING_LIST_SMART_LIMIT }} usos restantes
            </span>
          </div>
        </div>

        <footer class="mpsl-modal__foot">
          <button type="button" class="btn-secondary mpsl-modal__btn" @click="close">Cancelar</button>
          <button type="button" class="btn-primary mpsl-modal__btn" @click="save">Salvar alterações</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ShoppingCart, Sparkles, X } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import {
  SHOPPING_LIST_PERIODS,
  SHOPPING_LIST_SMART_LIMIT,
  buildShoppingListFromPlan,
  normalizeShoppingList,
  organizeShoppingListLocally,
  smartListRemainingUses,
} from '~/utils/meal-plan-shopping-list.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  shoppingList: { type: Object, default: null },
  meals: { type: Array, default: () => [] },
  methodology: { type: String, default: 'foods' },
  planTitle: { type: String, default: '' },
  autoSmart: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'save'])

const apiBase = useApiBase()
const draft = reactive(normalizeShoppingList(null))
const notice = ref('')
const errorMessage = ref('')
const smartLoading = ref(false)

const remainingUses = computed(() => smartListRemainingUses(draft))

watch(() => props.open, (value) => {
  if (!value) return
  notice.value = ''
  errorMessage.value = ''
  const normalized = normalizeShoppingList(props.shoppingList)
  draft.title = normalized.title
  draft.periodDays = normalized.periodDays
  draft.customText = normalized.customText
  draft.smartListUses = normalized.smartListUses
  draft.isSmartOrganized = normalized.isSmartOrganized
  draft.generatedAt = normalized.generatedAt

  if (!draft.customText.trim()) {
    applyGeneratedList(false)
  }

  if (props.autoSmart) {
    queueMicrotask(() => runSmartList())
  }
}, { immediate: true })

function applyGeneratedList(showNotice = true) {
  const generated = buildShoppingListFromPlan(props.meals, {
    methodology: props.methodology,
    periodDays: draft.periodDays,
  })
  draft.customText = generated.text
  draft.generatedAt = new Date().toISOString()
  draft.isSmartOrganized = false
  if (showNotice) {
    notice.value = `${generated.entries.length} itens gerados a partir do plano.`
  }
}

function setPeriod(periodDays) {
  draft.periodDays = periodDays
}

function regenerateFromPlan() {
  if (draft.customText.trim() && !confirm('Substituir a lista atual pelos itens do plano?')) return
  applyGeneratedList(true)
}

async function runSmartList() {
  errorMessage.value = ''
  notice.value = ''

  const rawText = draft.customText.trim()
  if (!rawText) {
    errorMessage.value = 'Gere ou adicione itens antes de usar a Lista Inteligente.'
    return
  }

  if (!remainingUses.value) {
    errorMessage.value = 'Limite de usos da Lista Inteligente atingido neste plano.'
    return
  }

  smartLoading.value = true
  try {
    const data = await $fetch(`${apiBase.value}/meal-plan/shopping-list/smart`, authFetchInit({
      method: 'POST',
      body: {
        itemsText: rawText,
        planTitle: props.planTitle,
        periodDays: draft.periodDays,
        smartListUses: draft.smartListUses,
      },
    }))

    draft.customText = String(data?.text || '').trim() || draft.customText
    draft.smartListUses = Number(data?.smartListUses) || (draft.smartListUses + 1)
    draft.isSmartOrganized = true
    notice.value = 'Lista organizada por categoria. Revise antes de salvar.'
  } catch (err) {
    const fallback = organizeShoppingListLocally(rawText.split('\n'))
    if (fallback.sections.length) {
      draft.customText = fallback.text
      draft.isSmartOrganized = true
      notice.value = 'Organização local aplicada (IA indisponível).'
    } else {
      errorMessage.value = err?.data?.message || err?.message || 'Não foi possível organizar a lista.'
    }
  } finally {
    smartLoading.value = false
  }
}

async function copyList() {
  const text = draft.customText.trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    notice.value = 'Lista copiada para a área de transferência.'
  } catch {
    errorMessage.value = 'Não foi possível copiar a lista.'
  }
}

function close() {
  emit('update:open', false)
}

function save() {
  emit('save', normalizeShoppingList({ ...draft }))
  close()
}
</script>

<style scoped>
.mpsl-modal {
  position: fixed;
  inset: 0;
  z-index: 6100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mpsl-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
}

.mpsl-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 36rem);
  max-height: min(92vh, 44rem);
  overflow: auto;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.09);
}

.mpsl-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
}

.mpsl-modal__title-wrap {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.mpsl-modal__title-wrap svg {
  width: 1rem;
  height: 1rem;
  color: #374151;
  flex-shrink: 0;
}

.mpsl-modal__head h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #374151;
}

.mpsl-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.mpsl-modal__close svg {
  width: 1rem;
  height: 1rem;
}

.mpsl-modal__close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.mpsl-modal__body {
  display: grid;
  gap: 0.85rem;
  padding: 0 1rem;
}

.mpsl-period__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 400;
  color: #6b7280;
}

.mpsl-period__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mpsl-period__btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 0.35rem 0.65rem;
  border-radius: var(--cf-radius-control);
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 400;
  color: #6b7280;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.mpsl-period__btn--active {
  border-color: #d1d5db;
  color: #374151;
  background: #f9fafb;
}

.mpsl-period__hint {
  margin: 0.35rem 0 0;
  font-size: 0.6875rem;
  color: #9ca3af;
  line-height: 1.4;
}

.mpsl-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.mpsl-toolbar__btn {
  min-height: 2rem !important;
  padding: 0.25rem 0.65rem !important;
  font-size: 0.72rem !important;
}

.mpsl-field--list :deep(textarea) {
  min-height: 11rem;
  resize: vertical;
  font-family: inherit;
  line-height: 1.45;
}

.mpsl-notice {
  margin: 0;
  font-size: 0.72rem;
  color: #047857;
}

.mpsl-error {
  margin: 0;
  font-size: 0.72rem;
  color: #b45309;
}

.mpsl-smart-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.mpsl-smart-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid transparent;
  border-radius: var(--cf-radius-control);
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #fbbf24, #a78bfa, #60a5fa) border-box;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.mpsl-smart-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mpsl-smart-btn svg {
  width: 0.85rem;
  height: 0.85rem;
}

.mpsl-smart-meta {
  font-size: 0.6875rem;
  color: #7c6cf0;
}

.mpsl-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid #f0f1f3;
}

.mpsl-modal__btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.8125rem !important;
  font-weight: 400 !important;
}
</style>
