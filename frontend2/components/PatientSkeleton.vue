<template>
  <div
    class="patient-skeleton"
    :class="[
      `patient-skeleton--${variant}`,
      { 'patient-skeleton--circle': circle },
    ]"
    :style="inlineStyle"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'block',
  },
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  circle: { type: Boolean, default: false },
})

const inlineStyle = computed(() => {
  const style = {}
  if (props.width) style.width = props.width
  if (props.height) style.height = props.height
  return style
})
</script>
