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
      <h2>Tudo pronto para começar</h2>
      <ul class="obrigado-list">
        <li>Dieta personalizada</li>
        <li>Bella IA no seu dia a dia</li>
        <li>Check-ins e acompanhamento</li>
      </ul>
      <p class="obrigado-note">Enviamos a confirmação no seu e-mail e WhatsApp.</p>
      <button type="button" class="obrigado-primary cf-squircle--control" @click="goNext">
        {{ loading ? 'Carregando…' : 'Começar agora' }}
      </button>
    </section>
  </div>
</template>

<script setup>
import { CheckCircle2, Sparkles } from 'lucide-vue-next'
import { isPatientPaidAccessActive } from '~/utils/patient-access'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { verifyAuthSession } = useAuthSession()
const { resolvePostLoginRoute } = usePatientOnboarding()
const { fetchMySubscription, subscription } = useBillingCheckout()

const loading = ref(false)
const accessExpiresAt = computed(() => subscription.value?.accessExpiresAt || null)

onMounted(async () => {
  await verifyAuthSession({ requiredRole: 'PACIENTE', force: true })
  await fetchMySubscription()
  const plan = subscription.value?.userPlan
  if (!isPatientPaidAccessActive(plan, subscription.value?.accessExpiresAt)) {
    await navigateTo('/assinatura', { replace: true })
  }
})

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR')
}

async function goNext() {
  loading.value = true
  try {
    const route = await resolvePostLoginRoute('/inicio')
    await navigateTo(route, { replace: true })
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
  padding: 1.5rem 0.5rem 1.25rem;
}

.obrigado-icon-wrap {
  width: 4.5rem;
  height: 4.5rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  background: rgba(139, 150, 124, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.obrigado-icon {
  width: 2.25rem;
  height: 2.25rem;
  color: var(--cf-green-dark, #6f7863);
}

.obrigado-hero h1 {
  margin: 0 0 0.5rem;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--cf-text, #141414);
}

.obrigado-hero p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--cf-text-muted, #525252);
}

.obrigado-access {
  margin-top: 0.65rem !important;
}

.obrigado-card {
  padding: 1.35rem 1.15rem;
  text-align: center;
}

.obrigado-card-icon {
  width: 1.35rem;
  height: 1.35rem;
  color: var(--cf-green, #8b967c);
  margin-bottom: 0.5rem;
}

.obrigado-card h2 {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.obrigado-list {
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--cf-text, #141414);
}

.obrigado-note {
  margin: 0 0 1.1rem;
  font-size: 0.78rem;
  color: var(--cf-text-muted, #525252);
}

.obrigado-primary {
  width: 100%;
  border: none;
  background: var(--cf-green-dark, #6f7863);
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.95rem 1rem;
  cursor: pointer;
}
</style>
