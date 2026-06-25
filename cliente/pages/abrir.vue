<template>
  <div class="auth-container patient-login-mode">
    <main class="patient-auth">
      <div class="patient-auth-inner">
        <div class="patient-auth-card cf-squircle cf-squircle--surface">
          <div class="patient-success-inline">
            <PatientLoadingLogo size="lg" :animated="checking" class="patient-auth-logo-mark" />
            <h2>{{ checking ? 'Abrindo...' : 'Bem-vinda ao Clube Florescer' }}</h2>

            <p v-if="checking" class="open-app-lead">
              Preparando seu acesso...
            </p>

            <template v-else>
              <p v-if="installedAppDetected" class="open-app-lead open-app-lead--highlight">
                Detectamos o app instalado no seu celular. Se ele não abriu sozinho, toque no ícone
                <strong>Clube Florescer</strong> na tela inicial.
              </p>

              <p v-else-if="isIos" class="open-app-lead">
                Se você já adicionou o app à tela inicial, abra pelo ícone
                <strong>Clube Florescer</strong>. Caso contrário, entre pelo navegador abaixo.
              </p>

              <p v-else class="open-app-lead">
                Toque em entrar para abrir no navegador com o e-mail e a senha que você cadastrou.
              </p>

              <button
                type="button"
                class="btn-auth-submit patient-auth-submit patient-auth-submit--inline cf-squircle--control"
                @click="goToLogin"
              >
                Entrar agora
              </button>

              <p v-if="isIos" class="open-app-hint">
                Dica: no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início para instalar o app.
              </p>
            </template>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { isStandalonePwa } from '~/utils/pwa-standalone'

definePageMeta({ layout: false, pageTransition: false })

useSeoMeta({
  title: 'Clube Florescer',
  ogTitle: 'Clube Florescer',
  description: 'Toque para abrir o app e entrar com seu e-mail e senha.',
  ogDescription: 'Toque para abrir o app e entrar com seu e-mail e senha.',
  ogType: 'website',
  ogImage: '/pwa/apple-touch-icon.png',
})

const { ensurePatientSession } = usePatientAuth()

const checking = ref(true)
const isIos = ref(false)
const installedAppDetected = ref(false)

async function goToLogin() {
  const valid = await ensurePatientSession()
  await navigateTo(valid ? '/inicio' : '/', { replace: true })
}

onMounted(async () => {
  if (import.meta.client) {
    const ua = window.navigator.userAgent || ''
    isIos.value = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  if (isStandalonePwa()) {
    await goToLogin()
    return
  }

  if (import.meta.client && 'getInstalledRelatedApps' in navigator) {
    try {
      const apps = await navigator.getInstalledRelatedApps()
      installedAppDetected.value = apps.length > 0
    } catch {
      installedAppDetected.value = false
    }
  }

  checking.value = false
})
</script>

<style scoped>
.open-app-lead {
  margin: 0 0 1.25rem;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--cf-text-muted);
  text-align: center;
}

.open-app-lead--highlight {
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: #f4f7f5;
  border: 1px solid #e2e8e4;
  color: var(--cf-text);
}

.open-app-hint {
  margin: 1rem 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #9ca3af;
  text-align: center;
}
</style>
