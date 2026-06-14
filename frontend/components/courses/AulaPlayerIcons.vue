<template>
  <FlorescerPlayerIcons v-bind="$props" />
</template>

<script setup>
import FlorescerPlayerIcons from './FlorescerPlayerIcons.vue'

defineProps({
  name: { type: String, required: true },
  waves: { type: Number, default: 0 },
  muted: { type: Boolean, default: false },
})
</script>
