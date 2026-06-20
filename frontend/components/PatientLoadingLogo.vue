<template>
  <div
    class="cf-loading-logo"
    :class="[
      `cf-loading-logo--${size}`,
      { 'cf-loading-logo--animated': animated },
    ]"
    :role="animated ? 'status' : 'img'"
    :aria-label="animated ? (label || 'Carregando') : undefined"
    :aria-hidden="!animated && !label ? true : undefined"
  >
    <img
      src="/icons/logovetorcarregamento.svg"
      alt=""
      class="cf-loading-logo__img"
      width="59"
      height="83"
      aria-hidden="true"
    />
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value),
  },
  animated: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
</script>

<style scoped>
.cf-loading-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.cf-loading-logo__img {
  display: block;
  width: auto;
  height: 100%;
  object-fit: contain;
}

.cf-loading-logo--sm {
  height: 2rem;
}

.cf-loading-logo--md {
  height: 3rem;
}

.cf-loading-logo--lg {
  height: 4.25rem;
}

.cf-loading-logo--xl {
  height: 5.75rem;
}

.cf-loading-logo--animated .cf-loading-logo__img {
  will-change: opacity;
  animation: cf-loading-logo-pulse 1.6s ease-in-out infinite;
}

@keyframes cf-loading-logo-pulse {
  0%,
  100% {
    opacity: 0.38;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cf-loading-logo--animated .cf-loading-logo__img {
    animation: cf-loading-logo-pulse 2s ease-in-out infinite;
  }
}
</style>
