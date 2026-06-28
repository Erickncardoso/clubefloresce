<template>
  <div class="auth-container patient-login-mode">
    <main v-if="guestResolving" class="patient-auth patient-auth--boot">
      <PatientLoadingLogo size="xl" :animated="true" class="patient-auth-logo-mark" />
      <p class="patient-auth-boot-text">Carregando sua conta…</p>
    </main>

    <main v-else class="patient-auth">
      <div class="patient-auth-inner">
        <div class="patient-auth-card cf-squircle cf-squircle--surface">
          <header class="patient-auth-header patient-auth-header--login">
            <div class="patient-auth-header__center">
              <PatientLoadingLogo
                size="xl"
                :animated="loading || firstAccessLoading"
                class="patient-auth-logo-mark"
              />
              <h2>Entrar</h2>
            </div>
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
              <NuxtLink to="/esqueci-senha" class="forgot-link forgot-link-btn">Esqueci a senha</NuxtLink>
            </div>

            <button type="submit" :disabled="loading" class="btn-auth-submit patient-auth-submit cf-squircle--control">
              <span v-if="loading">Validando...</span>
              <span v-else>Entrar</span>
            </button>

            <p v-if="error" class="error-banner cf-squircle cf-squircle--control" role="alert">
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
      <div class="modal-card cf-squircle cf-squircle--surface">
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
import { apiConnectionErrorMessage, isApiConnectionError, sanitizeUserFacingError } from '~/utils/resolve-api-base.mjs'
import { PATIENT_ACCESS_EXPIRED_MESSAGE } from '~/utils/patient-access'
import { getLegacyAuthToken, applyVerifiedSessionUser } from '~/composables/useAuthSession.js'

definePageMeta({ layout: false, pageTransition: false })

const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)
const { persistSession, clearPatientSession } = usePatientApp()
const patientAuth = usePatientAuth()

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

const route = useRoute()
const guestResolving = useState('patient-guest-resolving', () => false)

onMounted(() => {
  if (route.query.access === 'expired') {
    error.value = PATIENT_ACCESS_EXPIRED_MESSAGE
  }
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${authApiBase.value}/login`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    })

    applyVerifiedSessionUser(data.user)
    patientAuth.markSessionActive()
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

    const { resolvePostLoginRoute } = usePatientOnboarding()
    await navigateTo(await resolvePostLoginRoute())
  } catch (err) {
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else if (err.statusCode === 503) {
      error.value = sanitizeUserFacingError(err.data?.message)
        || 'Servidor ocupado. Aguarde alguns segundos e tente novamente.'
    } else if (err.data?.message) {
      error.value = sanitizeUserFacingError(err.data.message)
    } else if (err.statusCode === 401) {
      error.value = 'Credenciais inválidas. Verifique e-mail e senha.'
    } else if (!err?.data?.message && (err?.statusCode >= 500 || !err?.statusCode)) {
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

  const token = getLegacyAuthToken()
  if (!hasAuthSession() && !token) {
    firstAccessError.value = 'Sessão inválida. Faça login novamente.'
    return
  }

  firstAccessLoading.value = true
  try {
    await $fetch(`${authApiBase.value}/first-access/change-password`, {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      body: { newPassword: firstAccessForm.newPassword },
    })
    showFirstAccessModal.value = false
    firstAccessForm.newPassword = ''
    firstAccessForm.confirmPassword = ''
    const { resolvePostLoginRoute } = usePatientOnboarding()
    await navigateTo(await resolvePostLoginRoute())
  } catch (err) {
    firstAccessError.value = err.data?.message || 'Não foi possível atualizar a senha.'
  } finally {
    firstAccessLoading.value = false
  }
}
</script>

<style scoped>
.patient-auth-header--login h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--cf-text);
}

.patient-auth--boot {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.patient-auth-boot-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--cf-text-muted);
}

.field--float-password .forgot-link {
  display: block;
  width: 100%;
  margin: 0.45rem 0 0;
  padding: 0;
  text-align: right;
}

.input-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: #b8c0bd;
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.form-group.focused .input-icon {
  color: var(--cf-pink);
}

.input-wrapper input::placeholder {
  color: #b0b8b5;
}

.forgot-link {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--cf-pink);
  text-decoration: none;
}

.forgot-link-btn {
  border: none;
  background: transparent;
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
  width: 1.125rem;
  height: 1.125rem;
}

.error-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}
</style>
