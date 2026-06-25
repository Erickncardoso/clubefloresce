<template>
  <AdminAuthShell
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <div v-if="checking" class="status-block">Validando link...</div>

    <div v-else-if="!tokenValid" class="status-block">
      <p>{{ invalidMessage }}</p>
      <NuxtLink to="/esqueci-senha" class="btn-auth-submit cf-squircle cf-squircle--control">
        Solicitar novo link
      </NuxtLink>
    </div>

    <div v-else-if="done" class="status-block">
      <p>Senha redefinida com sucesso. Você já pode entrar no portal.</p>
      <NuxtLink to="/" class="btn-auth-submit cf-squircle cf-squircle--control">Ir para o login</NuxtLink>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="auth-form">
      <div class="form-group field--float" :class="{ focused: focusedField === 'password' }">
        <label for="reset-password">Nova senha</label>
        <div class="input-wrapper cf-squircle cf-squircle--control">
          <Lock class="input-icon" />
          <input
            id="reset-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            minlength="8"
            placeholder="Mínimo 8 caracteres"
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

      <div class="form-group field--float" :class="{ focused: focusedField === 'confirm' }">
        <label for="reset-confirm">Confirmar senha</label>
        <div class="input-wrapper cf-squircle cf-squircle--control">
          <Lock class="input-icon" />
          <input
            id="reset-confirm"
            v-model="confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            required
            minlength="8"
            placeholder="Repita a nova senha"
            @focus="focusedField = 'confirm'"
            @blur="focusedField = ''"
          >
        </div>
      </div>

      <button type="submit" :disabled="loading" class="btn-auth-submit cf-squircle cf-squircle--control">
        <span v-if="loading">Salvando...</span>
        <span v-else>Redefinir senha</span>
      </button>

      <p v-if="error" class="error-banner cf-squircle cf-squircle--control" role="alert">
        <AlertCircle class="error-icon" />
        {{ error }}
      </p>
    </form>
  </AdminAuthShell>
</template>

<script setup>
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError } from '~/utils/resolve-api-base.mjs'

definePageMeta({ layout: false })

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
const focusedField = ref('')

const pageTitle = computed(() => {
  if (checking.value) return 'Nova senha'
  if (!tokenValid.value || done.value) return ''
  return 'Nova senha'
})

const pageSubtitle = computed(() => {
  if (tokenValid.value && !done.value) return 'Escolha uma nova senha para sua conta.'
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
    invalidMessage.value = err.data?.message || 'Link inválido ou expirado.'
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
      error.value = err.data?.message || 'Não foi possível redefinir a senha.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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
</style>
