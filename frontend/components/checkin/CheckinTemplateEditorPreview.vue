<template>
  <div class="checkin-editor-preview">
    <div class="checkin-editor-preview-head">
      <strong>Prévia ao vivo</strong>
      <span>Como o paciente verá no app</span>
    </div>

    <div class="checkin-phone-shell">
      <img
        src="/imgs/mockup-isa.png"
        alt=""
        class="checkin-phone-mockup"
        width="486"
        height="978"
        draggable="false"
      >
      <div class="checkin-phone-screen">
        <CheckinTypeformFlow
          v-if="steps.length"
          preview
          :steps="steps"
          :initial-step-index="stepIndex"
          @step-change="onStepChange"
        />
        <div v-else class="checkin-phone-empty">
          <p>Adicione perguntas para visualizar o check-in.</p>
        </div>
      </div>
    </div>

    <p class="checkin-editor-preview-hint">
      Toque nas opções dentro do celular ou clique numa pergunta à esquerda para pular até ela.
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  steps: { type: Array, default: () => [] },
  stepIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:stepIndex'])

function onStepChange(index) {
  emit('update:stepIndex', index)
}
</script>

<style scoped>
.checkin-editor-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.checkin-editor-preview-head {
  width: 100%;
  text-align: center;
}

.checkin-editor-preview-head strong {
  display: block;
  font-size: 0.88rem;
  color: var(--admin-ink, #141414);
}

.checkin-editor-preview-head span {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.74rem;
  color: var(--admin-muted, #66706e);
}

/* mockup-isa.png — 486×978; fundo branco preenche a área transparente da tela */
.checkin-phone-shell {
  position: relative;
  width: min(100%, 280px);
  aspect-ratio: 486 / 978;
  margin-inline: auto;
  flex-shrink: 0;
  background: #fff;
  border-radius: 14%;
  overflow: hidden;
}

.checkin-phone-mockup {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 2;
  pointer-events: none;
  user-select: none;
}

.checkin-phone-screen {
  position: absolute;
  top: 5.5%;
  left: 5.5%;
  right: 5.5%;
  bottom: 6.7%;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 11%;
  background: #fff;
  --cf-pink: #8b967c;
  --cf-pink-dark: #6f7863;
  --cf-pink-soft: #eef0eb;
  --cf-border: #e8ece9;
  --cf-text: #1a2e24;
  --cf-text-muted: #7a8a82;
  --cf-bg: #ffffff;
  --cf-track: #eef0eb;
}

.checkin-phone-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  text-align: center;
}

.checkin-phone-empty p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--cf-text-muted, #66706e);
}

.checkin-editor-preview-hint {
  margin: 0;
  max-width: 16rem;
  font-size: 0.72rem;
  line-height: 1.45;
  text-align: center;
  color: var(--admin-muted, #66706e);
}
</style>
