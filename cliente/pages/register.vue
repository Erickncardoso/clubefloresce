<template>
  <div class="auth-container patient-login-mode patient-login-mode--scroll">
    <main class="patient-auth patient-auth--register">
      <div class="patient-auth-inner">
        <div class="patient-auth-card cf-squircle cf-squircle--surface">
          <header class="patient-auth-header">
            <NuxtLink to="/" class="back-link">
              <ArrowLeft class="back-link-icon" aria-hidden="true" />
              Voltar
            </NuxtLink>
            <h2>Criar sua conta</h2>
            <p>Cadastre-se e finalize o pagamento para liberar seu acesso ao Clube Florescer.</p>
          </header>

          <form class="auth-form patient-auth-form" @submit.prevent="handlePatientRequest">
            <div class="form-group field--float" :class="{ focused: focusedField === 'name' }">
              <label for="req-name">Nome completo</label>
              <div class="input-wrapper cf-squircle--control">
                <User class="input-icon" />
                <input
                  id="req-name"
                  v-model="patientForm.name"
                  type="text"
                  autocomplete="name"
                  required
                  @focus="focusedField = 'name'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group field--float" :class="{ focused: focusedField === 'email' }">
              <label for="req-email">E-mail</label>
              <div class="input-wrapper cf-squircle--control">
                <Mail class="input-icon" />
                <input
                  id="req-email"
                  v-model="patientForm.email"
                  type="email"
                  autocomplete="email"
                  required
                  @focus="focusedField = 'email'"
                  @blur="focusedField = ''"
                >
              </div>
            </div>

            <div class="form-group field--float field--float-password" :class="{ focused: focusedField === 'password' }">
              <label for="req-password">Senha</label>
              <div class="input-wrapper cf-squircle--control">
                <Lock class="input-icon" />
                <input
                  id="req-password"
                  v-model="patientForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
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
              <p class="field-hint">Mínimo 8 caracteres</p>
            </div>

            <div class="form-group field--float" :class="{ focused: focusedField === 'passwordConfirm' }">
              <label for="req-password-confirm">Confirmar senha</label>
              <div class="input-wrapper cf-squircle--control">
                <Lock class="input-icon" />
                <input
                  id="req-password-confirm"
                  v-model="patientForm.passwordConfirm"
                  :type="showPasswordConfirm ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  @focus="focusedField = 'passwordConfirm'"
                  @blur="focusedField = ''"
                >
                <button
                  type="button"
                  class="password-toggle-btn"
                  :aria-label="showPasswordConfirm ? 'Ocultar senha' : 'Mostrar senha'"
                  @click="showPasswordConfirm = !showPasswordConfirm"
                >
                  <EyeOff v-if="showPasswordConfirm" class="password-toggle-icon" />
                  <Eye v-else class="password-toggle-icon" />
                </button>
              </div>
            </div>

            <SharedCfPhoneInput
              v-model="patientForm.phone"
              input-id="req-phone"
              label="WhatsApp"
              hint="Obrigatório — usaremos para avisos da sua assinatura"
              required
              :focused="focusedField === 'phone'"
              @focus="focusedField = 'phone'"
              @blur="focusedField = ''"
            />

            <button type="submit" class="btn-auth-submit patient-auth-submit cf-squircle--control" :disabled="loading">
              <span v-if="loading">Criando conta...</span>
              <span v-else>Criar conta e ir ao pagamento</span>
            </button>

            <p v-if="error" class="error-banner cf-squircle cf-squircle--control" role="alert">
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
  </div>
</template>

<script setup>
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-vue-next'
import { parseInternationalPhone } from '~/utils/phone-countries.js'
import { applyVerifiedSessionUser } from '~/composables/useAuthSession.js'

definePageMeta({ layout: false, pageTransition: false })

const apiBase = useApiBase()
const authApiBase = computed(() => `${apiBase.value}/auth`)
const { persistSession } = usePatientApp()
const patientAuth = usePatientAuth()

const loading = ref(false)
const error = ref('')
const focusedField = ref('')
const showPassword = ref(false)
const showPasswordConfirm = ref(false)

const patientForm = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  phone: '',
})

const handlePatientRequest = async () => {
  error.value = ''

  if (patientForm.password.length < 8) {
    error.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }

  if (patientForm.password !== patientForm.passwordConfirm) {
    error.value = 'As senhas não coincidem.'
    return
  }

  const phone = patientForm.phone.trim()
  if (!phone) {
    error.value = 'Informe seu WhatsApp.'
    return
  }

  const parsedPhone = parseInternationalPhone(phone)
  if (!parsedPhone.nationalDigits || parsedPhone.nationalDigits.length < 10) {
    error.value = 'Informe um WhatsApp válido com DDD.'
    return
  }

  loading.value = true
  try {
    const data = await $fetch(`${authApiBase.value}/patient-registration-request`, {
      method: 'POST',
      credentials: 'include',
      body: {
        name: patientForm.name,
        email: patientForm.email,
        password: patientForm.password,
        passwordConfirm: patientForm.passwordConfirm,
        phone,
      },
    })

    if (data?.user) {
      applyVerifiedSessionUser(data.user)
      patientAuth.markSessionActive()
      persistSession({
        name: data.user.name,
        avatar: data.user.avatar,
        createdAt: data.user.createdAt,
      })
    }

    await navigateTo(data?.redirectTo || '/assinatura', { replace: true })
  } catch (err) {
    error.value = err.data?.message || 'Não foi possível criar sua conta. Tente novamente.'
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
  margin-bottom: 0.85rem;
  color: var(--cf-text-muted, #525252);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.back-link-icon {
  width: 1rem;
  height: 1rem;
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
  background: var(--cf-green-soft, #eef0eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--cf-green-dark, #6f7863);
}

.success-back-btn {
  margin-top: 1.25rem;
  text-decoration: none;
}
</style>
