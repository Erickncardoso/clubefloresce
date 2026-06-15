<template>
  <ClientOnly>
    <div class="course-video-player-wrap">
      <div v-if="!hasSource" class="player player--empty">
        <slot name="empty">
          <p>Selecione uma aula para começar.</p>
        </slot>
      </div>

      <div v-else-if="youtubeId" class="player">
        <div ref="youtubeHost" class="florescerPlayer florescerPlayer--youtube" :key="`yt-${youtubeId}`">
          <div
            class="plyr__video-embed"
            data-plyr-provider="youtube"
            :data-plyr-embed-id="youtubeId"
          />
        </div>
      </div>

      <div
        v-else
        ref="playerRoot"
        class="player"
        :key="`vid-${videoUrl}`"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        @touchstart.passive="onMouseMove"
      >
        <div
          class="florescerPlayer"
          :class="{
            tocando: isPlaying,
            controlesVisiveis: controlsVisible,
            sobre: isHovering,
            primeiroPlay: hasEverPlayed,
            fullscreen: isFullscreen,
            configAberta: settingsOpen,
          }"
          @click.self="onPlayerSurfaceClick"
        >
          <video
            ref="videoEl"
            playsinline
            preload="auto"
            :crossorigin="isHlsSource ? 'anonymous' : undefined"
            :poster="resolvedPoster || undefined"
            @error="onVideoError"
            @loadedmetadata="onTracksReady"
            @play="onPlay"
            @pause="onPause"
            @ended="onEnded"
            @timeupdate="onTimeUpdate"
            @progress="updateBuffered"
            @waiting="isBuffering = true"
            @canplay="onVideoCanPlay"
            @click="onVideoClick"
          >
            <track
              v-if="captionSrc"
              :key="captionSrc"
              ref="captionTrackEl"
              kind="subtitles"
              srclang="pt"
              label="Português"
              :src="captionSrc"
              @load="onCaptionTrackLoad"
            />
          </video>

          <div
            v-if="captionsEnabled && activeCaptionText"
            class="florescerPlayer__captions"
            aria-live="polite"
          >
            {{ activeCaptionText }}
          </div>

          <Transition name="ripple">
            <div
              v-if="ripple"
              class="ripple"
              :style="{ left: `${ripple.x}px`, top: `${ripple.y}px` }"
              aria-hidden="true"
            />
          </Transition>

          <div class="zonaToqueDuplo esquerda" aria-hidden="true" @click.stop="onDoubleTapZone('rew', $event)" />
          <div class="zonaToqueDuplo direita" aria-hidden="true" @click.stop="onDoubleTapZone('fwd', $event)" />

          <Transition name="indicador">
            <div v-if="actionIndicator" :key="actionIndicator.id" class="indicadorAcao" aria-hidden="true">
              <FlorescerPlayerIcons :name="actionIndicator.icon" />
            </div>
          </Transition>

          <div v-if="isSwitchingQuality" class="buffering buffering--quality" aria-hidden="true">
            <span class="orb" />
            <span class="orb" />
            <span class="orb" />
          </div>

          <div v-else-if="isBuffering" class="buffering" aria-hidden="true">
            <span class="orb" />
            <span class="orb" />
            <span class="orb" />
          </div>

          <Transition name="play-overlay">
            <button
              v-if="!isPlaying"
              type="button"
              class="overlayPlay"
              :class="{ 'overlayPlay--loading': !playbackReady }"
              aria-label="Reproduzir"
              @click.stop="togglePlay"
            >
              <span v-if="!playbackReady" class="overlayPlay__loader" aria-hidden="true" />
              <template v-else>
                <span class="halo" aria-hidden="true" />
                <FlorescerPlayerIcons name="play-large" />
              </template>
            </button>
          </Transition>

          <div class="controles" @click.stop>
            <div
              ref="barraRef"
              class="barra"
              @mousedown="onBarMouseDown"
              @mousemove="onBarHover"
              @mouseleave="onBarLeave"
            >
              <div class="trilho">
                <div class="bufferado" :style="{ width: `${bufferedPercent}%` }" />
                <div class="progresso" :style="{ width: `${progressPercent}%` }">
                  <span class="thumb"><span class="pulso" /></span>
                </div>
              </div>
              <div
                v-if="videoChapters.length && chapterDuration"
                class="chapterMarks"
                aria-hidden="true"
              >
                <button
                  v-for="(chapter, index) in videoChapters"
                  :key="`chapter-${chapter.start}-${index}`"
                  type="button"
                  class="chapterMark"
                  :style="{ left: `${(chapter.start / chapterDuration) * 100}%` }"
                  :title="chapter.title"
                  @mousedown.stop
                  @click.stop="seekToSeconds(chapter.start)"
                />
              </div>
              <Transition name="thumb-hover">
                <div
                  v-if="barHover"
                  class="barPreview"
                  :style="{ left: `${barHover.x}px` }"
                >
                  <div
                    v-if="barHover.thumbnailStyle"
                    class="barPreview__thumb"
                    :style="{
                      width: barHover.thumbnailStyle.width,
                      height: barHover.thumbnailStyle.height,
                    }"
                  >
                    <img
                      :src="barHover.thumbnail?.spriteUrl"
                      :style="barHover.thumbnailImageStyle"
                      class="barPreview__thumb-img"
                      alt=""
                      @error="onPreviewThumbError"
                    />
                  </div>
                  <div class="barPreview__body">
                    <p v-if="barHover.chapterTitle" class="barPreview__chapter">
                      {{ barHover.chapterTitle }}
                    </p>
                    <p class="barPreview__time">{{ formatTime(barHover.time) }}</p>
                  </div>
                </div>
              </Transition>
            </div>

            <div class="linha">
              <div class="esquerda">
                <button type="button" class="iconBtn play" :aria-label="isPlaying ? 'Pausar' : 'Reproduzir'" @click="togglePlayWithIndicator">
                  <span class="iconWrap">
                    <FlorescerPlayerIcons :name="isPlaying ? 'pause' : 'play'" />
                  </span>
                </button>
                <button type="button" class="iconBtn rew" aria-label="Voltar 10s" @click="seekRelative(-10, true)">
                  <span class="iconWrap">
                    <FlorescerPlayerIcons name="rew" />
                  </span>
                </button>
                <button type="button" class="iconBtn fwd" aria-label="Avançar 10s" @click="seekRelative(10, true)">
                  <span class="iconWrap">
                    <FlorescerPlayerIcons name="fwd" />
                  </span>
                </button>

                <div
                  class="volume"
                  @mouseenter="volumeOpen = true"
                  @mouseleave="onVolumeWrapLeave"
                >
                  <button
                    type="button"
                    class="iconBtn volBtn"
                    :aria-label="isMuted ? 'Ativar som' : 'Mutar'"
                    @click="toggleMute"
                  >
                    <FlorescerPlayerIcons name="volume" :waves="volumeWaves" :muted="isMuted || volume === 0" />
                  </button>
                  <div class="sliderVolume" :class="{ aberto: volumeOpen }">
                    <div class="trilhoVol">
                      <div class="preenchimento" :style="{ width: `${volumePercent}%` }" />
                      <span
                        class="thumbVol"
                        :style="{ left: `calc(${volumePercent}% - 6.5px)` }"
                        aria-hidden="true"
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        :value="isMuted ? 0 : volume"
                        aria-label="Volume"
                        @input="onVolumeChange"
                        @mousedown="volumeDragging = true"
                        @mouseup="volumeDragging = false"
                      />
                    </div>
                  </div>
                </div>

                <span class="tempos">
                  <span class="atual">{{ formatTime(currentTime) }}</span>
                  <span class="sep">/</span>
                  <span class="total">{{ formatTime(duration) }}</span>
                </span>
              </div>

              <div class="direita">
                <button
                  v-if="hasCaptionSource || captionsAvailable"
                  type="button"
                  class="iconBtn cc"
                  :class="{ ativa: captionsEnabled }"
                  :aria-label="captionsEnabled ? 'Desativar legendas' : 'Ativar legendas'"
                  :disabled="captionsLoading"
                  @click.stop="toggleCaptions"
                >
                  <FlorescerPlayerIcons name="cc" />
                </button>
                <div class="menu" :class="{ aberto: settingsOpen }">
                  <button
                    type="button"
                    class="iconBtn gear"
                    :class="{ ativa: settingsOpen }"
                    aria-label="Configurações"
                    @click.stop="toggleSettings"
                  >
                    <FlorescerPlayerIcons name="gear" />
                  </button>
                </div>
                <button
                  v-if="pipSupported"
                  type="button"
                  class="iconBtn pip"
                  aria-label="Picture in Picture"
                  @click="togglePip"
                >
                  <FlorescerPlayerIcons name="pip" />
                </button>
                <button type="button" class="iconBtn fs" aria-label="Tela cheia" @click="toggleFullscreen">
                  <FlorescerPlayerIcons :name="isFullscreen ? 'fs-exit' : 'fs'" />
                </button>
              </div>
            </div>
          </div>

          <Transition name="painel-config">
            <div
              v-if="settingsOpen"
              class="painel-config"
              :class="{ 'painel-config--mobile': settingsMobileOverlay }"
              :style="settingsPanelStyle"
              role="dialog"
              aria-label="Configurações do vídeo"
              @click.self="closeSettings"
            >
              <div class="painel-config__card" @click.stop>
                <button
                  v-if="settingsMobileOverlay && settingsView === 'root'"
                  type="button"
                  class="painel-config__fechar-mobile"
                  @click="closeSettings"
                >
                  <ChevronLeft :size="18" />
                  Voltar
                </button>

                <Transition :name="settingsTransition" mode="out-in">
                  <div v-if="settingsView === 'root'" key="root" class="painel-config__view">
                    <button
                      type="button"
                      class="painel-config__row"
                      :disabled="!isHlsSource"
                      @click="openSettingsSubmenu('quality')"
                    >
                      <span class="painel-config__row-left">
                        <SlidersHorizontal class="painel-config__row-icon" />
                        Qualidade
                      </span>
                      <span class="painel-config__row-right">
                        <span class="painel-config__valor">{{ qualitySummaryLabel }}</span>
                        <span v-if="qualityBadgeLabel" class="painel-config__badge">{{ qualityBadgeLabel }}</span>
                        <ChevronRight :size="16" class="painel-config__chevron" />
                      </span>
                    </button>

                    <button type="button" class="painel-config__row" @click="openSettingsSubmenu('speed')">
                      <span class="painel-config__row-left">
                        <Clock class="painel-config__row-icon" />
                        Velocidade
                      </span>
                      <span class="painel-config__row-right">
                        <span class="painel-config__valor">{{ speedSummaryLabel }}</span>
                        <ChevronRight :size="16" class="painel-config__chevron" />
                      </span>
                    </button>

                    <button
                      type="button"
                      class="painel-config__row"
                      :disabled="!hasCaptionSource && !captionsAvailable"
                      @click="openSettingsSubmenu('captions')"
                    >
                      <span class="painel-config__row-left">
                        <FlorescerPlayerIcons name="cc" class="painel-config__row-icon painel-config__row-icon--cc" />
                        Legendas
                      </span>
                      <span class="painel-config__row-right">
                        <span class="painel-config__valor">{{ captionsSummaryLabel }}</span>
                        <ChevronRight :size="16" class="painel-config__chevron" />
                      </span>
                    </button>
                  </div>

                  <div v-else key="sub" class="painel-config__view painel-config__sub">
                    <button type="button" class="painel-config__voltar" @click="backToSettingsRoot">
                      <ChevronLeft :size="18" />
                      {{ settingsSubmenuTitle }}
                    </button>

                    <template v-if="settingsView === 'quality'">
                      <button
                        v-for="option in availableQualityOptions"
                        :key="option.id"
                        type="button"
                        class="painel-config__opcao"
                        :class="{ 'is-active': videoQuality === option.id }"
                        @click="setQuality(option.id)"
                      >
                        <span class="painel-config__opcao-label">
                          {{ option.label }}
                          <span v-if="option.badge" class="painel-config__badge">{{ option.badge }}</span>
                        </span>
                        <Check v-if="videoQuality === option.id" :size="16" class="painel-config__check" />
                      </button>
                    </template>

                    <template v-else-if="settingsView === 'speed'">
                      <button
                        v-for="rate in speedOptions"
                        :key="rate"
                        type="button"
                        class="painel-config__opcao"
                        :class="{ 'is-active': playbackRate === rate }"
                        @click="setSpeed(rate)"
                      >
                        <span>{{ rate === 1 ? 'Normal' : `${rate}x` }}</span>
                        <Check v-if="playbackRate === rate" :size="16" class="painel-config__check" />
                      </button>
                    </template>

                    <template v-else-if="settingsView === 'captions'">
                      <button
                        type="button"
                        class="painel-config__opcao"
                        :class="{ 'is-active': !captionsEnabled }"
                        @click="setCaptions(false)"
                      >
                        <span>Desativadas</span>
                        <Check v-if="!captionsEnabled" :size="16" class="painel-config__check" />
                      </button>
                      <button
                        type="button"
                        class="painel-config__opcao"
                        :class="{ 'is-active': captionsEnabled }"
                        @click="setCaptions(true)"
                      >
                        <span>Português (auto)</span>
                        <Check v-if="captionsEnabled" :size="16" class="painel-config__check" />
                      </button>
                    </template>
                  </div>
                </Transition>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <template #fallback>
      <div class="player player--empty"><p>Carregando player...</p></div>
    </template>
  </ClientOnly>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, Clock, SlidersHorizontal } from 'lucide-vue-next'
import {
  applyCloudinaryVideoQuality,
  getBaseCloudinaryVideoUrl,
  getCloudinaryHlsUrl,
  getQualityTargetHeight,
  heightToQualityLabel,
  isCloudinaryVideoUrl,
} from '~/utils/cloudinary-video'
import { getBunnyStreamHlsUrl, getBunnyStreamMp4Url, isBunnyStreamVideoUrl } from '~/utils/bunny-video'
import {
  buildSeekThumbnailImageStyle,
  buildSeekThumbnailStyle,
  getChapterAtTime,
  getSeekThumbnailAtTime,
} from '~/utils/bunny-seek-thumbnails'
import { getVideoCaptionCandidates } from '~/utils/video-provider'
import { getActiveCaptionCue, parseVttToCaptionCues, transcriptionToCaptionCues } from '~/utils/transcription'
import FlorescerPlayerIcons from './FlorescerPlayerIcons.vue'

const props = defineProps({
  videoUrl: { type: String, default: '' },
  youtubeId: { type: String, default: '' },
  poster: { type: String, default: '' },
  captionUrl: { type: String, default: '' },
  lessonId: { type: [String, Number], default: '' },
  transcription: { type: Array, default: () => [] },
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const emit = defineEmits(['ended', 'timeupdate'])

const videoEl = ref(null)
const captionTrackEl = ref(null)
const playerRoot = ref(null)
const youtubeHost = ref(null)
const barraRef = ref(null)

const isPlaying = ref(false)
const isHovering = ref(false)
const controlsVisible = ref(true)
const hasEverPlayed = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const playbackRate = ref(1)
const settingsOpen = ref(false)
const settingsView = ref('root')
const settingsTransition = ref('drill')
const isMobilePlayer = ref(false)
const settingsPanelRect = ref({ top: 0, left: 0, width: 0, height: 0 })
const videoQuality = ref('auto')
const isFullscreen = ref(false)
const isBuffering = ref(false)
const isSwitchingQuality = ref(false)
const detectedVideoHeight = ref(0)
const pipSupported = ref(false)
const bufferedEnd = ref(0)
const volumeOpen = ref(false)
const volumeDragging = ref(false)
const ripple = ref(null)
const actionIndicator = ref(null)
const barHover = ref(null)
const isDraggingBar = ref(false)
const captionsEnabled = ref(false)
const captionSrc = ref('')
const captionsAvailable = ref(false)
const captionCues = ref([])
const captionsLoading = ref(false)
const hlsQualityOptions = ref([])
const bunnyPlayMetadata = ref(null)
const videoLoadError = ref(false)
const useHlsPlayback = ref(false)
const playbackReady = ref(false)
const pendingPlay = ref(false)

let hideControlsTimer = null
let actionIndicatorTimer = null
let rippleTimer = null
let youtubePlayer = null
let PlyrCtor = null
let hlsInstance = null

const doubleTapState = { side: null, time: 0 }

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

const settingsMobileOverlay = computed(() => isMobilePlayer.value && settingsOpen.value)

const settingsPanelStyle = computed(() => {
  if (!settingsMobileOverlay.value) return undefined
  const rect = settingsPanelRect.value
  return {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: 99999,
  }
})

const settingsSubmenuTitle = computed(() => {
  if (settingsView.value === 'quality') return 'Qualidade'
  if (settingsView.value === 'speed') return 'Velocidade'
  if (settingsView.value === 'captions') return 'Legendas'
  return ''
})

const hasSource = computed(() => Boolean(props.youtubeId || props.videoUrl))

const isCloudinarySource = computed(() => isCloudinaryVideoUrl(props.videoUrl))
const isBunnySource = computed(() => isBunnyStreamVideoUrl(props.videoUrl))
const isHlsSource = computed(() => isCloudinarySource.value || isBunnySource.value)

const playbackVideoUrl = computed(() => {
  if (!props.videoUrl || props.youtubeId) return props.videoUrl
  if (videoLoadError.value) return props.videoUrl
  if (isBunnySource.value) {
    if (useHlsPlayback.value) return getBunnyStreamHlsUrl(props.videoUrl)
    return getBunnyStreamMp4Url(props.videoUrl)
  }
  return applyCloudinaryVideoQuality(props.videoUrl, videoQuality.value)
})

function getProgressivePlaybackUrl() {
  if (isBunnySource.value) return getBunnyStreamMp4Url(props.videoUrl)
  return playbackVideoUrl.value
}

const qualitySummaryLabel = computed(() => {
  if (videoQuality.value === 'auto') return 'Automática'
  return videoQuality.value
})

const qualityBadgeLabel = computed(() => {
  if (videoQuality.value !== 'auto') return videoQuality.value
  return heightToQualityLabel(detectedVideoHeight.value)
})

const speedSummaryLabel = computed(() => (
  playbackRate.value === 1 ? 'Normal' : `${playbackRate.value}x`
))

const captionsSummaryLabel = computed(() => (
  captionsEnabled.value ? 'Ativadas' : 'Desativadas'
))

const hasCaptionSource = computed(() => (
  Boolean(props.captionUrl?.trim())
  || getVideoCaptionCandidates(props.videoUrl).length > 0
  || (Array.isArray(props.transcription) && props.transcription.length > 0)
))

const videoChapters = computed(() => {
  const chapters = bunnyPlayMetadata.value?.chapters
  return Array.isArray(chapters) ? chapters : []
})

const chapterDuration = computed(() => (
  duration.value || Number(bunnyPlayMetadata.value?.length) || 0
))

const activeCaptionText = computed(() => {
  if (!captionsEnabled.value) return ''
  const cue = getActiveCaptionCue(captionCues.value, currentTime.value)
  return cue?.text || ''
})

const resolvedPoster = computed(() => {
  if (props.poster) return props.poster
  return bunnyPlayMetadata.value?.thumbnailUrl || ''
})

const availableQualityOptions = computed(() => {
  if (useHlsPlayback.value && hlsQualityOptions.value.length) {
    const autoBadge = heightToQualityLabel(detectedVideoHeight.value)
    return [
      { id: 'auto', label: 'Automática', badge: autoBadge },
      ...hlsQualityOptions.value,
    ]
  }
  if (isCloudinarySource.value) {
    const autoBadge = heightToQualityLabel(detectedVideoHeight.value)
    return [
      { id: 'auto', label: 'Automática', badge: autoBadge },
      { id: '480p', label: '480p', badge: '480p' },
      { id: '720p', label: '720p', badge: '720p' },
      { id: '1080p', label: '1080p', badge: '1080p' },
    ]
  }
  if (isHlsSource.value) {
    const autoBadge = heightToQualityLabel(detectedVideoHeight.value)
    return [{ id: 'auto', label: 'Automática', badge: autoBadge }]
  }
  return [{ id: 'auto', label: 'Automática', badge: null }]
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (currentTime.value / duration.value) * 100)
})

const bufferedPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (bufferedEnd.value / duration.value) * 100)
})

const volumePercent = computed(() => {
  if (isMuted.value) return 0
  return Math.min(100, volume.value * 100)
})

const volumeWaves = computed(() => {
  if (isMuted.value || volume.value === 0) return 0
  if (volume.value < 0.34) return 1
  if (volume.value < 0.67) return 2
  return 3
})

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function showActionIndicator(icon) {
  actionIndicator.value = { id: Date.now(), icon }
  clearTimeout(actionIndicatorTimer)
  actionIndicatorTimer = setTimeout(() => {
    actionIndicator.value = null
  }, 700)
}

function showRipple(x, y) {
  ripple.value = { x, y }
  clearTimeout(rippleTimer)
  rippleTimer = setTimeout(() => {
    ripple.value = null
  }, 600)
}

function scheduleHideControls() {
  clearTimeout(hideControlsTimer)
  if (!isPlaying.value) {
    controlsVisible.value = true
    return
  }
  hideControlsTimer = setTimeout(() => {
    if (isPlaying.value && !isHovering.value && !settingsOpen.value) {
      controlsVisible.value = false
    }
  }, 2500)
}

function onMouseMove() {
  isHovering.value = true
  controlsVisible.value = true
  scheduleHideControls()
}

function onMouseLeave() {
  isHovering.value = false
  scheduleHideControls()
}

function onVolumeWrapLeave() {
  if (volumeDragging.value) return
  volumeOpen.value = false
}

function getRippleFromEvent(event) {
  const rect = playerRoot.value?.querySelector('.florescerPlayer')?.getBoundingClientRect()
  if (!rect) return null
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onVideoClick(event) {
  const point = getRippleFromEvent(event)
  if (point) showRipple(point.x, point.y)
  togglePlayWithIndicator()
}

function onPlayerSurfaceClick(event) {
  if (event.target.closest('.controles, .overlayPlay, .painel-config')) return
  onVideoClick(event)
}

function onDoubleTapZone(side, event) {
  const now = Date.now()
  if (doubleTapState.side === side && now - doubleTapState.time < 350) {
    seekRelative(side === 'rew' ? -10 : 10, true)
    doubleTapState.side = null
    doubleTapState.time = 0
    return
  }
  doubleTapState.side = side
  doubleTapState.time = now
  setTimeout(() => {
    if (doubleTapState.side === side && Date.now() - doubleTapState.time >= 340) {
      togglePlayWithIndicator()
      doubleTapState.side = null
    }
  }, 360)
}

function togglePlayWithIndicator() {
  const wasPlaying = isPlaying.value
  togglePlay()
  if (hasEverPlayed.value) {
    showActionIndicator(wasPlaying ? 'pause' : 'play')
  }
}

async function fulfillPendingPlay() {
  if (!pendingPlay.value) return
  const video = videoEl.value
  if (!video || !playbackReady.value) return
  pendingPlay.value = false
  try {
    await video.play()
  } catch {
    /* ignore */
  }
}

function markPlaybackReady() {
  if (!videoEl.value) return
  playbackReady.value = true
  isBuffering.value = false
  void fulfillPendingPlay()
}

function onVideoCanPlay() {
  markPlaybackReady()
}

async function togglePlay() {
  const video = videoEl.value
  if (!video) return
  if (video.paused) {
    if (!playbackReady.value) {
      pendingPlay.value = true
      isBuffering.value = true
      return
    }
    try {
      await video.play()
      pendingPlay.value = false
    } catch {
      pendingPlay.value = true
      isBuffering.value = true
    }
  } else {
    pendingPlay.value = false
    video.pause()
  }
}

function onPlay() {
  isPlaying.value = true
  hasEverPlayed.value = true
  scheduleHideControls()
}

function onPause() {
  isPlaying.value = false
  controlsVisible.value = true
  clearTimeout(hideControlsTimer)
}

function onEnded() {
  isPlaying.value = false
  controlsVisible.value = true
  emit('ended')
}

function onTimeUpdate() {
  const video = videoEl.value
  if (!video || isDraggingBar.value) return
  currentTime.value = video.currentTime
  emit('timeupdate', video.currentTime)
  updateBuffered()
}

function updateBuffered() {
  const video = videoEl.value
  if (!video || !video.buffered.length) {
    bufferedEnd.value = 0
    return
  }
  bufferedEnd.value = video.buffered.end(video.buffered.length - 1)
}

function onTracksReady() {
  const video = videoEl.value
  if (!video) return
  videoLoadError.value = false
  duration.value = video.duration || 0
  volume.value = video.volume
  detectedVideoHeight.value = video.videoHeight || 0
  updateBuffered()
  applyCaptionsState()
  isSwitchingQuality.value = false
  if (video.readyState >= 2) {
    markPlaybackReady()
  }
}

function onVideoError() {
  const video = videoEl.value
  if (!video || useHlsPlayback.value) return

  isBuffering.value = false
  isSwitchingQuality.value = false

  if (videoQuality.value !== 'auto' && !videoLoadError.value && isCloudinarySource.value) {
    videoLoadError.value = true
    videoQuality.value = 'auto'
    swapVideoSource(getBaseCloudinaryVideoUrl(props.videoUrl))
    return
  }

  if (!videoLoadError.value && props.videoUrl && isBunnySource.value && useHlsPlayback.value) {
    videoLoadError.value = true
    destroyHls()
    swapVideoSource(getBunnyStreamMp4Url(props.videoUrl))
    return
  }

  if (!videoLoadError.value && props.videoUrl) {
    videoLoadError.value = true
    swapVideoSource(props.videoUrl)
  }
}

function applyCaptionsState() {
  const trackEl = captionTrackEl.value
  const nativeTrack = trackEl?.track
  if (nativeTrack) {
    nativeTrack.mode = captionsEnabled.value ? 'showing' : 'hidden'
  }

  const video = videoEl.value
  if (video?.textTracks?.length) {
    for (const track of video.textTracks) {
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        track.mode = captionsEnabled.value ? 'showing' : 'hidden'
      }
    }
  }
}

function applyTranscriptionAsCaptions() {
  const cues = transcriptionToCaptionCues(props.transcription)
  if (!cues.length) return false
  captionCues.value = cues
  captionsAvailable.value = true
  return true
}

async function loadCaptionCues(url) {
  if (!url || !import.meta.client) return false

  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const vtt = await response.text()
    const cues = parseVttToCaptionCues(vtt)
    if (!cues.length) return false
    captionCues.value = cues
    captionSrc.value = url
    captionsAvailable.value = true
    return true
  } catch {
    return false
  }
}

async function ensureCaptionsReady() {
  if (captionCues.value.length) return true

  if (captionSrc.value && await loadCaptionCues(captionSrc.value)) {
    await nextTick()
    syncCaptionTrack()
    applyCaptionsState()
    return true
  }

  const resolved = await resolveCaptionSource()
  if (resolved) return true

  return applyTranscriptionAsCaptions()
}

async function resolveCaptionSource() {
  if (!props.videoUrl && !props.captionUrl) return false

  const explicit = props.captionUrl?.trim()
  const candidates = explicit
    ? [explicit, ...getVideoCaptionCandidates(props.videoUrl).filter((url) => url !== explicit)]
    : getVideoCaptionCandidates(props.videoUrl)

  for (const url of candidates) {
    if (!url) continue
    if (await loadCaptionCues(url)) {
      await nextTick()
      syncCaptionTrack()
      return true
    }
  }

  return false
}

function syncCaptionTrack() {
  const trackEl = captionTrackEl.value
  if (!trackEl || !captionSrc.value) return
  if (trackEl.getAttribute('src') !== captionSrc.value) {
    trackEl.src = captionSrc.value
  }
  applyCaptionsState()
}

function onCaptionTrackLoad() {
  captionsAvailable.value = true
  if (captionSrc.value && !captionCues.value.length) {
    void loadCaptionCues(captionSrc.value)
  }
  applyCaptionsState()
}

async function loadBunnyPlayMetadata() {
  bunnyPlayMetadata.value = null

  if (!props.lessonId || !isBunnySource.value || !import.meta.client) return

  try {
    const token = localStorage.getItem('auth_token')
    const result = await $fetch(`${apiBase}/courses/lessons/${props.lessonId}/video-metadata`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (result?.available && result?.metadata) {
      bunnyPlayMetadata.value = result.metadata
    }
  } catch {
    bunnyPlayMetadata.value = null
  }
}

async function toggleCaptions() {
  if (captionsLoading.value) return

  const next = !captionsEnabled.value
  if (!next) {
    captionsEnabled.value = false
    applyCaptionsState()
    controlsVisible.value = true
    scheduleHideControls()
    return
  }

  captionsLoading.value = true
  try {
    const ready = await ensureCaptionsReady()
    if (!ready) return
    captionsEnabled.value = true
    applyCaptionsState()
    controlsVisible.value = true
    scheduleHideControls()
  } finally {
    captionsLoading.value = false
  }
}

function seekToRatio(ratio) {
  const video = videoEl.value
  if (!video || !duration.value) return
  const t = Math.max(0, Math.min(duration.value, ratio * duration.value))
  video.currentTime = t
  currentTime.value = t
}

function onBarMouseDown(event) {
  isDraggingBar.value = true
  seekFromBarEvent(event)
  document.addEventListener('mousemove', onBarDrag)
  document.addEventListener('mouseup', onBarMouseUp, { once: true })
}

function onBarDrag(event) {
  seekFromBarEvent(event)
}

function onBarMouseUp() {
  isDraggingBar.value = false
  document.removeEventListener('mousemove', onBarDrag)
}

function seekFromBarEvent(event) {
  const bar = barraRef.value
  if (!bar) return
  const rect = bar.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  seekToRatio(ratio)
}

function onBarHover(event) {
  const bar = barraRef.value
  const totalDuration = chapterDuration.value
  if (!bar || !totalDuration) return
  const rect = bar.getBoundingClientRect()
  const x = event.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, x / rect.width))
  const time = ratio * totalDuration

  const hover = { x, time }

  if (bunnyPlayMetadata.value?.thumbnailCount || bunnyPlayMetadata.value?.length) {
    const thumbnail = getSeekThumbnailAtTime(time, bunnyPlayMetadata.value)
    const thumbnailStyle = buildSeekThumbnailStyle(thumbnail)
    const thumbnailImageStyle = buildSeekThumbnailImageStyle(thumbnail)
    if (thumbnailStyle) {
      hover.thumbnail = thumbnail
      hover.thumbnailStyle = thumbnailStyle
      hover.thumbnailImageStyle = thumbnailImageStyle
    }
  }

  const chapter = getChapterAtTime(videoChapters.value, time)
  if (chapter?.title) {
    hover.chapterTitle = chapter.title
  }

  barHover.value = hover
}

function onBarLeave() {
  barHover.value = null
}

function onPreviewThumbError(event) {
  const img = event?.target
  const fallback = barHover.value?.thumbnail?.fallbackUrl
  if (!img || !fallback || img.dataset.fallbackApplied === '1') return
  img.dataset.fallbackApplied = '1'
  img.src = fallback
}

function seekRelative(delta, showIndicator = false) {
  const video = videoEl.value
  if (!video) return
  video.currentTime = Math.max(0, Math.min(duration.value, video.currentTime + delta))
  if (showIndicator) {
    showActionIndicator(delta > 0 ? 'fwd' : 'rew')
  }
  controlsVisible.value = true
  scheduleHideControls()
}

function toggleMute() {
  const video = videoEl.value
  if (!video) return
  isMuted.value = !isMuted.value
  video.muted = isMuted.value
}

function onVolumeChange(event) {
  const video = videoEl.value
  if (!video) return
  const v = Number(event.target.value)
  volume.value = v
  video.volume = v
  isMuted.value = v === 0
  video.muted = v === 0
}

function updateMobilePlayerState() {
  if (!import.meta.client) return
  isMobilePlayer.value = window.matchMedia('(max-width: 1000px), (hover: none) and (pointer: coarse)').matches
}

function captureSettingsPanelRect() {
  const root = playerRoot.value?.querySelector('.florescerPlayer') || playerRoot.value
  if (!root) return
  const rect = root.getBoundingClientRect()
  settingsPanelRect.value = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

function openSettingsSubmenu(view) {
  settingsTransition.value = 'drill'
  settingsView.value = view
}

function backToSettingsRoot() {
  settingsTransition.value = 'drillback'
  settingsView.value = 'root'
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value
  if (settingsOpen.value) {
    settingsView.value = 'root'
    settingsTransition.value = 'drill'
    controlsVisible.value = true
    clearTimeout(hideControlsTimer)
    captureSettingsPanelRect()
  } else {
    settingsView.value = 'root'
  }
}

function closeSettings() {
  settingsOpen.value = false
  settingsView.value = 'root'
  settingsTransition.value = 'drill'
  scheduleHideControls()
}

function setSpeed(rate) {
  const video = videoEl.value
  if (!video) return
  playbackRate.value = rate
  video.playbackRate = rate
}

async function setCaptions(enabled) {
  if (enabled) {
    const ready = await ensureCaptionsReady()
    if (!ready) return
  }
  captionsEnabled.value = enabled
  applyCaptionsState()
}

function normalizeVideoSrc(src) {
  if (!src) return ''
  try {
    return new URL(src, import.meta.client ? window.location.href : 'http://localhost').href
  } catch {
    return src
  }
}

function destroyHls() {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
  useHlsPlayback.value = false
}

function findHlsLevelIndex(levels, targetHeight) {
  if (!levels?.length || !targetHeight) return -1
  let bestIdx = -1
  let bestDiff = Infinity
  for (let i = 0; i < levels.length; i += 1) {
    const height = levels[i]?.height || 0
    const diff = Math.abs(height - targetHeight)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }
  return bestIdx
}

function updateHlsQualityOptions() {
  if (!hlsInstance?.levels?.length) {
    hlsQualityOptions.value = []
    return
  }

  const seen = new Set()
  const options = []
  const levels = hlsInstance.levels
    .map((level, index) => ({ height: level.height || 0, index }))
    .filter((item) => item.height > 0)
    .sort((a, b) => b.height - a.height)

  for (const item of levels) {
    const label = heightToQualityLabel(item.height)
    if (seen.has(label)) continue
    seen.add(label)
    options.push({ id: label, label, badge: label, levelIndex: item.index })
  }

  hlsQualityOptions.value = options
}

function applyHlsQuality(quality) {
  if (!hlsInstance || !useHlsPlayback.value) return

  if (quality === 'auto') {
    hlsInstance.currentLevel = -1
    return
  }

  const option = hlsQualityOptions.value.find((item) => item.id === quality)
  if (option && option.levelIndex >= 0) {
    hlsInstance.currentLevel = option.levelIndex
    const level = hlsInstance.levels[option.levelIndex]
    if (level?.height) detectedVideoHeight.value = level.height
    return
  }

  const targetHeight = getQualityTargetHeight(quality)
  const levelIndex = findHlsLevelIndex(hlsInstance.levels, targetHeight)
  if (levelIndex >= 0) {
    hlsInstance.currentLevel = levelIndex
    const level = hlsInstance.levels[levelIndex]
    if (level?.height) detectedVideoHeight.value = level.height
  }
}

async function initHlsPlayback() {
  const video = videoEl.value
  if (!video || !isHlsSource.value || !props.videoUrl) return false

  const hlsUrl = isBunnySource.value
    ? getBunnyStreamHlsUrl(props.videoUrl)
    : getCloudinaryHlsUrl(props.videoUrl)
  if (!hlsUrl) return false

  destroyHls()

  const { default: Hls } = await import('hls.js')

  if (Hls.isSupported()) {
    return new Promise((resolve) => {
      const savedTime = video.currentTime || 0
      const shouldResume = pendingPlay.value || !video.paused
      let settled = false

      const finish = (value) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        resolve(value)
      }

      const timeoutId = setTimeout(() => {
        cleanup()
        finish(false)
      }, 12000)

      hlsInstance = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: false,
      })

      const onFatal = () => {
        cleanup()
        finish(false)
      }

      const cleanup = () => {
        hlsInstance?.off(Hls.Events.MANIFEST_PARSED, onParsed)
        hlsInstance?.off(Hls.Events.ERROR, onError)
        hlsInstance?.off(Hls.Events.LEVEL_SWITCHED, onLevelSwitched)
        destroyHls()
      }

      const onParsed = () => {
        useHlsPlayback.value = true
        updateHlsQualityOptions()
        applyHlsQuality(videoQuality.value)
        void resolveCaptionSource()
        if (savedTime > 0 && Number.isFinite(savedTime)) {
          video.currentTime = savedTime
        }
        if (Number.isFinite(video.duration) && video.duration > 0) {
          duration.value = video.duration
        }
        markPlaybackReady()
        if (shouldResume) {
          void video.play().catch(() => {
            pendingPlay.value = true
          })
        }
        finish(true)
      }

      const onError = (_event, data) => {
        if (data?.fatal) onFatal()
      }

      const onLevelSwitched = (_event, data) => {
        const level = hlsInstance?.levels?.[data.level]
        if (level?.height) detectedVideoHeight.value = level.height
      }

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, onParsed)
      hlsInstance.on(Hls.Events.ERROR, onError)
      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched)
      hlsInstance.loadSource(hlsUrl)
      hlsInstance.attachMedia(video)
    })
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsUrl
    useHlsPlayback.value = true
    video.addEventListener('loadedmetadata', () => {
      duration.value = video.duration || duration.value
      markPlaybackReady()
    }, { once: true })
    return true
  }

  return false
}

async function setupVideoPlayback() {
  await nextTick()
  if (!props.videoUrl || props.youtubeId) return

  for (let attempt = 0; attempt < 8 && !videoEl.value; attempt += 1) {
    await nextTick()
  }
  if (!videoEl.value) return

  playbackReady.value = false
  pendingPlay.value = false

  const progressiveUrl = normalizeVideoSrc(getProgressivePlaybackUrl())
  const hlsReady = await initHlsPlayback()
  if (!hlsReady) {
    destroyHls()
    swapVideoSource(progressiveUrl)
  }
}

function swapVideoSource(url) {
  const video = videoEl.value
  if (!video || !url || useHlsPlayback.value) return

  const nextUrl = normalizeVideoSrc(url)
  const currentSrc = normalizeVideoSrc(video.currentSrc || video.src || '')
  if (currentSrc === nextUrl) return

  const wasPlaying = !video.paused
  const savedTime = video.currentTime || 0
  const savedRate = playbackRate.value

  isSwitchingQuality.value = true
  isBuffering.value = false
  playbackReady.value = false

  const restore = () => {
    video.removeEventListener('loadeddata', restore)
    video.removeEventListener('canplay', onCanPlay)
    video.removeEventListener('error', onSwapError)

    if (savedTime > 0 && Number.isFinite(savedTime)) {
      video.currentTime = savedTime
    }
    video.playbackRate = savedRate
    detectedVideoHeight.value = video.videoHeight || 0
    applyCaptionsState()
    isSwitchingQuality.value = false
    markPlaybackReady()

    if (wasPlaying || pendingPlay.value) {
      const resume = () => video.play().catch(() => {
        pendingPlay.value = true
      })
      if (video.readyState >= 3) resume()
      else video.addEventListener('canplay', resume, { once: true })
    }
  }

  const onCanPlay = () => {
    markPlaybackReady()
  }

  const onSwapError = () => {
    video.removeEventListener('loadeddata', restore)
    video.removeEventListener('canplay', onCanPlay)
    video.removeEventListener('error', onSwapError)
    isSwitchingQuality.value = false
  }

  video.addEventListener('loadeddata', restore, { once: true })
  video.addEventListener('canplay', onCanPlay, { once: true })
  video.addEventListener('error', onSwapError, { once: true })
  video.src = nextUrl
  video.load()
}

function setQuality(quality) {
  videoQuality.value = quality
  if (useHlsPlayback.value) {
    applyHlsQuality(quality)
  }
}

async function togglePip() {
  const video = videoEl.value
  if (!video || !document.pictureInPictureEnabled) return
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else {
      await video.requestPictureInPicture()
    }
  } catch {
    /* ignore */
  }
}

async function toggleFullscreen() {
  const root = playerRoot.value?.querySelector('.florescerPlayer') || playerRoot.value
  if (!root) return
  try {
    if (!document.fullscreenElement) {
      await root.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch {
    /* ignore */
  }
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

function resetNativeState() {
  isPlaying.value = false
  hasEverPlayed.value = false
  controlsVisible.value = true
  currentTime.value = 0
  duration.value = 0
  bufferedEnd.value = 0
  playbackRate.value = 1
  videoQuality.value = 'auto'
  detectedVideoHeight.value = 0
  videoLoadError.value = false
  isSwitchingQuality.value = false
  playbackReady.value = false
  pendingPlay.value = false
  captionSrc.value = ''
  captionsAvailable.value = false
  captionCues.value = []
  captionsEnabled.value = false
  captionsLoading.value = false
  hlsQualityOptions.value = []
  bunnyPlayMetadata.value = null
  destroyHls()
  closeSettings()
  isBuffering.value = false
  actionIndicator.value = null
  barHover.value = null
  clearTimeout(hideControlsTimer)
  clearTimeout(actionIndicatorTimer)
  clearTimeout(rippleTimer)
}

function onKeydown(event) {
  if (!hasSource.value || props.youtubeId) return
  const target = event.target
  if (target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return

  switch (event.key) {
    case ' ':
    case 'k':
    case 'K':
      event.preventDefault()
      togglePlayWithIndicator()
      break
    case 'ArrowLeft':
      event.preventDefault()
      seekRelative(-5, true)
      break
    case 'ArrowRight':
      event.preventDefault()
      seekRelative(5, true)
      break
    case 'j':
      event.preventDefault()
      seekRelative(-10, true)
      break
    case 'l':
      event.preventDefault()
      seekRelative(10, true)
      break
    case 'f':
    case 'F':
      event.preventDefault()
      toggleFullscreen()
      break
    case 'm':
    case 'M':
      event.preventDefault()
      toggleMute()
      break
    default:
      break
  }
}

async function loadPlyr() {
  if (!import.meta.client) return null
  if (!PlyrCtor) {
    const [plyrMod] = await Promise.all([
      import('plyr'),
      import('plyr/dist/plyr.css'),
    ])
    PlyrCtor = plyrMod.default
  }
  return PlyrCtor
}

function destroyYoutube() {
  if (youtubePlayer) {
    youtubePlayer.destroy()
    youtubePlayer = null
  }
}

async function initYoutube() {
  if (!import.meta.client || !props.youtubeId) {
    destroyYoutube()
    return
  }
  const Plyr = await loadPlyr()
  if (!Plyr || !youtubeHost.value) return
  await nextTick()
  destroyYoutube()
  youtubePlayer = new Plyr(youtubeHost.value, {
    controls: ['play-large', 'progress', 'play', 'rewind', 'fast-forward', 'mute', 'volume', 'current-time', 'duration', 'settings', 'pip', 'fullscreen'],
    settings: ['speed'],
    speed: { selected: 1, options: speedOptions },
    seekTime: 10,
    hideControls: true,
    youtube: { noCookie: true, rel: 0, modestbranding: 1 },
  })
  youtubePlayer.on('ended', () => emit('ended'))
}

watch(
  () => [props.videoUrl, props.captionUrl, props.transcription],
  async () => {
    if (!props.videoUrl && !props.captionUrl && !props.transcription?.length) return

    const wasEnabled = captionsEnabled.value
    captionCues.value = []
    captionSrc.value = ''
    captionsAvailable.value = false

    const resolved = await resolveCaptionSource()
    if (!resolved) {
      applyTranscriptionAsCaptions()
    }

    if (wasEnabled && captionCues.value.length) {
      applyCaptionsState()
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => [props.lessonId, props.videoUrl],
  () => {
    void loadBunnyPlayMetadata()
  },
  { immediate: true },
)

watch(
  () => [props.videoUrl, props.youtubeId],
  async () => {
    resetNativeState()
    destroyYoutube()
    if (!props.videoUrl && !props.youtubeId) return
    if (props.youtubeId) {
      await initYoutube()
      return
    }
    await setupVideoPlayback()
  },
  { immediate: true },
)

watch(videoQuality, async (quality, previous) => {
  if (!props.videoUrl || props.youtubeId || previous === undefined) return
  if (useHlsPlayback.value) {
    applyHlsQuality(quality)
    return
  }
  videoLoadError.value = false
  await nextTick()
  swapVideoSource(playbackVideoUrl.value)
})


onBeforeUnmount(() => {
  clearTimeout(hideControlsTimer)
  clearTimeout(actionIndicatorTimer)
  clearTimeout(rippleTimer)
  document.removeEventListener('mousemove', onBarDrag)
  destroyYoutube()
  destroyHls()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('keydown', onKeydown)
  if (import.meta.client) {
    window.removeEventListener('resize', onPlayerResize)
    window.removeEventListener('scroll', onPlayerResize, true)
  }
})

function onPlayerResize() {
  updateMobilePlayerState()
  if (settingsOpen.value) captureSettingsPanelRect()
}

if (import.meta.client) {
  pipSupported.value = Boolean(document.pictureInPictureEnabled)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('keydown', onKeydown)
  onMounted(() => {
    updateMobilePlayerState()
    window.addEventListener('resize', onPlayerResize)
    window.addEventListener('scroll', onPlayerResize, true)
  })
}

function seekToSeconds(seconds) {
  const video = videoEl.value
  if (!video || !Number.isFinite(seconds)) return
  video.currentTime = Math.max(0, Math.min(duration.value || seconds, seconds))
  currentTime.value = video.currentTime
}

defineExpose({
  play: () => videoEl.value?.play(),
  pause: () => videoEl.value?.pause(),
  seekToSeconds,
})
</script>
