<template>
  <Teleport to="body">
    <div
      v-if="jobs.length"
      class="video-upload-queue"
      aria-live="polite"
      aria-label="Envios de vídeo em andamento"
    >
      <div class="video-upload-queue__stack" :style="stackHeightStyle">
        <TransitionGroup name="upload-queue" tag="div" class="video-upload-queue__pile">
          <article
            v-for="(job, index) in jobs"
            :key="job.id"
            class="upload-queue-card"
            :class="`upload-queue-card--${job.status}`"
            :style="stackCardStyle(index, jobs.length)"
          >
            <div class="upload-queue-card__row">
              <div class="upload-queue-card__thumb" aria-hidden="true">
                <img v-if="job.thumbnailUrl" :src="job.thumbnailUrl" alt="">
                <Film v-else class="upload-queue-card__thumb-fallback" />
                <div
                  v-if="isActive(job)"
                  class="upload-queue-card__thumb-shade"
                />
              </div>

              <div class="upload-queue-card__main">
                <div class="upload-queue-card__head">
                  <p class="upload-queue-card__title">{{ job.label }}</p>
                  <button
                    v-if="job.status === 'error'"
                    type="button"
                    class="upload-queue-card__dismiss"
                    aria-label="Fechar"
                    @click="dismissJob(job.id)"
                  >
                    <X :size="14" />
                  </button>
                </div>
                <p class="upload-queue-card__file">{{ job.fileName }}</p>

                <div v-if="isActive(job)" class="upload-queue-card__progress">
                  <div class="upload-queue-card__bar">
                    <div
                      class="upload-queue-card__fill"
                      :class="{ 'upload-queue-card__fill--indeterminate': job.status === 'processing' }"
                      :style="{ width: progressWidth(job) }"
                    />
                  </div>
                  <span v-if="job.status === 'uploading'" class="upload-queue-card__percent">
                    {{ job.progress }}%
                  </span>
                </div>

                <p v-else-if="job.status === 'error'" class="upload-queue-card__status upload-queue-card__status--err">
                  {{ job.error || 'Falha no envio' }}
                </p>
              </div>
            </div>
          </article>
        </TransitionGroup>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { Film, X } from 'lucide-vue-next'

const { jobs, dismissJob } = useVideoUploadQueue()

const CARD_HEIGHT = 5.5
const STACK_PEEK = 0.85

const stackHeightStyle = computed(() => {
  const count = jobs.value.length
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
  return job.status === 'uploading' || job.status === 'processing' || job.status === 'saving'
}

function progressWidth(job) {
  if (job.status === 'processing' || job.status === 'saving') return '100%'
  return `${job.progress}%`
}
</script>

<style scoped>
.video-upload-queue {
  position: fixed;
  top: 5.5rem;
  right: 1rem;
  z-index: 1300;
  width: min(100%, 20rem);
  pointer-events: none;
}

.video-upload-queue__stack {
  position: relative;
  width: 100%;
}

.video-upload-queue__pile {
  position: relative;
  width: 100%;
}

.upload-queue-card {
  pointer-events: auto;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
  padding: 0.65rem 0.7rem;
  overflow: hidden;
  transition: transform 0.28s ease, margin 0.28s ease, opacity 0.28s ease;
}

.upload-queue-card--done,
.upload-queue-card--uploaded,
.upload-queue-card--saving {
  border-color: #d7eadb;
}

.upload-queue-card--error {
  border-color: #fecaca;
  background: #fffafa;
}

.upload-queue-card__row {
  display: flex;
  align-items: stretch;
  gap: 0.65rem;
}

.upload-queue-card__thumb {
  position: relative;
  width: 4.6rem;
  height: 2.6rem;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(145deg, #edf2ef, #dfe8e3);
}

.upload-queue-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.upload-queue-card__thumb-fallback {
  width: 1.1rem;
  height: 1.1rem;
  color: #8B967C;
  position: absolute;
  inset: 0;
  margin: auto;
  opacity: 0.55;
}

.upload-queue-card__thumb-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.08));
  pointer-events: none;
}

.upload-queue-card__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
}

.upload-queue-card__head {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}

.upload-queue-card__title {
  margin: 0;
  flex: 1;
  font-size: 0.8rem;
  font-weight: 700;
  color: #141414;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-queue-card__file {
  margin: 0;
  font-size: 0.68rem;
  color: #66706e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-queue-card__dismiss {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.1rem;
  border-radius: 6px;
  flex-shrink: 0;
}

.upload-queue-card__dismiss:hover {
  background: #f1f5f3;
  color: #64748b;
}

.upload-queue-card__progress {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.15rem;
}

.upload-queue-card__bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: #edf2ef;
  overflow: hidden;
}

.upload-queue-card__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7a8570, #8B967C);
  transition: width 0.2s ease;
}

.upload-queue-card__fill--indeterminate {
  animation: upload-queue-pulse 1.2s ease-in-out infinite;
}

.upload-queue-card__percent {
  font-size: 0.68rem;
  font-weight: 700;
  color: #8B967C;
  min-width: 2rem;
  text-align: right;
}

.upload-queue-card__status {
  margin: 0.1rem 0 0;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.3;
}

.upload-queue-card__status--err {
  color: #dc2626;
}

.upload-queue-enter-active,
.upload-queue-leave-active {
  transition: all 0.28s ease;
}

.upload-queue-enter-from,
.upload-queue-leave-to {
  opacity: 0;
  transform: translateX(1rem) scale(0.96);
}

.upload-queue-move {
  transition: transform 0.28s ease;
}

@keyframes upload-queue-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 640px) {
  .video-upload-queue {
    top: auto;
    bottom: 1rem;
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
  }
}
</style>
