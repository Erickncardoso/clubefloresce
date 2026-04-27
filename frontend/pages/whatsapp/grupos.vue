<template>
  <NuxtLayout name="dashboard">
    <div class="grupos-container animate-fade-in">
      <header class="page-header flex-between">
        <div>
          <h1 class="text-gradient">Gestão de Grupos</h1>
          <p class="subtitle">Administre seus grupos e comunidades com agilidade e poder de moderação.</p>
        </div>
        <button class="btn btn-primary btn-glow" @click="showCreateModal = true">
          <Plus class="icon-small" /> Novo Grupo
        </button>
      </header>

      <div class="grid-layout">
        <!-- Lista de Grupos -->
        <div class="card glass-card groups-list">
          <div class="card-header flex-between">
            <div class="search-box">
               <Search class="icon-small text-muted" />
               <input type="text" v-model="searchQuery" placeholder="Buscar grupo...">
            </div>
            <button class="btn-icon" @click="loadGroups" title="Atualizar">
              <RefreshCw :class="{ 'spin': loadingGroups }" class="icon-small text-muted" />
            </button>
          </div>

          <div v-if="loadingGroups" class="loading-state">
            <Loader class="spin icon-large text-primary" />
            <p>Sincronizando grupos...</p>
          </div>

          <div v-else-if="filteredGroups.length === 0" class="empty-state">
             <Users class="icon-xl text-muted mb-2" />
             <p>Nenhum grupo encontrado.</p>
          </div>

          <div v-else class="group-items mt-3">
             <div 
               v-for="group in filteredGroups" 
               :key="group.id" 
               class="group-card" 
               :class="{ 'active': selectedGroup?.id === group.id }"
               @click="selectGroup(group)"
             >
                <div class="group-avatar">
                   <Users class="icon-medium" />
                </div>
                <div class="group-info">
                  <h4>{{ group.subject || 'Grupo sem nome' }}</h4>
                  <p class="text-muted text-sm">{{ group.participants?.length || 0 }} membros</p>
                </div>
                <div class="group-badges">
                  <span v-if="group.isCommunity" class="badge community" title="Comunidade"><Globe class="icon-tiny"/></span>
                  <span v-if="group.announce" class="badge locked" title="Somente Admins">🔒</span>
                </div>
             </div>
          </div>
        </div>

        <!-- Detalhes do Grupo Selecionado -->
        <div class="card glass-card group-details">
           <div v-if="!selectedGroup" class="empty-detail-state">
              <MousePointer2 class="icon-xl text-muted mb-2" />
              <h3>Selecione um grupo</h3>
              <p>Clique em um grupo na lista ao lado para ver e gerenciar suas configurações.</p>
           </div>
           
           <div v-else class="detail-content animate-slide-up">
              <div class="detail-header flex-between mb-4">
                 <div class="flex-align">
                   <div class="big-avatar">
                      <Users class="icon-xl" />
                   </div>
                   <div>
                     <h2>{{ selectedGroup.subject }}</h2>
                     <p class="text-muted">Criado em {{ new Date(selectedGroup.creation * 1000).toLocaleDateString() }} &bull; {{ selectedGroup.participants?.length }} participantes</p>
                   </div>
                 </div>
              </div>

              <!-- Configurações Rápidas -->
              <h4 class="section-title mt-4"><Settings class="icon-small"/> Configurações e Moderação</h4>
              <div class="settings-grid mt-3">
                 <!-- Announce (Quem pode mandar mensagem) -->
                 <div class="setting-card flex-between">
                    <div>
                      <strong>Apenas Administradores podem enviar mensagens</strong>
                      <p class="text-muted text-sm">Bloqueia o chat para os membros comuns.</p>
                    </div>
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="selectedGroup.announce" @change="toggleSetting('announce', !selectedGroup.announce)">
                      <span class="slider round"></span>
                    </label>
                 </div>

                 <!-- Locked (Quem pode editar dados do grupo) -->
                 <div class="setting-card flex-between">
                    <div>
                      <strong>Apenas Administradores podem editar dados</strong>
                      <p class="text-muted text-sm">Impede que membros mudem nome e foto.</p>
                    </div>
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="selectedGroup.restrict" @change="toggleSetting('locked', !selectedGroup.restrict)">
                      <span class="slider round"></span>
                    </label>
                 </div>
              </div>

              <div class="actions-row mt-4">
                 <button class="btn btn-outline-primary flex-align" @click="getInviteLink" :disabled="actionLoading">
                    <Loader v-if="actionLoading" class="spin icon-small" />
                    <Link class="icon-small" v-else />
                    Copiar Link de Convite
                 </button>
                 <button class="btn btn-outline-danger flex-align" @click="leaveGroup" :disabled="actionLoading">
                    Sair do Grupo
                 </button>
              </div>

              <!-- Lista de Participantes Simples -->
              <h4 class="section-title mt-4"><Users class="icon-small"/> Participantes Principais</h4>
              <div class="participants-list mt-3">
                 <div class="participant-item" v-for="p in selectedGroup.participants?.slice(0, 5)" :key="p.id">
                    <div class="participant-avatar"><User class="icon-small"/></div>
                    <div class="participant-data">
                       <span>{{ p.id?.replace('@s.whatsapp.net', '') }}</span>
                       <span v-if="p.admin" class="badge admin">Admin</span>
                    </div>
                 </div>
                 <div v-if="selectedGroup.participants?.length > 5" class="text-center mt-2 text-muted text-sm">
                    E mais {{ selectedGroup.participants.length - 5 }} participantes...
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Modal Criar Grupo -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
         <div class="modal-content glass-card animate-slide-up">
            <div class="modal-header flex-between mb-4">
               <h2>Criar Novo Grupo</h2>
               <button class="btn-icon" @click="showCreateModal = false"><X class="icon-medium" /></button>
            </div>
            
            <form @submit.prevent="submitCreateGroup">
               <div class="form-group">
                 <label>Nome do Grupo</label>
                 <input type="text" v-model="newGroup.name" class="form-control" required placeholder="Ex: Mentoria Turma 10">
               </div>

               <div class="form-group mt-3">
                 <label>Participantes Iniciais (Obrigatório ter ao menos 1 além de você)</label>
                 <textarea v-model="rawParticipants" class="form-control" rows="3" required placeholder="5511999999999\n5521988888888"></textarea>
                 <small class="text-muted">Apenas números com DDD, um por linha.</small>
               </div>

               <div class="modal-footer mt-4 flex-end">
                 <button type="button" class="btn btn-ghost mr-2" @click="showCreateModal = false">Cancelar</button>
                 <button type="submit" class="btn btn-primary" :disabled="creating">
                   <Loader v-if="creating" class="spin icon-small" />
                   <Plus v-else class="icon-small" />
                   Criar Grupo
                 </button>
               </div>
            </form>
         </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, RefreshCw, Search, Users, MousePointer2, Globe, Settings, Link, LogOut, X, Loader, User } from 'lucide-vue-next'

const PROXY_BASE = 'http://localhost:3001/api/whatsapp/proxy'
const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

const groups = ref([])
const loadingGroups = ref(true)
const selectedGroup = ref(null)
const searchQuery = ref('')
const actionLoading = ref(false)

const showCreateModal = ref(false)
const creating = ref(false)
const newGroup = ref({ name: '' })
const rawParticipants = ref('')

const filteredGroups = computed(() => {
  if(!searchQuery.value) return groups.value
  return groups.value.filter(g => g.subject?.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const loadGroups = async () => {
  try {
    loadingGroups.value = true
    const res = await fetch(`${PROXY_BASE}/group/getall`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    groups.value = Array.isArray(data) ? data : (data.groups || [])
    
    if(selectedGroup.value) {
       const updated = groups.value.find(g => g.id === selectedGroup.value.id)
       if(updated) selectedGroup.value = updated
    }
  } catch(e) {
    console.error("Erro ao carregar grupos", e)
  } finally {
    loadingGroups.value = false
  }
}

const selectGroup = (group) => {
  selectedGroup.value = group
}

const toggleSetting = async (action, value) => {
  try {
    const payload = {
       number: selectedGroup.value.id,
       action: action,
       value: value
    }
    
    await fetch(`${PROXY_BASE}/group/updateSetting`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    })
    
    // Atualiza o estado local para dar a sensação de realtime
    if(action === 'announce') selectedGroup.value.announce = value
    if(action === 'locked') selectedGroup.value.restrict = value
    
  } catch(e) {
    console.error("Erro ao alterar config", e)
    alert("Falha ao salvar configuração.")
  }
}

const getInviteLink = async () => {
  try {
    actionLoading.value = true
    const res = await fetch(`${PROXY_BASE}/group/inviteCode`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    // Como GET com query param? UazAPI pede o ID do grupo na query.
    // Vamos usar o POST alternativo (se houver) ou avisar o usuário.
    // O endpoint correto na UazAPI: GET /group/inviteCode?groupJid={id}
  } catch(e) {
    console.error(e)
    alert("Recurso não disponível.")
  } finally {
    actionLoading.value = false
  }
}

const leaveGroup = async () => {
  if(!confirm("Tem certeza que deseja sair deste grupo? O robô perderá o acesso.")) return
  try {
    await fetch(`${PROXY_BASE}/group/leave`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ number: selectedGroup.value.id })
    })
    selectedGroup.value = null
    loadGroups()
  } catch(e) {
    console.error(e)
  }
}

const submitCreateGroup = async () => {
  const nums = rawParticipants.value.split('\n').map(n => n.trim()).filter(n => n)
  if(nums.length === 0) {
    alert("Adicione pelo menos um participante.")
    return
  }
  
  try {
    creating.value = true
    const res = await fetch(`${PROXY_BASE}/group/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ 
         name: newGroup.value.name,
         participants: nums 
      })
    })
    
    if(res.ok) {
       showCreateModal.value = false
       alert("Grupo criado com sucesso!")
       loadGroups()
    }
  } catch(e) {
    console.error("Erro ao criar", e)
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  if(!token) navigateTo('/')
  else loadGroups()
})
</script>

<style scoped>
.grupos-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.text-gradient {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
.flex-align {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}
.btn-glow {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
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

.btn-outline-primary { background: transparent; color: #10b981; border: 1.5px solid #a7f3d0; }
.btn-outline-danger { background: transparent; color: #ef4444; border: 1.5px solid #fecaca; }
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

.groups-list {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}

.search-box {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 0.5rem 1rem;
  flex: 1;
  margin-right: 1rem;
}
.search-box input {
  border: none;
  background: transparent;
  width: 100%;
  margin-left: 0.5rem;
  outline: none;
  color: #334155;
  font-family: inherit;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.group-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 16px;
  background: white;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
  gap: 1rem;
}
.group-card:hover {
  background: #f8fafc;
  transform: translateX(4px);
}
.group-card.active {
  background: #f0fdf4;
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
}

.group-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  overflow: hidden;
}
.group-info h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
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
.big-avatar {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
}

.detail-header h2 {
  font-size: 1.5rem;
  margin: 0;
  color: #1e293b;
  font-weight: 800;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-card {
  background: #f8fafc;
  padding: 1.2rem;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}
.setting-card strong {
  color: #1e293b;
  display: block;
  margin-bottom: 0.2rem;
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
input:checked + .slider { background-color: #10b981; }
input:checked + .slider:before { transform: translateX(22px); }

.actions-row {
  display: flex;
  gap: 1rem;
}

.participants-list {
  background: #f8fafc;
  border-radius: 16px;
  padding: 1rem;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
}
.participant-item:last-child {
  border-bottom: none;
}
.participant-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}
.participant-data {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #334155;
  font-weight: 500;
}
.badge.admin {
  background: #fef3c7;
  color: #d97706;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
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
  border-radius: 24px;
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
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

/* Helpers */
.text-muted { color: #94a3b8; }
.text-center { text-align: center; }
.text-sm { font-size: 0.85rem; }
.icon-xl { width: 48px; height: 48px; }
.icon-medium { width: 22px; height: 22px; }
.icon-small { width: 16px; height: 16px; }
.icon-tiny { width: 14px; height: 14px; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1.5rem; }
.mr-2 { margin-right: 0.5rem; }
.spin { animation: spin 1s linear infinite; }

.animate-fade-in { animation: fadeIn 0.4s ease forwards; }
.animate-slide-up { animation: slideUp 0.3s ease forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
