<template>
  <Teleport to="body">
    <button
      v-if="incomingCall"
      type="button"
      class="cf-incoming-call"
      @click="goToCall"
    >
      <span class="cf-incoming-call-pulse" aria-hidden="true" />
      <div class="cf-incoming-call-copy">
        <strong>Chamada de vídeo</strong>
        <span>{{ incomingCall.nutriName || 'Sua nutricionista' }} está te ligando</span>
      </div>
      <span class="cf-incoming-call-cta">Atender</span>
    </button>
  </Teleport>
</template>

<script setup>
const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()
const { patientFetchInit } = usePatientLocalTime()

const incomingCall = ref(null)

const incomingCallPath = computed(() => {
  const call = incomingCall.value
  if (!call?.id) return '/chamada'
  return `/chamada?callId=${encodeURIComponent(call.id)}&room=${encodeURIComponent(call.roomName || '')}`
})

async function refreshIncomingCall() {
  if (String(route.path || '').startsWith('/chamada')) {
    incomingCall.value = null
    return
  }
  try {
    const callData = await $fetch(
      `${config.public.apiBase}/patients/me/video-call`,
      patientFetchInit(),
    )
    // Só ringing = ainda não atendeu. Encerrada some na hora.
    const call = callData?.call
    incomingCall.value = call?.status === 'ringing' ? call : null
  } catch {
    incomingCall.value = null
  }
}

function goToCall() {
  void router.push(incomingCallPath.value)
}

let timer = null

onMounted(() => {
  void refreshIncomingCall()
  timer = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      void refreshIncomingCall()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

watch(() => route.fullPath, () => {
  void refreshIncomingCall()
})
</script>

<style scoped>
.cf-incoming-call {
  position: fixed;
  top: max(0.75rem, env(safe-area-inset-top));
  left: 0.75rem;
  right: 0.75rem;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #2f6b3a, #8b967c);
  color: #fff;
  text-decoration: none;
  box-shadow: 0 12px 32px rgba(47, 107, 58, 0.35);
  border: 0;
  width: calc(100% - 1.5rem);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.cf-incoming-call-pulse {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
  animation: cf-call-pulse 1.4s ease-out infinite;
  flex-shrink: 0;
}

.cf-incoming-call-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.cf-incoming-call-copy strong {
  font-size: 0.92rem;
  font-weight: 800;
}

.cf-incoming-call-copy span {
  font-size: 0.78rem;
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cf-incoming-call-cta {
  flex-shrink: 0;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 0.8rem;
  font-weight: 800;
}

@keyframes cf-call-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.65); }
  70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}
</style>
