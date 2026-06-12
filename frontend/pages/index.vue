<template>
  <div class="auth-container" :class="{ 'patient-login-mode': config.public.mobileApp }">
    <!-- Lado Esquerdo: Visual Elite (somente web) -->
    <div v-if="!config.public.mobileApp" class="auth-visual">
      <div class="visual-overlay"></div>
      <img src="https://images.unsplash.com/photo-1543362906-acfc16c623a2?q=80&w=1974&auto=format&fit=crop" alt="Botanical Background" />
      <div class="visual-content">
        <div class="brand-badge">Florescer</div>
        <h1>Nutrição que <br/><span>Floresce</span> de dentro <br/>para fora.</h1>
        <p>Acesse sua plataforma exclusiva de acompanhamento nutricional e conteúdo premium.</p>
      </div>
    </div>

    <!-- App do paciente -->
    <main v-if="config.public.mobileApp" class="patient-auth">
      <div class="patient-auth-inner">
        <header class="patient-auth-brand">
          <img src="/logoflorescer.svg" alt="Florescer" class="patient-auth-logo" width="120" height="36">
          <p class="patient-auth-tagline">App do paciente</p>
        </header>

        <div class="patient-auth-card">
          <header class="patient-auth-header">
            <h2>Entrar</h2>
            <p>Use o e-mail e a senha enviados pela sua nutricionista.</p>
          </header>

          <form @submit.prevent="handleLogin" class="auth-form patient-auth-form">
            <div class="form-group" :class="{ focused: focusedField === 'email' }">
              <label for="patient-email">E-mail</label>
              <div class="input-wrapper">
                <Mail class="input-icon" />
                <input
                  id="patient-email"
                  type="email"
                  v-model="form.email"
                  placeholder="seu@email.com"
                  autocomplete="email"
                  required
                  @focus="focusedField = 'email'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group" :class="{ focused: focusedField === 'password' }">
              <div class="label-row">
                <label for="patient-password">Senha</label>
                <button type="button" class="forgot-link forgot-link-btn">Esqueci a senha</button>
              </div>
              <div class="input-wrapper">
                <Lock class="input-icon" />
                <input
                  id="patient-password"
                  :type="showPassword ? 'text' : 'password'"
                  v-model="form.password"
                  placeholder="Sua senha de acesso"
                  autocomplete="current-password"
                  required
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

            <button type="submit" :disabled="loading" class="btn-auth-submit patient-auth-submit">
              <span v-if="loading">Validando...</span>
              <span v-else>Entrar</span>
            </button>

            <p v-if="error" class="error-banner" role="alert">
              <AlertCircle class="error-icon" />
              {{ error }}
            </p>

            <p class="patient-auth-footer">
              Primeiro acesso?
              <NuxtLink to="/register">Solicitar cadastro</NuxtLink>
            </p>
          </form>
        </div>
      </div>
    </main>

    <!-- Portal web (nutricionista) -->
    <main v-else class="auth-main">
      <div class="auth-card">
        <header class="auth-header">
          <h2>Bem-vindo de volta</h2>
          <p>Insira suas credenciais para acessar o portal.</p>
        </header>

        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group" :class="{ 'focused': focusedField === 'email' }">
            <label>E-mail</label>
            <div class="input-wrapper">
              <Mail class="input-icon" />
              <input 
                type="email" 
                v-model="form.email" 
                placeholder="exemplo@florescer.com" 
                required 
                @focus="focusedField = 'email'" 
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group" :class="{ 'focused': focusedField === 'password' }">
            <div class="label-row">
              <label>Senha</label>
              <a href="#" class="forgot-link">Esqueci a senha</a>
            </div>
            <div class="input-wrapper">
              <Lock class="input-icon" />
              <input 
                :type="showPassword ? 'text' : 'password'" 
                v-model="form.password" 
                placeholder="••••••••" 
                required
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

          <button type="submit" :disabled="loading" class="btn-auth-submit">
            <span v-if="loading">Validando...</span>
            <span v-else>Entrar na plataforma</span>
          </button>

          <p v-if="error" class="error-banner">
            <AlertCircle class="error-icon" />
            {{ error }}
          </p>

          <div class="auth-footer">
            <p>Ainda não é membro? <NuxtLink to="/register">Solicitar acesso</NuxtLink></p>
          </div>
        </form>
      </div>

      <footer class="main-footer">
        &copy; 2026 Florescer
      </footer>
    </main>

    <div v-if="showFirstAccessModal" class="modal-overlay">
      <div class="modal-card">
        <h3>Primeiro acesso: altere sua senha</h3>
        <p>Por segurança, você precisa criar uma nova senha para continuar.</p>

        <form class="modal-form" @submit.prevent="handleFirstAccessPasswordChange">
          <div class="form-group" :class="{ focused: focusedField === 'newPassword' }">
            <label>Nova senha</label>
            <div class="input-wrapper">
              <Lock class="input-icon" />
              <input
                :type="showNewPassword ? 'text' : 'password'"
                v-model="firstAccessForm.newPassword"
                placeholder="Mínimo 6 caracteres"
                required
                minlength="6"
                @focus="focusedField = 'newPassword'"
                @blur="focusedField = ''"
              >
              <button
                type="button"
                class="password-toggle-btn"
                :aria-label="showNewPassword ? 'Ocultar senha' : 'Mostrar senha'"
                @click="showNewPassword = !showNewPassword"
              >
                <EyeOff v-if="showNewPassword" class="password-toggle-icon" />
                <Eye v-else class="password-toggle-icon" />
              </button>
            </div>
          </div>

          <div class="form-group" :class="{ focused: focusedField === 'confirmPassword' }">
            <label>Confirmar nova senha</label>
            <div class="input-wrapper">
              <Lock class="input-icon" />
              <input
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="firstAccessForm.confirmPassword"
                placeholder="Repita a nova senha"
                required
                minlength="6"
                @focus="focusedField = 'confirmPassword'"
                @blur="focusedField = ''"
              >
              <button
                type="button"
                class="password-toggle-btn"
                :aria-label="showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <EyeOff v-if="showConfirmPassword" class="password-toggle-icon" />
                <Eye v-else class="password-toggle-icon" />
              </button>
            </div>
          </div>

          <button type="submit" :disabled="firstAccessLoading" class="btn-auth-submit">
            <span v-if="firstAccessLoading">Atualizando senha...</span>
            <span v-else>Salvar nova senha</span>
          </button>
        </form>

        <p v-if="firstAccessError" class="error-banner">
          <AlertCircle class="error-icon" />
          {{ firstAccessError }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError } from '~/utils/resolve-api-base.mjs'

definePageMeta({
  layout: false
})

const config = useRuntimeConfig()
const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)
const { persistSession, clearPatientSession } = usePatientApp()
const patientAuth = usePatientAuth()

const form = reactive({
  email: '',
  password: ''
})
const loading = ref(false)
const error = ref('')
const focusedField = ref('')
const showPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const showFirstAccessModal = ref(false)
const firstAccessLoading = ref(false)
const firstAccessError = ref('')
const firstAccessForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${authApiBase.value}/login`, {
      method: 'POST',
      body: form
    })
    
    patientAuth.saveToken(data.token)
    localStorage.setItem('user_role', data.user.role)
    localStorage.setItem('user_id', data.user.id)
    persistSession({
      name: data.user.name,
      avatar: data.user.avatar,
      createdAt: data.user.createdAt,
    })

    if (config.public.mobileApp && data.user.role === 'NUTRICIONISTA') {
      clearPatientSession()
      error.value = 'Esta versão é exclusiva para pacientes. Nutricionistas devem usar a versão web.'
      return
    }

    if (data.mustChangePassword) {
      showFirstAccessModal.value = true
      return
    }

    navigateTo(config.public.mobileApp ? '/inicio' : '/cursos')
  } catch (err) {
    console.error('Erro completo:', err)
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else if (err.statusCode === 401) {
      error.value = 'Credenciais inválidas. Verifique e-mail e senha.'
    } else if (err.data?.message) {
      error.value = err.data.message
    } else if (err.statusCode === 500) {
      error.value = import.meta.dev
        ? 'Servidor indisponível. Rode o backend com npm run dev:backend e feche outros apps na porta 3001.'
        : 'Servidor indisponível. Tente novamente em alguns instantes.'
    } else if (err.statusCode === 502 || err.statusCode === 503 || err.statusCode === 504) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else {
      error.value = 'Não foi possível entrar. Verifique e-mail e senha.'
    }
  } finally {
    loading.value = false
  }
}

const handleFirstAccessPasswordChange = async () => {
  firstAccessError.value = ''

  if (firstAccessForm.newPassword !== firstAccessForm.confirmPassword) {
    firstAccessError.value = 'A confirmação de senha precisa ser igual à nova senha.'
    return
  }

  const token = patientAuth.getToken()
  if (!token) {
    firstAccessError.value = 'Sessão inválida. Faça login novamente.'
    return
  }

  firstAccessLoading.value = true
  try {
    await $fetch(`${authApiBase.value}/first-access/change-password`, {
      method: 'POST',
      headers: patientAuth.authHeaders(),
      body: {
        newPassword: firstAccessForm.newPassword
      }
    })

    showFirstAccessModal.value = false
    firstAccessForm.newPassword = ''
    firstAccessForm.confirmPassword = ''
    navigateTo(config.public.mobileApp ? '/inicio' : '/cursos')
  } catch (err) {
    if (err.data && err.data.message) {
      firstAccessError.value = err.data.message
    } else {
      firstAccessError.value = 'Não foi possível atualizar a senha.'
    }
  } finally {
    firstAccessLoading.value = false
  }
}

onMounted(async () => {
  if (!config.public.mobileApp) return
  patientAuth.bootstrapToken()
  if (!patientAuth.getToken()) return
  const ok = await patientAuth.refreshSession()
  if (ok) navigateTo('/inicio')
})
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

/* LADO VISUAL (LEFT) */
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

.visual-content h1 span {
  color: #a8d5a2;
}

.visual-content p {
  font-size: 1.15rem;
  line-height: 1.6;
  opacity: 0.9;
}

/* LADO FORMULÁRIO (RIGHT) */
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

.auth-header {
  margin-bottom: 3rem;
}

.patient-app-badge {
  display: inline-block;
  margin-bottom: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(45, 90, 39, 0.1);
  color: #2d5a27;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.auth-header h2 {
  font-size: 2rem;
  font-weight: 800;
  color: #111;
  margin-bottom: 0.8rem;
}

.auth-header p {
  color: #777;
  font-size: 1rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #444;
}

.forgot-link {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
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

.input-icon {
  width: 20px;
  height: 20px;
  color: #ccc;
  transition: color 0.3s;
}

.input-wrapper input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 1.1rem 0.8rem;
  font-family: inherit;
  font-size: 1rem;
  color: #111;
  outline: none;
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
  transition: color 0.2s, background 0.2s;
}

.password-toggle-btn:hover {
  color: var(--primary);
  background: rgba(45, 90, 39, 0.06);
}

.password-toggle-icon {
  width: 20px;
  height: 20px;
}

.form-group.focused .password-toggle-btn {
  color: var(--primary);
}

.form-group.focused .input-wrapper {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(45, 90, 39, 0.05);
}

.form-group.focused .input-icon {
  color: var(--primary);
}

.btn-auth-submit {
  width: 100%;
  background: #2d5a27;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 1.1rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 0.5rem;
}

.btn-auth-submit:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(45, 90, 39, 0.15);
}

.btn-auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-banner {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.error-icon { width: 18px; height: 18px; }

.auth-footer {
  margin-top: 2rem;
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #f0f0f0;
}

.auth-footer p {
  font-size: 0.95rem;
  color: #888;
}

.auth-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 800;
}

.main-footer {
  margin-top: 4rem;
  font-size: 0.8rem;
  color: #ccc;
  font-weight: 600;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.22);
}

.modal-card h3 {
  margin: 0 0 8px;
  font-size: 1.2rem;
  color: #12231a;
}

.modal-card p {
  margin: 0 0 16px;
  color: #46574f;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.patient-login-mode {
  background: var(--pa-bg, #ffffff);
  justify-content: center;
}

.patient-auth {
  flex: 1;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(1.5rem + env(safe-area-inset-top)) 1.25rem calc(1.5rem + env(safe-area-inset-bottom));
  background: var(--pa-bg, #ffffff);
}

.patient-auth-inner {
  width: 100%;
  max-width: 380px;
}

.patient-auth-brand {
  text-align: center;
  margin-bottom: 1.5rem;
}

.patient-auth-logo {
  display: block;
  margin: 0 auto 0.5rem;
  object-fit: contain;
}

.patient-auth-tagline {
  margin: 0;
  font-size: 0.82rem;
  color: var(--pa-text-muted, #66706e);
}

.patient-auth-card {
  background: var(--pa-surface, #fff);
  border: 1px solid var(--pa-border, #e0e0e0);
  border-radius: var(--pa-radius, 12px);
  padding: 1.35rem;
}

.patient-auth-header {
  margin-bottom: 1.25rem;
}

.patient-auth-header h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--pa-text, #333d3b);
}

.patient-auth-header p {
  margin: 0;
  font-size: 0.88rem;
  color: var(--pa-text-muted, #66706e);
}

.patient-auth-form {
  gap: 1.1rem;
}

.patient-login-mode .form-group label {
  font-weight: 600;
  color: var(--pa-text, #333d3b);
}

.patient-login-mode .input-wrapper {
  border-color: var(--pa-border, #e0e0e0);
  border-radius: var(--pa-radius, 12px);
  background: var(--pa-surface, #fff);
}

.patient-login-mode .form-group.focused .input-wrapper {
  border-color: var(--cf-pink, #c9898e);
  box-shadow: 0 0 0 3px rgba(201, 137, 142, 0.15);
}

.patient-login-mode .form-group.focused .input-icon {
  color: var(--cf-pink, #c9898e);
}

.patient-login-mode .forgot-link {
  color: var(--cf-pink, #c9898e);
}

.forgot-link-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.patient-auth-submit {
  background: var(--cf-green, #8baa87);
  border-radius: var(--pa-radius, 12px);
  min-height: 3rem;
  margin-top: 0.15rem;
  font-weight: 600;
}

.patient-auth-submit:hover:not(:disabled) {
  background: var(--cf-green-dark, #739a6f);
}

.patient-auth-footer {
  margin: 0.5rem 0 0;
  text-align: center;
  font-size: 0.88rem;
  color: var(--pa-text-muted, #66706e);
}

.patient-auth-footer a {
  color: var(--cf-pink, #c9898e);
  font-weight: 600;
  text-decoration: none;
}

.patient-login-mode .input-wrapper input {
  font-family: inherit;
  color: var(--pa-text, #333d3b);
}
</style>
