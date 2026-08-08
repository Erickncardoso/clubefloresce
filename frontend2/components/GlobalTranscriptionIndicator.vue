<template>
  <Teleport to="body">
    <div
      v-if="visibleJobs.length"
      class="gti"
      aria-live="polite"
      aria-label="Transcrições de áudio em andamento"
    >
      <div class="gti__stack" :style="stackHeightStyle">
        <TransitionGroup name="gti-card" tag="div" class="gti__pile">
          <article
            v-for="(job, index) in visibleJobs"
            :key="job.id"
            class="gti-card"
            :class="`gti-card--${job.status}`"
            :style="stackCardStyle(index, visibleJobs.length)"
          >
            <div class="gti-card__row">
              <div class="gti-card__icon" aria-hidden="true">
                <Loader2 v-if="isActive(job)" class="gti-card__spin" />
                <Check v-else-if="job.status === 'completed'" />
                <AlertCircle v-else-if="job.status === 'error'" />
                <Mic v-else />
              </div>

              <div class="gti-card__main">
                <div class="gti-card__head">
                  <p class="gti-card__title">{{ job.label }}</p>
                  <button
                    v-if="job.status === 'error' || job.status === 'completed'"
                    type="button"
                    class="gti-card__dismiss"
                    aria-label="Fechar"
                    @click="dismissJob(job.id)"
                  >
                    <X :size="14" />
                  </button>
                </div>

                <p class="gti-card__meta">
                  {{ statusLabel(job) }}
                  <span v-if="job.anamneseTitle"> · {{ job.anamneseTitle }}</span>
                </p>

                <div v-if="isActive(job)" class="gti-card__progress">
                  <div class="gti-card__bar">
                    <div class="gti-card__fill" />
                  </div>
                </div>

                <p v-if="job.status === 'error'" class="gti-card__error">
                  {{ job.error || 'Falha na transcrição' }}
                </p>
                <p v-if="job.status === 'error' && hasJobAudio(job.id)" class="gti-card__fallback">
                  Sua gravação foi preservada. Baixe o áudio antes de fechar — você não perde o registro.
                </p>

                <div v-if="job.status === 'completed' || job.status === 'error'" class="gti-card__actions">
                  <NuxtLink
                    v-if="job.status === 'completed'"
                    :to="buildPatientPath({ id: job.patientId, name: job.patientName })"
                    class="gti-card__action"
                    @click="prepareAnamneseOpen(job)"
                  >
                    Ver anamnese
                  </NuxtLink>
                  <button
                    v-if="job.status === 'completed'"
                    type="button"
                    class="gti-card__action"
                    @click="downloadJobTranscript(job.id)"
                  >
                    Baixar texto
                  </button>
                  <button
                    v-if="hasJobAudio(job.id)"
                    type="button"
                    class="gti-card__action"
                    :class="{ 'gti-card__action--primary': job.status === 'error' }"
                    @click="downloadJobAudio(job.id)"
                  >
                    {{ job.status === 'error' ? 'Baixar áudio (fallback)' : 'Baixar áudio' }}
                  </button>
                  <button
                    v-if="job.status === 'error'"
                    type="button"
                    class="gti-card__action"
                    @click="retryJob(job.id)"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          </article>
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { AlertCircle, Check, Loader2, Mic, X } from 'lucide-vue-next'
import { useGlobalTranscription } from '~/composables/useGlobalTranscription.js'
import { useFloatingAnamnese } from '~/composables/useFloatingAnamnese.js'
import { buildPatientPath } from '~/utils/patient-slug.js'
import { ensureNutriPusherConnected, releaseNutriPusherConnection } from '~/composables/useNutriPusher.js'

const {
  visibleJobs,
  dismissJob,
  retryJob,
  downloadJobAudio,
  downloadJobTranscript,
  hasJobAudio,
} = useGlobalTranscription()
const floatingAnamnese = useFloatingAnamnese()

const CARD_HEIGHT = 5.75
const STACK_PEEK = 0.85

const stackHeightStyle = computed(() => {
  const count = visibleJobs.value.length
  if (count <= 1) return undefined
  const rem = CARD_HEIGHT + (count - 1) * STACK_PEEK
  return { minHeight: `${rem}rem` }
})

function stackCardStyle(index, total) {
  const depth = total - 1 - index
  const scale = Math.max(0.9, 1 - depth * 0.035)
  return {
    zIndex: total - depth,
    marginTop: depth === 0 ? '0' : `-${STACK_PEEK}rem`,
    transform: depth === 0 ? 'none' : `scale(${scale})`,
    opacity: depth > 3 ? 0 : 1 - depth * 0.06,
    pointerEvents: depth === 0 ? 'auto' : 'none',
  }
}

function isActive(job) {
  return job.status === 'queued' || job.status === 'processing' || job.status === 'reconnecting'
}

function statusLabel(job) {
  if (job.status === 'queued') return 'Na fila de processamento…'
  if (job.status === 'processing') return 'Processando áudio com IA…'
  if (job.status === 'reconnecting') {
    return job.retryCount
      ? `Reconectando… tentativa ${job.retryCount}/${12}`
      : 'Verificando andamento…'
  }
  if (job.status === 'completed') return 'Transcrição concluída'
  if (job.status === 'error') return 'Erro na transcrição'
  return 'Transcrição'
}

function prepareAnamneseOpen(job) {
  if (!job?.patientId) return
  dismissJob(job.id)
  floatingAnamnese.openEditor(job.patientId, {
    type: 'new',
    count: 0,
    focusTranscription: true,
  })
}

onMounted(() => {
  if (import.meta.client) void ensureNutriPusherConnected()
})

onBeforeUnmount(() => {
  if (import.meta.client) releaseNutriPusherConnection()
})
</script>

<style scoped>
.gti {
  position: fixed;
  top: 5.5rem;
  right: 1rem;
  z-index: 1295;
  width: min(100%, 21rem);
  pointer-events: none;
}

.gti__stack {
  position: relative;
  width: 100%;
}

.gti__pile {
  position: relative;
  width: 100%;
}

.gti-card {
  pointer-events: auto;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
  padding: 0.7rem 0.75rem;
  overflow: hidden;
  transition: transform 0.28s ease, margin 0.28s ease, opacity 0.28s ease;
}

.gti-card--processing,
.gti-card--reconnecting {
  border-color: #d5dfd0;
}

.gti-card--completed {
  border-color: #d7eadb;
}

.gti-card--error {
  border-color: #fecaca;
  background: #fffafa;
}

.gti-card__row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.gti-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-control);
  background: rgba(139, 150, 124, 0.12);
  color: #5f6b55;
}

.gti-card--completed .gti-card__icon {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.gti-card--error .gti-card__icon {
  background: rgba(239, 68, 68, 0.1);
  color: #b42318;
}

.gti-card__icon svg {
  width: 1rem;
  height: 1rem;
}

.gti-card__spin {
  animation: gti-spin 0.9s linear infinite;
}

.gti-card__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.gti-card__head {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}

.gti-card__title {
  margin: 0;
  flex: 1;
  font-size: 0.8rem;
  font-weight: 700;
  color: #141414;
  line-height: 1.25;
}

.gti-card__meta {
  margin: 0;
  font-size: 0.72rem;
  color: #66706e;
  line-height: 1.35;
}

.gti-card__dismiss {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.1rem;
  border-radius: var(--cf-radius-control);
  flex-shrink: 0;
}

.gti-card__dismiss:hover {
  background: #f1f5f3;
  color: #64748b;
}

.gti-card__progress {
  margin-top: 0.15rem;
}

.gti-card__bar {
  height: 4px;
  border-radius: 999px;
  background: #edf2ef;
  overflow: hidden;
}

.gti-card__fill {
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7a8570, #8b967c);
  animation: gti-indeterminate 1.2s ease-in-out infinite;
}

.gti-card__error {
  margin: 0.1rem 0 0;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.35;
  color: #dc2626;
}

.gti-card__fallback {
  margin: 0.15rem 0 0;
  font-size: 0.68rem;
  line-height: 1.35;
  color: #92400e;
  font-weight: 500;
}

.gti-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.2rem;
}

.gti-card__action {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary, #8b967c);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.gti-card__action--primary {
  color: #b45309;
}

.gti-card-enter-active,
.gti-card-leave-active {
  transition: all 0.28s ease;
}

.gti-card-enter-from,
.gti-card-leave-to {
  opacity: 0;
  transform: translateX(1rem) scale(0.96);
}

.gti-card-move {
  transition: transform 0.28s ease;
}

@keyframes gti-spin {
  to { transform: rotate(360deg); }
}

@keyframes gti-indeterminate {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(260%); }
}

@media (max-width: 640px) {
  .gti {
    top: auto;
    bottom: 1rem;
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
  }
}
</style>
