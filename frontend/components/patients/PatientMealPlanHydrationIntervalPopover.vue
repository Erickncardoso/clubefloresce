<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mph-interval-hint mph-modal-popover"
      role="dialog"
      aria-label="Como funciona o intervalo de consumo"
      :style="panelStyle"
      @mouseenter="$emit('pointerenter')"
      @mouseleave="$emit('pointerleave')"
      @click.stop
    >
      <h3 class="mph-interval-hint__title">Como funciona?</h3>
      <p class="mph-interval-hint__text">
        O intervalo configurado aqui será
        <strong>aplicado automaticamente para o Paciente no App</strong>.
        O Paciente poderá
        <strong>modificar e personalizar</strong>
        os horários que fica acordado e a frequência das notificações.
      </p>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  panelStyle: { type: Object, default: () => ({}) },
})

defineEmits(['pointerenter', 'pointerleave'])
</script>

<style scoped>
.mph-interval-hint {
  --mph-water: #00b2ca;
  width: min(26rem, calc(100vw - 1.5rem));
  padding: 0.75rem 0.9rem;
  background: #fff;
  border: 1px solid #eceef0;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.09);
  z-index: 6300;
  pointer-events: auto;
  font-weight: 400;
}

.mph-interval-hint__title {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
}

.mph-interval-hint__text {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: #6b7280;
  font-weight: 400;
}

.mph-interval-hint__text strong {
  font-weight: 500;
  color: var(--mph-water);
}
</style>
