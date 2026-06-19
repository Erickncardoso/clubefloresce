<template>
  <div class="cf-brand-mark" :class="[`cf-brand-mark--${size}`, { 'cf-brand-mark--stacked': stacked }]">
    <img
      src="/logoflorescer.svg"
      alt=""
      class="cf-brand-mark__icon"
      width="28"
      height="50"
      aria-hidden="true"
    />
    <span v-if="showText" class="cf-brand-mark__text">Clube Florescer</span>
  </div>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md' },
  stacked: { type: Boolean, default: false },
  showText: { type: Boolean, default: true },
})
</script>

<style scoped>
.cf-brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  color: var(--cf-text);
}

.cf-brand-mark--stacked {
  flex-direction: column;
  gap: 0.55rem;
  text-align: center;
}

.cf-brand-mark__icon {
  flex-shrink: 0;
  width: auto;
  object-fit: contain;
}

.cf-brand-mark__text {
  font-family: var(--cf-font);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  white-space: nowrap;
}

.cf-brand-mark--sm .cf-brand-mark__icon {
  height: 1.35rem;
}

.cf-brand-mark--sm .cf-brand-mark__text {
  font-size: 0.9375rem;
}

.cf-brand-mark--md .cf-brand-mark__icon {
  height: 1.65rem;
}

.cf-brand-mark--md .cf-brand-mark__text {
  font-size: 1rem;
}

.cf-brand-mark--lg .cf-brand-mark__icon {
  height: 2.65rem;
}

.cf-brand-mark--lg .cf-brand-mark__text {
  font-size: 1.125rem;
}

.cf-brand-mark--stacked.cf-brand-mark--lg .cf-brand-mark__text {
  font-size: 1.0625rem;
}
</style>
