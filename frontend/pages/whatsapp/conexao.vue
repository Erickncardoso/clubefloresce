<template>
  <NuxtLayout name="dashboard">
    <div class="whatsapp-container animate-fade-in">
      <header class="page-header">
        <div>
          <h1 class="text-gradient">Conexão WhatsApp</h1>
          <p class="subtitle">Conecte seu WhatsApp para automatizar suas mensagens e gerenciar alunos.</p>
        </div>
      </header>
      
      <div class="grid-layout">
        <!-- Card Principal de Status -->
        <div class="card glass-card status-card" :class="statusClass">
          <!-- State: Loading -->
          <div v-if="loading" class="state-content">
            <Loader class="spin icon-xl text-primary" />
            <h3>Analisando Conexão...</h3>
            <p>Estabelecendo comunicação segura com a API do WhatsApp.</p>
          </div>
          
          <!-- State: Connected -->
          <div v-else-if="status === 'connected'" class="state-content slide-up">
            <div class="profile-avatar-wrapper">
               <img v-if="instanceProfilePicUrl" :src="instanceProfilePicUrl" class="profile-avatar" alt="Foto Perfil" />
               <div v-else class="icon-circle success">
                 <CheckCircle class="icon-xl" />
               </div>
               <div class="status-badge online"></div>
            </div>
            
            <h3>{{ instanceData?.profileName || 'WhatsApp Conectado!' }}</h3>
            <p class="phone-number">{{ instanceData?.name || 'Sessão Ativa' }}</p>
            
            <div class="connection-stats">
               <div class="stat-item">
                 <span class="stat-label">Plataforma</span>
                 <span class="stat-value">{{ instanceData?.plataform || 'Desconhecida' }}</span>
               </div>
               <div class="stat-item">
                 <span class="stat-label">Conta Business</span>
                 <span class="stat-value">{{ instanceData?.isBusiness ? 'Sim' : 'Não' }}</span>
               </div>
            </div>

            <div class="actions mt-4">
              <button class="btn btn-outline-danger" @click="disconnectWhatsApp" :disabled="actionLoading">
                <Loader v-if="actionLoading" class="spin icon-small" />
                <LogOut v-else class="icon-small" />
                Desconectar Sessão
              </button>
            </div>
          </div>

          <!-- State: Connecting (QR Code) -->
          <div v-else-if="status === 'connecting'" class="state-content slide-up">
            <div class="icon-circle warning">
              <Scan class="icon-xl" />
            </div>
            <h3>Sincronização Segura</h3>
            <p>1. Abra o WhatsApp no celular<br/>2. Vá em <strong>Aparelhos Conectados</strong><br/>3. Escaneie o código abaixo:</p>
            
            <div class="qr-wrapper">
              <div class="qr-corners top-left"></div>
              <div class="qr-corners top-right"></div>
              <div class="qr-corners bottom-left"></div>
              <div class="qr-corners bottom-right"></div>
              
              <img v-if="qrcode" :src="qrcode" alt="QR Code WhatsApp" class="qr-image" />
              <div v-else class="qr-placeholder">
                <Loader class="spin text-primary" />
                <span>Gerando chave de pareamento...</span>
              </div>
            </div>

            <div class="actions">
              <button class="btn btn-primary" @click="fetchStatus" :disabled="actionLoading">
                <RefreshCw :class="{ 'spin': actionLoading }" class="icon-small" />
                Atualizar QR Code
              </button>
              <button class="btn btn-ghost" @click="disconnectWhatsApp" :disabled="actionLoading">
                Cancelar
              </button>
            </div>
          </div>

          <!-- State: Disconnected -->
          <div v-else class="state-content slide-up">
            <div class="icon-circle muted">
              <Smartphone class="icon-xl" />
            </div>
            <h3>Aparelho Desconectado</h3>
            <p>Seu assistente virtual está inativo. Vincule um aparelho para iniciar as automações.</p>
            
            <div v-if="lastDisconnectReasonLabel" class="disconnect-reason">
              Última queda: {{ lastDisconnectReasonLabel }}
            </div>

            <!-- Campo para Nome da Instância -->
            <div class="mt-4 text-start">
              <label class="form-label">Nome da Instância (Opcional)</label>
              <input v-model="customInstanceName" type="text" class="form-control" placeholder="Ex: minha_instancia">
            </div>

            <div class="actions mt-4" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
              <button class="btn btn-primary btn-lg pulse-btn" @click="connectWhatsApp" :disabled="actionLoading">
                <Loader v-if="actionLoading" class="spin icon-small" />
                <Link2 v-else class="icon-small" />
                Conectar Agora
              </button>
              <button class="btn btn-outline-primary" @click="generateQrCode" :disabled="actionLoading">
                <Loader v-if="actionLoading" class="spin icon-small" />
                <Scan v-else class="icon-small" />
                Gerar QR Code
              </button>
              <button class="btn btn-outline-primary" @click="createInstance" :disabled="actionLoading">
                <Loader v-if="actionLoading" class="spin icon-small" />
                <Plus v-else class="icon-small" />
                Criar Instância
              </button>
            </div>

            <!-- Lista de Instâncias Existentes (Para Limpeza) -->
            <div v-if="allInstances.length > 0" class="mt-5 text-start">
              <h6 class="mb-3 text-muted">Gerenciar Instâncias (UazAPI)</h6>
              <div class="list-group">
                <div v-for="inst in allInstances" :key="inst.name || inst.instanceName" class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{{ inst.name || inst.instanceName }}</strong>
                    <span class="badge ms-2" :class="inst.status === 'connected' ? 'bg-success' : 'bg-secondary'">
                      {{ inst.status }}
                    </span>
                  </div>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteInstance(inst.name || inst.instanceName)" :disabled="actionLoading">
                    <Trash2 class="icon-small" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Painel Lateral: Configurações da Instância -->
        <div class="card glass-card config-panel" v-if="status === 'connected'">
           <h3 class="panel-title"><Settings class="icon-medium"/> Automação (Chatbot)</h3>
           <p class="panel-desc">Gerencie as regras do assistente automático para esta linha.</p>
           
           <div class="form-group mt-4">
              <label class="toggle-switch">
                <input type="checkbox" v-model="formSettings.chatbot_enabled" @change="saveSettings">
                <span class="slider round"></span>
                <span class="toggle-label">Habilitar IA e Fluxos Automáticos</span>
              </label>
           </div>
           
           <div class="form-group">
              <label class="toggle-switch">
                <input type="checkbox" v-model="formSettings.chatbot_ignoreGroups" @change="saveSettings">
                <span class="slider round"></span>
                <span class="toggle-label">Ignorar mensagens em Grupos</span>
              </label>
           </div>

           <div class="form-group config-input">
              <label>Palavra-chave para Pausa</label>
              <input type="text" v-model="formSettings.chatbot_stopConversation" class="form-control" @blur="saveSettings" placeholder="Ex: parar, cancelar, atendente">
              <small>Ao digitar isso, o robô silencia por X minutos.</small>
           </div>

           <div class="form-group config-input">
              <label>Tempo de Pausa Automática (Minutos)</label>
              <input type="number" v-model="formSettings.chatbot_stopMinutes" class="form-control" @blur="saveSettings">
              <small>Silencia o robô automaticamente se você (humano) responder a pessoa.</small>
           </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { 
  CheckCircle, Smartphone, Scan, Loader, RefreshCw, LogOut, Link2, Settings, Plus, Trash2
} from 'lucide-vue-next'
import { resetWhatsappAfterDisconnect } from '~/composables/whatsapp/useWhatsappChats.js'
import { isWhatsappConnectedFromStatusPayload } from '~/composables/whatsapp/useWhatsappApi.js'

const API_BASE = 'http://localhost:3001/api/whatsapp'
const PROXY_BASE = 'http://localhost:3001/api/whatsapp/proxy'
const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

const loading = ref(true)
const actionLoading = ref(false)
const status = ref('disconnected')
const qrcode = ref('')
const manualDisconnectRequested = ref(false)
const qrStickyUntil = ref(0)
// Timestamp até o qual devemos manter polling ativo independente do status.
// Setado por generateQrCode para garantir que detecção de conexão após scan continue.
const awaitingQrScanUntil = ref(0)
const instanceData = ref(null)
const pollInterval = ref(null)
const allInstances = ref([]) // Lista de todas as instâncias
const customInstanceName = ref('') // Nome customizado
const phone = ref('') // Número para pareamento

const formSettings = reactive({
  chatbot_enabled: true,
  chatbot_ignoreGroups: true,
  chatbot_stopConversation: 'parar',
  chatbot_stopMinutes: 60
})

const deleteInstance = async (name) => {
  if (!confirm(`Deseja mesmo DELETAR a instância "${name}"? Isso liberará espaço na sua conta.`)) return
  try {
    actionLoading.value = true
    const res = await fetch(`${API_BASE}/instance/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.success) {
       alert(`✅ Instância "${name}" deletada com sucesso!`)
       fetchStatus()
    } else {
       alert(`❌ Falha ao deletar: ${data.message || 'Erro desconhecido'}`)
    }
  } catch(e) {
    alert(`❌ Erro de conexão: ${e?.message || e}`)
  } finally {
    actionLoading.value = false
  }
}

const statusClass = computed(() => {
  return {
    'is-connected': status.value === 'connected',
    'is-connecting': status.value === 'connecting',
    'is-disconnected': status.value === 'disconnected' || status.value === 'error',
  }
})

/** Foto do perfil: UAZAPI pode enviar em vários campos ou só após o backend enriquecer o /status. */
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
    i.me?.imgUrl
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

  // Ruído comum durante regeneração de QR na UAZAPI; não deve ser exibido como erro real.
  if (normalized.includes('connection attempt canceled by api')) return ''

  if (normalized.includes('logged out')) return 'Sessão encerrada no celular'
  if (normalized.includes('timed out')) return 'Tempo de conexão expirado'
  if (normalized.includes('connection closed')) return 'Conexão encerrada'

  return reason
})

const updateQrCodeIfAvailable = (nextQr) => {
  if (nextQr && typeof nextQr === 'string' && nextQr.trim().length > 0) {
    qrcode.value = nextQr
    // Mantém o QR estável por alguns segundos para evitar flicker entre polls.
    qrStickyUntil.value = Date.now() + 20000
  }
}

const fetchStatus = async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    actionLoading.value = true
    const res = await fetch(`${API_BASE}/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.message || `Falha ao consultar status (${res.status})`)
    }
    
    // Atualiza lista de instâncias
    if (Array.isArray(data.allInstances)) {
      allInstances.value = data.allInstances
    }
    
    const inst = data.instance || null
    instanceData.value = inst

    // Determina o status de conexão
    // A UazAPI retorna status como objeto ou string
    const rawStatus = (
      inst?.status ||
      inst?.instance?.status ||
      inst?.connectionStatus ||
      inst?.instance?.connectionStatus ||
      inst?.state ||
      inst?.instance?.state ||
      data.status?.status ||
      data.status?.connectionStatus ||
      data.status?.state ||
      ''
    )
    const normalizedStatus = String(rawStatus).toLowerCase()

    const isConnected = isWhatsappConnectedFromStatusPayload(data)
    const isQrAlreadyRead = normalizedStatus === 'qrreadsuccess'

    const nextQr = inst?.qrcode || inst?.qr || data.status?.qrcode || ''
    if (isQrAlreadyRead) {
      // QR já foi escaneado: não manter QR antigo visível.
      qrcode.value = ''
    } else {
      updateQrCodeIfAvailable(nextQr)
    }
    const hasQrCached = Boolean(qrcode.value)
    const shouldKeepStickyQr =
      hasQrCached &&
      Date.now() < qrStickyUntil.value &&
      !manualDisconnectRequested.value

    if (isConnected) {
      status.value = 'connected'
      qrcode.value = ''
      manualDisconnectRequested.value = false
      qrStickyUntil.value = 0
      awaitingQrScanUntil.value = 0
    } else if (normalizedStatus === 'connecting' || isQrAlreadyRead) {
      status.value = 'connecting'
    } else if (shouldKeepStickyQr || Date.now() < awaitingQrScanUntil.value) {
      // Mantém "connecting" enquanto: há QR visível OU aguardamos scan recente.
      status.value = 'connecting'
    } else {
      status.value = 'disconnected'
      if (!shouldKeepStickyQr) qrcode.value = ''
    }

    // Configurações do chatbot
    if (inst) {
      formSettings.chatbot_enabled = inst.chatbot_enabled ?? true
      formSettings.chatbot_ignoreGroups = inst.chatbot_ignoreGroups ?? true
      formSettings.chatbot_stopConversation = inst.chatbot_stopConversation || 'parar'
      formSettings.chatbot_stopMinutes = inst.chatbot_stopMinutes || 60
    }
  } catch(e) {
    console.error('fetchStatus error:', e)
    status.value = 'error'
  } finally {
    clearTimeout(timer)
    loading.value = false
    actionLoading.value = false
    handlePolling()
  }
}

const saveSettings = async () => {
  try {
    // Usamos a rota proxy pra atualizar as configurações da instância na UazAPI
    await fetch(`${PROXY_BASE}/instance/settings`, {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         Authorization: `Bearer ${token}` 
       },
       body: JSON.stringify(formSettings)
    });
  } catch(e) {
    console.error("Falha ao salvar config", e);
  }
}

const connectWhatsApp = async () => {
  try {
    actionLoading.value = true
    manualDisconnectRequested.value = false
    const res = await fetch(`${API_BASE}/connect`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        name: customInstanceName.value,
        phone: phone.value 
      })
    })
    const data = await res.json()
    if(!res.ok) throw new Error(data.message || "Falha ao conectar")
    
    if(data.qrcode || data.base64) {
       qrcode.value = data.qrcode || data.base64 || ''
       status.value = 'connecting'
       awaitingQrScanUntil.value = Date.now() + 180_000
    }
    fetchStatus()
  } catch(e) {
    alert(e.message)
  } finally {
    actionLoading.value = false
  }
}

const generateQrCode = async () => {
  try {
    if (status.value === 'connected') {
      alert("Você já está conectado. Para gerar novo QR, desconecte a sessão primeiro.")
      return
    }

    actionLoading.value = true
    manualDisconnectRequested.value = false

    // Força desconexão prévia para garantir que a sessão em cache seja limpa
    // antes de gerar o QR, evitando reconexão automática indesejada.
    await fetch(`${API_BASE}/disconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
    resetWhatsappAfterDisconnect()

    // Pequena pausa para a UAZAPI processar a desconexão
    await new Promise(resolve => setTimeout(resolve, 800))

    const res = await fetch(`${API_BASE}/connect/regenerate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: customInstanceName.value })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Falha ao gerar QR Code")

    const qr = data?.qrcode || data?.base64 || data?.instance?.qrcode || data?.instance?.qr || data?.status?.qrcode || ''
    updateQrCodeIfAvailable(qr)
    status.value = 'connecting'
    // Garante polling ativo por 3 minutos após QR gerado, mesmo sem QR no response
    // ou se poll intermediário retornar "disconnected" antes do scan ser detectado.
    awaitingQrScanUntil.value = Date.now() + 180_000
    if (!qr) {
      alert("Solicitação enviada. Aguarde alguns segundos e clique em Atualizar QR Code.")
    } else {
      alert("QR Code gerado. Escaneie no WhatsApp para reconectar.")
    }
    fetchStatus()
  } catch (e) {
    alert(e.message)
  } finally {
    actionLoading.value = false
  }
}

const createInstance = async () => {
  try {
    actionLoading.value = true
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ name: customInstanceName.value })
    })
    const data = await res.json()
    if(!res.ok) throw new Error(data.message || "Erro ao criar")
    alert("Instância criada com sucesso!")
    fetchStatus()
  } catch(e) {
    alert(e.message)
  } finally {
    actionLoading.value = false
  }
}

const disconnectWhatsApp = async () => {
  if(!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return
  try {
    actionLoading.value = true
    manualDisconnectRequested.value = true
    await fetch(`${API_BASE}/disconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    resetWhatsappAfterDisconnect()
    // Força status desconectado localmente imediatamente
    status.value = 'disconnected'
    qrcode.value = ''
    qrStickyUntil.value = 0
    awaitingQrScanUntil.value = 0
    // Aguarda e busca status real da API para confirmar desconexão
    await new Promise(resolve => setTimeout(resolve, 1000))
    await fetchStatus()
  } catch(e) {
    console.error(e)
    status.value = 'disconnected'
  } finally {
    actionLoading.value = false
    stopPolling()
  }
}

const handlePolling = () => {
  const isAwaitingQrScan = Date.now() < awaitingQrScanUntil.value
  if (status.value === 'connecting' || isAwaitingQrScan) {
    if (!pollInterval.value) {
      // Intervalo mais curto enquanto aguardamos conexão após QR scan
      pollInterval.value = setInterval(fetchStatus, 3000)
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

onMounted(() => {
  if(!token) {
     navigateTo('/')
     return
  }
  fetchStatus()
})

onUnmounted(() => stopPolling())
</script>

<style scoped>
.whatsapp-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.text-gradient {
  background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  font-size: 2.2rem;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #64748b;
  font-size: 1.05rem;
  margin-top: 0.5rem;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

@media (min-width: 900px) {
  .grid-layout {
    grid-template-columns: 1.2fr 1fr;
  }
}

.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.status-card.is-connected {
  box-shadow: 0 20px 40px rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

.profile-avatar-wrapper {
  position: relative;
  margin-bottom: 1rem;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

.status-badge.online {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  background: #22c55e;
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
}

.phone-number {
  color: #64748b;
  font-weight: 500;
  background: #f1f5f9;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.connection-stats {
  display: flex;
  gap: 2rem;
  margin-top: 1.5rem;
  background: #f8fafc;
  padding: 1.2rem;
  border-radius: 16px;
  width: 100%;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
  font-weight: 700;
}

.stat-value {
  font-size: 1rem;
  color: #334155;
  font-weight: 600;
  margin-top: 0.2rem;
}

.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.icon-circle.success { background: #dcfce7; color: #16a34a; }
.icon-circle.warning { background: #e0e7ff; color: #4f46e5; }
.icon-circle.muted { background: #f1f5f9; color: #64748b; }

.icon-xl { width: 36px; height: 36px; }
.icon-medium { width: 22px; height: 22px; vertical-align: middle; margin-right: 8px;}
.icon-small { width: 18px; height: 18px; margin-right: 6px; }

h3 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.qr-wrapper {
  position: relative;
  background: white;
  padding: 1rem;
  border-radius: 20px;
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  margin: 1.5rem 0;
}

.qr-corners {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #6366f1;
}

.top-left { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 12px; }
.top-right { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 12px; }
.bottom-left { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 12px; }
.bottom-right { bottom: -2px; right: -2px; border-left: none; border-top: none; border-bottom-right-radius: 12px; }

.qr-image {
  width: 100%;
  border-radius: 12px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #94a3b8;
  font-weight: 500;
}

.disconnect-reason {
  background: #fef2f2;
  color: #ef4444;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 1rem;
}

/* Painel Lateral */
.panel-title {
  font-size: 1.25rem;
  color: #1e293b;
  margin-bottom: 0.2rem;
}
.panel-desc {
  color: #64748b;
  font-size: 0.9rem;
}

.form-group {
  margin-top: 1.5rem;
}

.config-input label {
  display: block;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
.config-input .form-control {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  transition: all 0.2s;
}
.config-input .form-control:focus {
  outline: none;
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
.config-input small {
  display: block;
  margin-top: 0.4rem;
  color: #94a3b8;
  font-size: 0.8rem;
}

/* Toggle Switch */
.toggle-switch {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.toggle-switch input { display: none; }
.slider {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  background-color: #cbd5e1;
  border-radius: 34px;
  transition: .3s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
}
input:checked + .slider { background-color: #22c55e; }
input:checked + .slider:before { transform: translateX(22px); }
.toggle-label {
  margin-left: 12px;
  font-weight: 600;
  color: #334155;
}

/* Botões */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1.5rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
}
.btn:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-lg { padding: 1rem 2.5rem; font-size: 1.05rem; }

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.btn-outline-danger {
  background: transparent;
  color: #ef4444;
  border: 1.5px solid #fecaca;
}
.btn-outline-danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #ef4444;
}

.btn-ghost {
  background: transparent;
  color: #64748b;
}
.btn-ghost:hover {
  background: #f1f5f9;
  color: #334155;
}

/* Animations */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.pulse-btn { animation: pulse 2s infinite; }
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
</style>
