<template>
  <div class="food-plate" :aria-label="`Alimentação: ${current} de ${target} dias na semana`">
    <div class="food-plate__scene" aria-hidden="true">
      <div class="food-plate__dish">
        <div
          v-for="(segment, index) in segments"
          :key="index"
          class="food-plate__slice"
          :class="{ 'food-plate__slice--filled': segment.filled }"
          :style="segmentStyle(index)"
        />
        <div class="food-plate__center">
          <span v-if="current > 0" class="food-plate__sparkle food-plate__sparkle--1">✦</span>
          <span v-if="current > 1" class="food-plate__sparkle food-plate__sparkle--2">✦</span>
          <span v-if="current > 2" class="food-plate__sparkle food-plate__sparkle--3">✦</span>
        </div>
      </div>
      <div class="food-plate__steam">
        <span /><span /><span />
      </div>
    </div>

    <p class="food-plate__count">
      <strong>{{ current }}</strong>
      <span>/ {{ target }} dias</span>
    </p>

    <div class="food-plate__actions">
      <button type="button" class="food-plate__btn" aria-label="Remover um dia" @click="emit('decrement')">−</button>
      <button type="button" class="food-plate__btn food-plate__btn--primary" aria-label="Marcar dia alinhado" @click="emit('increment')">+</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  target: { type: Number, default: 5 },
})

const emit = defineEmits(['increment', 'decrement'])

const segments = computed(() =>
  Array.from({ length: props.target }, (_, index) => ({
    filled: index < props.current,
  })),
)

function segmentStyle(index) {
  const angle = (360 / props.target) * index
  return {
    transform: `rotate(${angle}deg) skewY(${90 - 360 / props.target}deg)`,
    '--slice-delay': `${index * 0.08}s`,
  }
}
</script>

<style scoped>
.food-plate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.food-plate__scene {
  position: relative;
  width: 7rem;
  height: 7rem;
}

.food-plate__dish {
  position: relative;
  width: 6.5rem;
  height: 6.5rem;
  margin: 0 auto;
  border-radius: 50%;
  background: #fff8f4;
  border: 3px solid #f0ddd4;
  box-shadow: inset 0 2px 8px rgba(232, 165, 152, 0.15);
  overflow: hidden;
}

.food-plate__slice {
  position: absolute;
  inset: 0;
  transform-origin: 100% 100%;
  background: transparent;
  transition: background 0.4s ease;
  transition-delay: var(--slice-delay, 0s);
}

.food-plate__slice--filled {
  background: linear-gradient(135deg, #f4b8a8 0%, #e8a598 55%, #d9897a 100%);
  animation: food-pop 0.45s ease var(--slice-delay, 0s);
}

.food-plate__center {
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: #fffaf7;
  border: 2px dashed #f0ddd4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.food-plate__sparkle {
  position: absolute;
  font-size: 0.55rem;
  color: #e8a598;
  animation: food-sparkle 2s ease-in-out infinite;
}

.food-plate__sparkle--1 { top: 18%; left: 28%; animation-delay: 0s; }
.food-plate__sparkle--2 { top: 55%; right: 20%; animation-delay: 0.4s; }
.food-plate__sparkle--3 { bottom: 22%; left: 45%; animation-delay: 0.8s; }

.food-plate__steam {
  position: absolute;
  top: -0.15rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.35rem;
}

.food-plate__steam span {
  width: 0.35rem;
  height: 1rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(232, 165, 152, 0.5), transparent);
  animation: food-steam 2.2s ease-in-out infinite;
}

.food-plate__steam span:nth-child(2) { animation-delay: 0.35s; height: 1.2rem; }
.food-plate__steam span:nth-child(3) { animation-delay: 0.7s; }

.food-plate__count {
  margin: 0;
  font-size: 0.82rem;
  color: var(--cf-text-muted);
}

.food-plate__count strong {
  font-size: 1.15rem;
  color: #d9897a;
}

.food-plate__actions {
  display: flex;
  gap: 0.5rem;
}

.food-plate__btn {
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: var(--cf-surface);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
}

.food-plate__btn--primary {
  background: #e8a598;
  border-color: #e8a598;
  color: #fff;
}

@keyframes food-pop {
  0% { transform: rotate(var(--r, 0deg)) skewY(var(--s, 0deg)) scale(0.6); opacity: 0.4; }
  60% { transform: rotate(var(--r, 0deg)) skewY(var(--s, 0deg)) scale(1.04); }
  100% { transform: rotate(var(--r, 0deg)) skewY(var(--s, 0deg)) scale(1); opacity: 1; }
}

@keyframes food-steam {
  0%, 100% { opacity: 0.2; transform: translateY(0) scaleX(1); }
  50% { opacity: 0.7; transform: translateY(-0.35rem) scaleX(1.15); }
}

@keyframes food-sparkle {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .food-plate__slice,
  .food-plate__steam span,
  .food-plate__sparkle {
    animation: none;
    transition: none;
  }
}
</style>
