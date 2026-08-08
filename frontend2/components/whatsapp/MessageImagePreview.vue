<template>
  <button
    type="button"
    class="msg-image-trigger"
    :class="{ 'msg-image-trigger--loading': showDownloadingOverlay }"
    :aria-busy="showDownloadingOverlay ? 'true' : 'false'"
    @click="onClick"
  >
    <div
      class="msg-image-wrap"
      :class="{
        'msg-image-wrap--loaded': showFullImage,
        'msg-image-wrap--thumb-only': !hasDistinctFullUrl && Boolean(thumbSrc),
        'msg-image-wrap--pending': isPending,
        'msg-image-wrap--downloading': showDownloadingOverlay,
      }"
    >
      <div v-if="isPending && !loading" class="msg-image-placeholder" aria-hidden="true">
        <ImageIcon class="msg-image-placeholder-icon" />
        <span class="msg-image-placeholder-label">Toque para carregar</span>
      </div>

      <img
        v-if="thumbSrc && !fullLoaded"
        :src="thumbSrc"
        class="msg-image msg-image--thumb"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
      />
      <img
        v-if="fullSrc"
        :src="fullSrc"
        class="msg-image msg-image--full"
        :class="{ 'is-visible': showFullImage }"
        alt="Imagem enviada"
        loading="eager"
        decoding="sync"
        fetchpriority="high"
        @load="onFullLoad"
        @error="onFullError"
      />

      <div v-if="showDownloadingOverlay" class="msg-image-loading-overlay" role="status" aria-live="polite">
        <div class="msg-image-loading-spinner" aria-hidden="true" />
        <span class="msg-image-loading-label">Baixando imagem</span>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Image as ImageIcon } from 'lucide-vue-next'

const props = defineProps({
  thumbUrl: { type: String, default: '' },
  fullUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'request-load'])

const fullLoaded = ref(false)
const autoRequested = ref(false)

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim())

const thumbSrc = computed(() => String(props.thumbUrl || '').trim())
const fullSrc = computed(() => {
  const full = String(props.fullUrl || '').trim()
  if (!full) return ''
  if (full === thumbSrc.value && !isHttpUrl(full)) return ''
  return full
})

const hasDistinctFullUrl = computed(() => Boolean(fullSrc.value))
const isPending = computed(() => !thumbSrc.value && !fullSrc.value)

// Com URL full: mostra na hora (não espera @load — isso causava os “segundos” de atraso).
const showFullImage = computed(() => Boolean(fullSrc.value) && (fullLoaded.value || isHttpUrl(fullSrc.value)))

const showDownloadingOverlay = computed(() =>
  Boolean(props.loading) && !fullSrc.value
)

watch(
  () => props.fullUrl,
  (url) => {
    const next = String(url || '').trim()
    fullLoaded.value = false
    if (!next || typeof window === 'undefined') return
    // Prefetch/decode imediato — browser cache hit = instantâneo.
    try {
      const img = new window.Image()
      img.decoding = 'async'
      img.onload = () => { fullLoaded.value = true }
      img.src = next
      if (typeof img.decode === 'function') {
        img.decode().then(() => { fullLoaded.value = true }).catch(() => {})
      }
    } catch {
      /* ignore */
    }
  },
  { immediate: true },
)

watch(
  () => [isPending.value, props.loading, fullSrc.value],
  ([pending, loading, full]) => {
    // Só pede download se NÃO tem URL full ainda.
    if (full || !pending || loading || autoRequested.value) return
    autoRequested.value = true
    emit('request-load')
  },
  { immediate: true },
)

const onFullLoad = () => {
  fullLoaded.value = true
}

const onFullError = () => {
  fullLoaded.value = false
}

const onClick = () => {
  if (isPending.value && !props.loading) {
    emit('request-load')
    return
  }
  if (showDownloadingOverlay.value) return
  emit('open')
}
</script>
