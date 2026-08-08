<template>
  <Teleport to="body">
    <Transition name="wa-block-snackbar-fade">
      <div v-if="snackbar" class="wa-block-snackbar" role="status">
        <span class="wa-block-snackbar-text">Contato bloqueado: {{ snackbar.displayName }}</span>
        <button type="button" class="wa-block-snackbar-undo" @click="$emit('undo')">Desfazer</button>
        <button type="button" class="wa-block-snackbar-close" aria-label="Fechar" @click="$emit('dismiss')">
          <X class="wa-block-snackbar-close-icon" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  snackbar: { type: Object, default: null },
})

defineEmits(['undo', 'dismiss'])
</script>
