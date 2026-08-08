<template>
  <div
    class="wa-audio-msg"
    :class="{
      'wa-audio-msg--out': fromMe,
      'wa-audio-msg--loading': loading,
      'wa-audio-msg--listened': hasBeenListened || isPlaying
    }"
  >
    <button
      type="button"
      class="wa-audio-play"
      :aria-label="isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'"
      :disabled="loading"
      @click.stop="onPlayClick"
    >
      <svg v-if="isPlaying" class="wa-audio-play-icon" viewBox="0 0 12 14" width="14" height="16" aria-hidden="true">
        <rect x="1" y="0" width="3.5" height="14" rx="0.8" fill="currentColor" />
        <rect x="7.5" y="0" width="3.5" height="14" rx="0.8" fill="currentColor" />
      </svg>
      <svg v-else class="wa-audio-play-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M5 3.2v9.6c0 .5.6.8 1 .5l7.2-4.4c.4-.2.4-.8 0-1L6 2.7c-.4-.3-1 0-1 .5z" fill="currentColor" />
      </svg>
    </button>

    <div class="wa-audio-body">
      <div
        class="wa-audio-wave-wrap"
        role="slider"
        :aria-valuenow="Math.round(progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Progresso do áudio"
        @click.stop="onWaveClick"
      >
        <div class="wa-audio-bars" aria-hidden="true">
          <span
            v-for="(height, idx) in waveformBars"
            :key="`bar-${idx}`"
            class="wa-audio-bar"
            :class="{ 'is-played': isBarPlayed(idx) }"
            :style="{ height: `${height}px` }"
          />
        </div>
        <span class="wa-audio-progress-dot" :style="{ left: `${progress * 100}%` }" aria-hidden="true" />
      </div>

      <div class="wa-audio-meta">
        <span class="wa-audio-duration">{{ displayTime }}</span>
        <span class="wa-audio-time">
          <Pin v-if="pinned" class="msg-pin-icon" aria-hidden="true" />
          {{ timestamp }}
          <span v-if="isEdited" class="msg-edited-label">Editada</span>
          <WhatsappDeliveryTicks v-if="fromMe && deliveryStatus" :status="deliveryStatus" />
        </span>
      </div>
    </div>

    <button
      v-if="isPlaying"
      type="button"
      class="wa-audio-speed-btn"
      :aria-label="`Velocidade ${speedLabel}`"
      @click.stop="cycleSpeed"
    >
      {{ speedLabel }}
    </button>

    <div v-else-if="showAvatar" class="wa-audio-avatar-wrap" aria-hidden="true">
      <img v-if="avatarUrl" :src="avatarUrl" class="wa-audio-avatar" alt="" />
      <span v-else class="wa-audio-avatar wa-audio-avatar--fallback">
        <User class="wa-audio-avatar-fallback-icon" />
      </span>
      <span class="wa-audio-mic-badge">
        <WhatsappPttMicIcon :listened="hasBeenListened || isPlaying" />
      </span>
    </div>

    <audio
      v-if="src"
      ref="audioEl"
      :src="src"
      preload="metadata"
      class="wa-audio-native"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @pause="onPause"
      @play="onPlay"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { User, Pin } from 'lucide-vue-next'
import WhatsappDeliveryTicks from './WhatsappDeliveryTicks.vue'
import WhatsappPttMicIcon from './WhatsappPttMicIcon.vue'

const props = defineProps({
  src: { type: String, default: '' },
  fromMe: { type: Boolean, default: false },
  timestamp: { type: String, default: '' },
  deliveryStatus: { type: String, default: '' },
  isEdited: { type: Boolean, default: false },
  avatarUrl: { type: String, default: '' },
  showAvatar: { type: Boolean, default: false },
  durationSeconds: { type: Number, default: 0 },
  initialListened: { type: Boolean, default: false },
  waveformSeed: { type: String, default: 'audio' },
  loading: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
})

const emit = defineEmits(['request-load', 'listened'])

const audioEl = ref(null)
const isPlaying = ref(false)
const hasBeenListened = ref(false)
const fullyListened = ref(false)
const progress = ref(0)
const duration = ref(0)
const speedIndex = ref(0)

const SPEED_OPTIONS = [1, 1.5, 2]

const playbackSpeed = computed(() => SPEED_OPTIONS[speedIndex.value] || 1)

const speedLabel = computed(() => {
  const value = playbackSpeed.value
  if (value === 1) return '1,0x'
  if (value === 2) return '2,0x'
  return `${String(value).replace('.', ',')}x`
})

const isBarPlayed = (idx) => {
  if (fullyListened.value && !isPlaying.value) return true
  return idx / waveformBars.value.length <= progress.value
}

const applyPlaybackSpeed = () => {
  const el = audioEl.value
  if (el) el.playbackRate = playbackSpeed.value
}

const cycleSpeed = () => {
  speedIndex.value = (speedIndex.value + 1) % SPEED_OPTIONS.length
  applyPlaybackSpeed()
}

const markAsListened = () => {
  if (hasBeenListened.value) return
  hasBeenListened.value = true
  if (typeof sessionStorage !== 'undefined' && props.waveformSeed) {
    sessionStorage.setItem(`wa-audio-listened:${props.waveformSeed}`, '1')
  }
  emit('listened')
}

const hashSeed = (seed = '') => {
  let h = 2166136261
  const text = String(seed || 'audio')
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const waveformBars = computed(() => {
  const count = 46
  let h = hashSeed(props.waveformSeed)
  const bars = []
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    bars.push(4 + (h % 17))
  }
  return bars
})

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const displayTime = computed(() => {
  if (isPlaying.value || progress.value > 0) {
    const current = duration.value * progress.value
    return formatDuration(current)
  }
  const fallback = props.durationSeconds > 0 ? props.durationSeconds : duration.value
  return formatDuration(fallback)
})

const syncDuration = () => {
  const el = audioEl.value
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
  duration.value = el.duration
}

const onLoadedMetadata = () => {
  syncDuration()
  applyPlaybackSpeed()
}

const onTimeUpdate = () => {
  const el = audioEl.value
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
  duration.value = el.duration
  progress.value = Math.min(1, Math.max(0, el.currentTime / el.duration))
}

const onEnded = () => {
  isPlaying.value = false
  hasBeenListened.value = true
  fullyListened.value = true
  progress.value = 1
  const el = audioEl.value
  if (el) el.currentTime = 0
}

const onPause = () => { isPlaying.value = false }
const onPlay = () => {
  isPlaying.value = true
  fullyListened.value = false
  markAsListened()
  applyPlaybackSpeed()
}

const pauseSelf = () => {
  const el = audioEl.value
  if (!el) return
  el.pause()
  isPlaying.value = false
}

const onPlayClick = async () => {
  if (!props.src) {
    emit('request-load')
    return
  }
  const el = audioEl.value
  if (!el) return

  if (isPlaying.value) {
    pauseSelf()
    return
  }

  window.dispatchEvent(new CustomEvent('wa-audio-play', { detail: { id: props.waveformSeed } }))
  markAsListened()
  applyPlaybackSpeed()
  try {
    await el.play()
  } catch {
    pauseSelf()
  }
}

const onWaveClick = (event) => {
  if (!props.src) {
    emit('request-load')
    return
  }
  const el = audioEl.value
  const wrap = event.currentTarget
  if (!el || !wrap || !Number.isFinite(el.duration) || el.duration <= 0) return
  const rect = wrap.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
  progress.value = ratio
}

const onGlobalAudioPlay = (event) => {
  if (event?.detail?.id === props.waveformSeed) return
  pauseSelf()
}

watch(() => props.src, () => {
  pauseSelf()
  progress.value = 0
  hasBeenListened.value = false
  fullyListened.value = false
  speedIndex.value = 0
  duration.value = props.durationSeconds > 0 ? props.durationSeconds : 0
})

watch(playbackSpeed, () => applyPlaybackSpeed())

onMounted(() => {
  if (props.initialListened) hasBeenListened.value = true
  if (typeof sessionStorage !== 'undefined' && props.waveformSeed) {
    hasBeenListened.value = hasBeenListened.value || sessionStorage.getItem(`wa-audio-listened:${props.waveformSeed}`) === '1'
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('wa-audio-play', onGlobalAudioPlay)
  }
})

onBeforeUnmount(() => {
  pauseSelf()
  if (typeof window !== 'undefined') {
    window.removeEventListener('wa-audio-play', onGlobalAudioPlay)
  }
})
</script>
