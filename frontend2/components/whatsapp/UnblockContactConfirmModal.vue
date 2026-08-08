<template>
  <Teleport to="body">
    <Transition name="wa-block-modal-fade">
      <div v-if="open" class="wa-block-modal-backdrop" @click.self="$emit('cancel')">
        <div
          class="wa-block-modal wa-block-modal--compact"
          role="dialog"
          aria-modal="true"
          :aria-label="`Desbloquear ${displayName}`"
          @click.stop
        >
          <p class="wa-block-modal-question">Deseja desbloquear {{ displayName }}?</p>
          <div class="wa-block-modal-actions">
            <button type="button" class="wa-block-modal-cancel" :disabled="loading" @click="$emit('cancel')">
              Cancelar
            </button>
            <button type="button" class="wa-block-modal-primary" :disabled="loading" @click="$emit('confirm')">
              {{ loading ? 'Desbloqueando...' : 'Desbloquear' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  displayName: { type: String, default: 'Contato' },
  loading: { type: Boolean, default: false },
})

defineEmits(['cancel', 'confirm'])
</script>
