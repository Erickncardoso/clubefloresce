<template>
  <NuxtLink to="/dieta" class="home-nutrition cf-squircle">
    <div class="home-nutrition-main">
      <HomeMacroPizzaRing
        :targets="targets"
        :consumed="consumed"
        :streak-days="streakDays"
      />

      <div class="home-nutrition-macros">
        <HomeMacroBar
          label="Carbos"
          :value="consumed.carbsG"
          :target="targets.carbsG"
          :percent="macroPercent(consumed.carbsG, targets.carbsG)"
          color="#6d9a66"
        />
        <HomeMacroBar
          label="Proteína"
          :value="consumed.proteinG"
          :target="targets.proteinG"
          :percent="macroPercent(consumed.proteinG, targets.proteinG)"
          color="#c8d84a"
        />
        <HomeMacroBar
          label="Gorduras"
          :value="consumed.fatG"
          :target="targets.fatG"
          :percent="macroPercent(consumed.fatG, targets.fatG)"
          color="#a882d4"
        />
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
defineProps({
  targets: { type: Object, required: true },
  consumed: { type: Object, required: true },
  streakDays: { type: Number, default: 0 },
  percent: { type: Number, default: 0 },
})

function macroPercent(current, target) {
  if (!target) return 0
  return Math.min(100, Math.round((Number(current) / Number(target)) * 100))
}
</script>

<style scoped>
.home-nutrition {
  display: block;
  padding: 1.15rem 1.25rem 1.15rem 1.1rem;
  border: 1px solid var(--cf-border);
  background: var(--cf-surface);
  box-shadow: var(--cf-shadow-lg);
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.home-nutrition:active {
  transform: scale(0.995);
  box-shadow: var(--cf-shadow);
}

.home-nutrition-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.home-nutrition-macros {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.7rem;
  padding-top: 0.15rem;
  padding-right: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .home-nutrition {
    transition: none;
  }

  .home-nutrition:active {
    transform: none;
  }
}
</style>
