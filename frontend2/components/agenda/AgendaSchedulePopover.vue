<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panelRef"
      class="agenda-popover admin-shell-card"
      :style="panelStyle"
      role="dialog"
      aria-modal="false"
      aria-labelledby="agenda-popover-title"
      @mousedown.stop
    >
      <header class="agenda-popover__head">
        <div>
          <h3 id="agenda-popover-title">Novo agendamento</h3>
          <p class="agenda-popover__when">{{ whenLabel }}</p>
        </div>
        <button type="button" class="agenda-popover__close" aria-label="Fechar" @click="$emit('close')">
          ×
        </button>
      </header>

      <form class="agenda-popover__form" @submit.prevent="submit">
        <div class="field field--float">
          <label id="agenda-pop-patient-label" for="agenda-pop-patient">Paciente</label>
          <SharedCfSelect
            id="agenda-pop-patient"
            v-model="form.patientId"
            :options="patientOptions"
            placeholder="Selecione"
            required
          />
        </div>

        <div class="agenda-popover__row">
          <div class="field field--float">
            <label id="agenda-pop-title-label" for="agenda-pop-title">Tipo</label>
            <SharedCfSelect
              id="agenda-pop-title"
              v-model="form.title"
              :options="titleOptions"
              placeholder="Tipo"
            />
          </div>
          <div class="field field--float">
            <label id="agenda-pop-duration-label" for="agenda-pop-duration">Duração</label>
            <SharedCfSelect
              id="agenda-pop-duration"
              v-model="form.durationMin"
              :options="durationOptions"
              placeholder="Duração"
            />
          </div>
        </div>

        <p v-if="error" class="agenda-popover__error">{{ error }}</p>

        <footer class="agenda-popover__foot">
          <button type="button" class="btn-secondary" :disabled="saving" @click="expandToModal">
            Mais opções
          </button>
          <button type="submit" class="btn-primary" :disabled="saving || !form.patientId">
            {{ saving ? 'Salvando…' : 'Agendar' }}
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  AGENDA_DURATION_OPTIONS,
  AGENDA_TITLE_OPTIONS,
  formatAgendaDateTime,
  formatTimeRangeLabel,
} from '~/utils/agenda-calendar.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  anchor: { type: Object, default: () => ({ x: 0, y: 0, width: 0, height: 0 }) },
  slotData: {
    type: Object,
    default: () => ({ dayKey: '', startsAt: '', durationMin: 60, endMinutes: null }),
  },
  patients: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save', 'expand'])

const panelRef = ref(null)
const panelSize = ref({ width: 300, height: 280 })

const form = reactive({
  patientId: '',
  title: 'Consulta',
  durationMin: 60,
})

const patientOptions = computed(() => (
  props.patients.map((patient) => ({
    value: patient.id,
    label: patient.name,
  }))
))

const titleOptions = AGENDA_TITLE_OPTIONS
const durationOptions = AGENDA_DURATION_OPTIONS

const whenLabel = computed(() => {
  const start = props.slotData?.startsAt
  if (!start) return '—'
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return '—'
  const datePart = formatAgendaDateTime(start)
  const endMin = props.slotData?.endMinutes
  const startMin = startDate.getHours() * 60 + startDate.getMinutes()
  if (typeof endMin === 'number' && endMin > startMin) {
    return `${datePart.split(',').slice(0, 2).join(',')} · ${formatTimeRangeLabel(startMin, endMin)}`
  }
  return datePart
})

const panelStyle = computed(() => {
  const pad = 12
  const { x, y, width = 0, height = 0 } = props.anchor || {}
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const w = panelSize.value.width
  const h = panelSize.value.height

  let left = x + width + pad
  if (left + w > vw - pad) left = Math.max(pad, x - w - pad)
  if (left < pad) left = pad

  let top = y + (height / 2) - (h / 2)
  top = Math.max(pad, Math.min(top, vh - h - pad))

  return {
    left: `${left}px`,
    top: `${top}px`,
  }
})

watch(
  () => [props.open, props.slotData],
  () => {
    if (!props.open) return
    form.patientId = props.slotData?.patientId || ''
    form.title = 'Consulta'
    form.durationMin = Number(props.slotData?.durationMin) || 60
    nextTick(measurePanel)
  },
  { immediate: true },
)

function measurePanel() {
  const el = panelRef.value
  if (!el) return
  panelSize.value = {
    width: el.offsetWidth || 300,
    height: el.offsetHeight || 280,
  }
}

function onDocumentPointerDown(event) {
  if (!props.open) return
  const el = panelRef.value
  if (el && el.contains(event.target)) return
  emit('close')
}

function onDocumentKeyDown(event) {
  if (props.open && event.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKeyDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeyDown, true)
})

function expandToModal() {
  emit('expand', {
    patientId: form.patientId,
    title: form.title,
    durationMin: Number(form.durationMin) || 60,
  })
}

function submit() {
  emit('save', {
    patientId: form.patientId,
    title: form.title,
    startsAt: props.slotData?.startsAt,
    durationMin: Number(form.durationMin) || 60,
    notes: '',
  })
}
</script>

<style scoped>
.agenda-popover {
  position: fixed;
  z-index: 6100;
  width: min(18.5rem, calc(100vw - 1.5rem));
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.14);
  animation: agenda-popover-in 0.14s ease-out;
}

@keyframes agenda-popover-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.agenda-popover__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}

.agenda-popover__head h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--admin-ink, #141414);
}

.agenda-popover__when {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--admin-primary, #8b967c);
}

.agenda-popover__close {
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: var(--cf-radius-control);
  background: transparent;
  color: var(--admin-muted, #66706e);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.agenda-popover__close:hover {
  background: rgba(139, 150, 124, 0.1);
}

.agenda-popover__form {
  display: grid;
  gap: 0.55rem;
}

.agenda-popover__row {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 0.45rem;
}

.agenda-popover__error {
  margin: 0;
  font-size: 0.75rem;
  color: #b42318;
}

.agenda-popover__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  margin-top: 0.25rem;
}

.agenda-popover__foot .btn-primary,
.agenda-popover__foot .btn-secondary {
  min-height: 2.1rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
}
</style>
