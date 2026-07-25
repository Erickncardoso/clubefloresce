<template>
  <Teleport to="body">
    <div v-if="open" class="agenda-modal" role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title">
      <div class="agenda-modal__backdrop" aria-hidden="true" @click="$emit('close')" />
      <div class="agenda-modal__panel admin-shell-card">
        <header class="agenda-modal__head">
          <h2 id="agenda-modal-title">{{ editing ? 'Editar agendamento' : 'Novo agendamento' }}</h2>
          <button type="button" class="agenda-modal__close" @click="$emit('close')">Fechar</button>
        </header>

        <form class="agenda-modal__form" @submit.prevent="submit">
          <div class="field field--float">
            <label for="agenda-patient">Paciente</label>
            <select id="agenda-patient" v-model="form.patientId" required>
              <option value="">Selecione a paciente</option>
              <option v-for="patient in patients" :key="patient.id" :value="patient.id">
                {{ patient.name }}
              </option>
            </select>
          </div>

          <div class="field field--float">
            <label for="agenda-title">Título</label>
            <input id="agenda-title" v-model="form.title" type="text" maxlength="120" placeholder="Consulta">
          </div>

          <div class="field field--float">
            <label for="agenda-starts">Data e hora</label>
            <SharedCfDateTimeInput id="agenda-starts" v-model="form.startsAt" required />
          </div>

          <div class="field field--float">
            <label for="agenda-duration">Duração (min)</label>
            <select id="agenda-duration" v-model.number="form.durationMin">
              <option :value="30">30 min</option>
              <option :value="45">45 min</option>
              <option :value="60">60 min</option>
              <option :value="90">90 min</option>
            </select>
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
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? 'Salvando…' : 'Salvar' }}
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
import { defaultAppointmentDateTime } from '~/utils/agenda-calendar.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  patients: { type: Array, default: () => [] },
  appointment: { type: Object, default: null },
  defaultDate: { type: Date, default: null },
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

watch(
  () => [props.open, props.appointment, props.defaultDate],
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
    form.patientId = ''
    form.title = 'Consulta'
    form.startsAt = defaultAppointmentDateTime(props.defaultDate || new Date())
    form.durationMin = 60
    form.notes = ''
  },
  { immediate: true },
)

function submit() {
  emit('save', {
    patientId: form.patientId,
    title: form.title,
    startsAt: form.startsAt,
    durationMin: form.durationMin,
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
  width: min(28rem, 100%);
  max-height: min(92dvh, 720px);
  overflow: auto;
  padding: 1rem 1.1rem;
  border: 1px solid var(--admin-border, #e8ece9);
  background: #fff;
}

.agenda-modal__head {
  display: flex;
  align-items: center;
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
