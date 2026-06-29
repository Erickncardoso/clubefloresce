<template>
  <NuxtLayout name="dashboard">
    <div class="wa-page admin-shell">
      <header class="admin-shell-header wa-header">
        <div class="wa-header-copy">
          <div class="wa-title-row">
            <span class="wa-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            </span>
            <h1>Conexão WhatsApp</h1>
          </div>
          <p>Conecte seu número para atender alunas, enviar check-ins e usar o chat integrado.</p>
        </div>
        <span class="wa-status-pill" :class="`wa-status-pill--${statusPillTone}`">
          <span class="wa-status-dot" aria-hidden="true" />
          {{ statusLabel }}
        </span>
      </header>

      <div class="wa-grid">
        <section class="admin-shell-card wa-main">
          <div v-if="loading" class="wa-state">
            <div class="wa-loader" aria-hidden="true" />
            <h2>Verificando conexão</h2>
            <p>Consultando o status da sua sessão WhatsApp…</p>
          </div>

          <div v-else-if="status === 'connected'" class="wa-state wa-state--connected">
            <div class="wa-connected-hero">
              <div class="wa-avatar-wrap">
                <img
                  v-if="instanceProfilePicUrl"
                  :src="instanceProfilePicUrl"
                  class="wa-avatar"
                  alt=""
                >
                <div v-else class="wa-avatar wa-avatar--fallback">
                  <CheckCircle class="wa-icon-lg" />
                </div>
                <span class="wa-avatar-badge" aria-hidden="true" />
              </div>
              <div class="wa-connected-copy">
                <p class="wa-kicker">Sessão ativa</p>
                <h2>{{ instanceData?.profileName || 'WhatsApp conectado' }}</h2>
                <p class="wa-subline">{{ connectedLineLabel }}</p>
              </div>
            </div>

            <div class="wa-stats">
              <div class="wa-stat">
                <span class="wa-stat-label">Plataforma</span>
                <span class="wa-stat-value">{{ instanceData?.plataform || 'WhatsApp' }}</span>
              </div>
              <div class="wa-stat">
                <span class="wa-stat-label">Conta Business</span>
                <span class="wa-stat-value">{{ instanceData?.isBusiness ? 'Sim' : 'Pessoal' }}</span>
              </div>
            </div>

            <div class="wa-actions">
              <div v-if="initialSyncActive" class="wa-sync-alert" role="status">
                <Loader class="wa-spin wa-icon-sm" aria-hidden="true" />
                <div>
                  <strong>Mantenha o celular aberto com o WhatsApp ativo</strong>
                  <p>Aguarde a sincronização das conversas antes de usar o painel com intensidade.</p>
                </div>
              </div>
              <NuxtLink to="/whatsapp/chat" class="btn-primary wa-btn">
                Abrir conversas
              </NuxtLink>
              <button
                type="button"
                class="btn-secondary wa-btn wa-btn--danger"
                :disabled="actionLoading"
                @click="disconnectWhatsApp"
              >
                <Loader v-if="actionLoading" class="wa-spin wa-icon-sm" />
                <LogOut v-else class="wa-icon-sm" />
                Desconectar
              </button>
            </div>
          </div>

          <div v-else-if="connectionPhase === 'pairing'" class="wa-state wa-state--pairing">
            <div class="wa-loader" aria-hidden="true" />
            <div class="wa-state-head">
              <h2>Sincronizando…</h2>
              <p>QR Code escaneado. Estamos vinculando seu WhatsApp e importando conversas.</p>
            </div>
            <p class="wa-pairing-hint">
              <strong>Mantenha o celular aberto com o WhatsApp ativo</strong> até a sincronização terminar.
              Não feche o app no aparelho — isso pausa a importação das conversas.
            </p>
            <div class="wa-actions wa-actions--center">
              <button type="button" class="btn-secondary wa-btn" :disabled="actionLoading" @click="cancelConnection">
                Cancelar
              </button>
            </div>
          </div>

          <div v-else-if="connectionPhase === 'show_qr'" class="wa-state wa-state--qr">
            <div class="wa-state-head">
              <h2>Escaneie o QR Code</h2>
              <p>Use o WhatsApp do celular para concluir a conexão.</p>
            </div>

            <ol class="wa-steps">
              <li><span>1</span> Abra o WhatsApp no celular</li>
              <li><span>2</span> Menu → Aparelhos conectados</li>
              <li><span>3</span> Conectar aparelho → escaneie</li>
            </ol>

            <div class="wa-qr-frame">
              <img v-if="qrcode" :src="qrcode" alt="QR Code para conectar WhatsApp" class="wa-qr-img">
              <div v-else class="wa-qr-loading">
                <Loader class="wa-spin wa-icon-lg" />
                <span>Gerando QR Code…</span>
              </div>
            </div>

            <p v-if="qrRefreshCountdown > 0" class="wa-qr-countdown">
              Novo QR Code em <strong>{{ qrRefreshCountdown }}s</strong>
            </p>

            <div class="wa-actions wa-actions--center">
              <button type="button" class="btn-primary wa-btn" :disabled="actionLoading" @click="refreshQrCodeManual">
                <RefreshCw :class="{ 'wa-spin': actionLoading }" class="wa-icon-sm" />
                Atualizar agora
              </button>
              <button type="button" class="btn-secondary wa-btn" :disabled="actionLoading" @click="cancelConnection">
                Cancelar
              </button>
            </div>
          </div>

          <div v-else class="wa-state wa-state--empty">
            <div class="wa-empty-icon" aria-hidden="true">
              <Smartphone class="wa-icon-xl" />
            </div>
            <h2>Nenhum aparelho conectado</h2>
            <p>O chat e as automações ficam pausados até você vincular seu WhatsApp.</p>

            <div v-if="lastDisconnectReasonLabel" class="wa-alert">
              {{ lastDisconnectReasonLabel }}
            </div>

            <button type="button" class="btn-primary wa-btn wa-btn--wide" :disabled="actionLoading" @click="generateQrCode">
              <Loader v-if="actionLoading" class="wa-spin wa-icon-sm" />
              <Scan v-else class="wa-icon-sm" />
              Gerar QR Code
            </button>
          </div>
        </section>

        <aside v-if="status === 'connected'" class="admin-shell-card wa-side">
          <div class="wa-side-head">
            <Settings class="wa-icon-md" />
            <div>
              <h3>Automação</h3>
              <p>Regras do assistente nesta linha.</p>
            </div>
          </div>

          <label class="wa-toggle">
            <input v-model="formSettings.chatbot_enabled" type="checkbox" @change="saveSettings">
            <span class="wa-toggle-track" aria-hidden="true" />
            <span class="wa-toggle-copy">
              <strong>IA e fluxos automáticos</strong>
              <small>Respostas automáticas da Bella e fluxos configurados.</small>
            </span>
          </label>

          <label class="wa-toggle">
            <input v-model="formSettings.chatbot_ignoreGroups" type="checkbox" @change="saveSettings">
            <span class="wa-toggle-track" aria-hidden="true" />
            <span class="wa-toggle-copy">
              <strong>Ignorar grupos</strong>
              <small>O robô não responde em conversas de grupo.</small>
            </span>
          </label>

          <div class="wa-field">
            <label for="wa-stop-word">Palavra para pausar</label>
            <input
              id="wa-stop-word"
              v-model="formSettings.chatbot_stopConversation"
              type="text"
              class="wa-input"
              placeholder="parar, cancelar, atendente"
              @blur="saveSettings"
            >
            <small>Quando a aluna digitar isso, o robô silencia.</small>
          </div>

          <div class="wa-field">
            <label for="wa-stop-min">Pausa automática (minutos)</label>
            <input
              id="wa-stop-min"
              v-model="formSettings.chatbot_stopMinutes"
              type="number"
              min="1"
              class="wa-input"
              @blur="saveSettings"
            >
            <small>Se você responder manualmente, o robô pausa por esse tempo.</small>
          </div>
        </aside>

        <aside v-else-if="!loading" class="admin-shell-card wa-side wa-side--tips">
          <h3>Como funciona</h3>
          <ul class="wa-tips">
            <li>
              <strong>Notificações no celular</strong>
              <span>Seu aparelho continua recebendo alertas normalmente após conectar.</span>
            </li>
            <li>
              <strong>Seguro</strong>
              <span>Conexão oficial via QR Code, igual ao WhatsApp Web.</span>
            </li>
            <li>
              <strong>Rápido</strong>
              <span>O código expira em cerca de 30 segundos — atualizamos automaticamente se não for escaneado.</span>
            </li>
            <li>
              <strong>Seu número</strong>
              <span>As mensagens saem do seu WhatsApp, não de um número genérico.</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({ ssr: false })

const config = useRuntimeConfig()
const whatsappApiBase = config.public.whatsappApiBase

import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import {
  CheckCircle, Smartphone, Scan, Loader, RefreshCw, LogOut, Settings,
} from 'lucide-vue-next'
import { resetWhatsappAfterDisconnect } from '~/composables/whatsapp/useWhatsappChats.js'
import {
  initialSyncActive,
  beginInitialSyncWatch,
  resumeInitialSyncIfNeeded,
  markWhatsappConnectedNow,
  probeInitialSyncProgress,
} from '~/composables/whatsapp/useWhatsappInitialSync.js'
import { isWhatsappConnectedFromStatusPayload, resolveConnectedSessionJidFromStatus, whatsappHasAuth, whatsappJsonHeaders, whatsappAuthHeaders, whatsappFetchInit } from '~/composables/whatsapp/useWhatsappApi.js'

const API_BASE = `${whatsappApiBase}`
const PROXY_BASE = `${whatsappApiBase}/proxy`

const loading = ref(true)
const actionLoading = ref(false)
const status = ref('disconnected')
const connectionPhase = ref('idle')
const qrcode = ref('')
const manualDisconnectRequested = ref(false)
const awaitingQrScanUntil = ref(0)
const instanceData = ref(null)
const pollInterval = ref(null)
const qrRefreshCountdown = ref(0)

const QR_REFRESH_INTERVAL_SEC = 30
let qrCountdownInterval = null
let qrAutoRefreshInterval = null
let syncProbeInterval = null
const wasConnectedPreviously = ref(false)

const formSettings = reactive({
  chatbot_enabled: false,
  chatbot_ignoreGroups: true,
  chatbot_stopConversation: 'parar',
  chatbot_stopMinutes: 60,
})

const statusLabel = computed(() => {
  if (loading.value) return 'Verificando'
  if (connectionPhase.value === 'connected' || status.value === 'connected') return 'Conectado'
  if (connectionPhase.value === 'pairing') return 'Conectando'
  if (connectionPhase.value === 'show_qr') return 'Aguardando scan'
  if (status.value === 'error') return 'Erro'
  return 'Desconectado'
})

const statusPillTone = computed(() => {
  if (connectionPhase.value === 'connected' || status.value === 'connected') return 'connected'
  if (connectionPhase.value === 'pairing' || connectionPhase.value === 'show_qr') return 'connecting'
  if (status.value === 'error') return 'error'
  return 'disconnected'
})

function formatPhoneLine(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return digits.startsWith('55') ? `+${digits}` : digits
}

function pickConnectedLineLabel(instance) {
  if (!instance) return 'Sessão ativa'
  const profileName = String(instance.profileName || instance.profile?.name || '').trim()
  const jid = String(
    instance.jid ||
    instance.phone ||
    instance.owner ||
    instance.ownerJid ||
    instance.userId ||
    '',
  ).trim()
  const phoneLine = formatPhoneLine(jid.replace(/@.+$/, ''))
  if (profileName && phoneLine && profileName !== phoneLine) return phoneLine
  if (phoneLine) return phoneLine
  if (profileName) return profileName
  return 'Sessão ativa'
}

const connectedLineLabel = computed(() => pickConnectedLineLabel(instanceData.value))

function extractQrFromPayload(data) {
  if (!data || typeof data !== 'object') return ''
  const candidates = [
    data.qrcode,
    data.qr,
    data.base64,
    data.instance?.qrcode,
    data.instance?.qr,
    data.status?.qrcode,
  ]
  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? candidate.trim() : ''
    if (value) return value
  }
  return ''
}

const instanceProfilePicUrl = computed(() => {
  const i = instanceData.value
  if (!i) return ''
  const candidates = [
    i.profilePicUrl,
    i.profilePictureUrl,
    i.image,
    i.imagePreview,
    i.instance?.profilePicUrl,
    i.instance?.profilePictureUrl,
    i.me?.profilePictureUrl,
    i.me?.imgUrl,
  ]
  for (const c of candidates) {
    if (typeof c !== 'string') continue
    const s = c.trim()
    if (!s) continue
    if (/^https?:\/\//i.test(s) || s.startsWith('data:image')) return s
  }
  return ''
})

const lastDisconnectReasonLabel = computed(() => {
  const reason = instanceData.value?.lastDisconnectReason
  if (!reason || typeof reason !== 'string') return ''

  const normalized = reason.toLowerCase().trim()
  if (normalized.includes('connection attempt canceled by api')) return ''
  if (normalized.includes('logged out')) return 'Última sessão encerrada no celular.'
  if (normalized.includes('timed out')) return 'O tempo para escanear o QR expirou.'
  if (normalized.includes('connection closed')) return 'A conexão foi encerrada.'

  return reason
})

const updateQrCodeIfAvailable = (nextQr) => {
  if (nextQr && typeof nextQr === 'string' && nextQr.trim().length > 0) {
    qrcode.value = nextQr
  }
}

function stopQrRefreshTimers() {
  if (qrCountdownInterval) {
    clearInterval(qrCountdownInterval)
    qrCountdownInterval = null
  }
  if (qrAutoRefreshInterval) {
    clearInterval(qrAutoRefreshInterval)
    qrAutoRefreshInterval = null
  }
  qrRefreshCountdown.value = 0
}

function resetQrRefreshCountdown() {
  qrRefreshCountdown.value = QR_REFRESH_INTERVAL_SEC
}

function startQrRefreshTimers() {
  if (connectionPhase.value !== 'show_qr') return
  if (qrCountdownInterval && qrAutoRefreshInterval) return

  stopQrRefreshTimers()
  resetQrRefreshCountdown()

  qrCountdownInterval = setInterval(() => {
    if (connectionPhase.value !== 'show_qr') {
      stopQrRefreshTimers()
      return
    }
    if (qrRefreshCountdown.value > 0) {
      qrRefreshCountdown.value -= 1
    }
  }, 1000)

  qrAutoRefreshInterval = setInterval(() => {
    if (connectionPhase.value === 'show_qr') {
      void refreshQrCodeAuto()
    }
  }, QR_REFRESH_INTERVAL_SEC * 1000)
}

function applyConnectionState({
  isConnected,
  normalizedStatus,
  isQrAlreadyRead,
  hasQr,
}) {
  if (isConnected) {
    connectionPhase.value = 'connected'
    status.value = 'connected'
    qrcode.value = ''
    manualDisconnectRequested.value = false
    awaitingQrScanUntil.value = 0
    stopQrRefreshTimers()
    return
  }

  if (isQrAlreadyRead || normalizedStatus === 'qrreadsuccess') {
    connectionPhase.value = 'pairing'
    status.value = 'connecting'
    qrcode.value = ''
    stopQrRefreshTimers()
    markWhatsappConnectedNow({ force: true })
    beginInitialSyncWatch({ force: true })
    return
  }

  const awaitingScan =
    normalizedStatus === 'connecting' ||
    hasQr ||
    Date.now() < awaitingQrScanUntil.value

  if (awaitingScan && !manualDisconnectRequested.value) {
    connectionPhase.value = 'show_qr'
    status.value = 'connecting'
    startQrRefreshTimers()
    return
  }

  connectionPhase.value = 'idle'
  status.value = 'disconnected'
  qrcode.value = ''
  awaitingQrScanUntil.value = 0
  stopQrRefreshTimers()
}

const fetchStatus = async ({ silent = false } = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    if (!silent) actionLoading.value = true
    const res = await fetch(`${API_BASE}/status`, {
      headers: whatsappAuthHeaders(),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.message || `Falha ao consultar status (${res.status})`)
    }

    const inst = data.instance || null
    instanceData.value = inst

    const resolveStatus = (value) => {
      if (!value) return ''
      if (typeof value === 'object') {
        if (value.connected === true || value.loggedIn === true) return 'connected'
        if (value.connecting === true) return 'connecting'
        return 'disconnected'
      }
      return String(value).toLowerCase()
    }

    const rawStatus = (
      data.connectionStatus ||
      inst?.connectionStatus ||
      inst?.status ||
      inst?.state ||
      data.status?.status ||
      ''
    )
    const normalizedStatus = resolveStatus(rawStatus)

    const isConnected = isWhatsappConnectedFromStatusPayload(data)
    const isQrAlreadyRead = normalizedStatus === 'qrreadsuccess'

    const nextQr = data.qrcode || extractQrFromPayload(data) || extractQrFromPayload(inst)
    if (!isQrAlreadyRead) {
      updateQrCodeIfAvailable(nextQr)
    }

    applyConnectionState({
      isConnected,
      normalizedStatus,
      isQrAlreadyRead,
      hasQr: Boolean(qrcode.value),
    })

    if (isConnected) {
      const sessionJid = resolveConnectedSessionJidFromStatus(data)
      markWhatsappConnectedNow({ sessionJid })
      if (sessionJid && typeof window !== 'undefined') {
        localStorage.setItem('wa_session_jid', sessionJid)
      }
      if (!wasConnectedPreviously.value) {
        beginInitialSyncWatch({ sessionJid, force: true })
        prefetchWhatsappChatsCatalog()
        wasConnectedPreviously.value = true
      }
      if (initialSyncActive.value) startSyncProbe()
    } else {
      wasConnectedPreviously.value = false
      stopSyncProbe()
    }

    if (inst) {
      formSettings.chatbot_enabled = inst.chatbot_enabled ?? false
      formSettings.chatbot_ignoreGroups = inst.chatbot_ignoreGroups ?? true
      formSettings.chatbot_stopConversation = inst.chatbot_stopConversation || 'parar'
      formSettings.chatbot_stopMinutes = inst.chatbot_stopMinutes || 60
    }
  } catch (e) {
    console.error('fetchStatus error:', e)
    status.value = 'error'
    connectionPhase.value = 'idle'
    stopQrRefreshTimers()
  } finally {
    clearTimeout(timer)
    loading.value = false
    if (!silent) actionLoading.value = false
    handlePolling()
  }
}

const saveSettings = async () => {
  try {
    await fetch(`${PROXY_BASE}/instance/settings`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
      body: JSON.stringify(formSettings),
    })
  } catch (e) {
    console.error('Falha ao salvar config', e)
  }
}

const generateQrCode = async () => {
  try {
    if (connectionPhase.value === 'connected' || status.value === 'connected') {
      alert('Você já está conectado. Desconecte a sessão antes de gerar um novo QR.')
      return
    }

    actionLoading.value = true
    manualDisconnectRequested.value = false

    const res = await fetch(`${API_BASE}/connect/regenerate-qr`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Falha ao gerar QR Code')

    if (data.connectionStatus === 'qrreadsuccess') {
      applyConnectionState({
        isConnected: false,
        normalizedStatus: 'qrreadsuccess',
        isQrAlreadyRead: true,
        hasQr: false,
      })
      handlePolling()
      return
    }

    const qr = extractQrFromPayload(data)
    updateQrCodeIfAvailable(qr)
    connectionPhase.value = 'show_qr'
    status.value = 'connecting'
    awaitingQrScanUntil.value = Date.now() + 180_000
    startQrRefreshTimers()

    if (!qr) {
      await fetchStatus()
    } else {
      handlePolling()
    }
  } catch (e) {
    alert(e.message)
  } finally {
    actionLoading.value = false
  }
}

async function refreshQrCodeAuto() {
  if (connectionPhase.value !== 'show_qr') return
  try {
    const res = await fetch(`${API_BASE}/connect/refresh-qr`, {
      method: 'POST',
      headers: whatsappJsonHeaders(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Falha ao atualizar QR Code')

    if (data.connectionStatus === 'qrreadsuccess') {
      applyConnectionState({
        isConnected: false,
        normalizedStatus: 'qrreadsuccess',
        isQrAlreadyRead: true,
        hasQr: false,
      })
      return
    }

    const qr = extractQrFromPayload(data)
    if (qr) {
      qrcode.value = qr
      resetQrRefreshCountdown()
    }
  } catch (e) {
    console.warn('refreshQrCodeAuto:', e)
    resetQrRefreshCountdown()
  }
}

async function refreshQrCodeManual() {
  if (connectionPhase.value !== 'show_qr') return
  try {
    actionLoading.value = true
    await refreshQrCodeAuto()
  } catch (e) {
    alert(e.message || 'Não foi possível atualizar o QR Code.')
  } finally {
    actionLoading.value = false
  }
}

const disconnectWhatsApp = async () => {
  if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
  try {
    actionLoading.value = true
    manualDisconnectRequested.value = true

    const res = await fetch(`${API_BASE}/disconnect`, {
      method: 'POST',
      headers: whatsappAuthHeaders(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Falha ao desconectar')

    resetWhatsappAfterDisconnect()
    status.value = 'disconnected'
    connectionPhase.value = 'idle'
    qrcode.value = ''
    awaitingQrScanUntil.value = 0
    stopQrRefreshTimers()

    await new Promise((resolve) => setTimeout(resolve, 1000))
    await fetchStatus()
  } catch (e) {
    alert(e.message || 'Não foi possível desconectar.')
    status.value = 'disconnected'
  } finally {
    actionLoading.value = false
    stopPolling()
  }
}

const cancelConnection = async () => {
  if (!confirm('Cancelar a conexão e voltar?')) return
  await disconnectWhatsApp()
}

const handlePolling = () => {
  const shouldPoll =
    connectionPhase.value === 'show_qr' ||
    connectionPhase.value === 'pairing' ||
    Date.now() < awaitingQrScanUntil.value

  if (shouldPoll) {
    if (!pollInterval.value) {
      pollInterval.value = setInterval(() => fetchStatus({ silent: true }), 3000)
    }
  } else {
    stopPolling()
  }
}

const stopPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
    pollInterval.value = null
  }
}

const stopSyncProbe = () => {
  if (syncProbeInterval) {
    clearInterval(syncProbeInterval)
    syncProbeInterval = null
  }
}

const startSyncProbe = () => {
  stopSyncProbe()
  if (!initialSyncActive.value) return
  void probeInitialSyncProgress()
  syncProbeInterval = setInterval(() => {
    if (!initialSyncActive.value) {
      stopSyncProbe()
      return
    }
    void probeInitialSyncProgress()
  }, 5000)
}

const prefetchWhatsappChatsCatalog = () => {
  void fetch(`${API_BASE}/chats?cache=1`, whatsappFetchInit()).catch(() => {})
}

onMounted(() => {
  if (!whatsappHasAuth()) {
    navigateTo('/')
    return
  }
  resumeInitialSyncIfNeeded()
  fetchStatus().then(() => {
    if (initialSyncActive.value) startSyncProbe()
  })
})

onUnmounted(() => {
  stopPolling()
  stopQrRefreshTimers()
  stopSyncProbe()
})
</script>

<style scoped>
.wa-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: clip;
  animation: wa-fade-in 0.35s ease-out;
}

.wa-header {
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.wa-header-copy {
  flex: 1 1 220px;
  min-width: 0;
}

.wa-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.35rem;
  min-width: 0;
}

.wa-title-row h1 {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.wa-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 12px;
  background: #e8f5e9;
  color: #128c7e;
  flex-shrink: 0;
}

.wa-brand-mark svg {
  width: 1.25rem;
  height: 1.25rem;
}

.wa-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid var(--admin-border);
  background: #fff;
  color: var(--admin-muted);
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 100%;
}

.wa-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
}

.wa-status-pill--connected {
  border-color: #c8e6c9;
  background: #f1f8f1;
  color: #2e7d32;
}

.wa-status-pill--connected .wa-status-dot {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.wa-status-pill--connecting {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.wa-status-pill--connecting .wa-status-dot {
  background: #f59e0b;
  animation: wa-pulse 1.4s ease-in-out infinite;
}

.wa-status-pill--disconnected,
.wa-status-pill--error {
  border-color: var(--admin-border);
  background: #fafafa;
}

.wa-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
  width: 100%;
  min-width: 0;
}

.wa-main,
.wa-side {
  padding: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.wa-state {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.25rem;
  min-height: 280px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.wa-state-head {
  text-align: center;
}

.wa-state h2 {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--admin-ink);
  letter-spacing: -0.03em;
}

.wa-state p {
  margin: 0;
  color: var(--admin-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

.wa-loader {
  width: 2.5rem;
  height: 2.5rem;
  margin: 2rem auto 0.5rem;
  border-radius: 50%;
  border: 3px solid #eef0eb;
  border-top-color: var(--admin-primary);
  animation: wa-spin 0.8s linear infinite;
}

.wa-connected-hero {
  display: flex;
  align-items: center;
  gap: 1.15rem;
  padding: 1rem;
  border-radius: var(--cf-radius-surface);
  background: linear-gradient(135deg, #f7faf7 0%, #fff 100%);
  border: 1px solid #e8f0e8;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.wa-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.wa-avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.wa-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef0eb;
  color: var(--admin-primary);
}

.wa-avatar-badge {
  position: absolute;
  right: 0.15rem;
  bottom: 0.15rem;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #fff;
}

.wa-connected-copy {
  min-width: 0;
}

.wa-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #2e7d32;
}

.wa-connected-copy h2 {
  text-align: left;
  font-size: 1.2rem;
  overflow-wrap: anywhere;
}

.wa-subline {
  margin: 0.15rem 0 0;
  color: var(--admin-muted);
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}

.wa-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  width: 100%;
}

.wa-stat {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid var(--admin-border);
  min-width: 0;
}

.wa-stat-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #94a3b8;
}

.wa-stat-value {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--admin-ink);
  overflow-wrap: anywhere;
}

.wa-actions {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: auto;
  width: 100%;
}

.wa-sync-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  color: #14532d;
  box-sizing: border-box;
}

.wa-sync-alert strong {
  display: block;
  font-size: 0.92rem;
  line-height: 1.35;
}

.wa-sync-alert p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #166534;
}

.wa-btn {
  min-height: 2.75rem;
  text-decoration: none;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  white-space: normal;
  text-align: center;
}

.wa-actions--center {
  align-items: stretch;
}

.wa-btn--wide {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.wa-btn--danger {
  color: #b91c1c;
  border-color: #fecaca;
}

.wa-btn--danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
}

.wa-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.wa-steps li {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  background: #fafafa;
  border: 1px solid var(--admin-border);
  font-size: 0.86rem;
  color: var(--admin-ink);
  min-width: 0;
  overflow-wrap: anywhere;
}

.wa-steps li span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  background: var(--admin-primary-soft);
  color: var(--admin-primary);
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}

.wa-qr-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 100%;
  max-width: 260px;
  aspect-ratio: 1;
  padding: 0.85rem;
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--admin-border);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.wa-qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.wa-qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--admin-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.wa-qr-countdown {
  margin: 0;
  text-align: center;
  font-size: 0.84rem;
  color: var(--admin-muted);
}

.wa-qr-countdown strong {
  color: var(--admin-ink);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.wa-state--pairing {
  align-items: center;
  text-align: center;
  justify-content: center;
}

.wa-pairing-hint {
  margin: 0;
  max-width: 360px;
  font-size: 0.84rem;
  color: var(--admin-muted);
  line-height: 1.5;
}

.wa-state--empty {
  align-items: center;
  text-align: center;
  justify-content: center;
  padding: 1rem 0.5rem 0.25rem;
}

.wa-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 18px;
  background: #eef0eb;
  color: var(--admin-muted);
}

.wa-alert {
  width: 100%;
  max-width: 420px;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.45;
}

.wa-side-head {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.wa-side-head h3 {
  margin: 0 0 0.15rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--admin-ink);
}

.wa-side-head p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--admin-muted);
}

.wa-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.wa-toggle:last-of-type {
  border-bottom: none;
}

.wa-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.wa-toggle-track {
  position: relative;
  flex-shrink: 0;
  width: 2.5rem;
  height: 1.45rem;
  margin-top: 0.1rem;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 0.2s ease;
}

.wa-toggle-track::after {
  content: '';
  position: absolute;
  top: 0.18rem;
  left: 0.18rem;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.wa-toggle input:checked + .wa-toggle-track {
  background: var(--admin-primary);
}

.wa-toggle input:checked + .wa-toggle-track::after {
  transform: translateX(1.05rem);
}

.wa-toggle-copy {
  min-width: 0;
  flex: 1;
}

.wa-toggle-copy strong {
  display: block;
  font-size: 0.88rem;
  color: var(--admin-ink);
}

.wa-toggle-copy small {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--admin-muted);
}

.wa-field {
  margin-top: 1rem;
}

.wa-field label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--admin-ink);
}

.wa-input {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--cf-radius-control);
  background: #fff;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.wa-input:focus {
  outline: none;
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.08);
}

.wa-field small {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--admin-muted);
}

.wa-side--tips h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--admin-ink);
}

.wa-tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.wa-tips li {
  display: grid;
  gap: 0.15rem;
}

.wa-tips strong {
  font-size: 0.86rem;
  color: var(--admin-ink);
}

.wa-tips span {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--admin-muted);
}

.wa-icon-sm { width: 1rem; height: 1rem; flex-shrink: 0; }
.wa-icon-md { width: 1.15rem; height: 1.15rem; flex-shrink: 0; color: var(--admin-primary); }
.wa-icon-lg { width: 1.5rem; height: 1.5rem; }
.wa-icon-xl { width: 2rem; height: 2rem; }

.wa-spin { animation: wa-spin 0.9s linear infinite; }

@keyframes wa-spin {
  to { transform: rotate(360deg); }
}

@keyframes wa-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes wa-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

@media (min-width: 640px) {
  .wa-actions {
    flex-direction: row;
  }

  .wa-btn {
    width: auto;
    flex: 1 1 auto;
  }

  .wa-btn--wide {
    flex: 1 1 100%;
    max-width: 320px;
  }

  .wa-actions--center {
    justify-content: center;
    align-items: center;
  }

  .wa-actions--center .wa-btn {
    flex: 0 1 auto;
    width: auto;
  }
}

@media (min-width: 1024px) {
  .wa-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  }

  .wa-main,
  .wa-side {
    padding: 1.5rem;
  }

  .wa-header {
    align-items: center;
    flex-wrap: nowrap;
  }
}

@media (max-width: 768px) {
  .wa-page.admin-shell {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .wa-title-row h1 {
    font-size: 1.35rem;
  }

  .wa-main,
  .wa-side {
    padding: 1rem;
  }
}

@media (max-width: 420px) {
  .wa-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .wa-connected-hero {
    flex-direction: column;
    text-align: center;
  }

  .wa-connected-copy h2,
  .wa-kicker {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wa-page,
  .wa-spin,
  .wa-status-pill--connecting .wa-status-dot {
    animation: none;
  }
}
</style>
