<template>
  <svg
    class="wa-audio-ptt-mic"
    :class="{ 'wa-audio-ptt-mic--listened': listened }"
    viewBox="0 0 14 18"
    width="14"
    height="18"
    aria-hidden="true"
  >
    <rect
      x="4.5"
      y="1.2"
      width="5"
      height="7.8"
      rx="2.5"
      class="wa-audio-ptt-mic-body"
    />
    <path
      d="M3.1 7.2a3.9 3.9 0 0 0 7.8 0"
      class="wa-audio-ptt-mic-stand"
      fill="none"
    />
    <path
      d="M7 11.2v2.1"
      class="wa-audio-ptt-mic-stem"
      fill="none"
    />
    <path
      d="M4.8 13.8h4.4"
      class="wa-audio-ptt-mic-base"
      fill="none"
    />
  </svg>
</template>

<script setup>
defineProps({
  listened: { type: Boolean, default: false }
})
</script>
