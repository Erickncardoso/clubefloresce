<template>
  <Teleport to="body">
    <Transition name="app-toast">
      <div
        v-if="toast"
        :key="toast.id"
        class="app-toast"
        :class="[
          `app-toast--${toast.type || 'success'}`,
          { 'app-toast--actionable': !!toast.actionLabel },
        ]"
        role="status"
        aria-live="polite"
        @click="onToastClick"
      >
        <div class="app-toast__row">
          <span
            v-if="(toast.type || 'success') === 'call'"
            class="app-toast__pulse"
            aria-hidden="true"
          />
          <FlorescerPlayerIcons
            v-else-if="(toast.type || 'success') === 'success'"
            name="check"
            class="app-toast__icon"
          />
          <svg
            v-else
            class="app-toast__icon app-toast__icon--error"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.25"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>

          <div class="app-toast__copy">
            <p class="app-toast__text">{{ primaryText }}</p>
            <p v-if="secondaryText" class="app-toast__sub">{{ secondaryText }}</p>
          </div>

          <button
            v-if="toast.actionLabel"
            type="button"
            class="app-toast__cta"
            @click.stop="runAction"
          >
            {{ toast.actionLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import FlorescerPlayerIcons from '~/components/courses/FlorescerPlayerIcons.vue'

const { toast, hideToast } = useAppToast()

const primaryText = computed(() => {
  if (!toast.value) return ''
  const { title, message } = toast.value
  return title || message || ''
})

const secondaryText = computed(() => {
  if (!toast.value) return ''
  const { title, message, detail } = toast.value
  const parts = []
  if (title && message && title !== message) parts.push(message)
  if (detail) parts.push(detail)
  return parts.join(' · ')
})

function runAction() {
  const action = toast.value?.onAction
  hideToast()
  if (typeof action === 'function') action()
}

function onToastClick() {
  if (!toast.value?.actionLabel) return
  runAction()
}
</script>

<style scoped>
.app-toast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  min-height: 34px;
  padding: 0.38rem 1rem;
  padding-top: max(0.38rem, env(safe-area-inset-top));
  text-align: center;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.1);
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.app-toast--actionable {
  cursor: pointer;
  min-height: 48px;
  padding: 0.55rem 1rem;
  padding-top: max(0.55rem, env(safe-area-inset-top));
}

.app-toast--success,
.app-toast--call {
  background: #5cdb95;
  color: #0f1a14;
}

.app-toast--error {
  background: #ef4444;
  color: #fff;
}

.app-toast__row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  max-width: min(960px, 100%);
  width: 100%;
}

.app-toast__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
  text-align: left;
}

.app-toast:not(.app-toast--actionable) .app-toast__copy {
  align-items: center;
  text-align: center;
}

.app-toast__pulse {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: #0f1a14;
  flex-shrink: 0;
  animation: app-toast-pulse 1.4s ease-out infinite;
}

.app-toast__icon {
  flex-shrink: 0;
  display: inline-flex;
}

.app-toast__icon :deep(svg) {
  width: 16px;
  height: 16px;
  display: block;
}

.app-toast__icon--error {
  width: 16px;
  height: 16px;
  opacity: 0.95;
}

.app-toast__text {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.app-toast__sub {
  margin: 0;
  max-width: min(960px, 100%);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.3;
  opacity: 0.88;
  word-break: break-word;
}

.app-toast--error .app-toast__sub {
  opacity: 0.92;
}

.app-toast__cta {
  flex-shrink: 0;
  margin-left: auto;
  min-height: 2rem;
  padding: 0.35rem 0.85rem;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 26, 20, 0.16);
  color: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.app-toast-enter-active {
  transition:
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-toast-leave-active {
  transition:
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.32s cubic-bezier(0.4, 0, 1, 1);
}

.app-toast-enter-from {
  opacity: 0;
  transform: translate3d(0, -100%, 0);
}

.app-toast-leave-to {
  opacity: 0;
  transform: translate3d(0, -100%, 0);
}

@keyframes app-toast-pulse {
  0% { box-shadow: 0 0 0 0 rgba(15, 26, 20, 0.45); }
  70% { box-shadow: 0 0 0 10px rgba(15, 26, 20, 0); }
  100% { box-shadow: 0 0 0 0 rgba(15, 26, 20, 0); }
}
</style>
