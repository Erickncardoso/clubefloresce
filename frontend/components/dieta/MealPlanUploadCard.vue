<template>
  <section class="dieta-upload-card cf-card">
    <div class="dieta-upload-icon-wrap" aria-hidden="true">
      <FileText class="dieta-upload-icon" />
    </div>
    <h2 class="dieta-upload-title">Importe seu plano alimentar</h2>
    <p class="dieta-upload-copy">
      Envie o PDF prescrito pela nutricionista. Extraímos refeições, porções em gramas e ml, e opções de substituição automaticamente.
    </p>

    <label class="dieta-upload-btn">
      <Upload class="dieta-upload-btn-icon" aria-hidden="true" />
      <span>{{ uploading ? 'Processando PDF...' : 'Selecionar PDF' }}</span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        class="dieta-upload-input"
        :disabled="uploading"
        @change="onFileChange"
      />
    </label>

    <p v-if="error" class="dieta-upload-error">{{ error }}</p>
    <p class="dieta-upload-hint">Formato compatível: planejamento exportado em texto (ex.: WebDiet / Dietbox).</p>
  </section>
</template>

<script setup>
import { FileText, Upload } from 'lucide-vue-next'
import { usePatientMealPlan } from '~/composables/usePatientMealPlan'

const emit = defineEmits(['uploaded'])

const { uploading, error, uploadPdf } = usePatientMealPlan()

async function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return
  }

  try {
    await uploadPdf(file)
    emit('uploaded')
  } catch {
    /* erro já em error.value */
  } finally {
    event.target.value = ''
  }
}
</script>

<style scoped>
.dieta-upload-card {
  text-align: center;
  padding: 1.35rem 1.1rem;
}

.dieta-upload-icon-wrap {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 0.85rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dieta-upload-icon {
  width: 1.35rem;
  height: 1.35rem;
  color: var(--cf-pink);
}

.dieta-upload-title {
  margin: 0 0 0.45rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--cf-text);
}

.dieta-upload-copy {
  margin: 0 0 1rem;
  font-size: 0.84rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.dieta-upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 12rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--cf-pink);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.dieta-upload-btn:has(input:disabled) {
  opacity: 0.7;
  cursor: wait;
}

.dieta-upload-btn-icon {
  width: 1rem;
  height: 1rem;
}

.dieta-upload-input {
  display: none;
}

.dieta-upload-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: #c0392b;
}

.dieta-upload-hint {
  margin: 0.85rem 0 0;
  font-size: 0.72rem;
  color: var(--cf-text-muted);
}
</style>
