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
  right: 16px;
  transform: translateY(-50%);
  z-index: 10081;
  width: clamp(300px, 28vw, 380px);
  pointer-events: none;
}
.interactive-preview-side-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e9edef;
  background: #fff;
  box-shadow: 0 4px 24px rgba(11, 20, 26, 0.12);
  pointer-events: auto;
}
.interactive-preview-side-header {
  padding: 12px 14px;
  border-bottom: 1px solid #e9edef;
  background: #f0f2f5;
}
.interactive-preview-side-header h4 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #111b21;
}
.interactive-preview-side-body {
  max-height: min(78vh, 720px);
  overflow: auto;
  padding: 8px 10px 12px;
  background: #e5ddd5;
}
@media (max-width: 1380px) {
  .interactive-preview-side {
    display: none;
  }
}
</style>
