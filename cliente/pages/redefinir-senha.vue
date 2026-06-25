<template>
  <div class="auth-container patient-login-mode">
    <main class="patient-auth">
      <div class="patient-auth-inner">
        <div class="patient-auth-card cf-squircle cf-squircle--surface">
          <header class="patient-auth-header patient-auth-header--login">
            <div class="patient-auth-header__center">
              <PatientLoadingLogo size="xl" :animated="checking || loading" class="patient-auth-logo-mark" />
              <h2>{{ headerTitle }}</h2>
              <p v-if="pageSubtitle">{{ pageSubtitle }}</p>
            </div>
          </header>

          <div v-if="checking" class="status-block">Validando link...</div>

          <div v-else-if="!tokenValid" class="status-block">
            <p>{{ invalidMessage }}</p>
            <NuxtLink to="/esqueci-senha" class="btn-auth-submit patient-auth-submit cf-squircle--control">
              Solicitar novo link
            </NuxtLink>
          </div>

          <div v-else-if="done" class="status-block">
            <p>Senha redefinida com sucesso.</p>
            <NuxtLink to="/" class="btn-auth-submit patient-auth-submit patient-auth-submit--inline cf-squircle--control">
              Entrar no app
            </NuxtLink>
          </div>

          <form v-else class="auth-form patient-auth-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label for="reset-password">Nova senha</label>
              <div class="input-wrapper cf-squircle--control">
                <Lock class="input-icon" />
                <input
                  id="reset-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  placeholder="Mínimo 8 caracteres"
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
              <label for="reset-confirm">Confirmar senha</label>
              <div class="input-wrapper cf-squircle--control">
                <Lock class="input-icon" />
                <input
                  id="reset-confirm"
                  v-model="confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  placeholder="Repita a nova senha"
                >
              </div>
            </div>

            <button type="submit" :disabled="loading" class="btn-auth-submit patient-auth-submit cf-squircle--control">
              <span v-if="loading">Salvando...</span>
              <span v-else>Redefinir senha</span>
            </button>

            <p v-if="error" class="error-banner cf-squircle cf-squircle--control" role="alert">
              <AlertCircle class="error-icon" />
              {{ error }}
            </p>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError, sanitizeUserFacingError } from '~/utils/resolve-api-base.mjs'

definePageMeta({ layout: false, pageTransition: false })

const route = useRoute()
const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const checking = ref(true)
const tokenValid = ref(false)
const invalidMessage = ref('Link inválido ou expirado.')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref(false)

const headerTitle = computed(() => {
  if (done.value) return 'Pronto!'
  if (!tokenValid.value && !checking.value) return 'Link expirado'
  return 'Nova senha'
})

const pageSubtitle = computed(() => {
  if (tokenValid.value && !done.value) return 'Escolha uma nova senha para entrar no app.'
  return ''
})

onMounted(async () => {
  if (!token.value) {
    checking.value = false
    invalidMessage.value = 'Link inválido. Solicite um novo e-mail de recuperação.'
    return
  }

  try {
    await $fetch(`${authApiBase.value}/password-reset/validate`, {
      query: { token: token.value },
    })
    tokenValid.value = true
  } catch (err) {
    invalidMessage.value = sanitizeUserFacingError(err.data?.message) || 'Link inválido ou expirado.'
  } finally {
    checking.value = false
  }
})

const handleSubmit = async () => {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'A confirmação precisa ser igual à nova senha.'
    return
  }

  loading.value = true
  try {
    await $fetch(`${authApiBase.value}/reset-password`, {
      method: 'POST',
      body: { token: token.value, newPassword: password.value },
    })
    done.value = true
  } catch (err) {
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else {
      error.value = sanitizeUserFacingError(err.data?.message) || 'Não foi possível redefinir a senha.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.status-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
  line-height: 1.55;
  color: var(--cf-muted);
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
