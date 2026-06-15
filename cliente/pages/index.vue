<template>
  <div class="auth-container patient-login-mode">
    <main class="patient-auth">
      <div class="patient-auth-inner">
        <div class="patient-auth-card">
          <header class="patient-auth-header patient-auth-header--login">
            <img src="/logoflorescer.svg" alt="Florescer" class="patient-auth-logo" width="120" height="36">
            <h2>Entrar</h2>
          </header>

          <form @submit.prevent="handleLogin" class="auth-form patient-auth-form">
            <div class="form-group field--float" :class="{ focused: focusedField === 'email' }">
              <label for="patient-email">E-mail</label>
              <div class="input-wrapper cf-squircle--control">
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

            <div class="form-group field--float field--float-password" :class="{ focused: focusedField === 'password' }">
              <label for="patient-password">Senha</label>
              <div class="input-wrapper cf-squircle--control">
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
              <button type="button" class="forgot-link forgot-link-btn">Esqueci a senha</button>
            </div>

            <button type="submit" :disabled="loading" class="btn-auth-submit patient-auth-submit cf-squircle--control">
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

    <div v-if="showFirstAccessModal" class="modal-overlay">
      <div class="modal-card">
        <h3>Primeiro acesso: altere sua senha</h3>
        <p>Por segurança, você precisa criar uma nova senha para continuar.</p>

        <form class="modal-form" @submit.prevent="handleFirstAccessPasswordChange">
          <div class="form-group field--float" :class="{ focused: focusedField === 'newPassword' }">
            <label for="first-access-new">Nova senha</label>
            <div class="input-wrapper cf-squircle--control">
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
            </div>
          </div>

          <div class="form-group field--float" :class="{ focused: focusedField === 'confirmPassword' }">
            <label for="first-access-confirm">Confirmar nova senha</label>
            <div class="input-wrapper cf-squircle--control">
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
            </div>
          </div>

          <button type="submit" :disabled="firstAccessLoading" class="btn-auth-submit patient-auth-submit cf-squircle--control">
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

definePageMeta({ layout: false, pageTransition: false })

const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)
const { persistSession, clearPatientSession } = usePatientApp()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const focusedField = ref('')
const showPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const showFirstAccessModal = ref(false)
const firstAccessLoading = ref(false)
const firstAccessError = ref('')
const firstAccessForm = reactive({ newPassword: '', confirmPassword: '' })

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${authApiBase.value}/login`, {
      method: 'POST',
      body: form,
    })

    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user_role', data.user.role)
    localStorage.setItem('user_id', data.user.id)
    persistSession({
      name: data.user.name,
      avatar: data.user.avatar,
      createdAt: data.user.createdAt,
    })

    if (data.user.role === 'NUTRICIONISTA') {
      clearPatientSession()
      error.value = 'Esta versão é exclusiva para pacientes. Nutricionistas devem usar o painel web.'
      return
    }

    if (data.mustChangePassword) {
      showFirstAccessModal.value = true
      return
    }

    navigateTo('/inicio')
  } catch (err) {
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else if (err.statusCode === 401) {
      error.value = 'Credenciais inválidas. Verifique e-mail e senha.'
    } else if (err.statusCode === 500) {
      error.value = 'Erro no servidor ao entrar. Confira se o backend está rodando (npm run dev:backend) e reinicie o app paciente.'
    } else if (err.data?.message) {
      error.value = err.data.message
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
      body: { newPassword: firstAccessForm.newPassword },
    })
    showFirstAccessModal.value = false
    firstAccessForm.newPassword = ''
    firstAccessForm.confirmPassword = ''
    navigateTo('/inicio')
  } catch (err) {
    firstAccessError.value = err.data?.message || 'Não foi possível atualizar a senha.'
  } finally {
    firstAccessLoading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  height: 100%;
  height: 100dvh;
  max-height: 100dvh;
  width: 100%;
  overflow: hidden;
  background: var(--pa-bg, #ffffff);
  font-family: var(--pa-font, var(--cf-font));
  justify-content: center;
}

.patient-auth {
  flex: 1;
  width: 100%;
  min-height: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: calc(1rem + env(safe-area-inset-top)) 1.25rem calc(1rem + env(safe-area-inset-bottom));
}

.patient-auth-inner {
  width: 100%;
  max-width: 380px;
}

.patient-auth-header--login {
  text-align: center;
  margin-bottom: 1.35rem;
}

.patient-auth-header--login .patient-auth-logo {
  display: block;
  margin: 0 auto 0.85rem;
  object-fit: contain;
}

.patient-auth-header--login h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--pa-text, #333d3b);
}

.patient-auth-card {
  background: var(--pa-surface, #fff);
  border: 1px solid var(--pa-border, #e0e0e0);
  border-radius: var(--cf-radius-surface, var(--pa-radius));
  padding: 1.35rem;
}

.auth-form { display: flex; flex-direction: column; gap: 1.35rem; }

.form-group.field--float {
  position: relative;
  margin-top: 0.35rem;
}

.field--float-password .forgot-link {
  display: block;
  width: 100%;
  margin: 0.45rem 0 0;
  padding: 0;
  text-align: right;
}

.input-icon {
  width: 18px;
  height: 18px;
  color: #b8c0bd;
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.form-group.focused .input-icon {
  color: var(--cf-pink, #c9898e);
}

.input-wrapper input::placeholder {
  color: #b0b8b5;
}

.forgot-link {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--cf-pink, #c9898e);
  text-decoration: none;
}

.forgot-link-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.password-toggle-btn {
  border: none;
  background: transparent;
  padding: 0.25rem;
  cursor: pointer;
  color: #aaa;
  flex-shrink: 0;
}

.password-toggle-icon {
  width: 18px;
  height: 18px;
}

.btn-auth-submit {
  width: 100%;
  border: none;
  padding: 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.patient-auth-submit {
  background: var(--cf-green, #8baa87);
  min-height: 3rem;
  color: #fff;
}
.patient-auth-submit:hover:not(:disabled) { background: var(--cf-green-dark, #739a6f); }
.btn-auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.error-banner {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: var(--cf-radius-control);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.error-icon { width: 18px; height: 18px; }
.patient-auth-footer { margin: 0.5rem 0 0; text-align: center; font-size: 0.88rem; color: var(--pa-text-muted, #66706e); }
.patient-auth-footer a { color: var(--cf-pink, #c9898e); font-weight: 600; text-decoration: none; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 1000;
}
.modal-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  border-radius: var(--cf-radius-surface, var(--pa-radius));
  padding: 1.35rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  margin-top: 0.5rem;
}
</style>
