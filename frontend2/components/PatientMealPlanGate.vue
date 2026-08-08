<template>
  <Teleport to="body">
    <Transition name="meal-plan-gate-fade">
      <div
        v-if="open"
        class="meal-plan-gate-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-plan-gate-title"
      >
        <div class="meal-plan-gate cf-squircle">
          <div class="meal-plan-gate-icon-wrap" aria-hidden="true">
            <FileText class="meal-plan-gate-icon" />
          </div>

          <h2 id="meal-plan-gate-title" class="meal-plan-gate-title">
            Envie sua dieta para começar
          </h2>
          <p class="meal-plan-gate-copy">
            Antes de usar o app, importe o PDF do seu plano alimentar prescrito pela nutricionista.
            Extraímos refeições, porções e substituições automaticamente.
          </p>

          <div class="meal-plan-gate-actions">
            <label
              class="meal-plan-gate-btn"
              :class="{ 'meal-plan-gate-btn--loading': uploading }"
            >
              <span
                v-if="uploading"
                class="meal-plan-gate-spinner"
                aria-hidden="true"
              />
              <Upload v-else class="meal-plan-gate-btn-icon" aria-hidden="true" />
              <span>{{ uploading ? 'Processando PDF...' : 'Enviar PDF da dieta' }}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                class="meal-plan-gate-input"
                :disabled="uploading"
                @change="onFileChange"
              />
            </label>
          </div>

          <p v-if="error" class="meal-plan-gate-error" role="alert">{{ error }}</p>
          <p class="meal-plan-gate-hint">
            Use o PDF do plano alimentar enviado pela sua nutricionista.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { FileText, Upload } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const { uploading, error, uploadPdf, hasPlan } = usePatientMealPlan()

async function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    error.value = 'Selecione um arquivo PDF.'
    event.target.value = ''
    return
  }

  try {
    await uploadPdf(file)
    if (hasPlan.value) {
      error.value = ''
    }
  } catch {
    /* feedback em error.value */
  } finally {
    event.target.value = ''
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!import.meta.client) return
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true },
)

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.meal-plan-gate-overlay {
  position: fixed;
  inset: 0;
  z-index: 7000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.meal-plan-gate {
  width: 100%;
  max-width: 20rem;
  padding: 1.25rem 1.1rem 1.1rem;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  box-shadow: var(--cf-shadow-lg);
  text-align: center;
}

.meal-plan-gate-icon-wrap {
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.meal-plan-gate-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: var(--cf-pink);
}

.meal-plan-gate-title {
  margin: 0 0 0.45rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--cf-text);
}

.meal-plan-gate-copy {
  margin: 0 0 0.95rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.meal-plan-gate-actions {
  display: flex;
  justify-content: center;
}

.meal-plan-gate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  max-width: 100%;
  padding: 0.62rem 0.95rem;
  border-radius: 10px;
  background: var(--cf-pink);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}

.meal-plan-gate-btn:has(input:disabled),
.meal-plan-gate-btn--loading {
  opacity: 0.9;
  cursor: wait;
  pointer-events: none;
}

.meal-plan-gate-spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: meal-plan-gate-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes meal-plan-gate-spin {
  to {
    transform: rotate(360deg);
  }
}

.meal-plan-gate-fade-enter-active,
.meal-plan-gate-fade-leave-active {
  transition: opacity 0.2s ease;
}

.meal-plan-gate-fade-enter-from,
.meal-plan-gate-fade-leave-to {
  opacity: 0;
}

.meal-plan-gate-btn-icon {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.meal-plan-gate-input {
  display: none;
}

.meal-plan-gate-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: #c0392b;
}

.meal-plan-gate-hint {
  margin: 0.7rem 0 0;
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--cf-text-muted);
}
</style>
