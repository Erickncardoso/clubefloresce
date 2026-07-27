<template>
  <Teleport to="body">
    <Transition name="dieta-opts-intro">
      <div
        v-if="open"
        class="dieta-opts-intro-overlay"
        role="presentation"
      >
        <section
          class="dieta-opts-intro-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dieta-opts-intro-title"
        >
          <div class="dieta-opts-intro-icon" aria-hidden="true">
            <Layers />
          </div>

          <h2 id="dieta-opts-intro-title">Escolha as opções do seu cardápio</h2>

          <p class="dieta-opts-intro-copy">
            Seu plano tem mais de uma opção em algumas refeições
            <template v-if="slotsLabel"> ({{ slotsLabel }})</template>.
            Escolha qual deseja seguir — fica salva no app.
          </p>

          <p class="dieta-opts-intro-note">
            Depois você pode alterar quando quiser pelo botão
            <strong>Trocar opção</strong> na refeição.
          </p>

          <button type="button" class="dieta-opts-intro-cta" @click="emit('choose')">
            Escolher opções
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { Layers } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: false },
  /** Ex.: "Lanche da tarde, Café da manhã" */
  slotsLabel: { type: String, default: '' },
})

const emit = defineEmits(['choose'])
</script>

<style scoped>
.dieta-opts-intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 25015;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 0px));
  background: rgba(21, 24, 20, 0.42);
  box-sizing: border-box;
}

.dieta-opts-intro-card {
  width: 100%;
  max-width: 22rem;
  padding: 1.5rem 1.25rem 1.25rem;
  border-radius: 1.25rem;
  background: #fff;
  box-shadow: 0 16px 40px rgba(18, 22, 17, 0.18);
  text-align: center;
}

.dieta-opts-intro-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin: 0 auto 0.85rem;
  border-radius: 999px;
  background: #eff4ec;
  color: #62785a;
}

.dieta-opts-intro-icon :deep(svg) {
  width: 1.35rem;
  height: 1.35rem;
}

.dieta-opts-intro-card h2 {
  margin: 0;
  color: #20231f;
  font-size: 1.125rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.dieta-opts-intro-copy {
  margin: 0.7rem 0 0;
  color: #5f675c;
  font-size: 0.875rem;
  line-height: 1.45;
}

.dieta-opts-intro-note {
  margin: 0.75rem 0 0;
  padding: 0.7rem 0.8rem;
  border-radius: 0.75rem;
  background: #f5f7f3;
  color: #6f756d;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.dieta-opts-intro-note strong {
  color: #4f5a4a;
  font-weight: 650;
}

.dieta-opts-intro-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  margin-top: 1.15rem;
  padding: 0.75rem 1rem;
  border: 1px solid #7d9073;
  border-radius: 0.875rem;
  background: #7d9073;
  color: #fff;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(89, 108, 80, 0.2);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.dieta-opts-intro-cta:active {
  transform: scale(0.985);
}

.dieta-opts-intro-enter-active,
.dieta-opts-intro-leave-active {
  transition: opacity 0.2s ease;
}

.dieta-opts-intro-enter-active .dieta-opts-intro-card,
.dieta-opts-intro-leave-active .dieta-opts-intro-card {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.dieta-opts-intro-enter-from,
.dieta-opts-intro-leave-to {
  opacity: 0;
}

.dieta-opts-intro-enter-from .dieta-opts-intro-card,
.dieta-opts-intro-leave-to .dieta-opts-intro-card {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .dieta-opts-intro-enter-active,
  .dieta-opts-intro-leave-active,
  .dieta-opts-intro-enter-active .dieta-opts-intro-card,
  .dieta-opts-intro-leave-active .dieta-opts-intro-card {
    transition: none;
  }
}
</style>
