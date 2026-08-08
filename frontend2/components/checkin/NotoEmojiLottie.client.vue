<template>
  <DotLottieVue
    class="noto-emoji-lottie"
    :src="src"
    autoplay
    loop
    :speed="speed"
  />
</template>

<script setup>
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

defineProps({
  src: { type: String, required: true },
  speed: { type: Number, default: 1 },
})
</script>

<style scoped>
.noto-emoji-lottie {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
