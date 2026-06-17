<template>
  <div class="water-bottle" :aria-label="`Água: ${displayCurrent} de ${displayTarget}`">
    <div class="water-bottle__glass" aria-hidden="true">
      <div class="water-bottle__ticks">
        <span v-for="tick in ticks" :key="tick" class="water-bottle__tick" :style="{ bottom: `${tick}%` }" />
      </div>
      <div class="water-bottle__fill" :style="{ height: `${fillPercent}%` }">
        <div class="water-bottle__wave" />
      </div>
      <div class="water-bottle__cap" />
      <span class="water-bottle__liters">{{ displayCurrent }}</span>
    </div>

    <p class="water-bottle__count">
      <strong>{{ displayCurrent }}</strong>
      <span>/ {{ displayTarget }}</span>
    </p>

    <div class="water-bottle__actions">
      <button type="button" class="water-bottle__btn" aria-label="Remover 250 ml" @click="emit('decrement')">−</button>
      <button type="button" class="water-bottle__btn water-bottle__btn--primary" aria-label="Adicionar 250 ml" @click="emit('increment')">+</button>
    </div>
    <p class="water-bottle__hint">+250 ml por toque</p>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 2 },
})

const emit = defineEmits(['increment', 'decrement'])

const fillPercent = computed(() => {
  if (!props.target) return 0
  return Math.min(100, Math.round((props.current / props.target) * 100))
})

const ticks = [25, 50, 75]

function formatLiters(value) {
  const rounded = Math.round(value * 4) / 4
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace('.', ',')
  return `${text} L`
}

const displayCurrent = computed(() => formatLiters(props.current))
const displayTarget = computed(() => formatLiters(props.target))
</script>

<style scoped>
.water-bottle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.water-bottle__glass {
  position: relative;
  width: 5rem;
  height: 8rem;
  border: 2px solid #b8d9ef;
  border-radius: 0.35rem 0.35rem 1.15rem 1.15rem;
  background: linear-gradient(180deg, #f8fcff 0%, #eef7fc 100%);
  overflow: hidden;
  box-shadow: inset 0 -4px 12px rgba(91, 164, 217, 0.08);
}

.water-bottle__cap {
  position: absolute;
  top: -0.6rem;
  left: 50%;
  transform: translateX(-50%);
  width: 2.15rem;
  height: 0.6rem;
  border-radius: 0.3rem 0.3rem 0 0;
  background: linear-gradient(180deg, #9ed0ef, #7eb8de);
}

.water-bottle__ticks {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.water-bottle__tick {
  position: absolute;
  left: 0.45rem;
  right: 0.45rem;
  height: 1px;
  background: rgba(91, 164, 217, 0.2);
}

.water-bottle__fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #8ed4f5 0%, #5ba4d9 55%, #4a94cb 100%);
  transition: height 0.4s ease;
  z-index: 2;
}

.water-bottle__wave {
  position: absolute;
  top: -0.4rem;
  left: -25%;
  width: 150%;
  height: 0.75rem;
  border-radius: 45%;
  background: rgba(255, 255, 255, 0.35);
  animation: water-wave 2.8s ease-in-out infinite;
}

.water-bottle__liters {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  font-size: 0.72rem;
  font-weight: 800;
  color: #2f6f9e;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
  pointer-events: none;
}

.water-bottle__count {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.water-bottle__count strong {
  font-size: 1.2rem;
  color: #5ba4d9;
}

.water-bottle__hint {
  margin: 0;
  font-size: 0.62rem;
  color: var(--cf-text-muted);
}

.water-bottle__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.15rem;
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

@keyframes water-wave {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8%); }
}

@media (prefers-reduced-motion: reduce) {
  .water-bottle__fill,
  .water-bottle__wave {
    transition: none;
    animation: none;
  }
}
</style>
