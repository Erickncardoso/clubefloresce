<template>
  <AdminAuthShell
    :title="submitted ? '' : 'Recuperar senha'"
    :subtitle="submitted ? '' : 'Informe seu e-mail. Enviaremos um link válido por 10 minutos.'"
  >
    <div v-if="submitted" class="success-block">
      <h2 class="inline-title">Verifique seu e-mail</h2>
      <p>Se o e-mail estiver cadastrado, você receberá um link em instantes. Confira também a caixa de spam.</p>
      <NuxtLink to="/" class="btn-auth-submit btn-auth-submit--inline cf-squircle cf-squircle--control">Voltar ao login</NuxtLink>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="auth-form">
      <div class="form-group form-group--stacked">
        <label for="forgot-email">E-mail</label>
        <div class="input-wrapper cf-squircle cf-squircle--control">
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

      <button type="submit" :disabled="loading" class="btn-auth-submit cf-squircle cf-squircle--control">
        <span v-if="loading">Enviando...</span>
        <span v-else>Enviar link de recuperação</span>
      </button>

      <p v-if="error" class="error-banner cf-squircle cf-squircle--control" role="alert">
        <AlertCircle class="error-icon" />
        {{ error }}
      </p>

      <p class="auth-footer-link">
        <NuxtLink to="/">Voltar ao login</NuxtLink>
      </p>
    </form>
  </AdminAuthShell>
</template>

<script setup>
import { Mail, AlertCircle } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError } from '~/utils/resolve-api-base.mjs'

definePageMeta({ layout: false })

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
      body: { email: email.value, app: 'admin' },
    })
    submitted.value = true
  } catch (err) {
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else {
      error.value = err.data?.message || 'Não foi possível enviar o e-mail. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.inline-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a2e24;
}
</style>
