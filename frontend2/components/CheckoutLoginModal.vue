<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="cko-login-overlay patient-login-mode"
      @click.self="close"
    >
      <div
        class="cko-login-card cf-squircle cf-squircle--surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cko-login-title"
      >
        <button type="button" class="cko-login-close" aria-label="Fechar" @click="close">
          <X />
        </button>

        <h2 id="cko-login-title">{{ mustChangePassword ? 'Nova senha' : 'Entrar' }}</h2>
        <p class="cko-login-sub">
          {{ mustChangePassword
            ? 'Por segurança, crie uma nova senha para continuar.'
            : 'Use seu e-mail e senha do Clube Florescer.' }}
        </p>

        <form v-if="!mustChangePassword" class="patient-auth-form" novalidate @submit.prevent="submitLogin">
          <div class="form-group field--float" :class="{ focused: focusedField === 'email' || !!form.email }">
            <label for="cko-login-email">E-mail</label>
            <div class="input-wrapper cf-squircle--control">
              <input
                id="cko-login-email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="seu@email.com"
                @focus="focusedField = 'email'"
                @blur="focusedField = ''"
              >
            </div>
          </div>

          <div class="form-group field--float" :class="{ focused: focusedField === 'password' || !!form.password }">
            <label for="cko-login-password">Senha</label>
            <div class="input-wrapper cf-squircle--control">
              <input
                id="cko-login-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Sua senha"
                @focus="focusedField = 'password'"
                @blur="focusedField = ''"
              >
              <button
                type="button"
                class="cko-login-eye"
                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" />
                <Eye v-else />
              </button>
            </div>
          </div>

          <p v-if="error" class="cko-login-error" role="alert">{{ error }}</p>
          <button type="submit" class="btn-auth-submit patient-auth-submit cf-squircle--control" :disabled="loading">
            {{ loading ? 'Entrando…' : 'Entrar' }}
          </button>
          <NuxtLink to="/esqueci-senha" class="cko-login-forgot">Esqueci a senha</NuxtLink>
        </form>

        <form v-else class="patient-auth-form" novalidate @submit.prevent="submitNewPassword">
          <div class="form-group field--float" :class="{ focused: focusedField === 'newPassword' || !!firstAccess.newPassword }">
            <label for="cko-login-new">Nova senha</label>
            <div class="input-wrapper cf-squircle--control">
              <input
                id="cko-login-new"
                v-model="firstAccess.newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Mínimo 6 caracteres"
                @focus="focusedField = 'newPassword'"
                @blur="focusedField = ''"
              >
            </div>
          </div>
          <div class="form-group field--float" :class="{ focused: focusedField === 'confirmPassword' || !!firstAccess.confirmPassword }">
            <label for="cko-login-confirm">Confirmar senha</label>
            <div class="input-wrapper cf-squircle--control">
              <input
                id="cko-login-confirm"
                v-model="firstAccess.confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Repita a senha"
                @focus="focusedField = 'confirmPassword'"
                @blur="focusedField = ''"
              >
            </div>
          </div>
          <p v-if="error" class="cko-login-error" role="alert">{{ error }}</p>
          <button type="submit" class="btn-auth-submit patient-auth-submit cf-squircle--control" :disabled="loading">
            {{ loading ? 'Salvando…' : 'Salvar e continuar' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { Eye, EyeOff, X } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError, sanitizeUserFacingError } from '~/utils/resolve-api-base.mjs'
import {
  applyVerifiedSessionUser,
  getLegacyAuthToken,
  logoutAuthSession,
} from '~/composables/useAuthSession.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  email: { type: String, default: '' },
})

const emit = defineEmits(['close', 'success'])

const apiBase = useApiBase()
const { persistSession, clearPatientSession } = usePatientApp()
const patientAuth = usePatientAuth()

const form = reactive({ email: '', password: '' })
const firstAccess = reactive({ newPassword: '', confirmPassword: '' })
const focusedField = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const mustChangePassword = ref(false)

watch(
  () => [props.open, props.email],
  () => {
    if (!props.open) return
    form.email = String(props.email || '').trim()
    form.password = ''
    error.value = ''
    mustChangePassword.value = false
    firstAccess.newPassword = ''
    firstAccess.confirmPassword = ''
  },
)

function close() {
  if (loading.value) return
  emit('close')
}

async function submitLogin() {
  error.value = ''
  if (!String(form.email || '').trim()) {
    error.value = 'Informe seu e-mail.'
    return
  }
  if (!String(form.password || '')) {
    error.value = 'Informe sua senha.'
    return
  }

  loading.value = true
  try {
    await logoutAuthSession(apiBase.value)
    const data = await $fetch(`${apiBase.value}/auth/login`, {
      method: 'POST',
      body: { email: form.email, password: form.password },
      credentials: 'include',
    })
    if (data.user?.role === 'NUTRICIONISTA') {
      clearPatientSession()
      error.value = 'Esta versão é exclusiva para pacientes.'
      return
    }
    applyVerifiedSessionUser(data.user)
    patientAuth.markSessionActive()
    persistSession({
      name: data.user.name,
      avatar: data.user.avatar,
      createdAt: data.user.createdAt,
    })
    if (data.mustChangePassword) {
      mustChangePassword.value = true
      return
    }
    emit('success')
  } catch (err) {
    if (isApiConnectionError(err)) {
      error.value = apiConnectionErrorMessage({
        dev: import.meta.dev,
        hostname: import.meta.client ? window.location.hostname : undefined,
      })
    } else if (err?.data?.message) {
      error.value = sanitizeUserFacingError(err.data.message)
    } else if (err?.statusCode === 401) {
      error.value = 'E-mail ou senha inválidos.'
    } else {
      error.value = 'Não foi possível entrar. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}

async function submitNewPassword() {
  if (!firstAccess.newPassword || firstAccess.newPassword.length < 6) {
    error.value = 'A nova senha precisa ter pelo menos 6 caracteres.'
    return
  }
  if (firstAccess.newPassword !== firstAccess.confirmPassword) {
    error.value = 'A confirmação precisa ser igual à nova senha.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const token = getLegacyAuthToken()
    await $fetch(`${apiBase.value}/auth/first-access/change-password`, {
      method: 'POST',
      credentials: 'include',
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      body: { newPassword: firstAccess.newPassword },
    })
    emit('success')
  } catch (err) {
    error.value = err?.data?.message || 'Não foi possível atualizar a senha.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cko-login-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  background: rgba(18, 22, 20, 0.42);
}

.cko-login-card {
  position: relative;
  width: min(100%, 22.5rem);
  padding: 1.35rem 1.2rem 1.2rem;
  background: var(--cf-surface, #fff);
  box-shadow: 0 16px 40px rgba(20, 24, 22, 0.18);
}

.cko-login-card :deep(.patient-auth-form) {
  width: 100%;
  margin-top: 0.15rem;
}

.cko-login-card :deep(.form-group),
.cko-login-card :deep(.input-wrapper),
.cko-login-card :deep(.btn-auth-submit) {
  width: 100%;
  box-sizing: border-box;
}

.cko-login-card :deep(.input-wrapper input) {
  appearance: none;
  -webkit-appearance: none;
}

.cko-login-close {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  display: inline-flex;
  border: none;
  background: transparent;
  color: var(--cf-text-muted);
  cursor: pointer;
  padding: 0.2rem;
}

.cko-login-close svg {
  width: 1.15rem;
  height: 1.15rem;
}

.cko-login-card h2 {
  margin: 0 1.75rem 0.3rem 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.cko-login-sub {
  margin: 0 0 1.15rem;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--cf-text-muted);
}

.cko-login-eye {
  border: none;
  background: transparent;
  padding: 0.2rem;
  color: #aaa;
  cursor: pointer;
  flex-shrink: 0;
}

.cko-login-eye svg {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}

.cko-login-forgot {
  display: block;
  margin: 0.2rem 0 0;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--cf-pink, #c17b80);
  text-decoration: none;
}

.cko-login-error {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.35;
  color: #b42318;
}

@media (min-width: 640px) {
  .cko-login-overlay {
    align-items: center;
  }
}
</style>
