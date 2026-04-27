<template>
  <NuxtLayout name="dashboard">
    <div class="crm-container animate-fade-in">
      <header class="page-header flex-between">
        <div>
          <h1 class="text-gradient">CRM e Contatos</h1>
          <p class="subtitle">Gerencie seus leads, etiquetas e campos personalizados integrados ao WhatsApp.</p>
        </div>
      </header>

      <div class="grid-layout mt-4">
        <!-- Lista de Contatos -->
        <div class="card glass-card contacts-list">
          <div class="card-header flex-between mb-3">
             <div class="search-box">
                <Search class="icon-small text-muted" />
                <input type="text" v-model="searchQuery" placeholder="Buscar por número ou nome..." @keyup.enter="loadContacts(true)">
             </div>
             <button class="btn-icon ml-2" @click="loadContacts(true)" title="Pesquisar">
               <RefreshCw :class="{ 'spin': loadingList }" class="icon-small text-muted" />
             </button>
          </div>

          <div v-if="loadingList && contacts.length === 0" class="loading-state">
            <Loader class="spin icon-large text-primary" />
            <p>Buscando contatos...</p>
          </div>

          <div v-else-if="contacts.length === 0" class="empty-state">
             <Users class="icon-xl text-muted mb-2" />
             <p>Nenhum contato encontrado.</p>
          </div>

          <div v-else class="contacts-scroll" @scroll="handleScroll">
             <div 
               v-for="contact in contacts" 
               :key="contact.id" 
               class="contact-card" 
               :class="{ 'active': selectedContact?.id === contact.id }"
               @click="selectContact(contact)"
             >
                <div class="contact-avatar">
                   <User class="icon-medium" />
                </div>
                <div class="contact-info">
                  <h4>{{ contact.pushName || contact.name || contact.number || 'Desconhecido' }}</h4>
                  <p class="text-muted text-sm">{{ contact.id?.replace('@s.whatsapp.net', '') }}</p>
                </div>
                <!-- Exibir se for bloqueado, por exemplo, se tivesse na lista, mas como é via api separada não temos agora. -->
             </div>
             <div v-if="loadingList" class="text-center py-2 text-muted text-sm">Carregando mais...</div>
          </div>
        </div>

        <!-- Detalhes do Lead (CRM) -->
        <div class="card glass-card crm-details">
           <div v-if="!selectedContact" class="empty-detail-state">
              <UserCircle class="icon-xl text-muted mb-2" />
              <h3>Selecione um contato</h3>
              <p>Clique em um contato na lista para enriquecer os dados e gerenciar o relacionamento.</p>
           </div>
           
           <div v-else class="detail-content animate-slide-up">
              <div class="detail-header flex-between mb-4">
                 <div class="flex-align">
                   <div class="big-avatar">
                      <User class="icon-xl" />
                   </div>
                   <div>
                     <h2>{{ selectedContact.pushName || selectedContact.name || 'Contato' }}</h2>
                     <p class="text-muted font-mono">{{ selectedContact.id?.replace('@s.whatsapp.net', '') }}</p>
                   </div>
                 </div>
                 <div class="actions">
                    <button class="btn btn-outline-warning btn-sm mr-2" @click="toggleBlock(true)">Bloquear</button>
                    <!-- <button class="btn btn-outline-danger btn-sm">Limpar Chat</button> -->
                 </div>
              </div>

              <!-- Formulário de Enriquecimento (CRM) -->
              <h4 class="section-title mt-4"><Database class="icon-small"/> Dados do Lead (CRM)</h4>
              <form @submit.prevent="saveLeadData" class="crm-form mt-3">
                 <div class="form-row">
                    <div class="form-group flex-1">
                      <label>Nome CRM (Sobrescreve o do zap)</label>
                      <input type="text" v-model="leadForm.name" class="form-control" placeholder="Nome completo">
                    </div>
                    <div class="form-group flex-1">
                      <label>Etiquetas (IDs separados por vírgula)</label>
                      <input type="text" v-model="leadForm.labels" class="form-control" placeholder="Ex: 10,20">
                    </div>
                 </div>

                 <div class="form-group mt-3">
                   <label>Campos Personalizados (Custom Fields)</label>
                   <div v-for="(field, index) in leadForm.customFields" :key="index" class="custom-field-row mb-2">
                      <input type="text" v-model="field.key" class="form-control flex-1" placeholder="Nome do Campo (ex: email)">
                      <input type="text" v-model="field.value" class="form-control flex-2" placeholder="Valor (ex: joao@gmail.com)">
                      <button type="button" class="btn-icon text-danger" @click="removeField(index)"><Trash2 class="icon-small"/></button>
                   </div>
                   <button type="button" class="btn btn-ghost btn-sm mt-2" @click="addField">
                     <Plus class="icon-small" /> Adicionar Campo
                   </button>
                 </div>

                 <div class="form-group mt-3">
                   <label>Observações do Atendente</label>
                   <textarea v-model="leadForm.notes" class="form-control" rows="3" placeholder="Cliente entrou em contato sobre..."></textarea>
                 </div>

                 <div class="flex-end mt-4">
                    <button type="submit" class="btn btn-primary" :disabled="saving">
                       <Loader v-if="saving" class="spin icon-small" />
                       <Save v-else class="icon-small" />
                       Salvar Dados do CRM
                    </button>
                 </div>
              </form>
           </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search, RefreshCw, Users, User, UserCircle, Database, Plus, Trash2, Save, Loader } from 'lucide-vue-next'

const PROXY_BASE = 'http://localhost:3001/api/whatsapp/proxy'
const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

const contacts = ref([])
const loadingList = ref(false)
const searchQuery = ref('')
const page = ref(1)
const hasMore = ref(true)

const selectedContact = ref(null)
const saving = ref(false)

const leadForm = ref({
  name: '',
  labels: '',
  notes: '',
  customFields: []
})

const loadContacts = async (reset = false) => {
  if(loadingList.value) return
  if(reset) {
     page.value = 1
     contacts.value = []
     hasMore.value = true
  }
  if(!hasMore.value) return

  try {
    loadingList.value = true
    const res = await fetch(`${PROXY_BASE}/contacts/list`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
         page: page.value,
         limit: 50,
         where: searchQuery.value ? { pushName: { contains: searchQuery.value } } : undefined
      })
    })
    
    const data = await res.json()
    if(data.contacts && data.contacts.length > 0) {
       contacts.value = [...contacts.value, ...data.contacts]
       page.value++
    } else {
       hasMore.value = false
    }
  } catch(e) {
    console.error("Erro ao carregar contatos", e)
  } finally {
    loadingList.value = false
  }
}

const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target
  if(scrollTop + clientHeight >= scrollHeight - 10) {
    loadContacts()
  }
}

const selectContact = (contact) => {
  selectedContact.value = contact
  leadForm.value = {
     name: contact.name || '',
     labels: '', // Ideal seria carregar as labels deste contato
     notes: contact.notes || '',
     customFields: contact.customFields ? Object.entries(contact.customFields).map(([k,v]) => ({key: k, value: v})) : []
  }
}

const addField = () => {
  leadForm.value.customFields.push({ key: '', value: '' })
}

const removeField = (index) => {
  leadForm.value.customFields.splice(index, 1)
}

const saveLeadData = async () => {
  try {
    saving.value = true
    
    // Parse Custom Fields array to object
    const customFieldsObj = {}
    leadForm.value.customFields.forEach(f => {
       if(f.key && f.value) customFieldsObj[f.key] = f.value
    })

    const payload = {
       number: selectedContact.value.id.replace('@s.whatsapp.net', ''),
       name: leadForm.value.name,
       notes: leadForm.value.notes,
       customFields: customFieldsObj
    }

    const res = await fetch(`${PROXY_BASE}/chat/editChatLead`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    })
    
    if(res.ok) {
       // Se o user preencheu labels, vamos enviar tbm
       if(leadForm.value.labels) {
          const labelsArr = leadForm.value.labels.split(',').map(l => l.trim()).filter(l => l)
          if(labelsArr.length > 0) {
             await fetch(`${PROXY_BASE}/chat/labels`, {
               method: 'POST',
               headers: { 
                 'Content-Type': 'application/json',
                 Authorization: `Bearer ${token}` 
               },
               body: JSON.stringify({ number: payload.number, labelids: labelsArr })
             })
          }
       }
       alert("Dados do CRM atualizados com sucesso!")
    } else {
       alert("Erro ao salvar dados.")
    }
  } catch(e) {
    console.error("Erro", e)
    alert("Falha na requisição.")
  } finally {
    saving.value = false
  }
}

const toggleBlock = async (block) => {
  if(!selectedContact.value) return
  const num = selectedContact.value.id.replace('@s.whatsapp.net', '')
  if(!confirm(`Deseja realmente ${block ? 'bloquear' : 'desbloquear'} este contato?`)) return
  
  try {
    await fetch(`${PROXY_BASE}/chat/block`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ number: num, block })
    })
    alert(`Contato ${block ? 'bloqueado' : 'desbloqueado'} com sucesso.`)
  } catch(e) {
    console.error(e)
  }
}

onMounted(() => {
  if(!token) navigateTo('/')
  else loadContacts(true)
})
</script>

<style scoped>
.crm-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.text-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  font-size: 2.2rem;
  letter-spacing: -0.5px;
  margin-bottom: 0.2rem;
}

.subtitle { color: #64748b; font-size: 1.05rem; }

.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-align { display: flex; align-items: center; gap: 1rem; }
.flex-end { display: flex; justify-content: flex-end; align-items: center; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.7rem 1.2rem; border-radius: 12px; font-weight: 600;
  font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; border: none;
}
.btn-sm { padding: 0.5rem 0.8rem; font-size: 0.8rem; border-radius: 8px; }

.btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px); box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
}

.btn-icon {
  background: transparent; border: none; cursor: pointer; padding: 8px;
  border-radius: 8px; transition: background 0.2s; display: inline-flex;
  align-items: center; justify-content: center;
}
.btn-icon:hover { background: rgba(0,0,0,0.05); }

.btn-outline-warning { background: transparent; color: #d97706; border: 1.5px solid #fde68a; }
.btn-ghost { background: transparent; color: #64748b; }

.grid-layout {
  display: grid; grid-template-columns: 1fr; gap: 1.5rem;
}
@media (min-width: 900px) {
  .grid-layout { grid-template-columns: 350px 1fr; }
}

.card {
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px);
  border-radius: 20px; padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.05);
}

.contacts-list { display: flex; flex-direction: column; max-height: calc(100vh - 200px); }

.search-box {
  display: flex; align-items: center; background: #f1f5f9; border-radius: 12px; padding: 0.5rem 1rem; flex: 1;
}
.search-box input {
  border: none; background: transparent; width: 100%; margin-left: 0.5rem; outline: none; color: #334155; font-family: inherit;
}
.ml-2 { margin-left: 0.5rem; }

.contacts-scroll { display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; padding-right: 0.5rem; flex: 1; }

.contact-card {
  display: flex; align-items: center; padding: 1rem; border-radius: 16px;
  background: white; border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s; gap: 1rem;
}
.contact-card:hover { background: #f8fafc; transform: translateX(4px); }
.contact-card.active {
  background: #fffbeb; border-color: #f59e0b; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
}

.contact-avatar {
  width: 44px; height: 44px; border-radius: 12px; background: #e2e8f0;
  display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0;
}

.contact-info { flex: 1; overflow: hidden; }
.contact-info h4 {
  margin: 0; font-size: 0.95rem; color: #1e293b; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.font-mono { font-family: monospace; }

.empty-state, .empty-detail-state, .loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 200px; color: #94a3b8; text-align: center;
}

/* CRM Form */
.big-avatar {
  width: 72px; height: 72px; border-radius: 20px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex; align-items: center; justify-content: center; color: white;
  box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2);
}

.detail-header h2 { font-size: 1.5rem; margin: 0; color: #1e293b; font-weight: 800; }

.section-title { font-size: 1.1rem; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }

.crm-form { background: #f8fafc; padding: 1.5rem; border-radius: 16px; border: 1px solid #f1f5f9; }

.form-row { display: flex; gap: 1rem; }
.flex-1 { flex: 1; } .flex-2 { flex: 2; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; }
.form-control {
  width: 100%; padding: 0.8rem 1rem; border: 1px solid #cbd5e1;
  border-radius: 10px; font-family: inherit; transition: all 0.2s; background: white;
}
.form-control:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1); }

.custom-field-row { display: flex; gap: 0.5rem; align-items: center; }

/* Helpers */
.text-muted { color: #94a3b8; } .text-danger { color: #ef4444; } .text-primary { color: #f59e0b; }
.text-center { text-align: center; } .text-sm { font-size: 0.85rem; }
.icon-xl { width: 48px; height: 48px; } .icon-medium { width: 22px; height: 22px; } .icon-small { width: 16px; height: 16px; }
.mt-2 { margin-top: 0.5rem; } .mt-3 { margin-top: 1rem; } .mt-4 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; } .mb-3 { margin-bottom: 1rem; } .mb-4 { margin-bottom: 1.5rem; }
.mr-2 { margin-right: 0.5rem; } .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.spin { animation: spin 1s linear infinite; }

.animate-fade-in { animation: fadeIn 0.4s ease forwards; }
.animate-slide-up { animation: slideUp 0.3s ease forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
