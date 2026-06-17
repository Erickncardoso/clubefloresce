<template>
  <div class="water-bottle" :aria-label="`Água: ${current} de ${target} copos`">
    <div class="water-bottle__glass" aria-hidden="true">
      <div class="water-bottle__fill" :style="{ height: `${fillPercent}%` }">
        <div class="water-bottle__wave" />
      </div>
      <div class="water-bottle__cap" />
    </div>
    <p class="water-bottle__count">
      <strong>{{ current }}</strong>
      <span>/ {{ target }} copos</span>
    </p>
    <div class="water-bottle__actions">
      <button type="button" class="water-bottle__btn" aria-label="Remover um copo" @click="emit('decrement')">−</button>
      <button type="button" class="water-bottle__btn water-bottle__btn--primary" aria-label="Adicionar um copo" @click="emit('increment')">+</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 8 },
})

const emit = defineEmits(['increment', 'decrement'])

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, Math.round((props.current / props.target) * 100))
})
</script>

<style scoped>
.water-bottle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.water-bottle__glass {
  position: relative;
  width: 4.5rem;
  height: 7.5rem;
  border: 2px solid #b8d9ef;
  border-radius: 0 0 1.1rem 1.1rem;
  background: #f4fbff;
  overflow: hidden;
}

.water-bottle__cap {
  position: absolute;
  top: -0.55rem;
  left: 50%;
  transform: translateX(-50%);
  width: 2rem;
  height: 0.55rem;
  border-radius: 0.25rem 0.25rem 0 0;
  background: #8ec5e8;
}

.water-bottle__fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #7ec8f0 0%, #5ba4d9 100%);
  transition: height 0.35s ease;
}

.water-bottle__wave {
  position: absolute;
  top: -0.35rem;
  left: -20%;
  width: 140%;
  height: 0.7rem;
  border-radius: 45%;
  background: rgba(255, 255, 255, 0.35);
  animation: water-wave 2.8s ease-in-out infinite;
}

@keyframes water-wave {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8%); }
}

.water-bottle__count {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.water-bottle__count strong {
  font-size: 1.15rem;
  color: #5ba4d9;
}

.water-bottle__actions {
  display: flex;
  gap: 0.5rem;
}

.water-bottle__btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--cf-text);
  cursor: pointer;
}

.water-bottle__btn--primary {
  background: #5ba4d9;
  border-color: #5ba4d9;
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .water-bottle__fill,
  .water-bottle__wave {
    transition: none;
    animation: none;
  }
}
</style>
