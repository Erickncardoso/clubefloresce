<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="pvc-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pvc-title"
    >
      <div class="pvc-shell">
        <header class="pvc-header">
          <div class="pvc-header-copy">
            <h2 id="pvc-title">Consulta por vídeo</h2>
            <p>
              {{ patientName || 'Paciente' }}
              <span v-if="statusHint"> · {{ statusHint }}</span>
            </p>
          </div>
          <div class="pvc-header-actions">
            <button
              v-if="joinUrl"
              type="button"
              class="btn-secondary pvc-btn"
              @click="copyLink"
            >
              {{ copied ? 'Link copiado' : 'Copiar link' }}
            </button>
            <button type="button" class="btn-primary pvc-btn pvc-btn--end" @click="endCall">
              Encerrar
            </button>
          </div>
        </header>

        <div class="pvc-body">
          <div v-if="loading" class="pvc-state">Iniciando chamada…</div>
          <div v-else-if="error" class="pvc-state pvc-state--error">
            <p>{{ error }}</p>
            <button type="button" class="btn-secondary" @click="$emit('close')">Fechar</button>
          </div>
          <PatientsCfVideoCall
            v-else-if="roomUrl"
            ref="callRef"
            :room-url="roomUrl"
            :room-name="roomName"
            :jitsi-domain="jitsiDomain"
            :display-name="nutriDisplayName"
            role="host"
            @error="onCallSoftError"
            @end="endCall"
          />
        </div>

        <p v-if="notifyHint" class="pvc-footer">{{ notifyHint }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { authFetchInit } from '~/composables/useAuthSession.js'
import { preloadJitsiLib } from '~/composables/useJitsiMediaCall.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  patientId: { type: String, required: true },
  patientName: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const apiBase = useApiBase()
const { verifiedUser } = useAuthSession()
const { showToast } = useAppToast()
const loading = ref(false)
const error = ref('')
const joinUrl = ref('')
const callId = ref('')
const roomUrl = ref('')
const roomName = ref('')
const jitsiDomain = ref('meet.nutrisabellajardim.com.br')
const nutriDisplayName = computed(() => {
  const fromSession = String(verifiedUser.value?.name || '').trim()
  return fromSession || 'Nutricionista'
})
const copied = ref(false)
const notifyHint = ref('')
const statusHint = ref('')
const callRef = ref(null)
const ending = ref(false)

function resetState() {
  joinUrl.value = ''
  callId.value = ''
  roomUrl.value = ''
  roomName.value = ''
  jitsiDomain.value = 'meet.nutrisabellajardim.com.br'
  error.value = ''
  notifyHint.value = ''
  statusHint.value = ''
  ending.value = false
}

async function startCall() {
  loading.value = true
  resetState()
  statusHint.value = 'conectando'
  copied.value = false

  try {
    const data = await $fetch(`${apiBase.value}/patients/${props.patientId}/video-call`, authFetchInit({
      method: 'POST',
      body: { notifyWhatsapp: false },
    }))
    const call = data?.call
    if (!call?.roomUrl || !call?.id) {
      throw new Error('Resposta inválida ao criar a chamada.')
    }
    callId.value = call.id
    roomUrl.value = call.roomUrl
    roomName.value = call.roomName || ''
    jitsiDomain.value = call.jitsiDomain || 'meet.nutrisabellajardim.com.br'
    joinUrl.value = call.openAppUrl || call.joinUrl || ''
    statusHint.value = 'ao vivo'
    notifyHint.value = 'Notificação enviada. Aguardando o paciente atender no app.'
    showToast({
      type: 'success',
      title: 'Chamada iniciada',
      message: `Notificação enviada para ${props.patientName || 'o paciente'}`,
      duration: 4000,
    })
    void preloadJitsiLib(jitsiDomain.value).catch(() => {})
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Não foi possível iniciar a chamada.'
    statusHint.value = ''
    showToast({
      type: 'error',
      title: 'Falha na chamada',
      message: error.value,
      duration: 5000,
    })
  } finally {
    loading.value = false
  }
}

function onCallSoftError(message) {
  // Mantém a UI customizada visível; só atualiza o status
  statusHint.value = message ? 'com aviso' : 'ao vivo'
  notifyHint.value = message
    ? `${message} A chamada continua aberta para o paciente.`
    : 'Chamada aberta. Peça para o paciente tocar em Atender no app.'
}

async function endCall() {
  if (ending.value) return
  ending.value = true
  const id = callId.value
  const patient = props.patientId
  callId.value = ''
  try {
    await callRef.value?.leaveLocally?.()
  } catch {
    // ignore
  }
  roomUrl.value = ''
  roomName.value = ''
  if (id && patient) {
    try {
      await $fetch(
        `${apiBase.value}/patients/${patient}/video-call/${id}/end`,
        authFetchInit({ method: 'POST' }),
      )
    } catch {
      // fecha mesmo se o fim falhar
    }
  }
  ending.value = false
  emit('close')
}

async function copyLink() {
  if (!joinUrl.value || typeof navigator === 'undefined') return
  try {
    await navigator.clipboard.writeText(joinUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // ignore
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) startCall()
    else if (callId.value) void endCall()
    else resetState()
  },
)
</script>

<style scoped>
.pvc-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: rgba(0, 0, 0, 0.92);
  padding: 0;
}

.pvc-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
}

.pvc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 1rem;
  background: #000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.pvc-header-copy h2 {
  margin: 0;
  color: #e8eaed;
  font-size: 1rem;
  font-weight: 500;
}

.pvc-header-copy p {
  margin: 0.1rem 0 0;
  color: #9aa0a6;
  font-size: 0.8rem;
}

.pvc-header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.pvc-btn {
  min-height: 2.2rem !important;
  padding: 0.35rem 0.8rem !important;
  font-size: 0.84rem !important;
}

.pvc-btn--end {
  background: #ea4335 !important;
  border-color: #ea4335 !important;
}

.pvc-body {
  flex: 1;
  min-height: 0;
  height: 0;
  position: relative;
  background: #000;
}

.pvc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  height: 100%;
  color: #e8eaed;
  padding: 1.5rem;
  text-align: center;
}

.pvc-state--error {
  color: #f28b82;
}

.pvc-footer {
  margin: 0;
  padding: 0.5rem 1rem;
  color: #9aa0a6;
  font-size: 0.78rem;
  background: #202124;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .pvc-overlay {
    padding: 0;
  }

  .pvc-shell {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .pvc-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
