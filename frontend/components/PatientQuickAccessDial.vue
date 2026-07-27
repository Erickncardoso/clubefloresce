<template>
  <Teleport to="body">
    <div
      v-show="shown"
      class="patient-quick-dial"
      :class="{
        'patient-quick-dial--open': openPhase,
        'patient-quick-dial--closing': closePhase,
      }"
      role="menu"
      aria-label="Acesso rápido"
    >
      <button
        v-for="(item, index) in PATIENT_QUICK_DIAL_ITEMS"
        :key="item.id"
        type="button"
        class="patient-quick-dial__chip"
        role="menuitem"
        :style="{
          '--dial-i': index,
          '--dial-n': PATIENT_QUICK_DIAL_ITEMS.length,
        }"
        @click="selectItem(item)"
      >
        <span class="patient-quick-dial__chip-icon" aria-hidden="true">
          <component :is="item.icon" :size="18" :stroke-width="1.85" />
        </span>
        <span class="patient-quick-dial__chip-label">{{ item.label }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { PATIENT_QUICK_DIAL_ITEMS, navigateQuickDialItem } from '~/utils/patient-quick-dial'
import { isPatientFullAccessActive } from '~/utils/patient-access'
import { lockPatientScroll, unlockPatientScroll } from '~/composables/useVerticalWheelPassthrough'
import { patientHapticTap } from '~/utils/patient-haptics.mjs'

const STAGGER_MS = 58
const ANIM_MS = 340

const { open, close: closeQuickDial } = usePatientQuickAccess()

const { verifiedUser } = useAuthSession()

const shown = ref(false)
const openPhase = ref(false)
const closePhase = ref(false)
let closeTimer = null

const hasFullAccess = computed(() => {
  const user = verifiedUser.value
  if (!user) return true
  return isPatientFullAccessActive(user.plan, user.accessExpiresAt, user.approvalEmailSentAt)
})

function setDialChrome(isOpen) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('patient-quick-dial-open', isOpen)
}

function clearCloseTimer() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function finishClose() {
  clearCloseTimer()
  closePhase.value = false
  openPhase.value = false
  shown.value = false
  setDialChrome(false)
  unlockPatientScroll()
}

async function openDial() {
  clearCloseTimer()
  closePhase.value = false
  shown.value = true
  setDialChrome(true)
  lockPatientScroll()
  await nextTick()
  requestAnimationFrame(() => {
    openPhase.value = true
  })
}

function requestClose() {
  if (!shown.value || closePhase.value) return
  openPhase.value = false
  closePhase.value = true
  closeQuickDial()

  const totalMs = (PATIENT_QUICK_DIAL_ITEMS.length - 1) * STAGGER_MS + ANIM_MS
  clearCloseTimer()
  closeTimer = window.setTimeout(finishClose, totalMs)
}

function selectItem(item) {
  patientHapticTap(18)
  requestClose()

  window.setTimeout(() => {
    if (item.premium && !hasFullAccess.value) {
      navigateTo('/assinatura')
      return
    }
    navigateQuickDialItem(item)
  }, Math.min(180, STAGGER_MS * 2))
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) {
    requestClose()
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      void openDial()
      return
    }
    if (shown.value && !closePhase.value) {
      requestClose()
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearCloseTimer()
  setDialChrome(false)
  unlockPatientScroll()
})
</script>

<style scoped>
.patient-quick-dial {
  position: fixed;
  right: calc(1rem + env(safe-area-inset-right, 0px));
  bottom: calc(var(--cf-tab-h, 64px) + 12px + 3.5rem + 10px);
  left: auto;
  transform: translateZ(0);
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 0.55rem;
  width: min(calc(100vw - 2rem), 19rem);
  padding: 0 0.1rem 0.1rem;
  box-sizing: border-box;
  pointer-events: none;
}

.patient-quick-dial--open,
.patient-quick-dial--closing {
  pointer-events: auto;
}

.patient-quick-dial__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  max-width: 100%;
  padding: 0.48rem 0.85rem 0.48rem 0.55rem;
  border: none;
  border-radius: var(--cf-radius-sm);
  background: #2f332d;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  font-family: var(--cf-font);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  opacity: 0;
  transform: translateY(12px) scale(0.48);
  transform-origin: right bottom;
  will-change: transform, opacity;
}

.patient-quick-dial--open .patient-quick-dial__chip {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition:
    transform 0.36s cubic-bezier(0.34, 1.35, 0.64, 1),
    opacity 0.26s ease;
  transition-delay: calc(var(--dial-i) * 58ms);
}

.patient-quick-dial--closing .patient-quick-dial__chip {
  opacity: 0;
  transform: translateY(8px) scale(0.48);
  transition:
    transform 0.24s cubic-bezier(0.4, 0, 0.68, 0.06),
    opacity 0.18s ease;
  transition-delay: calc((var(--dial-n) - 1 - var(--dial-i)) * 58ms);
}

.patient-quick-dial__chip-icon {
  width: 1.85rem;
  height: 1.85rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--cf-pink);
  color: #ffffff;
}

.patient-quick-dial__chip-label {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-quick-dial__chip:active {
  opacity: 0.9;
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .patient-quick-dial__chip,
  .patient-quick-dial--open .patient-quick-dial__chip,
  .patient-quick-dial--closing .patient-quick-dial__chip {
    transition: none !important;
    transition-delay: 0ms !important;
    transform: none !important;
    opacity: 1 !important;
  }

  .patient-quick-dial:not(.patient-quick-dial--open) .patient-quick-dial__chip {
    opacity: 0 !important;
  }

  .patient-quick-dial__chip:active {
    transform: none;
  }
}
</style>

<style>
html.vk-open .patient-quick-dial,
html.meal-sheet-keyboard .patient-quick-dial,
body.keyboard-open .patient-quick-dial {
  display: none !important;
}
</style>
