<template>
  <div class="push-settings cf-squircle">
    <div class="push-settings-copy">
      <h3>Notificações no celular</h3>
      <p v-if="pushChecking">Verificando suporte a notificações…</p>
      <p v-else-if="pushNeedsHttps">
        Push não funciona em <strong>http</strong> no celular (ex.: IP da rede <code>192.168.x.x</code>).
        Para testar no aparelho, use o app em produção (HTTPS) ou um túnel seguro no PC.
      </p>
      <p v-else-if="!pushSupported && !pushStandalone">
        Para receber push, adicione o app à tela inicial do celular e abra por lá (não pelo navegador).
      </p>
      <p v-else-if="!pushSupported && pushStandalone">
        Atualize o iOS para 16.4 ou superior, ou reabra o app e tente de novo.
      </p>
      <p v-else-if="!pushEnabledOnServer">Conectando ao servidor de push…</p>
      <p v-else-if="pushPermission === 'denied'">Permissão bloqueada. Libere nas configurações do navegador ou do app.</p>
      <p v-else-if="pushSubscribed">Você receberá alertas de check-in, Bella e comunidade.</p>
      <p v-else>Receba alertas mesmo com o app fechado.</p>
    </div>
    <button
      v-if="pushSupported && pushEnabledOnServer && pushPermission !== 'denied'"
      type="button"
      class="push-settings-btn"
      :disabled="pushLoading"
      @click="togglePush"
    >
      {{ pushLoading ? 'Aguarde…' : pushSubscribed ? 'Desativar push' : 'Ativar push' }}
    </button>
    <p v-if="pushError" class="push-settings-error">{{ pushError }}</p>
  </div>
</template>

<script setup>
const {
  supported: pushSupported,
  standalone: pushStandalone,
  needsHttps: pushNeedsHttps,
  checking: pushChecking,
  enabledOnServer: pushEnabledOnServer,
  permission: pushPermission,
  subscribed: pushSubscribed,
  loading: pushLoading,
  error: pushError,
  initPushState,
  subscribe: subscribePush,
  unsubscribe: unsubscribePush,
} = usePushNotifications()

onMounted(() => {
  void initPushState()
})

async function togglePush() {
  if (pushSubscribed.value) {
    await unsubscribePush()
    return
  }
  const ok = await subscribePush()
  if (ok) localStorage.removeItem('push_prompt_dismissed')
}
</script>

<style scoped>
.push-settings {
  padding: 1rem;
  border: 1px solid var(--cf-border, var(--pa-border));
  background: var(--cf-surface, #fff);
  box-shadow: var(--cf-shadow-lg);
}

.push-settings-copy h3 {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--cf-text);
}

.push-settings-copy p {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--cf-text-muted, var(--pa-text-muted));
}

.push-settings-btn {
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  border-radius: 10px;
  background: var(--cf-pink, var(--pa-green));
  color: #fff;
  font-weight: 700;
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
}

.push-settings-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.push-settings-error {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--pa-red, #d64545);
}
</style>
