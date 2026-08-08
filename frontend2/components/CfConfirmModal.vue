<template>
  <Teleport to="body">
    <Transition name="cf-confirm-fade">
      <div
        v-if="state.open"
        class="cf-confirm-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="cancel"
        @keydown.esc="cancel"
      >
        <div class="cf-confirm-card">
          <div class="cf-confirm-icon" :class="state.variant">
            <AlertTriangle v-if="state.variant === 'danger'" :size="22" />
            <HelpCircle v-else :size="22" />
          </div>

          <h2 :id="titleId" class="cf-confirm-title">{{ state.title }}</h2>
          <p class="cf-confirm-message">{{ state.message }}</p>

          <div class="cf-confirm-actions">
            <button
              type="button"
              class="cf-confirm-btn cf-confirm-btn--cancel"
              :disabled="state.loading"
              @click="cancel"
            >
              {{ state.cancelLabel }}
            </button>
            <button
              type="button"
              class="cf-confirm-btn"
              :class="state.variant === 'danger' ? 'cf-confirm-btn--danger' : 'cf-confirm-btn--primary'"
              :disabled="state.loading"
              @click="accept"
            >
              {{ state.loading ? 'Aguarde...' : state.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { AlertTriangle, HelpCircle } from 'lucide-vue-next'

const { state, accept, cancel } = useConfirm()
const titleId = 'cf-confirm-title'
</script>

<style scoped>
.cf-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
}

.cf-confirm-card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 24px;
  padding: 1.75rem 1.75rem 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.16);
  text-align: center;
}

.cf-confirm-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 1rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cf-confirm-icon.danger {
  background: #fef2f2;
  color: #dc2626;
}

.cf-confirm-icon.default {
  background: #f0fdf4;
  color: #8B967C;
}

.cf-confirm-title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
}

.cf-confirm-message {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
}

.cf-confirm-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cf-confirm-btn {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 0.85rem 1rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}

.cf-confirm-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.cf-confirm-btn--cancel {
  background: #f8faf8;
  border: 1.5px solid #e8ece8;
  color: #555;
}

.cf-confirm-btn--cancel:hover:not(:disabled) {
  background: #f1f5f1;
}

.cf-confirm-btn--danger {
  background: #dc2626;
  color: #fff;
}

.cf-confirm-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
}

.cf-confirm-btn--primary {
  background: #8B967C;
  color: #fff;
}

.cf-confirm-btn--primary:hover:not(:disabled) {
  background: #3a7332;
  box-shadow: 0 8px 20px rgba(45, 90, 39, 0.22);
}

.cf-confirm-fade-enter-active,
.cf-confirm-fade-leave-active {
  transition: opacity 0.18s ease;
}

.cf-confirm-fade-enter-from,
.cf-confirm-fade-leave-to {
  opacity: 0;
}
</style>
