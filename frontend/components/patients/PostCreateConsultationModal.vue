<template>
  <Teleport to="body">
    <div v-if="open" class="pcm-overlay" @click.self="skip">
      <div class="pcm-modal" role="dialog" aria-modal="true" aria-labelledby="pcm-title">
        <h2 id="pcm-title">Você está realizando uma nova consulta?</h2>
        <p class="pcm-sub">
          Registre a consulta do seu paciente e tenha acesso as métricas completas do seu consultório.
        </p>

        <div class="field field--float">
          <label for="pcm-date">Data</label>
          <SharedCfDateInput id="pcm-date" v-model="form.date" />
        </div>

        <div class="field field--float">
          <label for="pcm-notes">Observação</label>
          <input
            id="pcm-notes"
            v-model="form.notes"
            type="text"
            maxlength="500"
            placeholder="Observação desta consulta"
          >
        </div>

        <label class="pcm-toggle-row">
          <span>Criar uma tarefa da consulta no planner</span>
          <input v-model="form.createPlannerTask" type="checkbox" class="pcm-switch">
        </label>

        <p v-if="error" class="pcm-error">{{ error }}</p>

        <button
          type="button"
          class="pcm-btn pcm-btn--primary"
          :disabled="saving || !form.date"
          @click="register"
        >
          {{ saving ? 'Registrando…' : 'registrar nova consulta' }}
        </button>

        <NuxtLink
          v-if="patient?.id"
          :to="buildPatientPath(patient)"
          class="pcm-btn pcm-btn--secondary"
          @click="onSkipLink"
        >
          não registrar e abrir menu do paciente
        </NuxtLink>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { authFetchInit } from '~/composables/useAuthSession.js'
import { buildPatientPath } from '~/utils/patient-slug.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  patient: { type: Object, default: null },
})

const emit = defineEmits(['close', 'done'])

const apiBase = useApiBase()
const saving = ref(false)
const error = ref('')

const form = reactive({
  date: todayInput(),
  notes: '',
  createPlannerTask: false,
})

function todayInput() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function resetForm() {
  form.date = todayInput()
  form.notes = ''
  form.createPlannerTask = false
  error.value = ''
  saving.value = false
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

function onSkipLink() {
  emit('done', props.patient)
  emit('close')
}

async function skip() {
  if (saving.value) return
  onSkipLink()
  if (props.patient?.id) {
    await navigateTo(buildPatientPath(props.patient))
  }
}

async function goToPatient() {
  onSkipLink()
  if (props.patient?.id) {
    await navigateTo(buildPatientPath(props.patient))
  }
}

async function register() {
  if (!props.patient?.id || !form.date || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const existing = Array.isArray(props.patient?.patientProfileData?.consultations)
      ? props.patient.patientProfileData.consultations
      : []

    const consultation = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      date: form.date,
      notes: form.notes.trim() || null,
      createPlannerTask: Boolean(form.createPlannerTask),
      createdAt: new Date().toISOString(),
    }

    await $fetch(`${apiBase.value}/users/${props.patient.id}`, authFetchInit({
      method: 'PATCH',
      body: {
        patientProfile: {
          consultations: [consultation, ...existing].slice(0, 200),
        },
      },
    }))

    goToPatient()
  } catch (err) {
    error.value = err?.data?.error || 'Não foi possível registrar a consulta.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pcm-overlay {
  position: fixed;
  inset: 0;
  z-index: 6400;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(20, 24, 20, 0.45);
  backdrop-filter: blur(2px);
}

.pcm-modal {
  width: min(420px, 100%);
  background: #fff;
  border-radius: var(--cf-radius-control);
  padding: 1.6rem 1.45rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  text-align: center;
  box-shadow: 0 18px 40px rgba(20, 24, 20, 0.18);
}

.pcm-modal h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #2c322c;
  line-height: 1.3;
}

.pcm-sub {
  margin: 0;
  color: #6b7368;
  font-size: 0.9rem;
  line-height: 1.45;
}

.pcm-modal :deep(.field--float) {
  position: relative;
  margin-top: 0.35rem;
  text-align: left;
}

.pcm-modal :deep(.field--float > label) {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  margin: 0;
  padding: 0 0.4rem;
  background: #fff;
  z-index: 2;
  font-size: 0.76rem;
  font-weight: 600;
  color: #444;
}

.pcm-modal :deep(.field input),
.pcm-modal :deep(.cf-date-input-trigger) {
  width: 100%;
  min-height: 3.1rem;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  background: #fff;
  font: inherit;
  font-size: 0.95rem;
  text-align: center;
  box-sizing: border-box;
}

.pcm-modal :deep(.field input) {
  padding: 0.95rem 0.9rem;
}

.pcm-modal :deep(.field input:focus),
.pcm-modal :deep(.cf-date-input-trigger:focus) {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: none;
}

.pcm-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  width: 100%;
  min-height: 3.1rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--cf-radius-control);
  background: #f3f5f3;
  color: #2c322c;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.pcm-switch {
  appearance: none;
  width: 2.6rem;
  height: 1.45rem;
  border-radius: 999px;
  background: #c5cbc4;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s ease;
}

.pcm-switch::after {
  content: '';
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.pcm-switch:checked {
  background: #8b967c;
}

.pcm-switch:checked::after {
  transform: translateX(1.15rem);
}

.pcm-error {
  margin: 0;
  color: #c53030;
  font-size: 0.86rem;
  font-weight: 600;
}

.pcm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.1rem;
  border: none;
  border-radius: var(--cf-radius-control);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: lowercase;
  text-decoration: none;
  cursor: pointer;
  color: #fff;
}

.pcm-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.pcm-btn--primary {
  background: #8b967c;
}

.pcm-btn--primary:hover:not(:disabled) {
  background: #7a8670;
}

.pcm-btn--secondary {
  background: #d9847a;
}

.pcm-btn--secondary:hover:not(:disabled) {
  background: #c97369;
}
</style>
