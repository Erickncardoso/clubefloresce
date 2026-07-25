<template>
  <div
    ref="rootRef"
    class="cf-time-input"
    :class="{
      'cf-time-input--open': open,
      'cf-time-input--disabled': disabled,
      'cf-time-input--compact': compact,
    }"
  >
    <button
      :id="id"
      type="button"
      class="cf-time-trigger cf-squircle cf-squircle--control"
      :disabled="disabled"
      :aria-label="ariaLabel || 'Horário'"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <Clock class="cf-time-trigger-icon" aria-hidden="true" />
      <span class="cf-time-trigger-value">{{ displayValue }}</span>
    </button>

    <Teleport to="body">
      <Transition name="cf-time-pop">
        <div
          v-if="open"
          ref="panelRef"
          class="cf-time-panel cf-squircle cf-squircle--control"
          role="dialog"
          aria-label="Selecionar horário"
          :style="panelStyle"
        >
          <header class="cf-time-panel-head">
            <p>Horário</p>
            <strong>{{ previewValue }}</strong>
          </header>

          <div class="cf-time-pickers">
            <div class="cf-time-col">
              <span class="cf-time-col-title">Hora</span>
              <div ref="hourListRef" class="cf-time-scroll">
                <button
                  v-for="hour in hourOptions"
                  :key="hour"
                  type="button"
                  class="cf-time-option"
                  :class="{ 'cf-time-option--selected': pendingHour === hour }"
                  @click="selectHour(hour)"
                >
                  {{ String(hour).padStart(2, '0') }}
                </button>
              </div>
            </div>
            <span class="cf-time-sep" aria-hidden="true">:</span>
            <div class="cf-time-col">
              <span class="cf-time-col-title">Min</span>
              <div ref="minuteListRef" class="cf-time-scroll">
                <button
                  v-for="minute in minuteOptions"
                  :key="minute"
                  type="button"
                  class="cf-time-option"
                  :class="{ 'cf-time-option--selected': pendingMinute === minute }"
                  @click="selectMinute(minute)"
                >
                  {{ String(minute).padStart(2, '0') }}
                </button>
              </div>
            </div>
          </div>

          <footer class="cf-time-panel-foot">
            <button type="button" class="cf-time-foot-btn" @click="applyNow">
              Agora
            </button>
            <button type="button" class="cf-time-foot-btn cf-time-foot-btn--primary" @click="confirmSelection">
              Confirmar
            </button>
          </footer>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { Clock } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: '08:00',
  },
  id: {
    type: String,
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  minuteStep: {
    type: Number,
    default: 5,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const hourOptions = Array.from({ length: 24 }, (_, index) => index)
const minuteOptions = computed(() => {
  const step = Math.max(1, Math.min(30, props.minuteStep || 5))
  const count = Math.floor(60 / step)
  return Array.from({ length: count }, (_, index) => index * step)
})

const open = ref(false)
const rootRef = ref(null)
const panelRef = ref(null)
const hourListRef = ref(null)
const minuteListRef = ref(null)
const panelStyle = ref({})
const pendingHour = ref(8)
const pendingMinute = ref(0)

const displayValue = computed(() => formatTime(props.modelValue) || '08:00')

const previewValue = computed(() => {
  return `${String(pendingHour.value).padStart(2, '0')}:${String(pendingMinute.value).padStart(2, '0')}`
})

function parseTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

function formatTime(value) {
  const parsed = parseTime(value)
  if (!parsed) return ''
  return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`
}

function roundMinuteToStep(minute) {
  const step = Math.max(1, props.minuteStep || 5)
  const rounded = Math.round(minute / step) * step
  if (rounded >= 60) return 60 - step
  return rounded
}

function syncPendingFromValue() {
  const parsed = parseTime(props.modelValue)
  const now = new Date()
  if (parsed) {
    pendingHour.value = parsed.hour
    pendingMinute.value = roundMinuteToStep(parsed.minute)
    return
  }
  pendingHour.value = now.getHours()
  pendingMinute.value = roundMinuteToStep(now.getMinutes())
}

function scrollSelectedTimeIntoView() {
  nextTick(() => {
    hourListRef.value?.querySelector('.cf-time-option--selected')?.scrollIntoView({ block: 'center' })
    minuteListRef.value?.querySelector('.cf-time-option--selected')?.scrollIntoView({ block: 'center' })
  })
}

function updatePanelPosition() {
  const root = rootRef.value
  if (!root) return

  const rect = root.getBoundingClientRect()
  const panelHeight = 320
  const panelWidth = 220
  const gap = 8
  const spaceBelow = window.innerHeight - rect.bottom
  const openAbove = spaceBelow < panelHeight && rect.top > panelHeight

  panelStyle.value = {
    position: 'fixed',
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12))}px`,
    width: `${panelWidth}px`,
    top: openAbove ? `${rect.top - panelHeight - gap}px` : `${rect.bottom + gap}px`,
    zIndex: 12000,
  }
}

function close() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (!open.value) return
  syncPendingFromValue()
  nextTick(() => {
    updatePanelPosition()
    scrollSelectedTimeIntoView()
  })
}

function emitValue() {
  emit('update:modelValue', previewValue.value)
}

function selectHour(hour) {
  pendingHour.value = hour
}

function selectMinute(minute) {
  pendingMinute.value = minute
}

function confirmSelection() {
  emitValue()
  close()
}

function applyNow() {
  const now = new Date()
  pendingHour.value = now.getHours()
  pendingMinute.value = roundMinuteToStep(now.getMinutes())
  scrollSelectedTimeIntoView()
}

function onDocumentClick(event) {
  if (!open.value) return
  const target = event.target
  if (rootRef.value?.contains(target) || panelRef.value?.contains(target)) return
  close()
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

function onViewportChange() {
  if (open.value) updatePanelPosition()
}

watch(() => props.modelValue, () => {
  if (open.value) syncPendingFromValue()
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped>
.cf-time-input {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

.cf-time-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  min-height: 2rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid #e2e8e4;
  background: #fff;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.cf-time-input--compact .cf-time-trigger {
  min-width: 5.5rem;
  --cf-squircle-r: var(--cf-radius-xs);
  border-radius: var(--cf-radius-xs);
}

.cf-time-trigger:hover:not(:disabled) {
  border-color: #cfe3cb;
}

.cf-time-input--open .cf-time-trigger {
  border-color: #8B967C;
  box-shadow: 0 0 0 3px rgba(139, 150, 124, 0.12);
}

.cf-time-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.cf-time-trigger-icon {
  width: 0.85rem;
  height: 0.85rem;
  color: #8B967C;
  flex-shrink: 0;
}

.cf-time-trigger-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
}

.cf-time-panel {
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #e8ece9;
  box-shadow:
    0 20px 48px rgba(15, 23, 42, 0.14),
    0 8px 20px rgba(15, 23, 42, 0.08);
  transform-origin: top center;
}

.cf-time-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.cf-time-panel-head p {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #8a9a92;
}

.cf-time-panel-head strong {
  font-size: 1rem;
  font-weight: 700;
  color: #2c322c;
}

.cf-time-pickers {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.cf-time-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 3rem;
}

.cf-time-col-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: #8a9a92;
}

.cf-time-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  width: 100%;
  max-height: 10.5rem;
  overflow-y: auto;
  padding: 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: #cfe3cb transparent;
}

.cf-time-scroll::-webkit-scrollbar {
  width: 4px;
}

.cf-time-scroll::-webkit-scrollbar-thumb {
  background: #cfe3cb;
  border-radius: 999px;
}

.cf-time-option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  padding: 0.38rem 0.5rem;
  border: none;
  background: transparent;
  color: #1a2e24;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.cf-time-option:hover {
  background: #f4f8f3;
}

.cf-time-option--selected {
  background: #8B967C;
  color: #fff;
}

.cf-time-option--selected:hover {
  background: #7a8572;
}

.cf-time-option:focus-visible {
  outline: 2px solid #9fc499;
  outline-offset: 1px;
}

.cf-time-sep {
  font-size: 1rem;
  font-weight: 700;
  color: #8B967C;
  padding-top: 1.1rem;
}

.cf-time-panel-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid #eef2ef;
}

.cf-time-foot-btn {
  border: none;
  background: transparent;
  color: #5c6b64;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.4rem 0.65rem;
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;
}

.cf-time-foot-btn:hover {
  color: #8B967C;
  background: #f4f8f3;
}

.cf-time-foot-btn--primary {
  color: #fff;
  background: #8B967C;
}

.cf-time-foot-btn--primary:hover {
  background: #7a8572;
  color: #fff;
}

.cf-time-pop-enter-active,
.cf-time-pop-leave-active {
  transition: opacity 0.2s ease;
}

.cf-time-pop-enter-active .cf-time-panel,
.cf-time-pop-leave-active .cf-time-panel {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s ease;
}

.cf-time-pop-enter-from,
.cf-time-pop-leave-to {
  opacity: 0;
}

.cf-time-pop-enter-from .cf-time-panel,
.cf-time-pop-leave-to .cf-time-panel {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .cf-time-pop-enter-active,
  .cf-time-pop-leave-active,
  .cf-time-pop-enter-active .cf-time-panel,
  .cf-time-pop-leave-active .cf-time-panel {
    transition: none;
  }

  .cf-time-pop-enter-from .cf-time-panel,
  .cf-time-pop-leave-to .cf-time-panel {
    transform: none;
  }
}
</style>
