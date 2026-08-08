<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mped-day-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mped-day-confirm-title"
      @click.self="cancel"
    >
      <div class="mped-day-confirm__panel modal-card" @click.stop>
        <h2 id="mped-day-confirm-title" class="mped-day-confirm__title">
          Selecionar dia específico
        </h2>
        <p class="mped-day-confirm__message">
          Ao selecionar um dia separado, a opção
          <strong>“Todos os dias”</strong>
          é automaticamente desabilitada. Deseja prosseguir?
        </p>
        <footer class="mped-day-confirm__actions">
          <button type="button" class="btn-secondary mped-day-confirm__btn" @click="cancel">
            Não
          </button>
          <button type="button" class="btn-primary mped-day-confirm__btn" @click="confirm">
            Sim
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

function close() {
  emit('update:open', false)
}

function cancel() {
  emit('cancel')
  close()
}

function confirm() {
  emit('confirm')
  close()
}
</script>

<style scoped>
.mped-day-confirm {
  position: fixed;
  inset: 0;
  z-index: 10100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
  isolation: isolate;
}

.mped-day-confirm__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 28rem);
  padding: 1.25rem 1.35rem 1.15rem;
  display: grid;
  gap: 0.85rem;
  background: #fff;
  border: 1px solid #e8ece9;
  border-radius: var(--cf-radius-control);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
  text-align: left;
}

.mped-day-confirm__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #2c322c;
}

.mped-day-confirm__message {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #5f675f;
}

.mped-day-confirm__message strong {
  font-weight: 600;
  color: #374151;
}

.mped-day-confirm__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.15rem;
}

.mped-day-confirm__btn {
  width: auto !important;
  min-height: 2.35rem !important;
  padding: 0.45rem 1.1rem !important;
  font-size: 0.875rem !important;
  box-shadow: none !important;
  transform: none !important;
}
</style>
