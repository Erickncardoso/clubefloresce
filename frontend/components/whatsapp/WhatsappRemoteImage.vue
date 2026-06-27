<template>
  <div class="msg-remote-image" :class="{ 'msg-remote-image--loaded': loaded || failed }">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="msg-remote-image-img"
      decoding="async"
      @load="loaded = true"
      @error="failed = true"
    />
    <div v-else class="msg-remote-image-fallback" aria-hidden="true" />
    <div v-if="src && !loaded && !failed" class="msg-image-loading-overlay" role="status" aria-live="polite">
      <div class="msg-image-loading-spinner" aria-hidden="true" />
      <span class="msg-image-loading-label">Baixando imagem</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' }
})

const loaded = ref(false)
const failed = ref(false)

watch(() => props.src, () => {
  loaded.value = false
  failed.value = false
})
</script>

<style scoped>
.msg-remote-image {
  position: relative;
  overflow: hidden;
  background: rgba(226, 232, 240, 0.55);
}
.msg-remote-image-fallback {
  min-height: 120px;
  background: linear-gradient(135deg, rgba(226, 232, 240, 0.65), rgba(241, 245, 249, 0.92));
}
.msg-remote-image-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.msg-remote-image--loaded .msg-remote-image-img {
  opacity: 1;
}
</style>
