<template>
  <Teleport to="body">
    <Transition name="dieta-subs">
      <div
        v-if="open"
        class="dieta-subs-overlay"
        @click.self="close"
        @keydown.esc="close"
      >
        <section
          class="dieta-subs-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dieta-subs-title"
          aria-describedby="dieta-subs-description"
        >
          <header class="dieta-subs-head">
            <div class="dieta-subs-heading">
              <span class="dieta-subs-handle" aria-hidden="true" />
              <p class="dieta-subs-eyebrow">Substituição da refeição</p>
              <h2 id="dieta-subs-title">Escolha o que deseja trocar</h2>
              <p class="dieta-subs-meal">{{ mealLabel }}</p>
            </div>

            <button type="button" class="dieta-subs-close" aria-label="Fechar sem salvar" @click="close">
              <X aria-hidden="true" />
            </button>
          </header>

          <div class="dieta-subs-content">
            <div id="dieta-subs-description" class="dieta-subs-guidance">
              <CircleHelp class="dieta-subs-guidance-icon" aria-hidden="true" />
              <p>
                Selecione uma opção para cada alimento que quiser trocar.
                As alterações só serão aplicadas ao salvar.
              </p>
            </div>

            <p class="dieta-subs-source">
              <FileText class="dieta-subs-source-icon" aria-hidden="true" />
              Opções definidas em {{ pdfSource.label }}
            </p>

            <ul class="dieta-subs-groups">
              <li v-for="group in groups" :key="group.key" class="dieta-subs-group">
                <div
                  class="dieta-subs-choices"
                  role="radiogroup"
                  :aria-label="`Substituições para ${group.prescribedLabel}`"
                >
                  <p class="dieta-subs-section-label">Alimento do plano</p>

                  <button
                    type="button"
                    class="dieta-subs-choice dieta-subs-prescribed"
                    :class="{ 'dieta-subs-choice--active': isPrescribedActive(group.key) }"
                    role="radio"
                    :aria-checked="isPrescribedActive(group.key)"
                    @click="selectSubstitution(group.key, null)"
                  >
                    <span class="dieta-subs-choice-copy">
                      <strong>{{ group.prescribedLabel }}</strong>
                      <span>Manter como foi prescrito</span>
                    </span>
                    <span class="dieta-subs-radio" aria-hidden="true">
                      <Check v-if="isPrescribedActive(group.key)" />
                    </span>
                  </button>

                  <p class="dieta-subs-section-label dieta-subs-section-label--options">
                    Trocar por
                    <span>{{ group.options.length }} {{ group.options.length === 1 ? 'opção' : 'opções' }}</span>
                  </p>

                  <ul class="dieta-subs-options">
                    <li v-for="(option, index) in group.options" :key="`${group.key}-${index}`">
                      <button
                        type="button"
                        class="dieta-subs-choice dieta-subs-option-btn"
                        :class="{ 'dieta-subs-choice--active': isOptionActive(group.key, option) }"
                        role="radio"
                        :aria-checked="isOptionActive(group.key, option)"
                        @click="selectSubstitution(group.key, option)"
                      >
                        <span class="dieta-subs-option-symbol" aria-hidden="true">
                          <ArrowLeftRight />
                        </span>
                        <span class="dieta-subs-choice-copy">
                          <strong>{{ option.label }}</strong>
                          <span v-if="option.note">{{ option.note }}</span>
                          <span v-else>Porção equivalente</span>
                        </span>
                        <span class="dieta-subs-radio" aria-hidden="true">
                          <Check v-if="isOptionActive(group.key, option)" />
                        </span>
                      </button>
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
          </div>

          <footer class="dieta-subs-foot">
            <p class="dieta-subs-status" aria-live="polite">
              {{ changesStatus }}
            </p>
            <button type="button" class="dieta-subs-save" @click="saveChanges">
              <Check aria-hidden="true" />
              {{ saveLabel }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ArrowLeftRight, Check, CircleHelp, FileText, X } from 'lucide-vue-next'
import { lockPatientScroll, resetPatientScrollLock, unlockPatientScroll } from '~/composables/useVerticalWheelPassthrough'
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

const initialOverrides = ref({})
const draftOverrides = ref({})

const changedGroups = computed(() => props.groups.filter((group) => {
  return !areChoicesEqual(initialOverrides.value[group.key], draftOverrides.value[group.key])
}))

const changesCount = computed(() => changedGroups.value.length)

const changesStatus = computed(() => {
  if (!changesCount.value) return 'Nenhuma alteração pendente'
  return `${changesCount.value} ${changesCount.value === 1 ? 'alteração selecionada' : 'alterações selecionadas'}`
})

const saveLabel = computed(() => {
  if (!changesCount.value) return 'Concluir'
  return `Salvar ${changesCount.value === 1 ? 'alteração' : 'alterações'}`
})

function close() {
  emit('update:open', false)
}

function syncDraft() {
  const current = {}

  for (const group of props.groups) {
    current[group.key] = getOverrideForItem(props.mealId, group.key)
  }

  initialOverrides.value = { ...current }
  draftOverrides.value = { ...current }
}

function areChoicesEqual(first, second) {
  if (!first && !second) return true
  if (!first || !second) return false
  return isSameOverride(first, second)
}

function isPrescribedActive(itemKey) {
  return !draftOverrides.value[itemKey]
}

function isOptionActive(itemKey, option) {
  return isSameOverride(draftOverrides.value[itemKey], option)
}

function selectSubstitution(itemKey, option) {
  draftOverrides.value = {
    ...draftOverrides.value,
    [itemKey]: option,
  }
}

function saveChanges() {
  for (const group of changedGroups.value) {
    const option = draftOverrides.value[group.key] || null
    setOverride(props.mealId, group.key, option)
    emit('substituted', { itemKey: group.key, option })
  }

  close()
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return

    if (isOpen) {
      syncDraft()
      document.documentElement.classList.add('dieta-subs-open')
      lockPatientScroll()
    } else {
      document.documentElement.classList.remove('dieta-subs-open')
      unlockPatientScroll()
    }
  },
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dieta-subs-open')
  }
  resetPatientScrollLock()
})
</script>

<style scoped>
.dieta-subs-overlay {
  position: fixed;
  inset: 0;
  z-index: 25010;
  background: rgba(21, 24, 20, 0.38);
  overscroll-behavior: none;
}

/* Bottom sheet: altura limitada — não cresce com o padding do botão */
.dieta-subs-sheet {
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

.dieta-subs-head {
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

.dieta-subs-heading {
  min-width: 0;
}

.dieta-subs-handle {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  width: 2.5rem;
  height: 0.25rem;
  border-radius: 999px;
  background: #d8dbd6;
  transform: translateX(-50%);
}

.dieta-subs-eyebrow {
  margin: 0 0 0.25rem;
  color: #778372;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
}

.dieta-subs-head h2 {
  margin: 0;
  color: #20231f;
  font-size: 1.125rem;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.25;
  text-wrap: balance;
}

.dieta-subs-meal {
  margin: 0.3rem 0 0;
  color: #8a6c72;
  font-size: 0.8125rem;
  font-weight: 500;
}

.dieta-subs-close {
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

.dieta-subs-close :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.dieta-subs-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 1rem 1rem 1.25rem;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  -webkit-overflow-scrolling: touch;
}

.dieta-subs-guidance {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem;
  border: 1px solid #e4e9e1;
  border-radius: 0.875rem;
  background: #f6f8f4;
  color: #596255;
}

.dieta-subs-guidance p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
}

.dieta-subs-guidance-icon {
  width: 1rem;
  height: 1rem;
  margin-top: 0.05rem;
  flex: 0 0 auto;
  color: #72806b;
}

.dieta-subs-source {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.75rem 0 1rem;
  color: #8b9088;
  font-size: 0.6875rem;
  line-height: 1.3;
}

.dieta-subs-source-icon {
  width: 0.8125rem;
  height: 0.8125rem;
  flex: 0 0 auto;
}

.dieta-subs-groups,
.dieta-subs-options {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dieta-subs-groups {
  gap: 0.875rem;
}

.dieta-subs-group {
  padding: 0.875rem;
  border: 1px solid #e1e4df;
  border-radius: 1rem;
  background: #fff;
}

.dieta-subs-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
  color: #80857e;
  font-size: 0.65625rem;
  font-weight: 600;
  letter-spacing: 0.055em;
  line-height: 1.2;
  text-transform: uppercase;
}

.dieta-subs-section-label span {
  color: #9a9e98;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.dieta-subs-section-label--options {
  margin-top: 0.875rem;
}

.dieta-subs-options {
  gap: 0.5rem;
}

.dieta-subs-choice {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.6875rem 0.75rem;
  border: 1px solid #e2e5e0;
  border-radius: 0.8125rem;
  background: #fff;
  color: #30332f;
  font-family: inherit;
  text-align: left;
  -webkit-tap-highlight-color: rgba(117, 139, 107, 0.16);
  touch-action: manipulation;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.dieta-subs-choice--active {
  border-color: #84967a;
  background: #f4f7f2;
  box-shadow: inset 0 0 0 1px #84967a;
}

.dieta-subs-option-btn {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.dieta-subs-choice-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.dieta-subs-choice-copy strong {
  color: #2c302b;
  font-size: 0.8125rem;
  font-weight: 550;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.dieta-subs-choice-copy > span {
  color: #858a82;
  font-size: 0.6875rem;
  font-weight: 400;
  line-height: 1.35;
}

.dieta-subs-option-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border-radius: 0.625rem;
  background: #edf2ea;
  color: #708067;
}

.dieta-subs-option-symbol :deep(svg) {
  width: 0.875rem;
  height: 0.875rem;
}

.dieta-subs-radio {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 auto;
  border: 1.5px solid #c9cdc6;
  border-radius: 999px;
  color: #fff;
}

.dieta-subs-choice--active .dieta-subs-radio {
  border-color: #758b6b;
  background: #758b6b;
}

.dieta-subs-radio :deep(svg) {
  width: 0.75rem;
  height: 0.75rem;
  stroke-width: 3;
}

.dieta-subs-foot {
  position: relative;
  z-index: 3;
  flex: 0 0 auto;
  /* Empurra só o botão pra cima — sheet não cresce (max-height fixo) */
  padding: 0.75rem 1rem 0.75rem;
  margin-bottom: max(3.25rem, calc(2.5rem + env(safe-area-inset-bottom, 0px)));
  border-top: 1px solid #e6e9e4;
  background: #fff;
  box-shadow: 0 -6px 18px rgba(31, 36, 29, 0.06);
  box-sizing: border-box;
}

.dieta-subs-status {
  margin: 0 0 0.5rem;
  color: #858a82;
  font-size: 0.6875rem;
  line-height: 1.3;
  text-align: center;
}

.dieta-subs-save {
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
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0.18);
  touch-action: manipulation;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(89, 108, 80, 0.2);
}

.dieta-subs-save :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.dieta-subs-choice:focus-visible,
.dieta-subs-close:focus-visible,
.dieta-subs-save:focus-visible {
  outline: 2px solid #62785a;
  outline-offset: 2px;
}

.dieta-subs-choice:active,
.dieta-subs-close:active,
.dieta-subs-save:active {
  transform: scale(0.985);
}

@media (hover: hover) {
  .dieta-subs-choice:hover {
    border-color: #b8c2b2;
    background: #f8faf7;
  }

  .dieta-subs-choice--active:hover {
    border-color: #758b6b;
    background: #eff4ec;
  }

  .dieta-subs-close:hover {
    background: #e7e9e5;
    color: #4f554d;
  }

  .dieta-subs-save:hover {
    border-color: #708467;
    background: #708467;
  }
}

@media (min-width: 600px) {
  .dieta-subs-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .dieta-subs-sheet {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    max-height: min(80dvh, 720px);
    border-radius: 1.5rem;
  }

  .dieta-subs-foot {
    margin-bottom: 0;
    padding-bottom: 1rem;
  }
}

@media (max-height: 700px) {
  .dieta-subs-sheet {
    max-height: min(78svh, calc(100svh - 0.5rem));
  }

  .dieta-subs-head {
    padding-block: 1rem 0.75rem;
  }

  .dieta-subs-status {
    display: none;
  }

  .dieta-subs-foot {
    margin-bottom: max(2.75rem, calc(2rem + env(safe-area-inset-bottom, 0px)));
  }
}

/* Tab bar some de verdade — não disputa a base com o Concluir */
:global(html.dieta-subs-open .patient-nav),
:global(html.dieta-subs-open .patient-quick-fab),
:global(html.dieta-subs-open .patient-quick-dial) {
  display: none !important;
}

.dieta-subs-enter-active,
.dieta-subs-leave-active {
  transition: opacity 0.22s ease;
}

.dieta-subs-enter-active .dieta-subs-sheet,
.dieta-subs-leave-active .dieta-subs-sheet {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.dieta-subs-enter-from,
.dieta-subs-leave-to {
  opacity: 0;
}

.dieta-subs-enter-from .dieta-subs-sheet,
.dieta-subs-leave-to .dieta-subs-sheet {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .dieta-subs-choice,
  .dieta-subs-close,
  .dieta-subs-save,
  .dieta-subs-enter-active,
  .dieta-subs-leave-active,
  .dieta-subs-enter-active .dieta-subs-sheet,
  .dieta-subs-leave-active .dieta-subs-sheet {
    transition: none;
  }
}
</style>
