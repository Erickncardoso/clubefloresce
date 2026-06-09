<template>
  <div class="auth-container" :class="{ 'patient-login-mode': isPatientApp }">
    <!-- App do paciente: solicitar cadastro -->
    <main v-if="isPatientApp" class="patient-auth">
      <div class="patient-auth-inner">
        <header class="patient-auth-brand">
          <img src="/logoflorescer.svg" alt="Florescer" class="patient-auth-logo" width="120" height="36">
          <p class="patient-auth-tagline">App do paciente</p>
        </header>

        <div v-if="submitted" class="patient-auth-card patient-success-card">
          <div class="success-icon-wrap" aria-hidden="true">
            <CheckCircle2 class="success-icon" />
          </div>
          <h2>Solicitação enviada!</h2>
          <p>
            Recebemos seus dados. A nutricionista vai analisar e entrar em contato
            para liberar seu acesso ao app.
          </p>
          <p class="success-note">Você receberá orientações no e-mail informado.</p>
          <NuxtLink to="/" class="btn-auth-submit patient-auth-submit success-back-btn">
            Voltar para o login
          </NuxtLink>
        </div>

        <div v-else class="patient-auth-card">
          <header class="patient-auth-header">
            <NuxtLink to="/" class="back-link">
              <ArrowLeft class="back-link-icon" aria-hidden="true" />
              Voltar
            </NuxtLink>
            <h2>Solicitar cadastro</h2>
            <p>Preencha seus dados. A nutricionista Isabella Jardim analisará e liberará seu acesso.</p>
          </header>

          <form class="auth-form patient-auth-form" @submit.prevent="handlePatientRequest">
            <div class="form-group" :class="{ focused: focusedField === 'name' }">
              <label for="req-name">Nome completo</label>
              <div class="input-wrapper">
                <User class="input-icon" />
                <input
                  id="req-name"
                  v-model="patientForm.name"
                  type="text"
                  placeholder="Como você gostaria de ser chamada"
                  autocomplete="name"
                  required
                  @focus="focusedField = 'name'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group" :class="{ focused: focusedField === 'email' }">
              <label for="req-email">E-mail</label>
              <div class="input-wrapper">
                <Mail class="input-icon" />
                <input
                  id="req-email"
                  v-model="patientForm.email"
                  type="email"
                  placeholder="seu@email.com"
                  autocomplete="email"
                  required
                  @focus="focusedField = 'email'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group" :class="{ focused: focusedField === 'phone' }">
              <label for="req-phone">WhatsApp <span class="optional">(opcional)</span></label>
              <div class="input-wrapper">
                <Phone class="input-icon" />
                <input
                  id="req-phone"
                  v-model="patientForm.phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  autocomplete="tel"
                  @focus="focusedField = 'phone'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group" :class="{ focused: focusedField === 'message' }">
              <label for="req-message">Mensagem <span class="optional">(opcional)</span></label>
              <textarea
                id="req-message"
                v-model="patientForm.message"
                class="patient-textarea"
                rows="3"
                placeholder="Conte um pouco sobre seu objetivo ou como nos conheceu..."
                @focus="focusedField = 'message'"
                @blur="focusedField = ''"
              />
            </div>

            <button type="submit" class="btn-auth-submit patient-auth-submit" :disabled="loading">
              <span v-if="loading">Enviando...</span>
              <span v-else>Enviar solicitação</span>
            </button>

            <p v-if="error" class="error-banner" role="alert">
              <AlertCircle class="error-icon" />
              {{ error }}
            </p>

            <p class="patient-auth-footer">
              Já tem acesso?
              <NuxtLink to="/">Entrar no app</NuxtLink>
            </p>
          </form>
        </div>
      </div>
    </main>

    <!-- Portal web (nutricionista / admin) -->
    <template v-else>
      <div class="auth-visual">
        <div class="visual-overlay" />
        <img src="https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=2070&auto=format&fit=crop" alt="Nature Background">
        <div class="visual-content">
          <div class="brand-badge">Junte-se a nós</div>
          <h1>Plante hoje a sua melhor <br><span>versão</span>.</h1>
          <p>Faça parte de uma comunidade focada em resultados reais e saúde duradoura.</p>
        </div>
      </div>

      <main class="auth-main">
        <div class="auth-card">
          <header class="auth-header">
            <h2>Criar sua conta</h2>
            <p>Preencha os dados abaixo para iniciar sua jornada.</p>
          </header>

          <form class="auth-form" @submit.prevent="handleWebRegister">
            <div class="form-group" :class="{ focused: focusedField === 'name' }">
              <label>Nome completo</label>
              <div class="input-wrapper">
                <User class="input-icon" />
                <input
                  v-model="webForm.name"
                  type="text"
                  placeholder="Seu nome completo"
                  required
                  @focus="focusedField = 'name'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group" :class="{ focused: focusedField === 'email' }">
              <label>E-mail</label>
              <div class="input-wrapper">
                <Mail class="input-icon" />
                <input
                  v-model="webForm.email"
                  type="email"
                  placeholder="seu@exemplo.com"
                  required
                  @focus="focusedField = 'email'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group" :class="{ focused: focusedField === 'password' }">
              <label>Senha de acesso</label>
              <div class="input-wrapper">
                <Lock class="input-icon" />
                <input
                  v-model="webForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minlength="8"
                  @focus="focusedField = 'password'"
                  @blur="focusedField = ''"
                >
                <button
                  type="button"
                  class="password-toggle-btn"
                  :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="password-toggle-icon" />
                  <Eye v-else class="password-toggle-icon" />
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Tipo de acesso</label>
              <div class="role-selector">
                <button
                  type="button"
                  class="role-btn"
                  :class="{ active: webForm.role === 'PACIENTE' }"
                  @click="webForm.role = 'PACIENTE'"
                >
                  Paciente
                </button>
                <button
                  type="button"
                  class="role-btn"
                  :class="{ active: webForm.role === 'NUTRICIONISTA' }"
                  @click="webForm.role = 'NUTRICIONISTA'"
                >
                  Nutricionista
                </button>
              </div>
            </div>

            <button type="submit" class="btn-auth-submit" :disabled="loading">
              <span v-if="loading">Criando sua conta...</span>
              <span v-else>Cadastrar agora</span>
            </button>

            <p v-if="error" class="error-banner">
              <AlertCircle class="error-icon" />
              {{ error }}
            </p>

            <div class="auth-footer">
              <p>Já possui uma conta? <NuxtLink to="/">Fazer login</NuxtLink></p>
            </div>
          </form>
        </div>

        <footer class="main-footer">&copy; 2026 Clube Florescer</footer>
      </main>
    </template>
  </div>
</template>

<script setup>
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-vue-next'

definePageMeta({ layout: false })

const config = useRuntimeConfig()
const isPatientApp = computed(() => Boolean(config.public.mobileApp))
const authApiBase = `${config.public.apiBase}/auth`

const loading = ref(false)
const error = ref('')
const submitted = ref(false)
const focusedField = ref('')
const showPassword = ref(false)

const patientForm = reactive({
  name: '',
  email: '',
  phone: '',
  message: '',
})

const webForm = reactive({
  name: '',
  email: '',
  password: '',
  role: 'NUTRICIONISTA',
})

const handlePatientRequest = async () => {
  loading.value = true
  error.value = ''
  try {
    await $fetch(`${authApiBase}/patient-registration-request`, {
      method: 'POST',
      body: {
        name: patientForm.name,
        email: patientForm.email,
        phone: patientForm.phone || null,
        message: patientForm.message || null,
      },
    })
    submitted.value = true
  } catch (err) {
    error.value = err.data?.message || 'Não foi possível enviar sua solicitação. Tente novamente.'
  } finally {
    loading.value = false
  }
}

const handleWebRegister = async () => {
  loading.value = true
  error.value = ''
  try {
    await $fetch(`${authApiBase}/register`, {
      method: 'POST',
      body: webForm,
    })
    alert('Conta criada com sucesso! Redirecionando para o login...')
    navigateTo('/')
  } catch (err) {
    error.value = err.data?.message || 'Não foi possível completar o cadastro. Verifique os dados.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  --primary: #2d5a27;
  --primary-light: #4c8c4a;
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: white;
  font-family: var(--pa-font, var(--cf-font));
}

.auth-visual {
  flex: 1.2;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 5rem;
}

@media (max-width: 1024px) {
  .auth-visual { display: none; }
}

.auth-visual img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(45, 90, 39, 0.9) 0%, rgba(20, 40, 18, 0.7) 100%);
  z-index: 2;
}

.visual-content {
  position: relative;
  z-index: 3;
  color: white;
  max-width: 500px;
}

.brand-badge {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 0.6rem 1.2rem;
  border-radius: 50px;
  display: inline-block;
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.visual-content h1 {
  font-size: 3.5rem;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 2rem;
}

.visual-content h1 span { color: #a8d5a2; }

.visual-content p {
  font-size: 1.15rem;
  line-height: 1.6;
  opacity: 0.9;
}

.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  background: #fcfcfc;
}

.auth-card {
  width: 100%;
  max-width: 420px;
}

.auth-header { margin-bottom: 2.5rem; }
.auth-header h2 { font-size: 2rem; font-weight: 800; color: #111; margin-bottom: 0.5rem; }
.auth-header p { color: #777; font-size: 1rem; }

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.85rem; font-weight: 700; color: #444; }

.optional {
  font-weight: 500;
  color: #999;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #eee;
  border-radius: 12px;
  padding: 0 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-icon { width: 18px; height: 18px; color: #ccc; transition: color 0.3s; flex-shrink: 0; }

.input-wrapper input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.9rem 0.8rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: #111;
  outline: none;
}

.patient-textarea {
  width: 100%;
  border: 1.5px solid #eee;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: #111;
  resize: vertical;
  min-height: 5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group.focused .patient-textarea {
  border-color: var(--cf-pink-dark, #a06267);
  box-shadow: 0 0 0 4px rgba(193, 123, 128, 0.08);
}

.password-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0.25rem;
  margin-left: 0.25rem;
  cursor: pointer;
  color: #aaa;
  border-radius: 8px;
}

.password-toggle-icon { width: 20px; height: 20px; }

.form-group.focused .input-wrapper {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(45, 90, 39, 0.05);
}

.form-group.focused .input-icon { color: var(--primary); }

.role-selector {
  display: flex;
  gap: 10px;
  background: #f0f0f0;
  padding: 4px;
  border-radius: 12px;
}

.role-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.6rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #777;
  cursor: pointer;
}

.role-btn.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.btn-auth-submit {
  width: 100%;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 1.1rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 0.25rem;
  text-decoration: none;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.patient-auth-submit {
  background: var(--cf-pink, #c17b80);
}

.patient-auth-submit:hover:not(:disabled) {
  background: var(--cf-pink-dark, #a06267);
}

.btn-auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.error-banner {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.auth-footer {
  margin-top: 1.5rem;
  text-align: center;
  padding-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.auth-footer p { font-size: 0.95rem; color: #888; }
.auth-footer a { color: var(--primary); text-decoration: none; font-weight: 800; }

.main-footer {
  margin-top: 3rem;
  font-size: 0.8rem;
  color: #ccc;
  font-weight: 600;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1rem;
  color: var(--cf-text-muted, #525252);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.back-link-icon {
  width: 1rem;
  height: 1rem;
}

.patient-auth-footer {
  margin: 0;
  text-align: center;
  font-size: 0.88rem;
  color: var(--cf-text-muted, #525252);
}

.patient-auth-footer a {
  color: var(--cf-pink-dark, #a06267);
  font-weight: 700;
  text-decoration: none;
}

.patient-success-card {
  text-align: center;
}

.patient-success-card h2 {
  margin: 0 0 0.65rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--cf-text, #141414);
}

.patient-success-card p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--cf-text-muted, #525252);
}

.success-note {
  margin-top: 0.75rem !important;
  font-size: 0.82rem !important;
}

.success-icon-wrap {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: var(--cf-green-soft, #edf3eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--cf-green-dark, #4d7348);
}

.success-back-btn {
  margin-top: 1.25rem;
}
</style>
