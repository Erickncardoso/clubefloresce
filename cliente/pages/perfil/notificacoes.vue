<template>
  <div class="patient-page notif-page">
    <PatientHeader title="Notificações" show-back back-to="/perfil" />

    <section class="notif-push cf-squircle">
      <div class="notif-push-copy">
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
        class="notif-push-btn"
        :disabled="pushLoading"
        @click="togglePush"
      >
        {{ pushLoading ? 'Aguarde…' : pushSubscribed ? 'Desativar push' : 'Ativar push' }}
      </button>
      <p v-if="pushError" class="notif-push-error">{{ pushError }}</p>
    </section>

    <div v-if="hasUnread" class="notif-toolbar">
      <button type="button" class="notif-mark-all" :disabled="markingAll" @click="handleMarkAllRead">
        Marcar todas como lidas
      </button>
    </div>

    <PatientPageSkeleton v-if="loading && !items.length" layout="feed" />

    <p v-else-if="error" class="notif-empty">{{ error }}</p>

    <p v-else-if="!grouped.length" class="notif-empty">Nenhuma notificação por enquanto.</p>

    <section v-for="group in grouped" :key="group.label" class="notif-group">
      <h2>{{ group.label }}</h2>
      <button
        v-for="n in group.items"
        :key="n.id"
        type="button"
        class="notif-item"
        :class="{ unread: !n.read }"
        @click="openNotification(n)"
      >
        <div class="notif-icon-wrap" :class="`notif-icon-wrap--${n.type}`">
          <component :is="n.icon" class="notif-icon" />
        </div>
        <div class="notif-body">
          <strong>{{ n.title }}</strong>
          <p>{{ n.text }}</p>
          <span>{{ n.time }}</span>
        </div>
        <span v-if="!n.read" class="notif-dot" />
      </button>
    </section>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const {
  items,
  grouped,
  hasUnread,
  loading,
  error,
  fetchNotifications,
  markAllRead,
  openNotification,
} = usePatientNotifications()

const markingAll = ref(false)

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
  fetchNotifications()
})

async function togglePush() {
  if (pushSubscribed.value) {
    await unsubscribePush()
    return
  }
  const ok = await subscribePush()
  if (ok) localStorage.removeItem('push_prompt_dismissed')
}

async function handleMarkAllRead() {
  if (markingAll.value || !hasUnread.value) return
  markingAll.value = true
  try {
    await markAllRead()
  } finally {
    markingAll.value = false
  }
}
</script>

<style scoped>
.notif-page {
  padding-top: 0;
}

.notif-push {
  margin-bottom: 0.85rem;
  padding: 1rem;
  border: 1px solid var(--pa-border);
  background: var(--cf-surface, #fff);
  box-shadow: var(--cf-shadow-lg);
}

.notif-push-copy h3 {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
}

.notif-push-copy p {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--pa-text-muted);
}

.notif-push-btn {
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  border-radius: 10px;
  background: var(--pa-green);
  color: #fff;
  font-weight: 700;
  font-size: 0.82rem;
  font-family: inherit;
  cursor: pointer;
}

.notif-push-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.notif-push-error {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--pa-red, #d64545);
}

.notif-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 0 0 0.5rem;
}

.notif-mark-all {
  border: none;
  background: transparent;
  color: var(--pa-green);
  font-size: 0.78rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0;
}

.notif-mark-all:disabled {
  opacity: 0.5;
  cursor: default;
}

.notif-empty {
  margin: 1.5rem 0;
  text-align: center;
  color: var(--pa-text-muted);
  font-size: 0.88rem;
}

.notif-group {
  margin-bottom: 1.25rem;
}

.notif-group h2 {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--pa-text-muted);
  margin: 0 0 0.65rem;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  width: 100%;
  padding: 0.85rem 0;
  border: none;
  border-bottom: 1px solid var(--pa-border);
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  position: relative;
}

.notif-item:focus-visible {
  outline: 2px solid var(--pa-green);
  outline-offset: 2px;
}

.notif-icon-wrap {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-icon-wrap--bella { background: #ecfdf5; color: var(--pa-green); }
.notif-icon-wrap--checkin { background: #eff6ff; color: #2563eb; }
.notif-icon-wrap--community { background: #fdf4ff; color: #9333ea; }
.notif-icon-wrap--content { background: #fff7ed; color: #ea580c; }
.notif-icon-wrap--general { background: #f3f4f6; color: #4b5563; }

.notif-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.notif-body strong {
  display: block;
  font-size: 0.88rem;
  color: var(--pa-text);
}

.notif-body p {
  margin: 0.15rem 0;
  font-size: 0.82rem;
  color: var(--pa-text-muted);
  line-height: 1.4;
}

.notif-body span {
  font-size: 0.74rem;
  color: #6b7280;
  font-weight: 500;
}

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pa-green);
  flex-shrink: 0;
  margin-top: 0.35rem;
}
</style>
