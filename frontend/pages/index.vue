<template>
  <div class="auth-container">
    <aside class="auth-visual" aria-hidden="true">
      <div class="auth-visual-bg">
        <div class="auth-visual-orb auth-visual-orb--one" />
        <div class="auth-visual-orb auth-visual-orb--two" />
        <div class="auth-visual-orb auth-visual-orb--three" />
      </div>
      <div class="visual-content">
        <span class="brand-badge">Portal nutricionista</span>
        <h1>
          Nutrição que
          <span>floresce</span>
          de dentro para fora.
        </h1>
        <p>Acompanhe pacientes, conteúdos e jornadas em um só lugar.</p>
      </div>
    </aside>

    <main class="auth-main">
      <div class="auth-card cf-squircle cf-squircle--surface">
        <header class="auth-header">
          <img src="/logoflorescer.svg" alt="Florescer" class="auth-logo" width="128" height="38">
          <h2>Bem-vindo de volta</h2>
          <p>Insira suas credenciais para acessar o portal.</p>
        </header>

        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group field--float" :class="{ focused: focusedField === 'email' }">
            <label for="portal-email">E-mail</label>
            <div class="input-wrapper cf-squircle cf-squircle--control">
              <Mail class="input-icon" />
              <input
                id="portal-email"
                type="email"
                v-model="form.email"
                placeholder="exemplo@florescer.com"
                autocomplete="email"
                required
                @focus="focusedField = 'email'"
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group field--float field--password" :class="{ focused: focusedField === 'password' }">
            <label for="portal-password">Senha</label>
            <div class="input-wrapper cf-squircle cf-squircle--control">
              <Lock class="input-icon" />
              <input
                id="portal-password"
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
            <NuxtLink to="/esqueci-senha" class="forgot-link">Esqueci a senha</NuxtLink>
          </div>

          <button type="submit" :disabled="loading" class="btn-auth-submit cf-squircle cf-squircle--control">
            <span v-if="loading">Validando...</span>
            <span v-else>Entrar na plataforma</span>
          </button>

          <p v-if="error" class="error-banner cf-squircle cf-squircle--control" role="alert">
            <AlertCircle class="error-icon" />
            {{ error }}
          </p>

          <div class="auth-footer">
            <p>Primeiro acesso? <NuxtLink to="/setup/nutricionista">Configurar painel</NuxtLink></p>
          </div>
        </form>
      </div>

      <footer class="main-footer">
        &copy; 2026 Florescer
      </footer>
    </main>

    <div v-if="showFirstAccessModal" class="modal-overlay">
      <div class="modal-card cf-squircle cf-squircle--surface">
        <h3>Primeiro acesso: altere sua senha</h3>
        <p>Por segurança, você precisa criar uma nova senha para continuar.</p>

        <form class="modal-form" @submit.prevent="handleFirstAccessPasswordChange">
          <div class="form-group field--float" :class="{ focused: focusedField === 'newPassword' }">
            <label for="first-access-new">Nova senha</label>
            <div class="input-wrapper cf-squircle cf-squircle--control">
              <Lock class="input-icon" />
              <input
                id="first-access-new"
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

          <div class="form-group field--float" :class="{ focused: focusedField === 'confirmPassword' }">
            <label for="first-access-confirm">Confirmar nova senha</label>
            <div class="input-wrapper cf-squircle cf-squircle--control">
              <Lock class="input-icon" />
              <input
                id="first-access-confirm"
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

          <button type="submit" :disabled="firstAccessLoading" class="btn-auth-submit cf-squircle cf-squircle--control">
            <span v-if="firstAccessLoading">Atualizando senha...</span>
            <span v-else>Salvar nova senha</span>
          </button>
        </form>

        <p v-if="firstAccessError" class="error-banner cf-squircle cf-squircle--control">
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

const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)

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
    
    if (data.user.role !== 'NUTRICIONISTA') {
      error.value = 'Acesso exclusivo para nutricionistas. Pacientes devem usar o app Clube Florescer.'
      return
    }

    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user_role', data.user.role)
    localStorage.setItem('user_id', data.user.id)

    if (data.mustChangePassword) {
      showFirstAccessModal.value = true
      return
    }

    navigateTo('/cursos')
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
        ? 'Servidor indisponível. Verifique se o backend está rodando e tente novamente.'
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

  const token = localStorage.getItem('auth_token')
  if (!token) {
    firstAccessError.value = 'Sessão inválida. Faça login novamente.'
    return
  }

  firstAccessLoading.value = true
  try {
    await $fetch(`${authApiBase.value}/first-access/change-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        newPassword: firstAccessForm.newPassword
      }
    })

    showFirstAccessModal.value = false
    firstAccessForm.newPassword = ''
    firstAccessForm.confirmPassword = ''
    navigateTo('/cursos')
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
</script>

<style scoped>
.auth-container {
  --auth-green: #8B967C;
  --auth-green-light: #a3ad98;
  --auth-green-soft: #e8f2e6;
  --auth-green-glow: #8ec487;
  --auth-text: #1a2e24;
  --auth-muted: #5c6b64;
  --auth-border: #e2e8e4;
  --auth-surface: #ffffff;

  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  font-family: var(--cf-font);
  color: var(--auth-text);
  background: #f4f7f5;
}

/* Painel esquerdo */
.auth-visual {
  position: relative;
  flex: 1.05;
  display: flex;
  align-items: center;
  padding: clamp(2.5rem, 5vw, 4.5rem);
  overflow: hidden;
  background: linear-gradient(145deg, #5a6152 0%, #8B967C 42%, #9aa88f 100%);
}

@media (max-width: 1024px) {
  .auth-visual {
    display: none;
  }
}

.auth-visual-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-visual-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(0.5px);
}

.auth-visual-orb--one {
  top: -12%;
  right: -8%;
  width: min(28rem, 55vw);
  height: min(28rem, 55vw);
  background: radial-gradient(circle, rgba(168, 213, 162, 0.35) 0%, transparent 68%);
}

.auth-visual-orb--two {
  bottom: -18%;
  left: -10%;
  width: min(22rem, 45vw);
  height: min(22rem, 45vw);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
}

.auth-visual-orb--three {
  top: 42%;
  left: 38%;
  width: 9rem;
  height: 9rem;
  background: radial-gradient(circle, rgba(142, 196, 135, 0.22) 0%, transparent 72%);
}

.visual-content {
  position: relative;
  z-index: 1;
  max-width: 32rem;
  color: #fff;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  margin-bottom: 1.75rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: var(--cf-radius-pill);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.visual-content h1 {
  margin: 0 0 1.15rem;
  font-size: clamp(2rem, 3.4vw, 3rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.visual-content h1 span {
  color: var(--auth-green-glow);
}

.visual-content p {
  margin: 0;
  max-width: 28rem;
  font-size: 1.02rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.86);
}

/* Formulário */
.auth-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 3rem);
}

.auth-card {
  width: 100%;
  max-width: 26rem;
  padding: clamp(1.5rem, 3vw, 2rem);
  background: var(--auth-surface);
  border: 1px solid var(--auth-border);
  box-shadow:
    0 1px 2px rgba(26, 46, 36, 0.04),
    0 12px 36px rgba(26, 46, 36, 0.06);
}

.auth-header {
  margin-bottom: 1.65rem;
  text-align: center;
}

.auth-logo {
  display: block;
  margin: 0 auto 1rem;
  object-fit: contain;
}

.auth-header h2 {
  margin: 0 0 0.4rem;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--auth-text);
}

.auth-header p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--auth-muted);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.form-group.field--float {
  position: relative;
  margin-top: 0.35rem;
}

.form-group.field--float > label {
  position: absolute;
  top: -0.58rem;
  left: 0.78rem;
  z-index: 2;
  margin: 0;
  padding: 0 0.4rem;
  background: var(--auth-surface);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1;
  color: var(--auth-text);
  pointer-events: none;
}

.form-group.field--float.focused > label {
  color: var(--auth-green);
}

.field--password .forgot-link {
  display: block;
  margin: 0.45rem 0 0;
  text-align: right;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--auth-green);
  text-decoration: none;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1.5px solid var(--auth-border);
  padding: 0 0.9rem;
  background: var(--auth-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: #b0bab5;
  transition: color 0.15s ease;
}

.input-wrapper input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0.95rem 0 0.85rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--auth-text);
  outline: none;
}

.input-wrapper input::placeholder {
  color: #b0bab5;
}

.password-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0.25rem;
  cursor: pointer;
  color: #a8b0ac;
}

.password-toggle-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.form-group.focused .input-wrapper {
  border-color: #9fc499;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.1);
}

.form-group.focused .input-icon,
.form-group.focused .password-toggle-btn {
  color: var(--auth-green);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  border: 1px solid #fed7d7;
  background: #fff5f5;
  color: #c53030;
  font-size: 0.88rem;
  font-weight: 600;
}

.error-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.auth-footer {
  margin-top: 0.25rem;
  padding-top: 1.15rem;
  border-top: 1px solid #eef2ef;
  text-align: center;
}

.auth-footer p {
  margin: 0;
  font-size: 0.86rem;
  color: var(--auth-muted);
}

.auth-footer a {
  color: var(--auth-green);
  font-weight: 700;
  text-decoration: none;
}

.main-footer {
  margin-top: 1.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #9aa8a2;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(20, 30, 24, 0.45);
}

.modal-card {
  width: 100%;
  max-width: 28rem;
  padding: 1.5rem;
  background: var(--auth-surface);
  border: 1px solid var(--auth-border);
  box-shadow: 0 18px 45px rgba(26, 46, 36, 0.18);
}

.modal-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--auth-text);
}

.modal-card p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--auth-muted);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  margin-top: 0.85rem;
}

.auth-form .btn-auth-submit {
  margin-top: 0.15rem;
}

@supports (corner-shape: squircle) {
  .auth-card.cf-squircle--surface,
  .modal-card.cf-squircle--surface,
  .input-wrapper.cf-squircle--control,
  .btn-auth-submit.cf-squircle--control,
  .error-banner.cf-squircle--control {
    corner-shape: squircle;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-auth-submit:active:not(:disabled) {
    transform: none;
  }
}
</style>
