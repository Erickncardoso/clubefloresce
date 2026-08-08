<template>
  <span
    v-if="status"
    class="msg-status-indicator"
    :class="`msg-status-indicator--${status}`"
    :aria-label="ariaLabel"
  >
    <svg
      v-if="status === 'pending'"
      class="msg-status-clock"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.25" />
      <path d="M8 4.5v3.5l2.25 1.35" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
    </svg>
    <svg
      v-else-if="status === 'sent'"
      class="msg-status-tick"
      viewBox="0 0 12 11"
      width="14"
      height="12"
      aria-hidden="true"
    >
      <path
        d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.406-2.318a.493.493 0 0 0-.682.01l-.415.403a.47.47 0 0 0-.01.68l3.13 3.014a.493.493 0 0 0 .679-.01l7.043-8.695a.47.47 0 0 0-.01-.68l-.414-.403z"
        fill="currentColor"
      />
    </svg>
    <svg
      v-else
      class="msg-status-tick msg-status-tick--double"
      viewBox="0 0 16 11"
      width="16"
      height="11"
      aria-hidden="true"
    >
      <path
        d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.406-2.318a.493.493 0 0 0-.682.01l-.415.403a.47.47 0 0 0-.01.68l3.13 3.014a.493.493 0 0 0 .679-.01l7.043-8.695a.47.47 0 0 0-.01-.68l-.414-.403z"
        fill="currentColor"
      />
      <path
        d="M15.817.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-9.636 11.89-2.786-2.677a.493.493 0 0 0-.682.01l-.415.403a.47.47 0 0 0-.01.68l3.797 3.653a.493.493 0 0 0 .679-.01l11.49-14.15a.47.47 0 0 0-.01-.68l-.414-.403z"
        fill="currentColor"
      />
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: ''
  }
})

const ariaLabel = computed(() => {
  switch (props.status) {
    case 'read': return 'Lida'
    case 'delivered': return 'Entregue'
    case 'sent': return 'Enviada'
    case 'pending': return 'Enviando'
    default: return ''
  }
})
</script>
