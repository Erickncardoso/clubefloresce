<template>
  <Teleport to="body">
    <Transition name="photo-guide-fade">
      <div
        v-if="open"
        class="photo-guide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-guide-title"
      >
        <header class="photo-guide-header">
          <button type="button" class="photo-guide-close" aria-label="Fechar" @click="emit('close')">
            <span class="photo-guide-close-glyph" aria-hidden="true">×</span>
          </button>
          <div class="photo-guide-steps" aria-label="Passo do tutorial">
            <span
              v-for="stepNumber in totalSteps"
              :key="stepNumber"
              class="photo-guide-step"
              :class="{ 'photo-guide-step--active': stepNumber === step }"
            >
              {{ stepNumber }}
            </span>
          </div>
        </header>

        <div class="photo-guide-body">
          <div class="photo-guide-preview">
            <div v-if="currentStep.showBadge" class="photo-guide-badge">
              <BellaPhotoGuideTipIcon name="check" class="photo-guide-badge-icon" />
              Perfeito! Pode fotografar
            </div>

            <div class="photo-guide-frame">
              <img
                src="/imgs/meal-photo-guide-plate.png"
                alt=""
                class="photo-guide-photo"
                loading="eager"
                decoding="async"
              />
              <div class="photo-guide-scan" aria-hidden="true">
                <span class="photo-guide-corner photo-guide-corner--tl" />
                <span class="photo-guide-corner photo-guide-corner--tr" />
                <span class="photo-guide-corner photo-guide-corner--bl" />
                <span class="photo-guide-corner photo-guide-corner--br" />
              </div>
            </div>

            <div class="photo-guide-mode-pill">
              <BellaPhotoGuideTipIcon name="camera" class="photo-guide-mode-icon" />
              Foto da refeição
            </div>
          </div>

          <h2 id="photo-guide-title" class="photo-guide-title">{{ currentStep.title }}</h2>

          <ul class="photo-guide-tips">
            <li v-for="(tip, index) in currentStep.tips" :key="index" class="photo-guide-tip">
              <img
                v-if="tip.icon === 'bella'"
                src="/imgs/bellaiaIcon.png"
                alt=""
                class="photo-guide-tip-brand"
              />
              <BellaPhotoGuideTipIcon v-else :name="tip.icon" />
              <span>{{ tip.text }}</span>
            </li>
          </ul>
        </div>

        <footer class="photo-guide-footer">
          <button type="button" class="photo-guide-next" @click="onPrimaryClick">
            {{ isLastStep ? 'Tirar foto' : 'Próximo' }}
          </button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { lockPatientScroll, unlockPatientScroll } from '~/composables/useVerticalWheelPassthrough'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'complete'])

const STEPS = [
  {
    title: 'Enquadre a refeição inteira',
    showBadge: false,
    tips: [
      { icon: 'scan-frame', text: 'Deixe o prato todo dentro das linhas.' },
      { icon: 'no-crop', text: 'Não corte as laterais da refeição.' },
      { icon: 'sun', text: 'Fotografe de cima, com boa luz.' },
    ],
  },
  {
    title: 'Capriche na iluminação',
    showBadge: false,
    tips: [
      { icon: 'sun', text: 'Prefira luz natural, perto de uma janela.' },
      { icon: 'soft-light', text: 'Evite flash forte ou sombras duras.' },
      { icon: 'top-view', text: 'Segure o celular firme ao clicar.' },
    ],
  },
  {
    title: 'Pronto para escanear',
    showBadge: true,
    tips: [
      { icon: 'bella', text: 'A Bella identifica os alimentos na foto.' },
      { icon: 'review', text: 'Você revisa e confirma antes de salvar.' },
    ],
  },
]

const step = ref(1)
const totalSteps = STEPS.length

const currentStep = computed(() => STEPS[Math.max(0, step.value - 1)] || STEPS[0])
const isLastStep = computed(() => step.value >= totalSteps)

watch(
  () => props.open,
  (open) => {
    if (open) {
      step.value = 1
      lockPatientScroll()
      return
    }
    unlockPatientScroll()
  },
)

onBeforeUnmount(() => {
  if (props.open) unlockPatientScroll()
})

function onPrimaryClick() {
  if (isLastStep.value) {
    emit('complete')
    return
  }
  step.value += 1
}
</script>

<style scoped>
.photo-guide {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: var(--cf-text, #1a1a1a);
  padding:
    calc(0.85rem + env(safe-area-inset-top, 0px))
    1.15rem
    calc(1rem + env(safe-area-inset-bottom, 0px));
}

.photo-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.15rem;
}

.photo-guide-close {
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 999px;
  background: #f3f3f3;
  color: #666;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.photo-guide-close-glyph {
  font-size: 1.35rem;
  line-height: 1;
  margin-top: -0.08rem;
}

.photo-guide-steps {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.photo-guide-step {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--cf-green-soft, #eef0eb);
  color: #9aa095;
}

.photo-guide-step--active {
  background: var(--cf-green-dark, #6f7863);
  color: #fff;
}

.photo-guide-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.photo-guide-preview {
  position: relative;
  margin-bottom: 1.35rem;
}

.photo-guide-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--cf-green-dark, #6f7863);
}

.photo-guide-badge-icon {
  width: 1rem;
  height: 1rem;
}

.photo-guide-frame {
  position: relative;
  overflow: hidden;
  border-radius: 1.1rem;
  border: 1px solid #ececec;
  background: linear-gradient(180deg, #fafaf8 0%, var(--cf-green-soft, #eef0eb) 100%);
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-guide-photo {
  width: 78%;
  height: 78%;
  max-width: 17rem;
  object-fit: contain;
  object-position: center;
  display: block;
}

.photo-guide-scan {
  position: absolute;
  inset: 12%;
  pointer-events: none;
}

.photo-guide-corner {
  position: absolute;
  width: 1.35rem;
  height: 1.35rem;
  border: 2.5px solid rgba(255, 255, 255, 0.95);
}

.photo-guide-corner--tl {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 0.35rem;
}

.photo-guide-corner--tr {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 0.35rem;
}

.photo-guide-corner--bl {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 0.35rem;
}

.photo-guide-corner--br {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 0.35rem;
}

.photo-guide-mode-pill {
  position: absolute;
  left: 50%;
  bottom: 0.85rem;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(139, 150, 124, 0.22);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--cf-green-dark, #6f7863);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.photo-guide-mode-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.photo-guide-title {
  margin: 0 0 0.85rem;
  font-size: 1.45rem;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.photo-guide-tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.photo-guide-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: #666;
}

.photo-guide-tip-brand {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  margin-top: 0.06rem;
  border-radius: 999px;
  object-fit: cover;
}

.photo-guide-footer {
  padding-top: 1rem;
}

.photo-guide-next {
  width: 100%;
  min-height: 3.15rem;
  border: none;
  border-radius: 999px;
  background: var(--cf-green-dark, #6f7863);
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}

.photo-guide-next:hover {
  background: color-mix(in srgb, var(--cf-green-dark, #6f7863) 88%, #000);
}

.photo-guide-next:active {
  transform: scale(0.985);
}

.photo-guide-fade-enter-active,
.photo-guide-fade-leave-active {
  transition: opacity 0.22s ease;
}

.photo-guide-fade-enter-from,
.photo-guide-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .photo-guide-fade-enter-active,
  .photo-guide-fade-leave-active,
  .photo-guide-next {
    transition: none;
  }
}
</style>
