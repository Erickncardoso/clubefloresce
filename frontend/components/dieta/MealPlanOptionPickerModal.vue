<template>
  <Teleport to="body">
    <Transition name="dieta-opts">
      <div
        v-if="open"
        class="dieta-opts-overlay"
        @click.self="onBackdrop"
        @keydown.esc="onBackdrop"
      >
        <section
          class="dieta-opts-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dieta-opts-title"
        >
          <header class="dieta-opts-head">
            <div class="dieta-opts-heading">
              <span class="dieta-opts-handle" aria-hidden="true" />
              <p class="dieta-opts-eyebrow">Seu cardápio</p>
              <h2 id="dieta-opts-title">{{ title }}</h2>
              <p class="dieta-opts-lead">
                {{ lead }}
              </p>
            </div>

            <button
              v-if="!required"
              type="button"
              class="dieta-opts-close"
              aria-label="Fechar"
              @click="close"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="dieta-opts-content">
            <section
              v-for="group in visibleGroups"
              :key="group.slotKey"
              class="dieta-opts-group"
            >
              <header class="dieta-opts-group-head">
                <h3>{{ group.label }}</h3>
                <span>{{ group.options.length }} opções</span>
              </header>

              <div
                class="dieta-opts-choices"
                role="radiogroup"
                :aria-label="`Opções de ${group.label}`"
              >
                <button
                  v-for="(option, index) in group.options"
                  :key="option.id"
                  type="button"
                  class="dieta-opts-choice"
                  :class="{ 'dieta-opts-choice--active': draft[group.slotKey] === option.id }"
                  role="radio"
                  :aria-checked="draft[group.slotKey] === option.id"
                  @click="selectOption(group.slotKey, option.id)"
                >
                  <span class="dieta-opts-choice-badge" aria-hidden="true">
                    {{ index + 1 }}
                  </span>
                  <span class="dieta-opts-choice-copy">
                    <strong>{{ optionTitle(option, index) }}</strong>
                    <span v-if="option.time" class="dieta-opts-time">{{ option.time }}</span>
                    <span>{{ previewItems(option) }}</span>
                    <span v-if="optionMacros(option)" class="dieta-opts-macros">
                      {{ optionMacros(option) }}
                    </span>
                  </span>
                  <span class="dieta-opts-radio" aria-hidden="true">
                    <Check v-if="draft[group.slotKey] === option.id" />
                  </span>
                </button>
              </div>
            </section>
          </div>

          <footer class="dieta-opts-foot">
            <p v-if="errorMessage" class="dieta-opts-error" role="alert">{{ errorMessage }}</p>
            <button
              type="button"
              class="dieta-opts-save"
              :disabled="!canSave || saving"
              @click="confirm"
            >
              <Check aria-hidden="true" />
              {{ saving ? 'Salvando…' : confirmLabel }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Check, X } from 'lucide-vue-next'
import {
  lockPatientScroll,
  resetPatientScrollLock,
  unlockPatientScroll,
} from '~/composables/useVerticalWheelPassthrough'
import { useMealPlanOptionSelections } from '~/composables/useMealPlanOptionSelections'
import { formatMealItemLabel } from '~/utils/meal-plan-format'
import { mealOptionVariantLabel } from '~/utils/meal-plan-options'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** Impede fechar sem salvar (pós-upload / plano sem escolha). */
  required: { type: Boolean, default: false },
  /** Se definido, mostra só esse slot (trocar opção de uma refeição). */
  focusSlotKey: { type: String, default: '' },
  title: { type: String, default: 'Escolha suas opções' },
  lead: {
    type: String,
    default: 'Seu plano tem mais de uma opção para algumas refeições. Escolha qual deseja seguir. Você pode trocar depois.',
  },
  confirmLabel: { type: String, default: 'Continuar' },
})

const emit = defineEmits(['update:open', 'saved'])

const {
  optionGroups,
  selectedMealBySlot,
  saving,
  saveError,
  saveSelections,
} = useMealPlanOptionSelections()

const draft = ref({})
const localError = ref('')

const visibleGroups = computed(() => {
  const focus = String(props.focusSlotKey || '').trim()
  if (!focus) return optionGroups.value
  return optionGroups.value.filter((group) => group.slotKey === focus)
})

const errorMessage = computed(() => localError.value || saveError.value)

const canSave = computed(() =>
  visibleGroups.value.every((group) => Boolean(draft.value[group.slotKey])),
)

function optionTitle(option, index) {
  return mealOptionVariantLabel(option?.label, index)
}

function previewItems(option) {
  const items = option?.items || []
  if (!items.length) return 'Sem itens listados'
  const labels = items
    .slice(0, 3)
    .map((item) => item.display || formatMealItemLabel(item) || item.name)
    .filter(Boolean)
  const more = items.length > 3 ? ` +${items.length - 3}` : ''
  return `${labels.join(' · ')}${more}`
}

function optionMacros(option) {
  const macros = option?.macros
  if (!macros?.caloriesKcal) return ''
  return `${Math.round(macros.caloriesKcal)} kcal`
}

function selectOption(slotKey, mealId) {
  draft.value = { ...draft.value, [slotKey]: mealId }
  localError.value = ''
}

function syncDraft() {
  const next = { ...(selectedMealBySlot.value || {}) }
  for (const group of visibleGroups.value) {
    if (!next[group.slotKey]) {
      next[group.slotKey] = group.options[0]?.id || ''
    }
  }
  draft.value = next
  localError.value = ''
}

function close() {
  if (props.required) return
  emit('update:open', false)
}

function onBackdrop() {
  if (props.required) return
  close()
}

async function confirm() {
  if (!canSave.value || saving.value) return
  localError.value = ''

  try {
    const payload = {}
    for (const group of optionGroups.value) {
      const fromDraft = draft.value[group.slotKey]
      const fromSaved = selectedMealBySlot.value?.[group.slotKey]
      payload[group.slotKey] = fromDraft || fromSaved || group.options[0]?.id || ''
    }

    await saveSelections(payload)
    emit('saved', payload)
    emit('update:open', false)
  } catch {
    /* saveError no composable */
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return

    if (isOpen) {
      syncDraft()
      document.documentElement.classList.add('dieta-opts-open')
      lockPatientScroll()
    } else {
      document.documentElement.classList.remove('dieta-opts-open')
      unlockPatientScroll()
    }
  },
)

watch(visibleGroups, () => {
  if (props.open) syncDraft()
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dieta-opts-open')
  }
  resetPatientScrollLock()
})
</script>

<style scoped>
.dieta-opts-overlay {
  position: fixed;
  inset: 0;
  z-index: 25020;
  background: rgba(21, 24, 20, 0.38);
  overscroll-behavior: none;
}

.dieta-opts-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  max-height: min(82svh, calc(100svh - 1rem));
  overflow: hidden;
  border-radius: 1.5rem 1.5rem 0 0;
  background: #fff;
  box-shadow: 0 -8px 24px rgba(18, 22, 17, 0.12);
  box-sizing: border-box;
}

.dieta-opts-head {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex: 0 0 auto;
  padding: 1.3rem 1.25rem 1rem;
  border-bottom: 1px solid #eceeea;
  background: #fff;
}

.dieta-opts-heading {
  min-width: 0;
}

.dieta-opts-handle {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 999px;
  background: #d8dbd6;
  transform: translateX(-50%);
}

.dieta-opts-eyebrow {
  margin: 0 0 0.25rem;
  color: #778372;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
}

.dieta-opts-head h2 {
  margin: 0;
  color: #20231f;
  font-size: 1.125rem;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

.dieta-opts-lead {
  margin: 0.4rem 0 0;
  color: #6f756d;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.dieta-opts-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: -0.25rem -0.35rem 0 0;
  padding: 0;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: #f1f2f0;
  color: #747a72;
  cursor: pointer;
}

.dieta-opts-close :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.dieta-opts-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1rem 1rem 1.25rem;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.dieta-opts-group + .dieta-opts-group {
  margin-top: 1.25rem;
  padding-top: 1.15rem;
  border-top: 1px solid #eceeea;
}

.dieta-opts-group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.dieta-opts-group-head h3 {
  margin: 0;
  color: #20231f;
  font-size: 0.9375rem;
  font-weight: 650;
}

.dieta-opts-group-head span {
  color: #858a82;
  font-size: 0.75rem;
  font-weight: 500;
}

.dieta-opts-choices {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.dieta-opts-choice {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 0.9rem;
  border: 1.5px solid #dce0d9;
  border-radius: 1rem;
  background: #fff;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dieta-opts-choice--active {
  border-color: #758b6b;
  background: #f3f7f1;
}

.dieta-opts-choice-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  margin-top: 0.1rem;
  border-radius: 999px;
  background: #e8ebe5;
  color: #5f675c;
  font-size: 0.75rem;
  font-weight: 700;
}

.dieta-opts-choice--active .dieta-opts-choice-badge {
  background: #758b6b;
  color: #fff;
}

.dieta-opts-choice-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1 1 auto;
}

.dieta-opts-choice-copy strong {
  color: #20231f;
  font-size: 0.9375rem;
  font-weight: 650;
}

.dieta-opts-choice-copy > span {
  color: #6f756d;
  font-size: 0.75rem;
  line-height: 1.35;
}

.dieta-opts-time {
  color: #858a82 !important;
  font-weight: 500;
}

.dieta-opts-macros {
  color: #758b6b !important;
  font-weight: 600;
}

.dieta-opts-radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
  margin-top: 0.15rem;
  border: 1.5px solid #c9cdc6;
  border-radius: 999px;
  color: #fff;
}

.dieta-opts-choice--active .dieta-opts-radio {
  border-color: #758b6b;
  background: #758b6b;
}

.dieta-opts-radio :deep(svg) {
  width: 0.75rem;
  height: 0.75rem;
  stroke-width: 3;
}

.dieta-opts-foot {
  position: relative;
  z-index: 3;
  flex: 0 0 auto;
  padding: 0.75rem 1rem 0.75rem;
  margin-bottom: max(3.25rem, calc(2.5rem + env(safe-area-inset-bottom, 0px)));
  border-top: 1px solid #e6e9e4;
  background: #fff;
  box-shadow: 0 -6px 18px rgba(31, 36, 29, 0.06);
  box-sizing: border-box;
}

.dieta-opts-error {
  margin: 0 0 0.55rem;
  color: #a14b4b;
  font-size: 0.75rem;
  text-align: center;
}

.dieta-opts-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border: 1px solid #7d9073;
  border-radius: 0.875rem;
  background: #7d9073;
  color: #fff;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(89, 108, 80, 0.2);
}

.dieta-opts-save:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.dieta-opts-save :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.dieta-opts-choice:active,
.dieta-opts-close:active,
.dieta-opts-save:active:not(:disabled) {
  transform: scale(0.985);
}

@media (min-width: 600px) {
  .dieta-opts-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .dieta-opts-sheet {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    max-height: min(80dvh, 720px);
    border-radius: 1.5rem;
  }

  .dieta-opts-foot {
    margin-bottom: 0;
    padding-bottom: 1rem;
  }
}

:global(html.dieta-opts-open .patient-nav),
:global(html.dieta-opts-open .patient-quick-fab),
:global(html.dieta-opts-open .patient-quick-dial) {
  display: none !important;
}

.dieta-opts-enter-active,
.dieta-opts-leave-active {
  transition: opacity 0.22s ease;
}

.dieta-opts-enter-active .dieta-opts-sheet,
.dieta-opts-leave-active .dieta-opts-sheet {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.dieta-opts-enter-from,
.dieta-opts-leave-to {
  opacity: 0;
}

.dieta-opts-enter-from .dieta-opts-sheet,
.dieta-opts-leave-to .dieta-opts-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .dieta-opts-choice,
  .dieta-opts-close,
  .dieta-opts-save,
  .dieta-opts-enter-active,
  .dieta-opts-leave-active,
  .dieta-opts-enter-active .dieta-opts-sheet,
  .dieta-opts-leave-active .dieta-opts-sheet {
    transition: none;
  }
}
</style>
