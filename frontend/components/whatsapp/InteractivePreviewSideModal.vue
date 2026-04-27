<template>
  <Teleport to="body">
    <aside v-if="open" class="interactive-preview-side">
      <div class="interactive-preview-side-card">
        <header class="interactive-preview-side-header">
          <h4>Preview em tempo real</h4>
        </header>
        <div class="interactive-preview-side-body">
          <InteractiveMessagePreview :form="form" />
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<script setup>
import InteractiveMessagePreview from '~/components/whatsapp/InteractiveMessagePreview.vue'

defineProps({
  open: { type: Boolean, default: false },
  form: {
    type: Object,
    default: () => ({ type: 'button', text: '', choicesText: '' })
  }
})
</script>

<style scoped>
.interactive-preview-side {
  position: fixed;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  z-index: 10081;
  width: clamp(280px, 32vw, 400px);
  pointer-events: none;
}
.interactive-preview-side-card {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #0b1220;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}
.interactive-preview-side-header {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.interactive-preview-side-header h4 {
  margin: 0;
  font-size: 0.92rem;
  color: #e2e8f0;
}
.interactive-preview-side-body {
  max-height: min(82vh, 760px);
  overflow: auto;
  padding: 4px 8px 8px;
}
@media (max-width: 1380px) {
  .interactive-preview-side {
    right: 10px;
    width: clamp(260px, 40vw, 340px);
  }
}
</style>
