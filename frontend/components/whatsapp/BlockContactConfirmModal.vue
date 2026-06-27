<template>
  <Teleport to="body">
    <Transition name="wa-block-modal-fade">
      <div v-if="open" class="wa-block-modal-backdrop" @click.self="$emit('cancel')">
        <div
          class="wa-block-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`Bloquear ${displayName}`"
          @click.stop
        >
          <h3 class="wa-block-modal-title">Deseja bloquear {{ displayName }}?</h3>
          <p class="wa-block-modal-text">
            A pessoa não poderá mais fazer ligações nem enviar mensagens para você. Ela não saberá que foi bloqueada ou denunciada por você.
          </p>
          <label class="wa-block-report-row">
            <input v-model="reportChecked" type="checkbox" class="wa-block-report-checkbox" />
            <span class="wa-block-report-copy">
              <strong>Denunciar ao WhatsApp</strong>
              <span class="wa-block-report-sub">
                As últimas cinco mensagens recebidas desse usuário serão encaminhadas para o WhatsApp.
                <button type="button" class="wa-block-report-link" @click.prevent>Saiba mais</button>
              </span>
            </span>
          </label>
          <div class="wa-block-modal-actions">
            <button type="button" class="wa-block-modal-cancel" :disabled="loading" @click="$emit('cancel')">
              Cancelar
            </button>
            <button type="button" class="wa-block-modal-danger" :disabled="loading" @click="$emit('confirm', reportChecked)">
              {{ loading ? 'Bloqueando...' : 'Bloquear' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  displayName: { type: String, default: 'Contato' },
  loading: { type: Boolean, default: false },
})

defineEmits(['cancel', 'confirm'])

const reportChecked = ref(false)

watch(
  () => props.open,
  (isOpen) => { if (isOpen) reportChecked.value = false },
)
</script>
