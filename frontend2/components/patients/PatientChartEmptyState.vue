<template>
  <div class="pc-empty-state">
    <div class="pc-empty-state__visual" aria-hidden="true">
      <component :is="icon" class="pc-empty-state__icon" />
    </div>
    <div class="pc-empty-state__copy">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <div v-if="actionLabel || $slots.actions" class="pc-empty-state__actions">
        <button
          v-if="actionLabel && !actionTo"
          type="button"
          class="btn-primary pc-empty-state__btn"
          @click="$emit('action')"
        >
          {{ actionLabel }}
        </button>
        <NuxtLink
          v-else-if="actionLabel && actionTo"
          :to="actionTo"
          class="btn-primary pc-empty-state__btn"
        >
          {{ actionLabel }}
        </NuxtLink>
        <slot name="actions" />
        <span v-if="counter" class="pc-empty-state__counter">{{ counter }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  actionLabel: { type: String, default: '' },
  actionTo: { type: [String, Object], default: null },
  counter: { type: String, default: '' },
})

defineEmits(['action'])
</script>

<style scoped>
.pc-empty-state {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 1.5rem;
  background: #fff;
  border: 1.5px solid #e8ece9;
  border-radius: var(--cf-radius-control);
}

.pc-empty-state__visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5.5rem;
  height: 5.5rem;
  flex-shrink: 0;
  border-radius: var(--cf-radius-control);
  background: rgba(139, 150, 124, 0.12);
  color: #8b967c;
}

.pc-empty-state__icon {
  width: 2.4rem;
  height: 2.4rem;
  stroke-width: 1.5;
}

.pc-empty-state__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.pc-empty-state__copy h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
  letter-spacing: -0.01em;
}

.pc-empty-state__copy p {
  margin: 0;
  max-width: 34rem;
  font-size: 0.84rem;
  font-weight: 400;
  line-height: 1.5;
  color: #6b7368;
}

.pc-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.45rem;
}

.pc-empty-state__btn {
  min-height: 2.35rem !important;
  padding: 0.4rem 0.9rem !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pc-empty-state__counter {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0.15rem 0.55rem;
  border-radius: var(--cf-radius-control);
  background: #eef1ee;
  color: #6b7368;
  font-size: 0.75rem;
  font-weight: 500;
}

@media (max-width: 720px) {
  .pc-empty-state {
    flex-direction: column;
    align-items: flex-start;
    padding: 1.35rem 1.1rem;
  }
}
</style>
