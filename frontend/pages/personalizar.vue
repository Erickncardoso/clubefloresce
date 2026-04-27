<template>
  <NuxtLayout name="dashboard">
    <div class="settings-container">
      <div class="settings-page">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1>Personalizar Portal</h1>
            <p>Ajuste a identidade visual e as configurações globais da sua área de membros.</p>
          </div>
          <button @click="handleSave" :disabled="saving" class="btn-primary">
            <Save class="btn-icon" />
            {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </div>

        <div class="settings-grid">
          <!-- Identidade Visual -->
          <div class="settings-section">
            <div class="section-badge">Visual</div>
            <h3>Identidade de Marca</h3>
            <p>Configure como seus alunos enxergam o seu portal.</p>

            <div class="upload-group">
              <label>Logotipo do Portal</label>
              <div class="logo-preview-box">
                <div class="preview-inner">
                  <img v-if="settings.logo" :src="settings.logo" />
                  <div v-else class="logo-placeholder">Seu Logo</div>
                </div>
                <button class="btn-upload-text">Alterar logomarca</button>
              </div>
            </div>

            <div class="form-group">
              <label>Cor Primária (Identidade)</label>
              <div class="color-picker-wrapper">
                <input type="color" v-model="settings.primaryColor" />
                <span class="color-hex">{{ settings.primaryColor.toUpperCase() }}</span>
              </div>
              <p class="hint">Esta cor será usada em botões, ícones ativos e destaques.</p>
            </div>
          </div>

          <!-- Conteúdo e Boas-Vindas -->
          <div class="settings-section">
            <div class="section-badge">Conteúdo</div>
            <h3>Experiência do Aluno</h3>
            <p>Personalize as mensagens de boas-vindas do Dashboard.</p>

            <div class="form-group">
              <label>Título de Boas-Vindas</label>
              <input v-model="settings.welcomeTitle" placeholder="Ex: Que bom ver você de novo!" />
            </div>

            <div class="form-group">
              <label>Mensagem de Destaque</label>
              <textarea v-model="settings.welcomeText" rows="3" placeholder="Sua próxima aula te espera..." />
            </div>

            <div class="form-group">
              <label>Link de Suporte (WhatsApp/E-mail)</label>
              <div class="input-with-icon">
                <Link2 class="input-icon" />
                <input v-model="settings.supportLink" placeholder="https://wa.me/..." />
              </div>
            </div>
          </div>

          <!-- Funcionalidades do Portal -->
          <div class="settings-section full-width">
            <div class="section-badge">Configurações</div>
            <h3>Recursos Ativos</h3>
            <p>Habilite ou desabilite módulos específicos para seus alunos.</p>

            <div class="features-toggles">
              <div class="toggle-card">
                <div class="toggle-info">
                  <div class="toggle-icon-box"><MessageSquare /></div>
                  <div>
                    <h4>Comunidade de Alunos</h4>
                    <p>Permite que os alunos postem e comentem entre si.</p>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" v-model="settings.enableCommunity" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="toggle-card">
                <div class="toggle-info">
                  <div class="toggle-icon-box"><BookOpen /></div>
                  <div>
                    <h4>Biblioteca de Ebooks</h4>
                    <p>Habilita a aba de materiais e guias para download.</p>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" v-model="settings.enableEbooks" />
                  <span class="slider"></span>
                </label>
              </div>

              <div class="toggle-card">
                <div class="toggle-info">
                  <div class="toggle-icon-box"><Bell /></div>
                  <div>
                    <h4>Notificações em Tempo Real</h4>
                    <p>Alertas no navegador para novas aulas e posts.</p>
                  </div>
                </div>
                <label class="switch">
                  <input type="checkbox" v-model="settings.enableNotifications" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { Save, Link2, MessageSquare, BookOpen, Bell } from 'lucide-vue-next'

const saving = ref(false)
const settings = reactive({
  logo: '',
  primaryColor: '#2d5a27',
  welcomeTitle: 'Que bom ter você aqui!',
  welcomeText: 'Continue sua jornada rumo a uma vida mais saudável e equilibrada.',
  supportLink: '',
  enableCommunity: true,
  enableEbooks: true,
  enableNotifications: true
})

const handleSave = () => {
  saving.value = true
  setTimeout(() => {
    saving.value = false
    alert('Configurações salvas com sucesso!')
  }, 1000)
}
</script>

<style scoped>
.settings-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.settings-page {
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
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem 1.6rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}

/* Settings Grid */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.5rem;
}

.settings-section {
  background: white;
  padding: 2.5rem;
  border-radius: 24px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

.settings-section.full-width {
  grid-column: span 2;
}

.section-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #f8fbf8;
  color: var(--primary);
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 1.2rem;
}

.settings-section h3 {
  font-size: 1.3rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 8px;
}

.settings-section p {
  font-size: 0.95rem;
  color: #777;
  margin-bottom: 2.5rem;
}

/* Forms */
.form-group {
  margin-bottom: 1.8rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 800;
  color: #444;
  margin-bottom: 0.6rem;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 0.9rem 1.1rem;
  border: 1px solid #eee;
  border-radius: 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  outline: none;
  background: #fafafa;
}

.form-group input:focus, .form-group textarea:focus {
  border-color: var(--primary);
  background: white;
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.05);
}

/* Logo Preview */
.logo-preview-box {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.preview-inner {
  width: 100px;
  height: 64px;
  background: #f8f8f8;
  border: 1px dashed #ddd;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-placeholder {
  font-size: 0.75rem;
  font-weight: 800;
  color: #bbb;
}

.btn-upload-text {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
}

/* Color Picker */
.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-picker-wrapper input[type="color"] {
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  appearance: none;
}

.color-picker-wrapper input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
.color-picker-wrapper input[type="color"]::-webkit-color-swatch { border-radius: 12px; border: 1px solid #eee; }

.color-hex { font-family: 'Mono', monospace; font-weight: 700; color: #555; font-size: 1rem; }
.hint { font-size: 0.8rem; color: #bbb; margin-top: 8px; }

/* Toggles */
.features-toggles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.toggle-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle-icon-box {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  box-shadow: 0 4px 10px rgba(0,0,0,0.03);
}

.toggle-info h4 { font-size: 1rem; font-weight: 800; color: #111; margin-bottom: 4px; }
.toggle-info p { font-size: 0.85rem; color: #777; margin-bottom: 0; }

/* Switch Style */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #eee;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider { background-color: var(--primary); }
input:checked + .slider:before { transform: translateX(24px); }

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  width: 18px;
  height: 18px;
  color: #ccc;
}

.input-with-icon input {
  padding-left: 3rem !important;
}
</style>
