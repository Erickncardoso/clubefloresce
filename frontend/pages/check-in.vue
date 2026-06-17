<template>
  <NuxtLayout name="dashboard">
    <div class="checkin-admin admin-shell">
      <header class="admin-shell-header">
        <div>
          <h1>Check-ins</h1>
          <p>Crie tipos de check-in personalizados e acompanhe as respostas das alunas.</p>
        </div>
      </header>

      <section class="checkin-dispatch-card admin-shell-card">
        <div class="checkin-dispatch-copy">
          <h2>Disparo semanal</h2>
          <p>
            Toda <strong>sexta-feira às 11h</strong> o sistema envia o check-in para todas as pacientes
            que ainda não responderam. Você também pode disparar manualmente agora.
          </p>
          <p v-if="dispatchStatus.dispatched" class="checkin-dispatch-note">
            Disparo desta semana já realizado.
          </p>
        </div>
        <button
          type="button"
          class="btn-primary checkin-dispatch-btn"
          :disabled="dispatching"
          @click="dispatchWeeklyCheckIn"
        >
          {{ dispatching ? 'Enviando...' : 'Disparar check-in agora' }}
        </button>
        <p v-if="dispatchMessage" class="checkin-dispatch-feedback">{{ dispatchMessage }}</p>
      </section>

      <nav class="checkin-tabs" aria-label="Seções de check-in">
        <button
          type="button"
          class="checkin-tab"
          :class="{ 'checkin-tab--active': activeTab === 'responses' }"
          @click="activeTab = 'responses'"
        >
          Respostas
        </button>
        <button
          type="button"
          class="checkin-tab"
          :class="{ 'checkin-tab--active': activeTab === 'templates' }"
          @click="activeTab = 'templates'"
        >
          Tipos de check-in
        </button>
      </nav>

      <!-- Respostas -->
      <section v-if="activeTab === 'responses'" class="checkin-section">
        <div class="nutri-toolbar">
          <div class="nutri-search">
            <Search class="nutri-search-icon" />
            <input
              v-model="responseSearch"
              type="search"
              placeholder="Buscar aluna ou check-in..."
              aria-label="Buscar respostas"
            >
          </div>
          <span class="nutri-count">{{ filteredResponses.length }} resposta{{ filteredResponses.length === 1 ? '' : 's' }}</span>
        </div>

        <div v-if="loadingResponses" class="loading-row">Carregando respostas...</div>

        <div v-else-if="!filteredResponses.length" class="nutri-empty admin-shell-card">
          <p>Nenhuma resposta ainda.</p>
          <span>Quando as alunas responderem os check-ins, os dados aparecem aqui.</span>
        </div>

        <div v-else class="checkin-table-card admin-shell-card">
          <div class="checkin-table-wrap">
            <table class="checkin-table">
              <thead>
                <tr>
                  <th>Aluna</th>
                  <th>Check-in</th>
                  <th>Período</th>
                  <th>Resumo</th>
                  <th>Atualizado</th>
                  <th class="th-actions" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredResponses"
                  :key="item.id"
                  class="checkin-row"
                  @click="openViewModal(item)"
                >
                  <td>
                    <div class="checkin-patient">
                      <PatientAvatar
                        :src="item.user?.avatar"
                        :name="item.user?.name || 'Aluna'"
                        size="sm"
                        :ring="false"
                      />
                      <span class="checkin-name">{{ item.user?.name || 'Aluna' }}</span>
                    </div>
                  </td>
                  <td>{{ item.template?.title || '—' }}</td>
                  <td class="checkin-date">{{ formatPeriod(item.periodKey, item.template?.frequency) }}</td>
                  <td class="checkin-summary">{{ summarizeResponse(item) }}</td>
                  <td class="checkin-date">{{ formatDate(item.updatedAt) }}</td>
                  <td class="td-actions" @click.stop>
                    <button
                      type="button"
                      class="checkin-link-btn"
                      @click="openViewModal(item)"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Tipos de check-in -->
      <section v-else class="checkin-section">
        <div class="templates-toolbar">
          <p class="templates-hint">{{ templates.length }} tipo{{ templates.length === 1 ? '' : 's' }} cadastrado{{ templates.length === 1 ? '' : 's' }}</p>
          <button type="button" class="btn-primary" @click="openCreateTemplate">
            <Plus class="btn-icon" />
            Novo check-in
          </button>
        </div>

        <div v-if="loadingTemplates" class="loading-row">Carregando tipos...</div>

        <div v-else-if="!templates.length" class="nutri-empty admin-shell-card">
          <p>Nenhum tipo de check-in.</p>
          <span>Crie o primeiro para suas alunas responderem.</span>
        </div>

        <div v-else class="templates-grid">
          <article
            v-for="tpl in templates"
            :key="tpl.id"
            class="template-card admin-shell-card"
          >
            <div class="template-card-head">
              <div>
                <h3>{{ tpl.title }}</h3>
                <p v-if="tpl.description">{{ tpl.description }}</p>
              </div>
              <span class="template-badge" :class="{ 'template-badge--off': !tpl.active }">
                {{ tpl.active ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <ul class="template-meta">
              <li>{{ frequencyLabel(tpl.frequency) }}</li>
              <li>{{ Array.isArray(tpl.steps) ? tpl.steps.length : 0 }} pergunta{{ (tpl.steps?.length || 0) === 1 ? '' : 's' }}</li>
              <li>{{ tpl._count?.responses || 0 }} resposta{{ (tpl._count?.responses || 0) === 1 ? '' : 's' }}</li>
            </ul>
            <div class="template-actions">
              <button type="button" class="btn-ghost" @click="openEditTemplate(tpl)">Editar</button>
              <button
                type="button"
                class="btn-ghost"
                @click="toggleTemplateActive(tpl)"
              >
                {{ tpl.active ? 'Desativar' : 'Ativar' }}
              </button>
              <button
                v-if="!tpl.isDefault"
                type="button"
                class="btn-danger-ghost"
                @click="deleteTemplate(tpl)"
              >
                Excluir
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- Modal editor -->
      <div v-if="editorOpen" class="modal-overlay" @click.self="closeEditor">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-label="editorMode === 'create' ? 'Novo check-in' : 'Editar check-in'">
          <header class="modal-head">
            <h2>{{ editorMode === 'create' ? 'Novo check-in' : 'Editar check-in' }}</h2>
            <button type="button" class="modal-close" aria-label="Fechar" @click="closeEditor">×</button>
          </header>

          <form class="modal-body" @submit.prevent="saveTemplate">
            <div class="form-row">
              <label for="tpl-title">Título</label>
              <input id="tpl-title" v-model="editor.title" type="text" required maxlength="120" placeholder="Ex: Check-in semanal">
            </div>
            <div class="form-row">
              <label for="tpl-desc">Descrição (opcional)</label>
              <textarea id="tpl-desc" v-model="editor.description" rows="2" maxlength="300" placeholder="Breve explicação para a aluna" />
            </div>
            <div class="form-row-inline">
              <div class="form-row">
                <label for="tpl-freq">Frequência</label>
                <select id="tpl-freq" v-model="editor.frequency">
                  <option value="weekly">Semanal</option>
                  <option value="daily">Diário</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              <label class="form-check">
                <input v-model="editor.active" type="checkbox">
                Ativo para alunas
              </label>
            </div>

            <div class="steps-block">
              <div class="steps-head">
                <h3>Perguntas</h3>
                <button type="button" class="btn-ghost btn-sm" @click="addStep">+ Pergunta</button>
              </div>

              <div v-for="(step, index) in editor.steps" :key="step._key" class="step-card">
                <div class="step-card-head">
                  <strong>Pergunta {{ index + 1 }}</strong>
                  <button
                    v-if="editor.steps.length > 1"
                    type="button"
                    class="btn-danger-ghost btn-sm"
                    @click="removeStep(index)"
                  >
                    Remover
                  </button>
                </div>
                <div class="form-row-inline">
                  <div class="form-row">
                    <label>Tipo</label>
                    <select v-model="step.type" @change="onStepTypeChange(step)">
                      <option value="food">Alimentação (rostos)</option>
                      <option value="water">Água (copos)</option>
                      <option value="exercise">Sim/Não exercício</option>
                      <option value="scale">Escala 1–5 (estrelas)</option>
                      <option value="choice">Escolha única</option>
                      <option value="text">Texto livre</option>
                    </select>
                  </div>
                  <div class="form-row">
                    <label>Rótulo curto</label>
                    <input v-model="step.label" type="text" maxlength="40" placeholder="Ex: Sono">
                  </div>
                </div>
                <div class="form-row">
                  <label>Pergunta</label>
                  <input v-model="step.question" type="text" required maxlength="200" placeholder="Texto exibido para a aluna">
                </div>
                <div class="form-row">
                  <label>Dica (opcional)</label>
                  <input v-model="step.hint" type="text" maxlength="200" placeholder="Texto de apoio">
                </div>
                <div v-if="step.type === 'choice'" class="form-row">
                  <label>Opções (uma por linha)</label>
                  <textarea
                    v-model="step.optionsText"
                    rows="3"
                    placeholder="Ótimo&#10;Regular&#10;Ruim"
                  />
                </div>
              </div>
            </div>

            <p v-if="editorError" class="error-text">{{ editorError }}</p>

            <footer class="modal-foot">
              <button type="button" class="btn-ghost" @click="closeEditor">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="savingTemplate">
                {{ savingTemplate ? 'Salvando...' : 'Salvar' }}
              </button>
            </footer>
          </form>
        </div>
      </div>

      <!-- Detalhe da resposta -->
      <div v-if="viewModalOpen && selectedResponse" class="modal-overlay" @click.self="closeViewModal">
        <div class="modal-card response-detail-card" role="dialog" aria-modal="true" aria-label="Resposta do check-in">
          <header class="modal-head">
            <div>
              <h2>{{ selectedResponse.template?.title || 'Check-in' }}</h2>
              <p class="response-detail-meta">
                {{ selectedResponse.user?.name || 'Aluna' }}
                · {{ formatPeriod(selectedResponse.periodKey, selectedResponse.template?.frequency) }}
                · {{ formatDate(selectedResponse.updatedAt) }}
              </p>
            </div>
            <button type="button" class="modal-close" aria-label="Fechar" @click="closeViewModal">×</button>
          </header>

          <div class="response-detail-body">
            <article v-for="row in answerRows" :key="row.id" class="response-answer-row">
              <span class="response-answer-label">{{ row.label }}</span>
              <strong class="response-answer-value">{{ row.value }}</strong>
              <p v-if="row.question" class="response-answer-question">{{ row.question }}</p>
            </article>
          </div>

          <footer class="modal-foot">
            <button type="button" class="btn-ghost" @click="closeViewModal">Fechar</button>
            <button
              v-if="selectedResponse.user?.id"
              type="button"
              class="btn-primary"
              @click="goToPatient(selectedResponse.user.id)"
            >
              Ver perfil da aluna
            </button>
          </footer>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { Plus, Search } from 'lucide-vue-next'
import {
  buildAnswerRows,
  summarizeCheckinAnswers,
} from '~/utils/checkin-answers'

definePageMeta({
  layout: false,
  middleware: 'nutri-only',
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const activeTab = ref('responses')
const loadingResponses = ref(false)
const loadingTemplates = ref(false)
const responses = ref([])
const templates = ref([])
const responseSearch = ref('')
const viewModalOpen = ref(false)
const selectedResponse = ref(null)
const dispatching = ref(false)
const dispatchMessage = ref('')
const dispatchStatus = ref({ dispatched: false, periodKey: '' })

const editorOpen = ref(false)
const editorMode = ref('create')
const editorId = ref(null)
const editorError = ref('')
const savingTemplate = ref(false)

const defaultStep = () => ({
  _key: crypto.randomUUID(),
  id: `step_${Date.now()}`,
  type: 'scale',
  label: 'Pergunta',
  question: '',
  hint: '',
  optionsText: '',
})

const editor = reactive({
  title: '',
  description: '',
  frequency: 'weekly',
  active: true,
  steps: [defaultStep()],
})

const authHeaders = () => {
  const token = import.meta.client ? localStorage.getItem('auth_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const filteredResponses = computed(() => {
  const q = responseSearch.value.trim().toLowerCase()
  if (!q) return responses.value
  return responses.value.filter((item) => {
    const name = item.user?.name?.toLowerCase() || ''
    const title = item.template?.title?.toLowerCase() || ''
    const summary = summarizeResponse(item).toLowerCase()
    return name.includes(q) || title.includes(q) || summary.includes(q)
  })
})

function frequencyLabel(freq) {
  if (freq === 'daily') return 'Diário'
  if (freq === 'monthly') return 'Mensal'
  return 'Semanal'
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPeriod(periodKey, frequency) {
  if (!periodKey) return '—'
  if (frequency === 'daily') {
    const [y, m, d] = periodKey.slice(0, 10).split('-')
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
  if (frequency === 'monthly') return periodKey
  return new Date(periodKey).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function summarizeResponse(item) {
  return summarizeCheckinAnswers(item.template?.steps, item.answers)
}

const answerRows = computed(() => {
  if (!selectedResponse.value) return []
  return buildAnswerRows(
    selectedResponse.value.template?.steps,
    selectedResponse.value.answers,
  )
})

function openViewModal(item) {
  selectedResponse.value = item
  viewModalOpen.value = true
}

function closeViewModal() {
  viewModalOpen.value = false
  selectedResponse.value = null
}

function goToPatient(userId) {
  if (userId) navigateTo(`/usuarios/${userId}?tab=checkins`)
}

async function loadResponses() {
  loadingResponses.value = true
  try {
    const data = await $fetch(`${apiBase}/checkin/responses`, { headers: authHeaders() })
    responses.value = data.responses || []
  } catch (err) {
    console.error(err)
  } finally {
    loadingResponses.value = false
  }
}

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    const data = await $fetch(`${apiBase}/checkin/templates`, { headers: authHeaders() })
    templates.value = data.templates || []
  } catch (err) {
    console.error(err)
  } finally {
    loadingTemplates.value = false
  }
}

function resetEditor() {
  editor.title = ''
  editor.description = ''
  editor.frequency = 'weekly'
  editor.active = true
  editor.steps = [defaultStep()]
  editorError.value = ''
  editorId.value = null
}

function openCreateTemplate() {
  editorMode.value = 'create'
  resetEditor()
  editorOpen.value = true
}

function openEditTemplate(tpl) {
  editorMode.value = 'edit'
  editorId.value = tpl.id
  editor.title = tpl.title
  editor.description = tpl.description || ''
  editor.frequency = tpl.frequency || 'weekly'
  editor.active = tpl.active !== false
  editor.steps = (Array.isArray(tpl.steps) ? tpl.steps : []).map((step) => ({
    _key: crypto.randomUUID(),
    id: step.id,
    type: step.type || 'text',
    label: step.label || '',
    question: step.question || '',
    hint: step.hint || '',
    optionsText: Array.isArray(step.options)
      ? step.options.map((o) => (typeof o === 'string' ? o : o.label || o.value)).join('\n')
      : '',
  }))
  if (!editor.steps.length) editor.steps = [defaultStep()]
  editorError.value = ''
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
}

function addStep() {
  if (editor.steps.length >= 20) {
    editorError.value = 'Máximo de 20 perguntas.'
    return
  }
  const step = defaultStep()
  step.id = `step_${editor.steps.length + 1}`
  editor.steps.push(step)
}

function removeStep(index) {
  editor.steps.splice(index, 1)
}

function onStepTypeChange(step) {
  if (step.type === 'choice' && !step.optionsText) {
    step.optionsText = 'Sim\nNão'
  }
}

function buildStepsPayload() {
  return editor.steps.map((step, index) => {
    const payload = {
      id: String(step.id || `step_${index + 1}`).trim(),
      type: step.type,
      label: String(step.label || `Pergunta ${index + 1}`).trim(),
      question: String(step.question || '').trim(),
      hint: step.hint ? String(step.hint).trim() : '',
    }
    if (step.type === 'scale') {
      payload.min = 1
      payload.max = 5
    }
    if (step.type === 'choice') {
      const options = String(step.optionsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      if (options.length < 2) throw new Error(`Pergunta ${index + 1}: adicione pelo menos 2 opções.`)
      payload.options = options
    }
    if (!payload.question) throw new Error(`Pergunta ${index + 1}: texto obrigatório.`)
    return payload
  })
}

async function saveTemplate() {
  editorError.value = ''
  savingTemplate.value = true
  try {
    const body = {
      title: editor.title.trim(),
      description: editor.description.trim() || null,
      frequency: editor.frequency,
      active: editor.active,
      steps: buildStepsPayload(),
    }
    if (!body.title) throw new Error('Título obrigatório.')

    if (editorMode.value === 'create') {
      await $fetch(`${apiBase}/checkin/templates`, {
        method: 'POST',
        headers: authHeaders(),
        body,
      })
    } else {
      await $fetch(`${apiBase}/checkin/templates/${editorId.value}`, {
        method: 'PUT',
        headers: authHeaders(),
        body,
      })
    }
    closeEditor()
    await loadTemplates()
  } catch (err) {
    editorError.value = err.data?.message || err.message || 'Erro ao salvar.'
  } finally {
    savingTemplate.value = false
  }
}

async function toggleTemplateActive(tpl) {
  try {
    await $fetch(`${apiBase}/checkin/templates/${tpl.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: { active: !tpl.active },
    })
    await loadTemplates()
  } catch (err) {
    alert(err.data?.message || 'Erro ao atualizar.')
  }
}

async function deleteTemplate(tpl) {
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Excluir check-in',
    message: `Excluir "${tpl.title}"? As respostas anteriores também serão removidas.`,
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
  try {
    await $fetch(`${apiBase}/checkin/templates/${tpl.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await loadTemplates()
  } catch (err) {
    alert(err.data?.message || 'Erro ao excluir.')
  }
}

async function loadDispatchStatus() {
  try {
    dispatchStatus.value = await $fetch(`${apiBase}/checkin/dispatch/status`, { headers: authHeaders() })
  } catch {
    dispatchStatus.value = { dispatched: false, periodKey: '' }
  }
}

async function dispatchWeeklyCheckIn() {
  dispatchMessage.value = ''
  dispatching.value = true
  try {
    const result = await $fetch(`${apiBase}/checkin/dispatch`, {
      method: 'POST',
      headers: authHeaders(),
      body: { force: true },
    })
    dispatchMessage.value = result.message || 'Disparo concluído.'
    await loadDispatchStatus()
  } catch (err) {
    dispatchMessage.value = err.data?.message || 'Não foi possível disparar o check-in.'
  } finally {
    dispatching.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadResponses(), loadTemplates(), loadDispatchStatus()])
})
</script>

<style scoped>
.checkin-admin {
  --primary: #2d5a27;
}

.checkin-dispatch-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
  padding: 1.15rem 1.25rem;
}

.checkin-dispatch-copy h2 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.checkin-dispatch-copy p {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #555;
}

.checkin-dispatch-note {
  margin-top: 0.45rem !important;
  font-size: 0.82rem !important;
  font-weight: 600;
  color: var(--primary) !important;
}

.checkin-dispatch-btn {
  width: fit-content;
}

.checkin-dispatch-feedback {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--primary);
}

.checkin-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 1.25rem;
  padding: 0.25rem;
  background: #f3f5f4;
  border-radius: 12px;
  width: fit-content;
}

.checkin-tab {
  border: none;
  background: transparent;
  padding: 0.55rem 1rem;
  border-radius: 9px;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: #666;
  cursor: pointer;
}

.checkin-tab--active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.nutri-toolbar,
.templates-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.templates-hint {
  margin: 0;
  font-size: 0.88rem;
  color: #666;
}

.nutri-search {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;
}

.nutri-search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #9ca3af;
  pointer-events: none;
}

.nutri-search input {
  width: 100%;
  padding: 0.65rem 0.9rem 0.65rem 2.4rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.88rem;
  box-sizing: border-box;
}

.nutri-count {
  margin-left: auto;
  font-size: 0.82rem;
  font-weight: 600;
  color: #888;
}

.loading-row {
  padding: 2rem;
  text-align: center;
  color: #888;
}

.nutri-empty {
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.nutri-empty p {
  margin: 0 0 0.35rem;
  font-weight: 700;
}

.nutri-empty span {
  font-size: 0.88rem;
  color: #888;
}

.checkin-table-card {
  overflow: hidden;
}

.checkin-table-wrap {
  overflow-x: auto;
}

.checkin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.checkin-table th {
  padding: 0.75rem 0.85rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #888;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.checkin-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #f3f3f3;
  font-size: 0.86rem;
  color: #444;
  vertical-align: middle;
}

.checkin-row {
  cursor: pointer;
}

.checkin-row:hover td {
  background: #fafcfb;
}

.checkin-patient {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.checkin-name {
  font-weight: 700;
  color: #141414;
}

.checkin-date,
.checkin-summary {
  font-size: 0.82rem;
  color: #666;
}

.checkin-summary {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.th-actions,
.td-actions {
  text-align: right;
}

.checkin-link-btn {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.templates-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.template-card {
  padding: 1.1rem 1.15rem;
}

.template-card-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.template-card h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.template-card p {
  margin: 0;
  font-size: 0.84rem;
  color: #666;
}

.template-badge {
  flex-shrink: 0;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: #eef8f0;
  color: var(--primary);
}

.template-badge--off {
  background: #f3f4f6;
  color: #888;
}

.template-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  color: #888;
}

.template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

.btn-ghost {
  padding: 0.45rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-sm {
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
}

.btn-danger-ghost {
  padding: 0.45rem 0.75rem;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff;
  color: #b91c1c;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.modal-card {
  width: min(100%, 640px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #eee;
}

.modal-head h2 {
  margin: 0;
  font-size: 1.1rem;
}

.modal-close {
  border: none;
  background: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: #888;
}

.modal-body {
  padding: 1.25rem;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 1rem;
  margin-top: 0.5rem;
  border-top: 1px solid #eee;
}

.response-detail-card {
  max-width: 34rem;
}

.response-detail-meta {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #737373;
}

.response-detail-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 55vh;
  overflow-y: auto;
  padding: 0 1.25rem 1.25rem;
}

.response-answer-row {
  padding: 0.85rem 1rem;
  border: 1px solid #eee;
  border-radius: 12px;
  background: #fafafa;
}

.response-answer-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  margin-bottom: 0.25rem;
}

.response-answer-value {
  display: block;
  font-size: 1rem;
  color: #1f2937;
}

.response-answer-question {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.form-row {
  margin-bottom: 0.9rem;
}

.form-row label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #444;
}

.form-row input,
.form-row textarea,
.form-row select {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-row-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: flex-end;
}

.form-row-inline .form-row {
  flex: 1;
  min-width: 140px;
}

.form-check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #444;
  padding-bottom: 0.9rem;
}

.steps-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.steps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.steps-head h3 {
  margin: 0;
  font-size: 0.95rem;
}

.step-card {
  padding: 0.85rem;
  margin-bottom: 0.75rem;
  border: 1px solid #e8ece9;
  border-radius: 12px;
  background: #fafcfb;
}

.step-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.error-text {
  color: #c53030;
  font-size: 0.84rem;
  font-weight: 600;
}
</style>
