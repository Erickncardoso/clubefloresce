<template>
  <Teleport to="body">
    <div v-if="open" class="checkin-prompt-overlay" @click.self="emit('dismiss')">
      <div class="checkin-prompt cf-squircle" role="dialog" aria-modal="true" aria-labelledby="checkin-prompt-title">
        <CalendarCheck class="checkin-prompt-icon" aria-hidden="true" />
        <h2 id="checkin-prompt-title">Check-in da semana</h2>
        <p class="checkin-prompt-text">
          Seu check-in semanal está disponível. Preencha até no máximo
          <strong>{{ deadlineLabel }}</strong> para manter sua evolução em dia.
        </p>
        <button
          type="button"
          class="checkin-prompt-reminder"
          :disabled="reminderLoading"
          @click="activateReminder"
        >
          {{ reminderEnabled ? 'Lembrete ativado ✓' : 'Ativar lembrete para não esquecer' }}
        </button>
        <div class="checkin-prompt-actions">
          <button type="button" class="checkin-prompt-secondary" @click="emit('dismiss')">
            Depois
          </button>
          <button type="button" class="checkin-prompt-primary" @click="emit('start')">
            Começar agora
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { CalendarCheck } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
  deadlineLabel: { type: String, default: 'segunda-feira' },
})

const emit = defineEmits(['dismiss', 'start'])

const config = useRuntimeConfig()
const { patientTimeHeaders } = usePatientLocalTime()

const reminderLoading = ref(false)
const reminderEnabled = ref(false)

onMounted(() => {
  if (import.meta.client) {
    reminderEnabled.value = localStorage.getItem('cf-checkin-reminder') === '1'
  }
})

async function activateReminder() {
  if (reminderEnabled.value) return
  reminderLoading.value = true
  try {
    await $fetch(`${config.public.apiBase}/checkin/reminders/subscribe`, {
      method: 'POST',
      headers: patientTimeHeaders(),
    })
    localStorage.setItem('cf-checkin-reminder', '1')
    reminderEnabled.value = true
  } catch {
    localStorage.setItem('cf-checkin-reminder', '1')
    reminderEnabled.value = true
  } finally {
    reminderLoading.value = false
  }
}
</script>

<style scoped>
.checkin-prompt-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.4);
}

.checkin-prompt {
  width: 100%;
  max-width: 22rem;
  padding: 1.25rem 1.15rem 1.1rem;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  box-shadow: var(--cf-shadow-lg);
  text-align: center;
}

.checkin-prompt-icon {
  width: 2rem;
  height: 2rem;
  color: var(--cf-pink);
  margin-bottom: 0.65rem;
}

.checkin-prompt h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--cf-text);
}

.checkin-prompt-text {
  margin: 0 0 0.85rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.checkin-prompt-reminder {
  width: 100%;
  margin-bottom: 0.85rem;
  padding: 0.65rem 0.75rem;
  border: 1px dashed var(--cf-pink);
  border-radius: 12px;
  background: var(--cf-pink-soft);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--cf-pink-dark);
  cursor: pointer;
}

.checkin-prompt-reminder:disabled {
  opacity: 0.7;
  cursor: default;
}

.checkin-prompt-actions {
  display: flex;
  gap: 0.5rem;
}

.checkin-prompt-secondary,
.checkin-prompt-primary {
  flex: 1;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.checkin-prompt-secondary {
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  color: var(--cf-text-muted);
}

.checkin-prompt-primary {
  border: none;
  background: var(--cf-pink);
  color: #fff;
}
</style>
