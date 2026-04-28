<template>
  <NuxtLayout name="dashboard">
    <div class="sender-container animate-fade-in">
      <header class="page-header flex-between">
        <div>
          <h1 class="text-gradient">Disparo em Massa</h1>
          <p class="subtitle">Crie, agende e monitore suas campanhas de WhatsApp sem bloqueios.</p>
        </div>
        <button class="btn btn-primary btn-glow" @click="openNewCampaignModal">
          <Plus class="icon-small" /> Nova Campanha
        </button>
      </header>

      <div class="grid-layout">
        <!-- Lista de Campanhas -->
        <div class="card glass-card campaigns-list">
          <div class="card-header flex-between">
            <h3>HistÃ³rico de Campanhas</h3>
            <button class="btn-icon" @click="loadCampaigns" title="Atualizar">
              <RefreshCw :class="{ 'spin': loadingList }" class="icon-small text-muted" />
            </button>
          </div>

          <div v-if="loadingList" class="loading-state">
            <Loader class="spin icon-large text-primary" />
            <p>Buscando campanhas...</p>
          </div>

          <div v-else-if="campaigns.length === 0" class="empty-state">
             <Send class="icon-xl text-muted mb-2" />
             <p>Nenhuma campanha encontrada.</p>
          </div>

          <div v-else class="campaign-items">
             <div 
               v-for="camp in campaigns" 
               :key="camp.id" 
               class="campaign-card" 
               :class="{ 'active': selectedCampaign?.id === camp.id }"
               @click="selectCampaign(camp)"
             >
                <div class="camp-info">
                  <h4>{{ camp.info || 'Campanha sem nome' }}</h4>
                  <span class="status-badge" :class="camp.status">{{ camp.status }}</span>
                </div>
                <div class="camp-stats text-muted">
                   <small>Total: {{ camp.log_total || 0 }}</small> &bull;
                   <small>Enviados: {{ camp.log_sucess || 0 }}</small>
                </div>
                <div class="progress-bar-mini">
                   <div class="progress-fill" :style="{ width: calculateProgress(camp) + '%' }"></div>
                </div>
             </div>
          </div>
        </div>

        <!-- Detalhes da Campanha Selecionada -->
        <div class="card glass-card campaign-details">
           <div v-if="!selectedCampaign" class="empty-detail-state">
              <MousePointer2 class="icon-xl text-muted mb-2" />
              <h3>Selecione uma campanha</h3>
              <p>Clique em uma campanha na lista ao lado para ver as estatÃ­sticas e os nÃºmeros que receberam a mensagem.</p>
           </div>
           
           <div v-else class="detail-content animate-slide-up">
              <div class="detail-header flex-between">
                 <div>
                   <h2>{{ selectedCampaign.info }}</h2>
                   <p class="text-muted text-sm">Criada em: {{ new Date(selectedCampaign.created).toLocaleString() }}</p>
                 </div>
                 <div class="campaign-actions">
                    <button v-if="selectedCampaign.status === 'scheduled' || selectedCampaign.status === 'queued'" class="btn btn-outline-warning" @click="editCampaign('stop')">Pausar</button>
                    <button v-if="selectedCampaign.status === 'paused'" class="btn btn-outline-success" @click="editCampaign('continue')">Retomar</button>
                    <button class="btn btn-outline-danger" @click="editCampaign('delete')">Excluir</button>
                 </div>
              </div>

              <!-- Big Stats -->
              <div class="stats-grid">
                <div class="stat-box">
                  <span class="stat-title">Entregues</span>
                  <span class="stat-number text-success">{{ selectedCampaign.log_delivered || 0 }}</span>
                </div>
                <div class="stat-box">
                  <span class="stat-title">Lidas</span>
                  <span class="stat-number text-primary">{{ selectedCampaign.log_read || 0 }}</span>
                </div>
                <div class="stat-box">
                  <span class="stat-title">Falhas</span>
                  <span class="stat-number text-danger">{{ selectedCampaign.log_failed || 0 }}</span>
                </div>
              </div>

              <!-- Mensagens da Campanha -->
              <div class="messages-list mt-4">
                 <div class="flex-between mb-2">
                   <h4>Logs de Envio</h4>
                   <button class="btn-icon" @click="loadMessages"><RefreshCw class="icon-small text-muted" :class="{'spin': loadingMessages}"/></button>
                 </div>
                 
                 <div class="table-responsive">
                    <table class="modern-table">
                       <thead>
                          <tr>
                             <th>NÃºmero</th>
                             <th>Status</th>
                             <th>AÃ§Ã£o</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr v-if="loadingMessages">
                             <td colspan="3" class="text-center py-3"><Loader class="spin icon-small"/></td>
                          </tr>
                          <tr v-else-if="messages.length === 0">
                             <td colspan="3" class="text-center py-3 text-muted">Nenhuma mensagem registrada.</td>
                          </tr>
                          <tr v-for="msg in messages" :key="msg.id">
                             <td>{{ msg.chatid?.replace('@s.whatsapp.net', '') }}</td>
                             <td><span class="status-badge" :class="msg.status.toLowerCase()">{{ msg.status }}</span></td>
                             <td>
                               <button class="btn-icon" title="Ver mensagem">
                                 <Eye class="icon-small" />
                               </button>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Modal de Nova Campanha -->
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
         <div class="modal-content glass-card animate-slide-up">
            <div class="modal-header flex-between mb-4">
               <h2>Criar Campanha</h2>
               <button class="btn-icon" @click="showModal = false"><X class="icon-medium" /></button>
            </div>
            
            <form @submit.prevent="submitCampaign">
               <div class="form-group">
                 <label>Nome da Campanha (Interno)</label>
                 <input type="text" v-model="newCamp.info" class="form-control" required placeholder="Ex: PromoÃ§Ã£o Dia das MÃ£es">
               </div>

               <div class="form-row">
                 <div class="form-group">
                   <label>Delay MÃ­nimo (segundos)</label>
                   <input type="number" v-model="newCamp.delayMin" class="form-control" required min="3">
                 </div>
                 <div class="form-group">
                   <label>Delay MÃ¡ximo (segundos)</label>
                   <input type="number" v-model="newCamp.delayMax" class="form-control" required min="5">
                 </div>
               </div>

               <div class="form-group mt-3">
                 <label>Mensagem</label>
                 <textarea v-model="newCamp.text" class="form-control" rows="4" required placeholder="OlÃ¡! Temos uma oferta especial..."></textarea>
               </div>

               <div class="form-group mt-3">
                 <label>Lista de NÃºmeros (Um por linha)</label>
                 <textarea v-model="rawNumbers" class="form-control" rows="4" required placeholder="5511999999999\n5521988888888"></textarea>
                 <small class="text-muted">Apenas nÃºmeros com DDD. Formato internacional limpo.</small>
               </div>

               <div class="modal-footer mt-4 flex-end">
                 <button type="button" class="btn btn-ghost mr-2" @click="showModal = false">Cancelar</button>
                 <button type="submit" class="btn btn-primary" :disabled="creating">
                   <Loader v-if="creating" class="spin icon-small" />
                   <Send v-else class="icon-small" />
                   Iniciar Disparo
                 </button>
               </div>
            </form>
         </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase

import { ref, onMounted } from 'vue'
import { Plus, RefreshCw, Send, MousePointer2, Eye, X, Loader } from 'lucide-vue-next'

const PROXY_BASE = `${whatsappApiBase}/proxy`
const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

const campaigns = ref([])
const loadingList = ref(true)
const selectedCampaign = ref(null)

const messages = ref([])
const loadingMessages = ref(false)

const showModal = ref(false)
const creating = ref(false)
const rawNumbers = ref('')
const newCamp = ref({
  info: '',
  delayMin: 10,
  delayMax: 25,
  text: '',
  type: 'text'
})

const loadCampaigns = async () => {
  try {
    loadingList.value = true
    const res = await fetch(`${PROXY_BASE}/sender/listfolders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    campaigns.value = Array.isArray(data) ? data : []
  } catch(e) {
    console.error("Erro ao carregar campanhas", e)
  } finally {
    loadingList.value = false
  }
}

const selectCampaign = (camp) => {
  selectedCampaign.value = camp
  loadMessages()
}

const loadMessages = async () => {
  if(!selectedCampaign.value) return
  try {
    loadingMessages.value = true
    const res = await fetch(`${PROXY_BASE}/sender/listmessages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ folder_id: selectedCampaign.value.id, limit: 50 })
    })
    const data = await res.json()
    messages.value = data.messages || []
  } catch(e) {
    console.error("Erro ao carregar mensagens", e)
  } finally {
    loadingMessages.value = false
  }
}

const editCampaign = async (action) => {
  if(!confirm(`Tem certeza que deseja aplicar a aÃ§Ã£o: ${action}?`)) return
  try {
    await fetch(`${PROXY_BASE}/sender/edit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ folder_id: selectedCampaign.value.id, action })
    })
    alert('AÃ§Ã£o executada com sucesso!')
    loadCampaigns()
  } catch(e) {
    console.error("Erro", e)
    alert('Falha ao executar aÃ§Ã£o.')
  }
}

const openNewCampaignModal = () => {
  newCamp.value = { info: '', delayMin: 10, delayMax: 25, text: '', type: 'text' }
  rawNumbers.value = ''
  showModal.value = true
}

const submitCampaign = async () => {
  const nums = rawNumbers.value.split('\n').map(n => n.trim()).filter(n => n)
  if(nums.length === 0) {
    alert("Informe ao menos um nÃºmero vÃ¡lido.")
    return
  }

  const payload = {
    ...newCamp.value,
    folder: newCamp.value.info,
    numbers: nums.map(n => n.includes('@s.whatsapp.net') ? n : `${n}@s.whatsapp.net`),
    delayMin: Number(newCamp.value.delayMin),
    delayMax: Number(newCamp.value.delayMax)
  }

  try {
    creating.value = true
    const res = await fetch(`${PROXY_BASE}/sender/simple`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    })
    
    if(res.ok) {
       showModal.value = false
       alert("Campanha agendada com sucesso!")
       loadCampaigns()
    } else {
       const err = await res.json()
       alert(`Erro: ${err.message || 'Falha ao criar'}`)
    }
  } catch(e) {
    console.error("Erro ao criar", e)
    alert("Erro interno.")
  } finally {
    creating.value = false
  }
}

const calculateProgress = (camp) => {
  if(!camp.log_total) return 0
  const done = (camp.log_sucess || 0) + (camp.log_failed || 0)
  return Math.min(100, Math.round((done / camp.log_total) * 100))
}

onMounted(() => {
  if(!token) navigateTo('/')
  else loadCampaigns()
})
</script>

<style scoped>
.sender-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.text-gradient {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  font-size: 2.2rem;
  letter-spacing: -0.5px;
  margin-bottom: 0.2rem;
}

.subtitle {
  color: #64748b;
  font-size: 1.05rem;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.flex-end {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1.2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}
.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}
.btn-glow {
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-icon:hover {
  background: rgba(0,0,0,0.05);
}

.btn-outline-danger { background: transparent; color: #ef4444; border: 1px solid #fecaca; }
.btn-outline-warning { background: transparent; color: #f59e0b; border: 1px solid #fde68a; }
.btn-outline-success { background: transparent; color: #10b981; border: 1px solid #a7f3d0; }
.btn-ghost { background: transparent; color: #64748b; }

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

@media (min-width: 900px) {
  .grid-layout {
    grid-template-columns: 350px 1fr;
  }
}

.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.05);
}

.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.campaign-card {
  padding: 1rem;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.campaign-card:hover {
  background: #f1f5f9;
}
.campaign-card.active {
  background: white;
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

.camp-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.camp-info h4 {
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.status-badge.queued, .status-badge.scheduled { background: #e0e7ff; color: #4f46e5; }
.status-badge.ativo, .status-badge.sending { background: #dcfce7; color: #16a34a; }
.status-badge.paused { background: #fef3c7; color: #d97706; }
.status-badge.done { background: #f1f5f9; color: #64748b; }
.status-badge.failed { background: #fee2e2; color: #ef4444; }
.status-badge.sent { background: #dcfce7; color: #16a34a; }

.progress-bar-mini {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 4px;
  margin-top: 0.5rem;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: #6366f1;
  transition: width 0.3s;
}

.empty-state, .empty-detail-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #94a3b8;
  text-align: center;
}

/* Detail Section */
.detail-header h2 {
  font-size: 1.5rem;
  margin: 0;
  color: #1e293b;
  font-weight: 800;
}
.campaign-actions {
  display: flex;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}
.stat-box {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #f1f5f9;
}
.stat-title {
  font-size: 0.85rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.stat-number {
  font-size: 2rem;
  font-weight: 900;
  margin-top: 0.2rem;
}

/* Table */
.modern-table {
  width: 100%;
  border-collapse: collapse;
}
.modern-table th {
  text-align: left;
  padding: 12px 16px;
  color: #64748b;
  font-weight: 600;
  font-size: 0.85rem;
  border-bottom: 1px solid #e2e8f0;
}
.modern-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
  color: #334155;
  vertical-align: middle;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}
.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.4rem;
}
.form-control {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  transition: all 0.2s;
}
.form-control:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Helpers */
.text-muted { color: #94a3b8; }
.text-success { color: #22c55e; }
.text-danger { color: #ef4444; }
.text-primary { color: #6366f1; }
.icon-xl { width: 48px; height: 48px; }
.icon-medium { width: 22px; height: 22px; }
.icon-small { width: 16px; height: 16px; margin-right: 4px; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1.5rem; }
.py-3 { padding-top: 1rem; padding-bottom: 1rem; }
.mr-2 { margin-right: 0.5rem; }
.spin { animation: spin 1s linear infinite; }

.animate-fade-in { animation: fadeIn 0.4s ease forwards; }
.animate-slide-up { animation: slideUp 0.3s ease forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

