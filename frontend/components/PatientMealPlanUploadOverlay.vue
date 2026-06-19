<template>
  <Teleport to="body">
    <Transition name="meal-plan-upload-fade">
      <div
        v-if="uploading"
        class="meal-plan-upload-overlay"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Processando PDF do cardápio"
      >
        <div class="meal-plan-upload-overlay__card cf-squircle">
          <span class="meal-plan-upload-overlay__spinner" aria-hidden="true" />
          <p class="meal-plan-upload-overlay__title">{{ title }}</p>
          <p class="meal-plan-upload-overlay__copy">{{ copy }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const mealPlan = usePatientMealPlan()
const uploading = computed(() => mealPlan.uploading.value)

const hasExistingPlan = useState('patient-meal-plan-upload-had-plan', () => false)

const title = computed(() =>
  hasExistingPlan.value ? 'Atualizando seu cardápio' : 'Importando seu cardápio',
)

const copy = computed(() =>
  hasExistingPlan.value
    ? 'Estamos lendo o PDF e atualizando sua dieta e metas nutricionais...'
    : 'Estamos lendo o PDF e montando sua dieta...',
)

watch(() => mealPlan.uploading.value, (isUploading) => {
  if (!import.meta.client) return
  document.body.style.overflow = isUploading ? 'hidden' : ''
}, { immediate: true })

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.meal-plan-upload-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(5px);
}

.meal-plan-upload-overlay__card {
  width: 100%;
  max-width: 18.5rem;
  padding: 1.35rem 1.15rem 1.2rem;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  box-shadow: var(--cf-shadow-lg);
  text-align: center;
}

.meal-plan-upload-overlay__spinner {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  margin-bottom: 0.85rem;
  border: 3px solid var(--cf-pink-soft);
  border-top-color: var(--cf-pink);
  border-radius: 50%;
  animation: meal-plan-upload-spin 0.75s linear infinite;
}

.meal-plan-upload-overlay__title {
  margin: 0 0 0.4rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--cf-text);
}

.meal-plan-upload-overlay__copy {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

@keyframes meal-plan-upload-spin {
  to {
    transform: rotate(360deg);
  }
}

.meal-plan-upload-fade-enter-active,
.meal-plan-upload-fade-leave-active {
  transition: opacity 0.2s ease;
}

.meal-plan-upload-fade-enter-from,
.meal-plan-upload-fade-leave-to {
  opacity: 0;
}
</style>
