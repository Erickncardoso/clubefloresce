<template>
  <div class="patient-page obrigado-page">
    <div class="obrigado-hero">
      <div class="obrigado-icon-wrap" aria-hidden="true">
        <CheckCircle2 class="obrigado-icon" />
      </div>
      <h1>Bem-vinda ao Clube Florescer!</h1>
      <p>Seu pagamento foi confirmado e seu acesso está liberado.</p>
      <p v-if="accessExpiresAt" class="obrigado-access">
        Válido até <strong>{{ formatDate(accessExpiresAt) }}</strong>
      </p>
    </div>

    <section class="obrigado-card cf-squircle cf-squircle--surface">
      <Sparkles class="obrigado-card-icon" aria-hidden="true" />
      <h2>{{ isGuest ? 'Entre para começar' : 'Tudo pronto para começar' }}</h2>
      <ul class="obrigado-list">
        <li>Dieta personalizada</li>
        <li>Bella IA no seu dia a dia</li>
        <li>Check-ins e acompanhamento</li>
      </ul>

      <template v-if="isGuest">
        <p class="obrigado-note">
          Use o e-mail
          <strong v-if="guestEmail">{{ guestEmail }}</strong>
          <span v-else>do pagamento</span>
          para entrar. Se for a primeira vez, use
          <NuxtLink to="/esqueci-senha" class="obrigado-link">esqueci a senha</NuxtLink>
          para criar uma senha.
        </p>
        <button type="button" class="obrigado-primary cf-squircle--control" @click="goLogin">
          Ir para o login
        </button>
        <NuxtLink
          :to="forgotPasswordTo"
          class="obrigado-secondary"
        >
          Esqueci a senha
        </NuxtLink>
      </template>

      <template v-else>
        <p class="obrigado-note">Enviamos a confirmação no seu e-mail e WhatsApp.</p>
        <button type="button" class="obrigado-primary cf-squircle--control" @click="goNext">
          {{ loading ? 'Carregando…' : 'Começar agora' }}
        </button>
      </template>
    </section>

    <div v-if="showAppModal" class="app-modal-overlay">
      <div class="app-modal-card cf-squircle cf-squircle--surface">
        <div class="obrigado-icon-wrap" aria-hidden="true">
          <CheckCircle2 class="obrigado-icon" />
        </div>
        <h2>Pagamento confirmado!</h2>
        <p>Toque abaixo para voltar ao app Clube Florescer.</p>
        <button type="button" class="obrigado-primary cf-squircle--control" @click="openApp">
          Abrir app Clube Florescer
        </button>
        <button type="button" class="app-modal-dismiss" @click="showAppModal = false">
          Continuar aqui pelo navegador
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { CheckCircle2, Sparkles } from 'lucide-vue-next'
import { isPatientPaidAccessActive } from '~/utils/patient-access'
import {
  appleItunesAppMetaContent,
  openNativeAppOrStore,
} from '~/utils/native-app-links'

definePageMeta({ layout: 'patient' })

const route = useRoute()
const { verifyAuthSession } = useAuthSession()
const { resolvePostLoginRoute } = usePatientOnboarding()
const { fetchMySubscription, subscription } = useBillingCheckout()

const loading = ref(false)
const showAppModal = ref(false)
const sessionUser = ref(null)

useHead(() => ({
  meta: [{
    key: 'apple-itunes-app',
    name: 'apple-itunes-app',
    content: appleItunesAppMetaContent('/assinatura/obrigado'),
  }],
  title: 'Pagamento confirmado — Clube Florescer',
}))

const guestEmail = computed(() => String(route.query.email || '').trim().toLowerCase())
const isGuest = computed(() => !sessionUser.value?.id)
const accessExpiresAt = computed(() => subscription.value?.accessExpiresAt || null)
const forgotPasswordTo = computed(() => (
  guestEmail.value
    ? { path: '/esqueci-senha', query: { email: guestEmail.value } }
    : '/esqueci-senha'
))

onMounted(async () => {
  if (sessionStorage.getItem('cf_from_app') === '1') {
    sessionStorage.removeItem('cf_from_app')
    showAppModal.value = true
  }

  const user = await verifyAuthSession({ requiredRole: 'PACIENTE', force: false })
  sessionUser.value = user

  if (!user?.id) return

  await fetchMySubscription().catch(() => {})
  const plan = subscription.value?.userPlan
  if (!isPatientPaidAccessActive(plan, subscription.value?.accessExpiresAt)) {
    await navigateTo('/assinatura', { replace: true })
  }
})

function openApp() {
  openNativeAppOrStore()
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR')
}

async function goLogin() {
  const query = guestEmail.value ? { email: guestEmail.value } : undefined
  await navigateTo({ path: '/', query }, { replace: true })
}

async function goNext() {
  loading.value = true
  try {
    const next = await resolvePostLoginRoute('/inicio')
    await navigateTo(next, { replace: true })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.obrigado-page {
  min-height: 100dvh;
  padding: 1.25rem 1rem 2rem;
  background: linear-gradient(180deg, #eef0eb 0%, #f7f8f5 38%, #fff 100%);
}

.obrigado-hero {
  text-align: center;
  margin-bottom: 1.25rem;
}

.obrigado-icon-wrap {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto 0.85rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(139, 150, 124, 0.16);
}

.obrigado-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--cf-pink, #8b967c);
}

.obrigado-hero h1 {
  margin: 0 0 0.4rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--cf-text, #1f211c);
}

.obrigado-hero p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--cf-text-muted, #6f7863);
}

.obrigado-access {
  margin-top: 0.5rem !important;
}

.obrigado-card {
  padding: 1.15rem 1rem 1.2rem;
  background: #fff;
  border: 1px solid var(--cf-border, #e5e5ea);
  text-align: center;
}

.obrigado-card-icon {
  width: 1.35rem;
  height: 1.35rem;
  margin: 0 auto 0.55rem;
  color: var(--cf-pink, #8b967c);
}

.obrigado-card h2 {
  margin: 0 0 0.65rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--cf-text, #1f211c);
}

.obrigado-list {
  margin: 0 0 0.85rem;
  padding: 0;
  list-style: none;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--cf-text-muted, #6f7863);
}

.obrigado-list li::before {
  content: '✓ ';
  color: var(--cf-pink, #8b967c);
  font-weight: 700;
}

.obrigado-note {
  margin: 0 0 0.95rem;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--cf-text-muted, #6f7863);
}

.obrigado-link {
  color: var(--cf-pink, #8b967c);
  font-weight: 700;
  text-decoration: underline;
}

.obrigado-primary {
  width: 100%;
  min-height: 2.75rem;
  border: none;
  border-radius: var(--cf-radius-control, 12px);
  background: var(--cf-pink, #8b967c);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.obrigado-secondary {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--cf-pink, #8b967c);
  text-decoration: none;
}

.app-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 7000;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.55);
}

.app-modal-card {
  width: 100%;
  max-width: 20rem;
  padding: 1.25rem 1.1rem;
  background: #fff;
  text-align: center;
}

.app-modal-dismiss {
  margin-top: 0.65rem;
  border: none;
  background: transparent;
  color: var(--cf-text-muted, #6f7863);
  font-size: 0.8rem;
  cursor: pointer;
}
</style>
