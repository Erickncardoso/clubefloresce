<template>
  <NuxtLayout name="dashboard">
    <div class="quick-replies-container animate-fade-in">
      <header class="page-header flex-between">
        <div>
          <h1 class="text-gradient">Respostas RÃ¡pidas</h1>
          <p class="subtitle">Automatize e padronize seu atendimento criando templates de respostas.</p>
        </div>
        <button class="btn btn-primary btn-glow" @click="openModal()">
          <Plus class="icon-small" /> Nova Resposta
        </button>
      </header>

      <div class="card glass-card mt-4">
         <div class="card-header flex-between mb-4">
            <div class="search-box">
               <Search class="icon-small text-muted" />
               <input type="text" v-model="searchQuery" placeholder="Buscar atalho ou texto...">
            </div>
            <button class="btn-icon" @click="loadReplies" title="Atualizar">
               <RefreshCw :class="{ 'spin': loading }" class="icon-small text-muted" />
            </button>
         </div>

         <div v-if="loading" class="loading-state">
            <Loader class="spin icon-large text-primary" />
            <p>Carregando templates...</p>
         </div>

         <div v-else-if="filteredReplies.length === 0" class="empty-state">
            <MessageSquarePlus class="icon-xl text-muted mb-2" />
            <p>Nenhuma resposta rÃ¡pida encontrada.</p>
         </div>

         <div v-else class="replies-grid">
            <div 
               v-for="reply in filteredReplies" 
               :key="reply.id" 
               class="reply-card animate-slide-up"
            >
               <div class="reply-header">
                  <span class="shortcut-badge">/{{ reply.shortCut }}</span>
                  <div class="actions">
                     <button class="btn-icon text-muted" title="Editar" @click="openModal(reply)" v-if="!reply.onWhatsApp">
                        <Edit2 class="icon-small" />
                     </button>
                     <button class="btn-icon text-danger" title="Excluir" @click="deleteReply(reply.id)" v-if="!reply.onWhatsApp">
                        <Trash2 class="icon-small" />
                     </button>
                     <span v-if="reply.onWhatsApp" class="badge whatsapp-origin text-sm" title="Criado via WhatsApp Business">ðŸ“± WAB</span>
                  </div>
               </div>
               
               <div class="reply-content mt-3">
                  <p v-if="reply.type === 'text'" class="text-message">{{ reply.text }}</p>
                  
                  <div v-else class="media-message">
                     <div class="media-icon">
                        <Image v-if="reply.type === 'image'" class="icon-medium" />
                        <Video v-else-if="reply.type === 'video'" class="icon-medium" />
                        <FileText v-else-if="reply.type === 'document'" class="icon-medium" />
                        <Mic v-else-if="['audio', 'ptt', 'myaudio'].includes(reply.type)" class="icon-medium" />
                     </div>
                     <div class="media-info">
                        <strong>MÃ­dia Anexada ({{ reply.type }})</strong>
                        <p class="text-muted text-sm line-clamp-1">{{ reply.text || 'Sem legenda' }}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- Modal Criar/Editar -->
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
         <div class="modal-content glass-card animate-slide-up">
            <div class="modal-header flex-between mb-4">
               <h2>{{ editingReply?.id ? 'Editar Resposta' : 'Nova Resposta RÃ¡pida' }}</h2>
               <button class="btn-icon" @click="showModal = false"><X class="icon-medium" /></button>
            </div>
            
            <form @submit.prevent="submitReply">
               <div class="form-row">
                 <div class="form-group flex-2">
                   <label>Atalho (atalho digitado para chamar)</label>
                   <div class="input-with-prefix">
                      <span class="prefix">/</span>
                      <input type="text" v-model="form.shortCut" class="form-control" required placeholder="saudacao">
                   </div>
                 </div>
                 <div class="form-group flex-1">
                   <label>Tipo</label>
                   <select v-model="form.type" class="form-control">
                      <option value="text">Texto</option>
                      <option value="image">Imagem</option>
                      <option value="document">Documento</option>
                      <option value="video">VÃ­deo</option>
                      <option value="audio">Ãudio</option>
                   </select>
                 </div>
               </div>

               <div v-if="form.type !== 'text'" class="form-group mt-3">
                  <label>URL do Arquivo ou Base64</label>
                  <input type="text" v-model="form.file" class="form-control" placeholder="https://exemplo.com/arquivo.jpg" :required="form.type !== 'text'">
               </div>
               
               <div v-if="form.type === 'document'" class="form-group mt-3">
                  <label>Nome do Arquivo (opcional)</label>
                  <input type="text" v-model="form.docName" class="form-control" placeholder="Tabela_Precos.pdf">
               </div>

               <div class="form-group mt-3">
                 <label>{{ form.type === 'text' ? 'Mensagem' : 'Legenda (opcional)' }}</label>
                 <textarea v-model="form.text" class="form-control" rows="4" :required="form.type === 'text'" placeholder="OlÃ¡! Como posso ajudar hoje?"></textarea>
               </div>

               <div class="modal-footer mt-4 flex-end">
                 <button type="button" class="btn btn-ghost mr-2" @click="showModal = false">Cancelar</button>
                 <button type="submit" class="btn btn-primary" :disabled="saving">
                   <Loader v-if="saving" class="spin icon-small" />
                   <Save v-else class="icon-small" />
                   Salvar Resposta
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

import { ref, computed, onMounted } from 'vue'
import { Plus, RefreshCw, Search, MessageSquarePlus, Edit2, Trash2, X, Loader, Save, Image, Video, FileText, Mic } from 'lucide-vue-next'

const PROXY_BASE = `${whatsappApiBase}/proxy`
const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

const replies = ref([])
const loading = ref(true)
const searchQuery = ref('')

const showModal = ref(false)
const saving = ref(false)
const editingReply = ref(null)

const form = ref({
  shortCut: '',
  type: 'text',
  text: '',
  file: '',
  docName: ''
})

const filteredReplies = computed(() => {
  if(!searchQuery.value) return replies.value
  const q = searchQuery.value.toLowerCase()
  return replies.value.filter(r => 
     r.shortCut?.toLowerCase().includes(q) || 
     r.text?.toLowerCase().includes(q)
  )
})

const loadReplies = async () => {
  try {
    loading.value = true
    const res = await fetch(`${PROXY_BASE}/quickreply/list`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    replies.value = Array.isArray(data) ? data : []
  } catch(e) {
    console.error("Erro ao carregar quick replies", e)
  } finally {
    loading.value = false
  }
}

const openModal = (reply = null) => {
  editingReply.value = reply
  if(reply) {
     form.value = { 
        id: reply.id,
        shortCut: reply.shortCut,
        type: reply.type || 'text',
        text: reply.text || '',
        file: reply.file || '',
        docName: reply.docName || ''
     }
  } else {
     form.value = { shortCut: '', type: 'text', text: '', file: '', docName: '' }
  }
  showModal.value = true
}

const submitReply = async () => {
  try {
    saving.value = true
    const payload = { ...form.value }
    if(!payload.id) delete payload.id // CriaÃ§Ã£o nÃ£o tem ID

    const res = await fetch(`${PROXY_BASE}/quickreply/edit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    })
    
    if(res.ok) {
       showModal.value = false
       alert(`Resposta ${editingReply.value ? 'atualizada' : 'criada'} com sucesso!`)
       loadReplies()
    } else {
       alert("Erro ao salvar resposta.")
    }
  } catch(e) {
    console.error("Erro ao salvar", e)
    alert("Falha na requisiÃ§Ã£o.")
  } finally {
    saving.value = false
  }
}

const deleteReply = async (id) => {
  if(!confirm("Tem certeza que deseja excluir esta resposta rÃ¡pida?")) return
  try {
    await fetch(`${PROXY_BASE}/quickreply/edit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ id, delete: true })
    })
    alert("Resposta excluÃ­da.")
    loadReplies()
  } catch(e) {
    console.error("Erro ao excluir", e)
  }
}

onMounted(() => {
  if(!token) navigateTo('/')
  else loadReplies()
})
</script>

<style scoped>
.quick-replies-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.text-gradient {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
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

.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-end { display: flex; justify-content: flex-end; align-items: center; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.7rem 1.2rem; border-radius: 12px; font-weight: 600;
  font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; border: none;
}
.btn-primary {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: white; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);
}
.btn-primary:hover {
  transform: translateY(-2px); box-shadow: 0 8px 20px rgba(225, 29, 72, 0.4);
}
.btn-glow { box-shadow: 0 0 15px rgba(225, 29, 72, 0.5); }

.btn-icon {
  background: transparent; border: none; cursor: pointer; padding: 8px;
  border-radius: 8px; transition: background 0.2s; display: inline-flex;
  align-items: center; justify-content: center;
}
.btn-icon:hover { background: rgba(0,0,0,0.05); }

.btn-ghost { background: transparent; color: #64748b; }

.card {
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px);
  border-radius: 20px; padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.05);
}

.search-box {
  display: flex; align-items: center; background: #f1f5f9;
  border-radius: 12px; padding: 0.5rem 1rem; width: 300px;
}
.search-box input {
  border: none; background: transparent; width: 100%;
  margin-left: 0.5rem; outline: none; color: #334155; font-family: inherit;
}

.replies-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
}

.reply-card {
  background: white; border: 1px solid #e2e8f0; border-radius: 16px;
  padding: 1.5rem; transition: all 0.3s ease;
}
.reply-card:hover {
  transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06);
  border-color: #f43f5e;
}

.reply-header { display: flex; justify-content: space-between; align-items: flex-start; }
.shortcut-badge {
  background: #ffe4e6; color: #e11d48; font-weight: 800;
  padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; letter-spacing: 0.5px;
}
.actions { display: flex; gap: 0.2rem; }

.reply-content { min-height: 60px; }
.text-message {
  color: #334155; font-size: 0.95rem; line-height: 1.5;
  white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 4;
  -webkit-box-orient: vertical; overflow: hidden;
}

.media-message {
  display: flex; align-items: center; gap: 1rem; background: #f8fafc;
  padding: 1rem; border-radius: 12px;
}
.media-icon {
  width: 40px; height: 40px; border-radius: 10px; background: #e2e8f0;
  display: flex; align-items: center; justify-content: center; color: #64748b;
}

.empty-state, .loading-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 200px; color: #94a3b8; text-align: center;
}

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-content {
  background: white; width: 100%; max-width: 500px; max-height: 90vh;
  overflow-y: auto; padding: 2rem; border-radius: 24px;
}
.form-row { display: flex; gap: 1rem; }
.flex-1 { flex: 1; } .flex-2 { flex: 2; }
.form-group label {
  display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem;
}
.form-control {
  width: 100%; padding: 0.8rem 1rem; border: 1px solid #cbd5e1;
  border-radius: 10px; font-family: inherit; transition: all 0.2s; background: white;
}
.form-control:focus {
  outline: none; border-color: #f43f5e; box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
}
.input-with-prefix { position: relative; display: flex; align-items: center; }
.prefix {
  position: absolute; left: 1rem; color: #94a3b8; font-weight: 700;
}
.input-with-prefix input { padding-left: 2rem; }

/* Helpers */
.text-muted { color: #94a3b8; } .text-danger { color: #ef4444; }
.text-sm { font-size: 0.85rem; }
.line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.icon-xl { width: 48px; height: 48px; } .icon-medium { width: 22px; height: 22px; }
.icon-small { width: 16px; height: 16px; }
.mt-3 { margin-top: 1rem; } .mt-4 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; } .mb-4 { margin-bottom: 1.5rem; }
.mr-2 { margin-right: 0.5rem; }
.spin { animation: spin 1s linear infinite; }
.whatsapp-origin { background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; }

.animate-fade-in { animation: fadeIn 0.4s ease forwards; }
.animate-slide-up { animation: slideUp 0.3s ease forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

