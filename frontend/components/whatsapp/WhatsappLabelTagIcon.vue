<template>
  <span
    class="wa-label-tag-icon"
    :class="{ 'wa-label-tag-icon--large': large }"
    :style="{ backgroundColor: colorHex }"
    aria-hidden="true"
  >
    <svg viewBox="0 0 18 12" class="wa-label-tag-icon-svg">
      <path
        fill="#fff"
        d="M1.25 1.1C1.25.77 1.52.5 1.85.5h7.05c.22 0 .43.09.58.24l6.32 5.26a.75.75 0 0 1 0 1.15L9.48 12.26a.85.85 0 0 1-.58.24H1.85A1.35 1.35 0 0 1 .5 11.15V1.85c0-.41.34-.75.75-.75z"
      />
    </svg>
  </span>
</template>

<script setup>
defineProps({
  colorHex: { type: String, default: '#9ab6c1' },
  large: { type: Boolean, default: false },
})
</script>

<style scoped>
.wa-label-tag-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wa-label-tag-icon--large {
  width: 44px;
  height: 44px;
}

.wa-label-tag-icon-svg {
  width: 18px;
  height: 12px;
  display: block;
}
</style>
