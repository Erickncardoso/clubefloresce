<template>
  <Teleport to="body">
    <Transition name="push-prompt-fade">
      <div
        v-if="open"
        class="push-prompt-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-prompt-title"
      >
        <div class="push-prompt cf-squircle">
          <div class="push-prompt-icon-wrap" aria-hidden="true">
            <BellRing class="push-prompt-icon" />
          </div>

          <h2 id="push-prompt-title" class="push-prompt-title">
            Ative as notificações
          </h2>

          <p v-if="pushChecking" class="push-prompt-copy">
            Verificando suporte a notificações…
          </p>
          <p v-else-if="pushNeedsHttps" class="push-prompt-copy">
            Notificações push exigem conexão segura (HTTPS). Abra o app publicado ou use um túnel
            seguro para testar no celular.
          </p>
          <p v-else-if="pushPermission === 'denied'" class="push-prompt-copy">
            A permissão está bloqueada. Nas configurações do celular, libere notificações para o
            Clube Florescer e volte aqui.
          </p>
          <p v-else class="push-prompt-copy">
            Receba lembretes de refeições, check-ins, mensagens da Bella e avisos da comunidade —
            mesmo com o app fechado. Este passo é essencial para acompanhar seu plano.
          </p>

          <div class="push-prompt-actions">
            <button
              v-if="canActivate"
              type="button"
              class="push-prompt-btn"
              :disabled="pushLoading"
              @click="activate"
            >
              <span
                v-if="pushLoading"
                class="push-prompt-spinner"
                aria-hidden="true"
              />
              {{ pushLoading ? 'Ativando…' : 'Ativar notificações' }}
            </button>
            <button
              v-else-if="pushPermission === 'denied'"
              type="button"
              class="push-prompt-btn push-prompt-btn--secondary"
              :disabled="pushLoading"
              @click="recheck"
            >
              Já liberei — verificar
            </button>
          </div>

          <p v-if="pushError" class="push-prompt-error" role="alert">{{ pushError }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { BellRing } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const {
  supported: pushSupported,
  needsHttps: pushNeedsHttps,
  checking: pushChecking,
  enabledOnServer: pushEnabledOnServer,
  permission: pushPermission,
  subscribed: pushSubscribed,
  loading: pushLoading,
  error: pushError,
  subscribe: subscribePush,
  refreshStatus,
  detectPushSupport,
} = usePushNotifications()

const canActivate = computed(() => (
  !pushChecking.value
  && !pushNeedsHttps.value
  && pushSupported.value
  && pushEnabledOnServer.value
  && pushPermission.value !== 'denied'
  && !pushSubscribed.value
))

async function activate() {
  const ok = await subscribePush()
  if (ok && import.meta.client) {
    localStorage.removeItem('push_prompt_dismissed')
  }
}

async function recheck() {
  pushError.value = ''
  await detectPushSupport()
  await refreshStatus()
  if (pushPermission.value === 'granted' && !pushSubscribed.value) {
    await activate()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!import.meta.client) return
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true },
)

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<style scoped>
.push-prompt-overlay {
  position: fixed;
  inset: 0;
  z-index: 8000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.push-prompt {
  width: 100%;
  max-width: 20rem;
  padding: 1.25rem 1.1rem 1.1rem;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  box-shadow: var(--cf-shadow-lg);
  text-align: center;
}

.push-prompt-icon-wrap {
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  background: var(--cf-pink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.push-prompt-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: var(--cf-pink);
}

.push-prompt-title {
  margin: 0 0 0.45rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--cf-text);
}

.push-prompt-copy {
  margin: 0 0 0.95rem;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--cf-text-muted);
}

.push-prompt-actions {
  display: flex;
  justify-content: center;
}

.push-prompt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.62rem 0.95rem;
  border: none;
  border-radius: 10px;
  background: var(--cf-pink);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  font-family: inherit;
  line-height: 1.2;
  cursor: pointer;
}

.push-prompt-btn:disabled {
  opacity: 0.9;
  cursor: wait;
}

.push-prompt-btn--secondary {
  background: var(--cf-track);
  color: var(--cf-text);
}

.push-prompt-spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: push-prompt-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes push-prompt-spin {
  to {
    transform: rotate(360deg);
  }
}

.push-prompt-error {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: #c0392b;
}

.push-prompt-fade-enter-active,
.push-prompt-fade-leave-active {
  transition: opacity 0.2s ease;
}

.push-prompt-fade-enter-from,
.push-prompt-fade-leave-to {
  opacity: 0;
}
</style>
