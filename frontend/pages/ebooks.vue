<template>
  <NuxtLayout name="dashboard">
    <div class="ebooks-container">
      <div class="ebooks-page">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1>Biblioteca Digital</h1>
            <p>Guia prÃ¡ticos, receitas e materiais exclusivos para download.</p>
          </div>
          <button v-if="isNutri" @click="openCreateEbookModal" class="btn-primary">
            <Plus class="btn-icon" />
            Adicionar Ebook
          </button>
        </div>

        <!-- Grid de Ebooks -->
        <div v-if="ebooks.length" class="ebooks-grid">
          <div v-for="ebook in ebooks" :key="ebook.id" class="ebook-card">
            <div class="card-inner">
              <div class="ebook-cover">
                <img v-if="ebook.thumbnail" :src="ebook.thumbnail" :alt="ebook.title" />
                <div v-else class="ebook-cover-placeholder">
                  <BookOpen />
                </div>
                <div class="cover-overlay">
                  <a :href="ebook.fileUrl" target="_blank" class="btn-download-overlay" title="Baixar PDF">
                    <Download />
                  </a>
                </div>
              </div>
              <div class="ebook-info">
                <h3>{{ ebook.title }}</h3>
                <p class="ebook-desc">{{ ebook.description || 'Material complementar exclusivo.' }}</p>
                <div class="ebook-footer">
                  <a :href="ebook.fileUrl" target="_blank" class="btn-read">
                    <FileText class="btn-icon-xs" />
                    Ler Material
                  </a>
                  <button v-if="isNutri" @click="handleDeleteEbook(ebook.id)" class="btn-icon-danger" title="Excluir">
                    <Trash2 />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Estado Vazio -->
        <div v-else class="empty-state">
          <div class="empty-icon-box">
            <Book class="empty-icon" />
          </div>
          <h3>Biblioteca vazia</h3>
          <p>Ainda nÃ£o hÃ¡ materiais disponÃ­veis para download.</p>
          <button v-if="isNutri" @click="openCreateEbookModal" class="btn-primary mt-4">Adicionar primeiro ebook</button>
        </div>

        <!-- Modal: Novo Ebook -->
        <div v-if="showCreateEbookModal" class="modal-overlay" @click.self="closeCreateEbookModal">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Novo Ebook</h2>
              <button @click="closeCreateEbookModal" class="btn-close"><X /></button>
            </div>

            <!-- Upload de Capa -->
            <div class="form-group">
              <label>Capa do Ebook</label>
              <div class="upload-area" @click="triggerUpload" :class="{ 'has-image': previewUrl }">
                <img v-if="previewUrl" :src="previewUrl" class="upload-preview" />
                <div v-else class="upload-placeholder">
                  <ImageIcon class="upload-icon" />
                  <span>Selecione uma imagem de capa</span>
                </div>
                <input ref="fileInput" type="file" accept="image/*" class="file-input-hidden" @change="handleImageSelect" />
              </div>
            </div>

            <div class="form-group">
              <label>Título do Ebook</label>
              <input v-model="newEbook.title" placeholder="Ex: Guia de Receitas Detox" />
            </div>
            
            <div class="form-group">
              <label>Descrição Curta</label>
              <textarea v-model="newEbook.description" rows="2" placeholder="Resumo do conteúdo..." />
            </div>

            <!-- Upload de PDF -->
            <div class="form-group">
              <label>Arquivo do Ebook (PDF)</label>
              <div class="pdf-upload-box" @click="triggerPdfUpload" :class="{ 'has-file': selectedPdfFile }">
                <FileText v-if="!selectedPdfFile" class="pdf-icon-big" />
                <div v-else class="pdf-file-info">
                  <FileText class="pdf-icon-small" />
                  <span>{{ selectedPdfFile.name }}</span>
                </div>
                <span v-if="!selectedPdfFile">Clique para selecionar o PDF</span>
                <input ref="pdfInput" type="file" accept="application/pdf" class="file-input-hidden" @change="handlePdfSelect" />
              </div>
            </div>

            <div class="modal-actions">
              <button @click="closeCreateEbookModal" class="btn-cancel">Cancelar</button>
              <button @click="handleCreateEbook" class="btn-primary" :disabled="uploading">
                <span v-if="uploading">Enviando...</span>
                <span v-else>Salvar Ebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase
const route = useRoute()

import { 
  Book, 
  BookOpen, 
  Plus, 
  Download, 
  FileText, 
  Trash2, 
  X, 
  Image as ImageIcon 
} from 'lucide-vue-next'

const ebooks = ref([])
const isNutri = ref(false)
const showCreateEbookModal = ref(false)
const uploading = ref(false)
const previewUrl = ref(null)
const selectedFile = ref(null)
const selectedPdfFile = ref(null)
const fileInput = ref(null)
const pdfInput = ref(null)

const newEbook = reactive({
  title: '',
  description: '',
  fileUrl: '',
  thumbnail: ''
})

const fetchEbooks = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`${apiBase}/ebooks`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    ebooks.value = data
  } catch (err) {
    console.error('Erro ao buscar ebooks:', err)
  }
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const triggerPdfUpload = () => {
  pdfInput.value?.click()
}

const handleImageSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

const handlePdfSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== 'application/pdf') return alert('Por favor, selecione apenas arquivos PDF.')
  selectedPdfFile.value = file
}

const resetCreateEbookState = () => {
  Object.assign(newEbook, { title: '', description: '', fileUrl: '', thumbnail: '' })
  if (previewUrl.value && String(previewUrl.value).startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
  selectedFile.value = null
  selectedPdfFile.value = null
}

const openCreateEbookModal = () => {
  resetCreateEbookState()
  showCreateEbookModal.value = true
}

const closeCreateEbookModal = () => {
  showCreateEbookModal.value = false
  resetCreateEbookState()
}

const handleCreateEbook = async () => {
  if (!newEbook.title) return alert('O título é obrigatório.')
  if (!selectedPdfFile.value && !newEbook.fileUrl) return alert('Selecione um arquivo PDF ou insira um link.')
  
  uploading.value = true
  const token = localStorage.getItem('auth_token')
  
  try {
    // 1. Upload da Capa (se houver)
    if (selectedFile.value) {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      const uploadRes = await $fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      newEbook.thumbnail = uploadRes.url
    }

    // 2. Upload do PDF (se houver)
    if (selectedPdfFile.value) {
      const formData = new FormData()
      formData.append('file', selectedPdfFile.value)
      const uploadRes = await $fetch(`${apiBase}/upload/file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      newEbook.fileUrl = uploadRes.url
    }

    // 3. Salvar Ebook no Banco
    await $fetch(`${apiBase}/ebooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { ...newEbook }
    })

    closeCreateEbookModal()
    fetchEbooks()
  } catch (err) {
    alert('Erro ao processar upload ou criar ebook.')
    console.error(err)
  } finally {
    uploading.value = false
  }
}

const handleDeleteEbook = async (id) => {
  if (!confirm('Deseja excluir este material permanentemente?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/ebooks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchEbooks()
  } catch (err) {
    alert('Erro ao excluir ebook.')
  }
}

onMounted(() => {
  isNutri.value = localStorage.getItem('user_role') === 'NUTRICIONISTA'
  fetchEbooks()
  if (isNutri.value && route.query.action === 'create') {
    openCreateEbookModal()
  }
})
</script>

<style scoped>
.ebooks-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.ebooks-page {
  padding: 3rem;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3.5rem;
}

.page-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

/* Grid */
.ebooks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2.5rem;
}

.ebook-card {
  /* Perspective removed as per request */
}

.card-inner {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #eee;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ebook-card:hover .card-inner {
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border-color: #e0e0e0;
}

.ebook-cover {
  height: 280px;
  position: relative;
  background: #f8fbf8;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f5f5f5;
}

.ebook-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ebook-cover-placeholder {
  color: var(--primary);
  opacity: 0.3;
}

.ebook-cover-placeholder svg {
  width: 48px;
  height: 48px;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(45, 90, 39, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ebook-card:hover .cover-overlay {
  opacity: 1;
}

.btn-download-overlay {
  width: 60px;
  height: 60px;
  background: white;
  color: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transform: scale(0.8);
  transition: 0.3s;
}

.btn-download-overlay:hover {
  transform: scale(1);
}

.ebook-info {
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.ebook-info h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 8px;
}

.ebook-desc {
  font-size: 0.9rem;
  color: #777;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  flex: 1;
}

.ebook-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1.2rem;
  border-top: 1px solid #f8f8f8;
}

.btn-read {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 700;
  transition: opacity 0.2s;
}

.btn-read:hover {
  opacity: 0.7;
}

.btn-icon-xs {
  width: 16px;
  height: 16px;
}

.btn-icon-danger {
  background: transparent;
  border: none;
  color: #bbb;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-icon-danger:hover {
  color: #e63946;
  background: #fff0f0;
}

/* Modal, Upload area and general styling consistent with Cursos */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem 1.6rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-card {
  background: white;
  padding: 2.5rem;
  border-radius: 24px;
  width: 100%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #555;
  margin-bottom: 0.5rem;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid #eee;
  border-radius: 10px;
  font-family: 'Figtree', sans-serif;
  outline: none;
}

.form-group input:focus {
  border-color: var(--primary);
}

.input-hint {
  font-size: 0.75rem;
  color: #aaa;
  margin-top: 4px;
}

.upload-area {
  border: 2px dashed #eee;
  border-radius: 16px;
  height: 140px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.upload-area.has-image { border: none; }
.upload-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 16px; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 6rem 2rem;
}

.empty-icon-box {
  width: 80px;
  height: 80px;
  background: #f8fbf8;
  color: #eee;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
}

.empty-icon { width: 40px; height: 40px; }

.btn-close {
  background: transparent;
  border: none;
  color: #aaa;
  cursor: pointer;
}

.pdf-upload-box {
  border: 2px dashed #eee;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
  color: #888;
}

.pdf-upload-box:hover {
  border-color: var(--primary);
  background: #f8fbf8;
  color: var(--primary);
}

.pdf-upload-box.has-file {
  border-color: #2d5a27;
  background: #f0fdf4;
  color: #166534;
}

.pdf-icon-big { width: 32px; height: 32px; opacity: 0.5; }
.pdf-icon-small { width: 20px; height: 20px; }

.pdf-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.9rem;
}

.pdf-upload-box span { font-size: 0.8rem; font-weight: 600; }

.file-input-hidden { display: none; }
</style>


