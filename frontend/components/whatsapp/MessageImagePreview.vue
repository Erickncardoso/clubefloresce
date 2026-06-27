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
        'msg-image-wrap--loaded': fullLoaded,
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
        v-if="thumbSrc"
        :src="thumbSrc"
        class="msg-image msg-image--thumb"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <img
        v-if="fullSrc"
        :src="fullSrc"
        class="msg-image msg-image--full"
        :class="{ 'is-visible': fullLoaded || !thumbSrc }"
        alt="Imagem enviada"
        decoding="async"
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

const showDownloadingOverlay = computed(() => props.loading && !fullLoaded.value)

watch(
  () => [props.fullUrl, props.thumbUrl],
  () => {
    fullLoaded.value = false
  },
)

watch(
  () => [isPending.value, props.loading],
  ([pending, loading]) => {
    if (!pending || loading || autoRequested.value) return
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
