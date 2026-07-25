<template>
  <NuxtLayout name="dashboard">
    <div class="ig-page admin-shell">
      <header class="admin-shell-header ig-header">
        <div class="ig-header-copy">
          <h1>Conexão Instagram</h1>
          <p>Conecte sua conta profissional para responder comentários e stories com DM automática.</p>
        </div>
        <span class="ig-status-pill" :class="status.connected ? 'ig-status-pill--on' : 'ig-status-pill--off'">
          <span class="ig-status-dot" aria-hidden="true" />
          {{ status.connected ? 'Conectado' : 'Desconectado' }}
        </span>
      </header>

      <div class="ig-grid">
        <section class="admin-shell-card ig-main">
          <div v-if="loading" class="ig-state">
            <Loader class="ig-spin ig-icon-lg" aria-hidden="true" />
            <p>Verificando conexão…</p>
          </div>

          <div v-else-if="!status.appConfigured" class="ig-state">
            <AlertTriangle class="ig-icon-lg" aria-hidden="true" />
            <h2>App da Meta ainda não configurado</h2>
            <p>
              Falta preencher <code>INSTAGRAM_APP_ID</code>, <code>INSTAGRAM_APP_SECRET</code> e
              <code>INSTAGRAM_WEBHOOK_VERIFY_TOKEN</code> no <code>.env</code> do backend.
              Siga o guia da Meta antes de conectar.
            </p>
          </div>

          <div v-else-if="status.connected" class="ig-state ig-state--connected">
            <div class="ig-profile">
              <img v-if="status.profilePictureUrl" :src="status.profilePictureUrl" class="ig-avatar" alt="">
              <div v-else class="ig-avatar ig-avatar--fallback">
                <Instagram class="ig-icon-lg" />
              </div>
              <div>
                <p class="ig-kicker">Conta conectada</p>
                <h2>@{{ status.username }}</h2>
                <p v-if="status.tokenExpiresAt" class="ig-subline">
                  Acesso renovado automaticamente (expira {{ formatDate(status.tokenExpiresAt) }})
                </p>
              </div>
            </div>

            <div class="ig-actions">
              <NuxtLink to="/instagram/automacoes" class="btn-primary">
                Gerenciar automações
              </NuxtLink>
              <button type="button" class="btn-secondary" :disabled="actionLoading" @click="disconnect">
                <Loader v-if="actionLoading" class="ig-spin ig-icon-sm" />
                Desconectar
              </button>
            </div>
          </div>

          <div v-else class="ig-state ig-state--empty">
            <div class="ig-empty-icon" aria-hidden="true">
              <Instagram class="ig-icon-xl" />
            </div>
            <h2>Nenhuma conta conectada</h2>
            <p>Conecte a conta profissional que você quer automatizar. Você será levada ao Instagram para autorizar.</p>
            <button type="button" class="btn-primary" :disabled="actionLoading" @click="connect">
              <Loader v-if="actionLoading" class="ig-spin ig-icon-sm" />
              Conectar Instagram
            </button>
          </div>
        </section>

        <aside class="admin-shell-card ig-side">
          <h3>Como funciona</h3>
          <ul class="ig-tips">
            <li>
              <strong>Comentário → DM</strong>
              <span>Alguém comenta a palavra-chave no seu post ou reels e recebe sua mensagem no privado.</span>
            </li>
            <li>
              <strong>Story e DM</strong>
              <span>Também funciona quando respondem seu story ou mandam a palavra na DM.</span>
            </li>
            <li>
              <strong>Sem spam</strong>
              <span>Só responde quem interage — nada de mensagem em massa (isso derruba a conta).</span>
            </li>
            <li>
              <strong>Conexão oficial</strong>
              <span>Login direto pela Meta, sem senha salva aqui.</span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({ ssr: false })

import { ref, onMounted } from 'vue'
import { Instagram, Loader, AlertTriangle } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession'
import { useAppToast } from '~/composables/useAppToast'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const route = useRoute()
const { showToast } = useAppToast()

const loading = ref(true)
const actionLoading = ref(false)
const status = ref({ appConfigured: false, connected: false, username: null, profilePictureUrl: null, tokenExpiresAt: null })

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return ''
  }
}

async function loadStatus() {
  loading.value = true
  try {
    status.value = await $fetch(`${apiBase}/instagram/status`, authFetchInit())
  } catch (error) {
    console.error('[Instagram] Falha ao carregar status:', error)
    showToast({ type: 'error', title: 'Instagram', message: 'Não foi possível carregar o status da conexão.' })
  } finally {
    loading.value = false
  }
}

async function connect() {
  actionLoading.value = true
  try {
    const { url } = await $fetch(`${apiBase}/instagram/oauth/url`, authFetchInit())
    window.location.href = url
  } catch (error) {
    const message = error?.data?.message || 'Não foi possível iniciar a conexão.'
    showToast({ type: 'error', title: 'Instagram', message })
    actionLoading.value = false
  }
}

async function disconnect() {
  actionLoading.value = true
  try {
    await $fetch(`${apiBase}/instagram/disconnect`, authFetchInit({ method: 'POST' }))
    showToast({ type: 'success', title: 'Instagram', message: 'Conta desconectada.' })
    await loadStatus()
  } catch (error) {
    showToast({ type: 'error', title: 'Instagram', message: 'Falha ao desconectar.' })
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  if (route.query.conectado) {
    showToast({ type: 'success', title: 'Instagram', message: `Conta @${route.query.conectado} conectada!` })
  } else if (route.query.erro) {
    showToast({ type: 'error', title: 'Instagram', message: String(route.query.erro), duration: 8000 })
  }
  await loadStatus()
})
</script>

<style scoped>
.ig-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.ig-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: var(--cf-radius-pill);
  font-size: 0.85rem;
  font-weight: 600;
}

.ig-status-pill--on {
  background: rgba(46, 160, 92, 0.12);
  color: #1d7a44;
}

.ig-status-pill--off {
  background: rgba(120, 120, 120, 0.12);
  color: #6b6b6b;
}

.ig-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}

.ig-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

@media (max-width: 900px) {
  .ig-grid {
    grid-template-columns: 1fr;
  }
}

.ig-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
}

.ig-state--connected {
  align-items: stretch;
  text-align: left;
}

.ig-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ig-avatar {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.ig-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(120, 120, 120, 0.12);
}

.ig-kicker {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
  margin: 0;
}

.ig-subline {
  font-size: 0.85rem;
  opacity: 0.75;
  margin: 0.25rem 0 0;
}

.ig-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.ig-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: rgba(120, 120, 120, 0.1);
}

.ig-icon-sm { width: 1rem; height: 1rem; }
.ig-icon-lg { width: 2rem; height: 2rem; }
.ig-icon-xl { width: 2.5rem; height: 2.5rem; }

.ig-spin {
  animation: ig-rotate 0.9s linear infinite;
}

@keyframes ig-rotate {
  to { transform: rotate(360deg); }
}

.ig-tips {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.ig-tips li {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ig-tips span {
  font-size: 0.88rem;
  opacity: 0.8;
}
</style>
