<template>
  <Teleport to="body">
    <div v-if="open" class="mpdup-modal" role="dialog" aria-modal="true" aria-labelledby="mpdup-title">
      <div class="mpdup-modal__backdrop" aria-hidden="true" @click="close" />
      <div class="modal-card mpdup-modal__panel admin-shell admin-shell-card" @click.stop>
        <header class="mpdup-modal__head">
          <div>
            <h2 id="mpdup-title">Duplicar plano alimentar</h2>
            <p>Copia refeições, receitas, grupos, observações e texto qualitativo.</p>
          </div>
          <button type="button" class="mpdup-modal__close" aria-label="Fechar" @click="close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="mpdup-modal__body">
          <div class="field field--float">
            <label for="mpdup-title-input">Nome da cópia</label>
            <input
              id="mpdup-title-input"
              ref="titleInputRef"
              v-model="title"
              type="text"
              maxlength="120"
              placeholder="Ex.: Plano alimentar (cópia)"
            >
          </div>

          <div class="field field--float">
            <label for="mpdup-patient">Paciente destino</label>
            <SharedCfSelect
              id="mpdup-patient"
              v-model="targetPatientId"
              :options="patientOptions"
              placeholder="Selecione a paciente"
            />
          </div>

          <p v-if="sourceLabel" class="mpdup-source">
            Origem: <strong>{{ sourceLabel }}</strong>
          </p>
          <p v-if="error" class="mpdup-error">{{ error }}</p>
        </div>

        <footer class="mpdup-modal__foot">
          <button type="button" class="btn-secondary mpdup-btn" :disabled="submitting" @click="close">
            Cancelar
          </button>
          <button type="button" class="btn-primary mpdup-btn" :disabled="submitting" @click="submit">
            {{ submitting ? 'Duplicando…' : 'Duplicar plano' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession.js'
import { duplicateMealPlanTitle } from '~/utils/meal-plan-duplicate.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  source: { type: Object, default: null },
  currentPatient: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'submit'])

const apiBase = useApiBase()
const titleInputRef = ref(null)
const title = ref('')
const targetPatientId = ref('')
const patientOptions = ref([])
const error = ref('')
const submitting = ref(false)

const sourceLabel = computed(() => {
  const name = String(props.source?.title || '').trim()
  return name || 'Plano alimentar'
})

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  error.value = ''
  submitting.value = false
  title.value = duplicateMealPlanTitle(props.source?.title)
  targetPatientId.value = props.currentPatient?.id || ''
  await loadPatients()
  await nextTick()
  titleInputRef.value?.focus?.()
})

async function loadPatients() {
  try {
    const users = await $fetch(`${apiBase.value}/users`, authFetchInit())
    const patients = (Array.isArray(users) ? users : [])
      .filter((entry) => entry?.role === 'PACIENTE')
      .map((entry) => ({ value: entry.id, label: entry.name || 'Paciente' }))

    patientOptions.value = patients
    if (!targetPatientId.value && props.currentPatient?.id) {
      targetPatientId.value = props.currentPatient.id
    }
  } catch {
    patientOptions.value = props.currentPatient?.id
      ? [{ value: props.currentPatient.id, label: props.currentPatient.name || 'Paciente atual' }]
      : []
  }
}

function close() {
  if (submitting.value) return
  emit('update:open', false)
}

function submit() {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) {
    error.value = 'Informe um nome para a cópia.'
    return
  }
  if (!targetPatientId.value) {
    error.value = 'Selecione a paciente destino.'
    return
  }
  error.value = ''
  submitting.value = true
  emit('submit', {
    title: trimmedTitle,
    targetPatientId: targetPatientId.value,
    onComplete: () => {
      submitting.value = false
    },
    onError: (message) => {
      submitting.value = false
      error.value = message
    },
  })
}
</script>

<style scoped>
.mpdup-modal {
  position: fixed;
  inset: 0;
  z-index: 6200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mpdup-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
}

.mpdup-modal__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 32rem);
  display: grid;
  gap: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.09);
}

.mpdup-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
}

.mpdup-modal__head h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}

.mpdup-modal__head p {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #6b7280;
  line-height: 1.45;
}

.mpdup-modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: var(--cf-radius-xs);
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.mpdup-modal__close svg {
  width: 1rem;
  height: 1rem;
}

.mpdup-modal__body {
  display: grid;
  gap: 0.75rem;
  padding: 0 1rem 0.85rem;
}

.mpdup-source {
  margin: 0;
  font-size: 0.74rem;
  color: #6b7280;
}

.mpdup-error {
  margin: 0;
  font-size: 0.74rem;
  color: #b45309;
}

.mpdup-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid #f0f1f3;
}

.mpdup-btn {
  min-height: 2.35rem !important;
  font-size: 0.8125rem !important;
}
</style>
