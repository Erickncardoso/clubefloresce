<template>
  <Teleport to="body">
    <div v-if="open" class="agenda-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title">
      <div class="agenda-modal__backdrop" aria-hidden="true" @click="$emit('close')" />
      <div class="agenda-modal__panel admin-shell-card">
        <header class="agenda-modal__head">
          <div>
            <h2 id="agenda-modal-title">{{ modalTitle }}</h2>
            <p v-if="selectedPatientName" class="agenda-modal__subtitle">{{ selectedPatientName }}</p>
          </div>
          <button type="button" class="agenda-modal__close" @click="$emit('close')">Fechar</button>
        </header>

        <form class="agenda-modal__form" @submit.prevent="submit">
          <div class="field field--float">
            <label id="agenda-patient-label" for="agenda-patient">Paciente</label>
            <SharedCfSelect
              id="agenda-patient"
              v-model="form.patientId"
              :options="patientOptions"
              placeholder="Selecione a paciente"
              required
            />
          </div>

          <div class="field field--float">
            <label id="agenda-title-label" for="agenda-title">Tipo de consulta</label>
            <SharedCfSelect
              id="agenda-title"
              v-model="form.title"
              :options="titleOptions"
              placeholder="Tipo de consulta"
            />
          </div>

          <div class="field field--float">
            <label for="agenda-starts">Data e hora</label>
            <SharedCfDateTimeInput id="agenda-starts" v-model="form.startsAt" required />
          </div>

          <div v-if="!editing" class="agenda-modal__quick-hours">
            <span>Horários rápidos</span>
            <div class="agenda-modal__hour-grid">
              <button
                v-for="hour in quickHours"
                :key="hour"
                type="button"
                class="agenda-modal__hour-btn"
                @click="applyQuickHour(hour)"
              >
                {{ formatHourLabel(hour) }}
              </button>
            </div>
          </div>

          <div class="field field--float">
            <label id="agenda-duration-label" for="agenda-duration">Duração</label>
            <SharedCfSelect
              id="agenda-duration"
              v-model="form.durationMin"
              :options="durationOptions"
              placeholder="Duração"
            />
          </div>

          <div class="field field--float">
            <label for="agenda-notes">Observações</label>
            <textarea id="agenda-notes" v-model="form.notes" rows="3" placeholder="Opcional" />
          </div>

          <p v-if="error" class="agenda-modal__error">{{ error }}</p>

          <footer class="agenda-modal__foot">
            <button
              v-if="editing"
              type="button"
              class="btn-secondary agenda-modal__danger"
              :disabled="saving"
              @click="$emit('delete')"
            >
              Excluir
            </button>
            <div class="agenda-modal__actions">
              <button type="button" class="btn-secondary" :disabled="saving" @click="$emit('close')">
                Cancelar
              </button>
              <button type="submit" class="btn-primary" :disabled="saving || !form.patientId">
                {{ saving ? 'Salvando…' : 'Confirmar agendamento' }}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import {
  AGENDA_DURATION_OPTIONS,
  AGENDA_QUICK_HOURS,
  AGENDA_TITLE_OPTIONS,
  buildSlotDateTime,
  defaultAppointmentDateTime,
  toDateKey,
} from '~/utils/agenda-calendar.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  patients: { type: Array, default: () => [] },
  appointment: { type: Object, default: null },
  defaultDate: { type: Date, default: null },
  prefillPatientId: { type: String, default: '' },
  prefillStartsAt: { type: String, default: '' },
  prefillDurationMin: { type: Number, default: 60 },
  saving: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save', 'delete'])

const editing = computed(() => Boolean(props.appointment?.id))

const form = reactive({
  patientId: '',
  title: 'Consulta',
  startsAt: defaultAppointmentDateTime(),
  durationMin: 60,
  notes: '',
})

const patientOptions = computed(() => (
  props.patients.map((patient) => ({
    value: patient.id,
    label: patient.name,
  }))
))

const titleOptions = AGENDA_TITLE_OPTIONS
const durationOptions = AGENDA_DURATION_OPTIONS
const quickHours = AGENDA_QUICK_HOURS

const selectedPatientName = computed(() => {
  const patient = props.patients.find((item) => item.id === form.patientId)
  return patient?.name || props.appointment?.patientName || ''
})

const modalTitle = computed(() => (
  editing.value ? 'Editar agendamento' : 'Agendar paciente'
))

watch(
  () => [props.open, props.appointment, props.defaultDate, props.prefillPatientId, props.prefillStartsAt, props.prefillDurationMin],
  () => {
    if (!props.open) return

    if (props.appointment) {
      form.patientId = props.appointment.patientId || ''
      form.title = props.appointment.title || 'Consulta'
      form.startsAt = props.appointment.startsAt || defaultAppointmentDateTime(props.defaultDate || new Date())
      form.durationMin = Number(props.appointment.durationMin) || 60
      form.notes = props.appointment.notes || ''
      return
    }

    form.patientId = props.prefillPatientId || ''
    form.title = 'Consulta'
    form.startsAt = props.prefillStartsAt
      || defaultAppointmentDateTime(props.defaultDate || new Date())
    form.durationMin = Number(props.prefillDurationMin) || 60
    form.notes = ''
  },
  { immediate: true },
)

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`
}

function applyQuickHour(hour) {
  const dayKey = toDateKey(new Date(form.startsAt || Date.now()))
  form.startsAt = buildSlotDateTime(dayKey, hour, 0)
}

function submit() {
  emit('save', {
    patientId: form.patientId,
    title: form.title,
    startsAt: form.startsAt,
    durationMin: Number(form.durationMin) || 60,
    notes: form.notes,
  })
}
</script>

<style scoped>
.agenda-modal {
  position: fixed;
  inset: 0;
  z-index: 6200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.agenda-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.agenda-modal__panel {
  position: relative;
  width: min(30rem, 100%);
  max-height: min(92dvh, 760px);
  overflow: auto;
  padding: 1rem 1.1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
}

.agenda-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.agenda-modal__head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--admin-ink, #141414);
}

.agenda-modal__subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.8125rem;
  color: var(--admin-muted, #66706e);
}

.agenda-modal__close {
  border: none;
  background: transparent;
  color: var(--admin-muted, #66706e);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.agenda-modal__form {
  display: grid;
  gap: 0.75rem;
}

.agenda-modal__quick-hours {
  display: grid;
  gap: 0.45rem;
}

.agenda-modal__quick-hours > span {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--admin-muted, #66706e);
}

.agenda-modal__hour-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.agenda-modal__hour-btn {
  min-height: 2rem;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: var(--cf-radius-control);
  background: #fff;
  color: var(--admin-ink, #141414);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.agenda-modal__hour-btn:hover {
  background: rgba(139, 150, 124, 0.1);
  border-color: rgba(139, 150, 124, 0.35);
}

.agenda-modal__error {
  margin: 0;
  font-size: 0.8125rem;
  color: #b42318;
}

.agenda-modal__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-top: 0.35rem;
}

.agenda-modal__actions {
  display: flex;
  gap: 0.45rem;
  margin-left: auto;
}

.agenda-modal__danger {
  color: #b42318 !important;
  border-color: rgba(180, 35, 24, 0.25) !important;
}
</style>
