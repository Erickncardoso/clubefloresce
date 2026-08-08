<template>
  <NuxtLayout name="dashboard">
    <div class="iga-page admin-shell">
      <header class="admin-shell-header iga-header">
        <div>
          <h1>Automações do Instagram</h1>
          <p>Palavra-chave no comentário, story ou DM → mensagem automática com seu link.</p>
        </div>
        <button v-if="!showForm" type="button" class="btn-primary" @click="startCreate">
          Nova automação
        </button>
      </header>

      <!-- Formulário criar/editar -->
      <section v-if="showForm" class="admin-shell-card iga-form-card admin-form-fields">
        <h2>{{ editingId ? 'Editar automação' : 'Nova automação' }}</h2>

        <div class="iga-form-grid">
          <div class="field field--float">
            <label for="iga-name">Nome da automação</label>
            <input id="iga-name" v-model="form.name" type="text" placeholder="Ex.: Ebook receitas fit">
          </div>

          <div class="field field--float">
            <label for="iga-keywords">Palavras-chave (separadas por vírgula)</label>
            <input id="iga-keywords" v-model="keywordsText" type="text" placeholder="EBOOK, QUERO, RECEITA">
          </div>

          <div class="field field--float">
            <label for="iga-match">Tipo de correspondência</label>
            <SharedCfSelect
              id="iga-match"
              v-model="form.matchType"
              :options="[
                { value: 'CONTAINS', label: 'Contém a palavra (recomendado)' },
                { value: 'EXACT', label: 'Comentário exatamente igual' },
              ]"
            />
          </div>

          <div class="field field--float">
            <label for="iga-media">Post/reels específico (opcional)</label>
            <SharedCfSelect
              id="iga-media"
              v-model="form.targetMediaId"
              :options="mediaOptions"
              placeholder="Qualquer post ou reels"
            />
          </div>
        </div>

        <fieldset class="iga-triggers">
          <legend>Onde essa automação escuta</legend>
          <label class="iga-check">
            <input v-model="form.triggerComment" type="checkbox">
            <span>Comentários em posts/reels</span>
          </label>
          <label class="iga-check">
            <input v-model="form.triggerStory" type="checkbox">
            <span>Respostas de story</span>
          </label>
          <label class="iga-check">
            <input v-model="form.triggerDm" type="checkbox">
            <span>Mensagens na DM</span>
          </label>
        </fieldset>

        <div class="field field--float">
          <label for="iga-welcome">Mensagem de boas-vindas (DM)</label>
          <textarea
            id="iga-welcome"
            v-model="form.welcomeMessage"
            rows="3"
            placeholder="Oi! Vi seu comentário 💚 Toca no botão abaixo que te mando o link."
          />
        </div>

        <div class="iga-form-grid">
          <div class="field field--float">
            <label for="iga-quick">Texto do botão de resposta rápida</label>
            <input id="iga-quick" v-model="form.quickReplyLabel" type="text" maxlength="20" placeholder="Quero o link!">
          </div>

          <div class="field field--float">
            <label for="iga-public">Respostas públicas no comentário (uma por linha, sorteia)</label>
            <textarea
              id="iga-public"
              v-model="publicRepliesText"
              rows="2"
              placeholder="Te chamei na DM! 💌&#10;Olha o privado 😉"
            />
          </div>
        </div>

        <h3 class="iga-section-title">Depois que a pessoa toca no botão</h3>
        <div class="iga-form-grid">
          <div class="field field--float">
            <label for="iga-link-text">Texto da mensagem com o link</label>
            <textarea id="iga-link-text" v-model="form.linkText" rows="2" placeholder="Aqui está! 👇" />
          </div>
          <div class="field field--float">
            <label for="iga-link-url">Link (URL)</label>
            <input id="iga-link-url" v-model="form.linkUrl" type="url" placeholder="https://clubeflorescer.com.br/...">
          </div>
          <div class="field field--float">
            <label for="iga-link-btn">Texto do botão do link</label>
            <input id="iga-link-btn" v-model="form.linkButtonLabel" type="text" maxlength="20" placeholder="Acessar">
          </div>
        </div>

        <h3 class="iga-section-title">Lembrete (se a pessoa não voltar)</h3>
        <div class="iga-form-grid">
          <div class="field field--float">
            <label for="iga-reminder">Mensagem de lembrete (opcional)</label>
            <textarea id="iga-reminder" v-model="form.reminderText" rows="2" placeholder="Ainda tá aí? Seu link continua te esperando 💚" />
          </div>
          <div class="field field--float">
            <label for="iga-delay">Enviar lembrete após (minutos)</label>
            <input id="iga-delay" v-model.number="form.reminderDelayMinutes" type="number" min="1">
          </div>
        </div>

        <div class="iga-form-actions">
          <button type="button" class="btn-primary" :disabled="saving" @click="save">
            <Loader v-if="saving" class="iga-spin iga-icon-sm" />
            {{ editingId ? 'Salvar alterações' : 'Criar automação' }}
          </button>
          <button type="button" class="btn-secondary" :disabled="saving" @click="cancelForm">
            Cancelar
          </button>
        </div>
      </section>

      <!-- Lista -->
      <section v-if="!showForm" class="iga-list">
        <div v-if="loading" class="admin-shell-card iga-empty">
          <Loader class="iga-spin iga-icon-lg" aria-hidden="true" />
          <p>Carregando automações…</p>
        </div>

        <div v-else-if="!automations.length" class="admin-shell-card iga-empty">
          <Zap class="iga-icon-lg" aria-hidden="true" />
          <h2>Nenhuma automação ainda</h2>
          <p>Crie a primeira: escolha uma palavra-chave e a mensagem que a pessoa recebe na DM.</p>
          <button type="button" class="btn-primary" @click="startCreate">Criar automação</button>
        </div>

        <article v-for="automation in automations" :key="automation.id" class="admin-shell-card iga-item">
          <div class="iga-item-main">
            <div class="iga-item-head">
              <h2>{{ automation.name }}</h2>
              <span class="iga-badge" :class="automation.active ? 'iga-badge--on' : 'iga-badge--off'">
                {{ automation.active ? 'Ativa' : 'Pausada' }}
              </span>
            </div>
            <p class="iga-item-keywords">
              <strong>Palavras:</strong>
              <span v-for="keyword in automation.keywords" :key="keyword" class="iga-chip">{{ keyword }}</span>
            </p>
            <p class="iga-item-meta">
              {{ triggerSummary(automation) }}
              <template v-if="automation.targetMediaId"> · post específico</template>
              <template v-else> · todos os posts</template>
            </p>
          </div>

          <SharedCfTileActionsMenu :menu-key="`iga-${automation.id}`" class="iga-item-menu">
            <button type="button" class="cf-tile-actions-item cf-tile-actions-item--edit" role="menuitem" @click="startEdit(automation)">
              Editar
            </button>
            <button type="button" class="cf-tile-actions-item" role="menuitem" @click="toggleActive(automation)">
              {{ automation.active ? 'Pausar' : 'Ativar' }}
            </button>
            <button type="button" class="cf-tile-actions-item cf-tile-actions-item--danger" role="menuitem" @click="remove(automation)">
              Excluir
            </button>
          </SharedCfTileActionsMenu>
        </article>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({ ssr: false })

import { ref, computed, onMounted } from 'vue'
import { Loader, Zap } from 'lucide-vue-next'
import { authFetchInit } from '~/composables/useAuthSession'
import { useAppToast } from '~/composables/useAppToast'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { showToast } = useAppToast()

const loading = ref(true)
const saving = ref(false)
const automations = ref([])
const media = ref([])
const showForm = ref(false)
const editingId = ref(null)

const emptyForm = () => ({
  name: '',
  active: true,
  triggerComment: true,
  triggerStory: false,
  triggerDm: false,
  matchType: 'CONTAINS',
  targetMediaId: '',
  welcomeMessage: '',
  quickReplyLabel: 'Quero o link!',
  linkText: '',
  linkButtonLabel: 'Acessar',
  linkUrl: '',
  reminderText: '',
  reminderDelayMinutes: 60,
})

const form = ref(emptyForm())
const keywordsText = ref('')
const publicRepliesText = ref('')

const mediaOptions = computed(() => [
  { value: '', label: 'Qualquer post ou reels' },
  ...media.value.map((item) => ({
    value: item.id,
    label: `${item.media_type === 'VIDEO' ? '🎬' : '📷'} ${(item.caption || 'Sem legenda').slice(0, 60)}`,
  })),
])

function triggerSummary(automation) {
  const parts = []
  if (automation.triggerComment) parts.push('comentários')
  if (automation.triggerStory) parts.push('stories')
  if (automation.triggerDm) parts.push('DMs')
  return parts.length ? `Escuta ${parts.join(', ')}` : 'Sem gatilho ativo'
}

async function loadAutomations() {
  loading.value = true
  try {
    const data = await $fetch(`${apiBase}/instagram/automations`, authFetchInit())
    automations.value = data.automations || []
  } catch (error) {
    console.error('[Instagram] Falha ao listar automações:', error)
    showToast({ type: 'error', title: 'Instagram', message: 'Não foi possível carregar as automações.' })
  } finally {
    loading.value = false
  }
}

async function loadMedia() {
  try {
    const data = await $fetch(`${apiBase}/instagram/media`, authFetchInit())
    media.value = data.media || []
  } catch {
    media.value = [] // conta desconectada — o select fica só com "qualquer post"
  }
}

function startCreate() {
  form.value = emptyForm()
  keywordsText.value = ''
  publicRepliesText.value = ''
  editingId.value = null
  showForm.value = true
}

function startEdit(automation) {
  form.value = {
    ...emptyForm(),
    ...automation,
    targetMediaId: automation.targetMediaId || '',
    linkText: automation.linkText || '',
    linkButtonLabel: automation.linkButtonLabel || 'Acessar',
    linkUrl: automation.linkUrl || '',
    reminderText: automation.reminderText || '',
  }
  keywordsText.value = (automation.keywords || []).join(', ')
  publicRepliesText.value = (automation.publicReplyVariations || []).join('\n')
  editingId.value = automation.id
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
}

function buildPayload() {
  return {
    ...form.value,
    targetMediaId: form.value.targetMediaId || null,
    keywords: keywordsText.value.split(',').map((k) => k.trim()).filter(Boolean),
    publicReplyVariations: publicRepliesText.value.split('\n').map((l) => l.trim()).filter(Boolean),
  }
}

async function save() {
  const payload = buildPayload()
  if (!payload.name) return showToast({ type: 'error', title: 'Instagram', message: 'Dê um nome para a automação.' })
  if (!payload.keywords.length) return showToast({ type: 'error', title: 'Instagram', message: 'Informe ao menos uma palavra-chave.' })
  if (!payload.welcomeMessage.trim()) return showToast({ type: 'error', title: 'Instagram', message: 'Escreva a mensagem de boas-vindas.' })

  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`${apiBase}/instagram/automations/${editingId.value}`, authFetchInit({ method: 'PUT', body: payload }))
    } else {
      await $fetch(`${apiBase}/instagram/automations`, authFetchInit({ method: 'POST', body: payload }))
    }
    showToast({ type: 'success', title: 'Instagram', message: editingId.value ? 'Automação atualizada.' : 'Automação criada!' })
    showForm.value = false
    await loadAutomations()
  } catch (error) {
    const message = error?.data?.message || 'Falha ao salvar a automação.'
    showToast({ type: 'error', title: 'Instagram', message })
  } finally {
    saving.value = false
  }
}

async function toggleActive(automation) {
  try {
    await $fetch(`${apiBase}/instagram/automations/${automation.id}/toggle`, authFetchInit({
      method: 'PATCH',
      body: { active: !automation.active },
    }))
    await loadAutomations()
  } catch {
    showToast({ type: 'error', title: 'Instagram', message: 'Falha ao alterar o status.' })
  }
}

async function remove(automation) {
  if (!window.confirm(`Excluir a automação "${automation.name}"?`)) return
  try {
    await $fetch(`${apiBase}/instagram/automations/${automation.id}`, authFetchInit({ method: 'DELETE' }))
    showToast({ type: 'success', title: 'Instagram', message: 'Automação excluída.' })
    await loadAutomations()
  } catch {
    showToast({ type: 'error', title: 'Instagram', message: 'Falha ao excluir.' })
  }
}

onMounted(async () => {
  await Promise.all([loadAutomations(), loadMedia()])
})
</script>

<style scoped>
.iga-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.iga-form-card h2 {
  margin-top: 0;
}

.iga-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem 1.25rem;
  width: 100%;
}

.iga-section-title {
  margin: 1.25rem 0 0.5rem;
  font-size: 1rem;
}

.iga-triggers {
  border: none;
  margin: 0.75rem 0;
  padding: 0;
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.iga-triggers legend {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.iga-check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.92rem;
  cursor: pointer;
}

.iga-form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.iga-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.iga-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
}

.iga-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.iga-item-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.iga-item-head h2 {
  margin: 0;
  font-size: 1.05rem;
}

.iga-badge {
  padding: 0.15rem 0.7rem;
  border-radius: var(--cf-radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
}

.iga-badge--on {
  background: rgba(46, 160, 92, 0.12);
  color: #1d7a44;
}

.iga-badge--off {
  background: rgba(120, 120, 120, 0.12);
  color: #6b6b6b;
}

.iga-item-keywords {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin: 0.5rem 0 0.25rem;
  font-size: 0.9rem;
}

.iga-chip {
  padding: 0.1rem 0.6rem;
  border-radius: var(--cf-radius-pill);
  background: rgba(120, 120, 120, 0.1);
  font-size: 0.8rem;
}

.iga-item-meta {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.75;
}

.iga-icon-sm { width: 1rem; height: 1rem; }
.iga-icon-lg { width: 2rem; height: 2rem; }

.iga-spin {
  animation: iga-rotate 0.9s linear infinite;
}

@keyframes iga-rotate {
  to { transform: rotate(360deg); }
}
</style>
