<template>
  <div class="aula-transcricao-panel">
    <div class="aula-transcricao-panel__toolbar">
      <label class="aula-transcricao-panel__search">
        <Search class="aula-transcricao-panel__search-icon" :size="16" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          class="aula-transcricao-panel__search-input"
          placeholder="Buscar trecho na aula..."
          autocomplete="off"
        />
      </label>

      <button
        v-if="canSync"
        type="button"
        class="aula-transcricao-panel__sync"
        :disabled="syncing"
        @click="syncTranscription"
      >
        <RefreshCw :size="14" :class="{ 'is-spinning': syncing }" />
        {{ syncing ? 'Atualizando…' : 'Atualizar' }}
      </button>
    </div>

    <p v-if="statusMessage" class="aula-transcricao-panel__status">{{ statusMessage }}</p>

    <div v-else-if="!displayLines.length && hasManagedVideo" class="aula-transcricao-panel__empty">
      A transcrição ainda está sendo gerada. Aguarde alguns minutos após o upload e toque em atualizar.
    </div>

    <div v-else-if="!displayLines.length" class="aula-transcricao-panel__empty">
      Nenhuma transcrição disponível para esta aula.
    </div>

    <div
      v-else-if="!filteredLines.length"
      class="aula-transcricao-panel__empty"
    >
      Nenhum trecho encontrado para “{{ searchQuery.trim() }}”.
    </div>

    <div v-else ref="listRef" class="aula-transcricao-list">
      <button
        v-for="(chunk, index) in filteredLines"
        :key="`${chunk.seconds}-${index}`"
        type="button"
        class="aula-transcricao-list__row"
        :class="{
          'is-active': lineStates[index]?.state === 'active',
          'is-past': lineStates[index]?.state === 'past',
        }"
        @click="emit('seek', chunk.seconds)"
      >
        <span class="aula-transcricao-list__time">{{ chunk.time }}</span>
        <span
          class="aula-transcricao-list__text"
          :class="`aula-transcricao-list__text--${lineStates[index]?.state || 'upcoming'}`"
          :style="lineStates[index]?.state === 'active'
            ? { '--karaoke-progress': `${Math.round((lineStates[index]?.progress || 0) * 100)}%` }
            : undefined"
        >{{ chunk.text }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RefreshCw, Search } from 'lucide-vue-next'
import {
  getTranscriptionDisplayLines,
  getTranscriptionLineState,
} from '~/utils/transcription'
import { isManagedVideoUrl } from '~/utils/video-provider'

const props = defineProps({
  lessonId: { type: String, required: true },
  videoUrl: { type: String, default: '' },
  transcription: { type: Array, default: () => [] },
  currentTime: { type: Number, default: 0 },
  canSync: { type: Boolean, default: false },
})

const emit = defineEmits(['seek', 'updated'])

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const syncing = ref(false)
const statusMessage = ref('')
const searchQuery = ref('')
const listRef = ref(null)
const lastScrolledIndex = ref(-1)
const localTranscription = ref(Array.isArray(props.transcription) ? [...props.transcription] : [])

const hasManagedVideo = computed(() => isManagedVideoUrl(props.videoUrl))
const displayLines = computed(() => getTranscriptionDisplayLines(localTranscription.value))

const filteredLines = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return displayLines.value

  return displayLines.value.filter((chunk) => (
    chunk.text.toLowerCase().includes(query)
    || chunk.time.toLowerCase().includes(query)
  ))
})

const lineStates = computed(() => (
  filteredLines.value.map((chunk, index) => (
    getTranscriptionLineState(chunk, index, filteredLines.value, props.currentTime)
  ))
))

watch(
  () => [props.lessonId, props.transcription],
  () => {
    localTranscription.value = Array.isArray(props.transcription) ? [...props.transcription] : []
    statusMessage.value = ''
    searchQuery.value = ''
    lastScrolledIndex.value = -1
  },
)

function scrollActiveLineIntoView(activeIndex) {
  const list = listRef.value
  if (!list || activeIndex < 0) return

  const rows = list.querySelectorAll('.aula-transcricao-list__row')
  const activeRow = rows[activeIndex]
  if (!activeRow) return

  const rowTop = activeRow.offsetTop
  const rowBottom = rowTop + activeRow.offsetHeight
  const viewTop = list.scrollTop
  const viewBottom = viewTop + list.clientHeight
  const padding = 10

  if (rowTop < viewTop + padding) {
    list.scrollTop = Math.max(0, rowTop - padding)
  } else if (rowBottom > viewBottom - padding) {
    list.scrollTop = rowBottom - list.clientHeight + padding
  }
}

watch(
  () => props.currentTime,
  async () => {
    if (!import.meta.client || searchQuery.value.trim()) return

    const activeIndex = lineStates.value.findIndex((state) => state.state === 'active')
    if (activeIndex < 0 || activeIndex === lastScrolledIndex.value) return

    lastScrolledIndex.value = activeIndex
    await nextTick()
    scrollActiveLineIntoView(activeIndex)
  },
)

watch(searchQuery, () => {
  lastScrolledIndex.value = -1
})

async function syncTranscription() {
  if (!props.canSync || syncing.value) return

  syncing.value = true
  statusMessage.value = ''
  try {
    const token = localStorage.getItem('auth_token')
    const result = await $fetch(`${apiBase}/courses/lessons/${props.lessonId}/sync-transcription`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (Array.isArray(result?.transcription) && result.transcription.length) {
      localTranscription.value = result.transcription
      emit('updated', result)
      statusMessage.value = ''
      return
    }

    if (result?.status === 'pending') {
      statusMessage.value = 'A transcrição ainda está sendo gerada. Tente novamente em alguns minutos.'
      return
    }

    statusMessage.value = 'Não foi possível obter a transcrição desta aula.'
  } catch (error) {
    statusMessage.value = error?.data?.message || error?.message || 'Erro ao atualizar transcrição.'
  } finally {
    syncing.value = false
  }
}
</script>

<style scoped>
.aula-transcricao-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0.85rem;
  color: #4b5563;
  background: #fff;
}

.aula-transcricao-panel__toolbar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.aula-transcricao-panel__search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1;
  min-width: 0;
  padding: 0.62rem 0.9rem;
  border-radius: 999px;
  background: #f8faf8;
  border: 1px solid var(--aula-border, #e5e7eb);
}

.aula-transcricao-panel__search-icon {
  flex-shrink: 0;
  color: #9ca3af;
}

.aula-transcricao-panel__search-input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #1f2937;
  font: inherit;
  font-size: 0.88rem;
  outline: none;
}

.aula-transcricao-panel__search-input::placeholder {
  color: #9ca3af;
}

.aula-transcricao-panel__search-input::-webkit-search-cancel-button {
  display: none;
}

.aula-transcricao-panel__sync {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  border: 1px solid var(--aula-border, #e5e7eb);
  background: #fff;
  color: var(--aula-accent, #8B967C);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.aula-transcricao-panel__sync:hover:not(:disabled) {
  background: var(--aula-accent-soft, #f0f7ef);
  border-color: var(--aula-accent-muted, #b8d4b4);
}

.aula-transcricao-panel__sync:disabled {
  opacity: 0.55;
  cursor: wait;
}

.aula-transcricao-panel__status,
.aula-transcricao-panel__empty {
  margin: 0;
  padding: 1.25rem 0.35rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #6b7280;
}

.aula-transcricao-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.1rem 0.15rem 0.35rem 0;
  margin-right: -0.15rem;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #c8dcc5 #f3f6f2;
}

.aula-transcricao-list::-webkit-scrollbar {
  width: 6px;
}

.aula-transcricao-list::-webkit-scrollbar-track {
  background: #f3f6f2;
  border-radius: 999px;
}

.aula-transcricao-list::-webkit-scrollbar-thumb {
  background: #c8dcc5;
  border-radius: 999px;
}

.aula-transcricao-list::-webkit-scrollbar-thumb:hover {
  background: #9fbf9a;
}

.aula-transcricao-list__row {
  display: grid;
  grid-template-columns: 3.4rem minmax(0, 1fr);
  gap: 0.85rem;
  align-items: start;
  width: 100%;
  padding: 0.72rem 0.55rem 0.72rem 0.45rem;
  border: 0;
  border-radius: 0.75rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.aula-transcricao-list__row:hover {
  background: #f5faf4;
}

.aula-transcricao-list__row.is-active {
  background: #eef6ec;
}

.aula-transcricao-list__row.is-past {
  opacity: 0.92;
}

.aula-transcricao-list__time {
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.55;
  color: var(--aula-accent, #8B967C);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.aula-transcricao-list__row.is-active .aula-transcricao-list__time {
  color: #1f4d1a;
}

.aula-transcricao-list__text {
  font-size: 0.92rem;
  line-height: 1.65;
  word-break: break-word;
}

.aula-transcricao-list__text--upcoming {
  color: #9ca3af;
}

.aula-transcricao-list__text--past {
  color: #374151;
}

.aula-transcricao-list__text--active {
  background: linear-gradient(
    90deg,
    #1f4d1a 0%,
    #1f4d1a var(--karaoke-progress, 0%),
    #b8c0b8 var(--karaoke-progress, 0%),
    #b8c0b8 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.is-spinning {
  animation: transcricao-spin 0.8s linear infinite;
}

@keyframes transcricao-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .aula-transcricao-panel__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .aula-transcricao-list__row {
    grid-template-columns: 3rem minmax(0, 1fr);
    gap: 0.65rem;
    padding: 0.65rem 0.35rem 0.65rem 0.25rem;
  }
}
</style>
