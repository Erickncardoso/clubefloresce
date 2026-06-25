<template>
  <div class="auth-container patient-login-mode">
    <main class="patient-auth">
      <div class="patient-auth-inner">
        <div class="patient-auth-card cf-squircle cf-squircle--surface">
          <header v-if="!submitted" class="patient-auth-header patient-auth-header--login">
            <NuxtLink to="/" class="back-link">
              <ArrowLeft class="back-link-icon" aria-hidden="true" />
              Voltar
            </NuxtLink>
            <div class="patient-auth-header__center">
              <PatientLoadingLogo size="xl" :animated="loading" class="patient-auth-logo-mark" />
              <h2>Recuperar senha</h2>
              <p>Informe seu e-mail. O link expira em 10 minutos.</p>
            </div>
          </header>

          <div v-if="submitted" class="patient-success-inline">
            <PatientLoadingLogo size="lg" :animated="false" class="patient-auth-logo-mark" />
            <h2>Verifique seu e-mail</h2>
            <p>Se o e-mail estiver cadastrado, você receberá um link em instantes. Confira também a caixa de spam.</p>
            <NuxtLink to="/" class="btn-auth-submit patient-auth-submit patient-auth-submit--inline cf-squircle--control">
              Voltar ao login
            </NuxtLink>
          </div>

          <form v-else class="auth-form patient-auth-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label for="forgot-email">E-mail</label>
              <div class="input-wrapper cf-squircle--control">
                <Mail class="input-icon" />
                <input
                  id="forgot-email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="seu@email.com"
                >
              </div>
            </div>

            <button type="submit" :disabled="loading" class="btn-auth-submit patient-auth-submit cf-squircle--control">
              <span v-if="loading">Enviando...</span>
              <span v-else>Enviar link</span>
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
import { Mail, AlertCircle, ArrowLeft } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError, sanitizeUserFacingError } from '~/utils/resolve-api-base.mjs'

definePageMeta({ layout: false, pageTransition: false })

const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)

const email = ref('')
const loading = ref(false)
const error = ref('')
const submitted = ref(false)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    await $fetch(`${authApiBase.value}/forgot-password`, {
      method: 'POST',
      body: { email: email.value, app: 'patient' },
    })
    submitted.value = true
  } catch (err) {
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else {
      error.value = sanitizeUserFacingError(err.data?.message) || 'Não foi possível enviar o e-mail.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--cf-pink);
  text-decoration: none;
}

.back-link-icon {
  width: 1rem;
  height: 1rem;
}

.patient-success-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  line-height: 1.55;
  color: var(--cf-muted);
}

.patient-success-inline h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--cf-text);
}

.patient-success-inline p {
  margin: 0;
  max-width: 22rem;
}

.input-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: #b8c0bd;
  flex-shrink: 0;
}

.error-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}
</style>
