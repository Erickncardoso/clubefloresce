<template>
  <Teleport to="body">
    <div v-if="open" class="dieta-subs-overlay" @click.self="close">
      <div class="dieta-subs-sheet" role="dialog" aria-modal="true" aria-labelledby="dieta-subs-title">
        <header class="dieta-subs-head">
          <div>
            <h2 id="dieta-subs-title">Opções de substituição</h2>
            <p class="dieta-subs-meal">{{ mealLabel }}</p>
            <p class="dieta-subs-source">
              <FileText class="dieta-subs-source-icon" aria-hidden="true" />
              Conforme {{ pdfSource.label }}
            </p>
          </div>
          <button type="button" class="dieta-subs-close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <p class="dieta-subs-intro">
          Toque em uma opção para trocar o alimento na sua refeição de hoje. Toque no prescrito para voltar ao original.
        </p>

        <ul class="dieta-subs-groups">
          <li v-for="group in groups" :key="group.key" class="dieta-subs-group">
            <button
              type="button"
              class="dieta-subs-prescribed dieta-subs-choice"
              :class="{ 'dieta-subs-choice--active': isPrescribedActive(group.key) }"
              @click="applySubstitution(group.key, null)"
            >
              <span class="dieta-subs-prescribed-tag">Prescrito</span>
              <strong>{{ group.prescribedLabel }}</strong>
            </button>

            <ul class="dieta-subs-options">
              <li v-for="(option, index) in group.options" :key="`${group.key}-${index}`">
                <button
                  type="button"
                  class="dieta-subs-option-btn dieta-subs-choice"
                  :class="{ 'dieta-subs-choice--active': isOptionActive(group.key, option) }"
                  @click="applySubstitution(group.key, option)"
                >
                  <ArrowLeftRight class="dieta-subs-option-icon" aria-hidden="true" />
                  <div>
                    <span>{{ option.label }}</span>
                    <p v-if="option.note" class="dieta-subs-option-note">{{ option.note }}</p>
                  </div>
                  <Check v-if="isOptionActive(group.key, option)" class="dieta-subs-check" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </li>
        </ul>

        <footer class="dieta-subs-foot">
          <button type="button" class="dieta-subs-done" @click="close">Concluir</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { lockPatientScroll, unlockPatientScroll, resetPatientScrollLock } from '~/composables/useVerticalWheelPassthrough'
import { ArrowLeftRight, Check, FileText, X } from 'lucide-vue-next'
import { useMealItemOverrides } from '~/composables/useMealItemOverrides'
import { useMealSubstitutions } from '~/composables/useMealSubstitutions'

const props = defineProps({
  open: { type: Boolean, default: false },
  mealId: { type: String, required: true },
  mealLabel: { type: String, default: '' },
  groups: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'substituted'])

const { pdfSource: pdfSourceRef } = useMealSubstitutions()
const pdfSource = pdfSourceRef
const { getOverrideForItem, setOverride, isSameOverride } = useMealItemOverrides()

function close() {
  emit('update:open', false)
}

function isPrescribedActive(itemKey) {
  return !getOverrideForItem(props.mealId, itemKey)
}

function isOptionActive(itemKey, option) {
  const active = getOverrideForItem(props.mealId, itemKey)
  return isSameOverride(active, option)
}

function applySubstitution(itemKey, option) {
  setOverride(props.mealId, itemKey, option)
  emit('substituted', { itemKey, option })
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    if (isOpen) lockPatientScroll()
    else unlockPatientScroll()
  },
)

onUnmounted(() => {
  resetPatientScrollLock()
})
</script>

<style scoped>
.dieta-subs-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: rgba(20, 20, 20, 0.45);
}

.dieta-subs-sheet {
  width: 100%;
  max-width: 430px;
  max-height: min(88vh, 720px);
  overflow: auto;
  padding: 1.1rem 1.15rem 1rem;
  border-radius: var(--cf-radius) var(--cf-radius) 0 0;
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
}

.dieta-subs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.dieta-subs-head h2 {
  margin: 0 0 0.2rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--cf-text);
}

.dieta-subs-meal {
  margin: 0 0 0.35rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--cf-pink);
}

.dieta-subs-source {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--cf-text-muted);
}

.dieta-subs-source-icon {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

.dieta-subs-close {
  border: none;
  background: var(--cf-track);
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cf-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.dieta-subs-close :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.dieta-subs-intro {
  margin: 0 0 1rem;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.dieta-subs-groups {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dieta-subs-group {
  padding: 0.85rem;
  border: 1px solid var(--cf-border);
  border-radius: var(--cf-radius-sm);
  background: var(--cf-bg);
}

.dieta-subs-choice {
  width: 100%;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dieta-subs-choice:active {
  background: var(--cf-green-soft);
}

.dieta-subs-choice--active {
  border-color: var(--cf-green);
  background: var(--cf-green-soft);
}

.dieta-subs-prescribed {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.65rem;
  padding: 0.55rem 0.6rem;
}

.dieta-subs-prescribed-tag {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-text-muted);
}

.dieta-subs-prescribed strong {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--cf-text);
  line-height: 1.3;
}

.dieta-subs-options {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.dieta-subs-option-btn {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.55rem 0.6rem;
  font-size: 0.84rem;
  line-height: 1.35;
  color: var(--cf-text);
}

.dieta-subs-option-icon {
  width: 0.85rem;
  height: 0.85rem;
  margin-top: 0.15rem;
  flex-shrink: 0;
  color: var(--cf-green);
}

.dieta-subs-check {
  width: 0.9rem;
  height: 0.9rem;
  margin-left: auto;
  flex-shrink: 0;
  color: var(--cf-green-dark);
}

.dieta-subs-option-note {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}

.dieta-subs-foot {
  margin-top: 1rem;
  padding-top: 0.5rem;
}

.dieta-subs-done {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--cf-pink);
  color: #fff;
  cursor: pointer;
}

.dieta-subs-done:active {
  background: var(--cf-pink-dark);
}
</style>
