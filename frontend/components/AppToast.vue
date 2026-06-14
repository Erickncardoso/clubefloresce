<template>
  <Teleport to="body">
    <Transition name="app-toast">
      <div
        v-if="toast"
        :key="toast.id"
        class="app-toast"
        :class="`app-toast--${toast.type || 'success'}`"
        role="status"
        aria-live="polite"
      >
        <div class="app-toast__row">
          <FlorescerPlayerIcons
            v-if="(toast.type || 'success') === 'success'"
            name="check"
            class="app-toast__icon"
          />
          <svg
            v-else
            class="app-toast__icon app-toast__icon--error"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2.25"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          <p class="app-toast__text">{{ primaryText }}</p>
        </div>
        <p v-if="secondaryText" class="app-toast__sub">{{ secondaryText }}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import FlorescerPlayerIcons from '~/components/courses/FlorescerPlayerIcons.vue'

const { toast } = useAppToast()

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
</script>

<style scoped>
.app-toast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-height: 44px;
  padding: 0.65rem 1.25rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.12);
}

.app-toast--success {
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
}

.app-toast__icon {
  flex-shrink: 0;
  display: inline-flex;
}

.app-toast__icon :deep(svg) {
  width: 20px;
  height: 20px;
  display: block;
}

.app-toast__icon--error {
  opacity: 0.95;
}

.app-toast__text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.app-toast__sub {
  margin: 0;
  max-width: min(960px, 100%);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  opacity: 0.88;
  word-break: break-word;
}

.app-toast--error .app-toast__sub {
  opacity: 0.92;
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
