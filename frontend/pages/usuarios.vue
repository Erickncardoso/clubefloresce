<template>
  <NuxtLayout name="dashboard">
    <div class="users-container">
      <div class="users-page admin-shell">
        <header class="admin-shell-header">
          <div class="page-header-copy">
            <h1>Gest?o de Alunos</h1>
            <p>
              {{ users.length }} {{ users.length === 1 ? 'aluna cadastrada' : 'alunas cadastradas' }}
              <span v-if="activeCount !== users.length"> ? {{ activeCount }} ativas</span>
              <span v-if="pendingApprovalEmailCount"> ? {{ pendingApprovalEmailCount }} sem e-mail de aprova??o</span>
              <span v-if="pendingApprovalWhatsappCount"> ? {{ pendingApprovalWhatsappCount }} sem WhatsApp de aprova??o</span>
              <span v-if="registrationRequests.length"> ? {{ registrationRequests.length }} solicita??o(?es) pendente(s)</span>
            </p>
          </div>
        </header>

        <div class="users-toolbar">
          <div class="search-bar">
            <Search class="search-icon" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Buscar por nome ou e-mail..."
              aria-label="Buscar alunas"
            >
          </div>
          <div class="users-toolbar-actions">
            <button
              v-if="pendingApprovalWhatsappCount"
              type="button"
              class="btn-secondary"
              :disabled="resendingWhatsappBulk"
              @click="resendPendingApprovalWhatsapp"
            >
              {{ resendingWhatsappBulk ? 'Enviando...' : `Reenviar WhatsApp (${pendingApprovalWhatsappCount})` }}
            </button>
            <button type="button" class="btn-secondary" @click="openGlobalWhatsappModal">
              Mensagem WhatsApp
            </button>
            <button type="button" class="btn-primary" @click="openCreateModal">
              <UserPlus class="btn-icon" />
              Adicionar aluna
            </button>
          </div>
        </div>

        <section v-if="requestsLoading || registrationRequests.length || requestsError" class="requests-section">
          <div class="requests-head">
            <h2 class="requests-title">Solicita??es pendentes</h2>
            <span v-if="registrationRequests.length" class="requests-count">{{ registrationRequests.length }}</span>
          </div>

          <p v-if="requestsLoading" class="requests-loading">Carregando solicita??es...</p>
          <p v-else-if="requestsError" class="load-error requests-error">{{ requestsError }}</p>

          <div v-else-if="registrationRequests.length" class="requests-list">
            <article v-for="req in registrationRequests" :key="req.id" class="request-card">
              <PatientAvatar :name="req.name" size="sm" :ring="false" />
              <div class="request-body">
                <strong>{{ req.name }}</strong>
                <p>{{ req.email }}<span v-if="req.phone"> ? {{ req.phone }}</span></p>
                <p v-if="req.message" class="request-message">{{ req.message }}</p>
                <small>{{ formatDate(req.createdAt) }}</small>
              </div>
              <div class="request-actions">
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="rejectingRequestId === req.id"
                  @click="rejectRequest(req)"
                >
                  {{ rejectingRequestId === req.id ? 'Reprovando...' : 'Reprovar acesso' }}
                </button>
                <button type="button" class="btn-primary" @click="openCreateFromRequest(req)">
                  Aprovar acesso
                </button>
              </div>
            </article>
          </div>
        </section>

        <p v-if="usersError" class="load-error">{{ usersError }}</p>

        <div v-if="usersLoading" class="loading-row">
          <span class="loading-spinner" aria-hidden="true" />
          Carregando alunas...
        </div>

        <div v-else class="users-panel">
          <div v-if="filteredUsers.length" class="users-table-wrap">
            <div class="users-table-card">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Aluna</th>
                    <th>Plano</th>
                    <th>Status</th>
                    <th>E-mail aprova??o</th>
                    <th>WhatsApp aprova??o</th>
                    <th>Membro desde</th>
                    <th>Acesso at?</th>
                    <th class="th-actions">A??es</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="user in filteredUsers"
                    :key="user.id"
                    class="user-row"
                    @click="goToPatient(user)"
                  >
                    <td>
                      <div class="user-cell">
                        <PatientAvatar :src="user.avatar" :name="user.name" size="sm" :ring="false" />
                        <div class="user-copy">
                          <span class="user-name">{{ user.name }}</span>
                          <span class="user-email">{{ user.email }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="user-tag user-tag--plan" :class="`user-tag--plan-${(user.plan || 'FREE').toLowerCase()}`">
                        {{ formatPlan(user.plan) }}
                      </span>
                    </td>
                    <td>
                      <span class="user-tag user-tag--status" :class="statusTagClass(user.status)">
                        {{ formatStatus(user.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="email-status-cell">
                        <span class="user-tag user-tag--email" :class="approvalEmailTagClass(user)">
                          {{ approvalEmailLabel(user) }}
                        </span>
                        <small v-if="user.approvalEmailSentAt" class="email-status-date">
                          {{ formatDate(user.approvalEmailSentAt) }}
                        </small>
                        <button
                          v-if="canResendApprovalEmail(user)"
                          type="button"
                          class="email-resend-btn"
                          :disabled="resendingEmailId === user.id"
                          @click.stop="resendApprovalEmail(user)"
                        >
                          {{ resendingEmailId === user.id ? 'Enviando...' : 'Reenviar' }}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div class="email-status-cell">
                        <span class="user-tag user-tag--email" :class="approvalWhatsappTagClass(user)">
                          {{ approvalWhatsappLabel(user) }}
                        </span>
                        <small v-if="user.phone" class="email-status-date">{{ user.phone }}</small>
                        <small v-if="user.approvalWhatsappSentAt" class="email-status-date">
                          {{ formatDate(user.approvalWhatsappSentAt) }}
                        </small>
                        <button
                          v-if="canEditWhatsappMessage(user)"
                          type="button"
                          class="email-resend-btn"
                          @click.stop="openIndividualWhatsappModal(user)"
                        >
                          {{ user.approvalWhatsappMessage ? 'Editar msg individual' : 'Editar msg' }}
                        </button>
                        <button
                          v-if="canResendApprovalWhatsapp(user)"
                          type="button"
                          class="email-resend-btn"
                          :disabled="resendingWhatsappId === user.id"
                          @click.stop="resendApprovalWhatsapp(user)"
                        >
                          {{ resendingWhatsappId === user.id ? 'Enviando...' : 'Reenviar' }}
                        </button>
                      </div>
                    </td>
                    <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
                    <td class="date-cell">
                      <span
                        v-if="isPatientAccessExpired(user.accessExpiresAt)"
                        class="user-tag user-tag--access-expired"
                      >
                        Expirado
                      </span>
                      <template v-else>{{ formatAccessDate(user.accessExpiresAt) }}</template>
                    </td>
                    <td class="td-actions" @click.stop>
                      <button type="button" class="icon-btn" title="Editar" @click="openEditModal(user)">
                        <Edit3 class="icon-xs" />
                      </button>
                      <button type="button" class="icon-btn icon-btn--danger" title="Remover" @click="handleDelete(user.id)">
                        <Trash2 class="icon-xs" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="filteredUsers.length" class="users-mobile-list">
            <article
              v-for="user in filteredUsers"
              :key="`mobile-${user.id}`"
              class="user-mobile-card"
              @click="goToPatient(user)"
            >
              <div class="user-mobile-head">
                <PatientAvatar :src="user.avatar" :name="user.name" size="sm" :ring="false" />
                <div class="user-copy">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-email">{{ user.email }}</span>
                </div>
              </div>

              <dl class="user-mobile-meta">
                <div class="user-mobile-meta-row">
                  <dt>Plano</dt>
                  <dd>
                    <span class="user-tag user-tag--plan" :class="`user-tag--plan-${(user.plan || 'FREE').toLowerCase()}`">
                      {{ formatPlan(user.plan) }}
                    </span>
                  </dd>
                </div>
                <div class="user-mobile-meta-row">
                  <dt>Status</dt>
                  <dd>
                    <span class="user-tag user-tag--status" :class="statusTagClass(user.status)">
                      {{ formatStatus(user.status) }}
                    </span>
                  </dd>
                </div>
                <div class="user-mobile-meta-row">
                  <dt>E-mail aprova??o</dt>
                  <dd>
                    <div class="email-status-cell">
                      <span class="user-tag user-tag--email" :class="approvalEmailTagClass(user)">
                        {{ approvalEmailLabel(user) }}
                      </span>
                      <small v-if="user.approvalEmailSentAt" class="email-status-date">
                        {{ formatDate(user.approvalEmailSentAt) }}
                      </small>
                    </div>
                  </dd>
                </div>
                <div class="user-mobile-meta-row">
                  <dt>WhatsApp aprova??o</dt>
                  <dd>
                    <div class="email-status-cell">
                      <span class="user-tag user-tag--email" :class="approvalWhatsappTagClass(user)">
                        {{ approvalWhatsappLabel(user) }}
                      </span>
                      <small v-if="user.phone" class="email-status-date">{{ user.phone }}</small>
                      <small v-if="user.approvalWhatsappSentAt" class="email-status-date">
                        {{ formatDate(user.approvalWhatsappSentAt) }}
                      </small>
                    </div>
                  </dd>
                </div>
                <div class="user-mobile-meta-row">
                  <dt>Membro desde</dt>
                  <dd>{{ formatDate(user.createdAt) }}</dd>
                </div>
                <div class="user-mobile-meta-row">
                  <dt>Acesso at?</dt>
                  <dd>
                    <span
                      v-if="isPatientAccessExpired(user.accessExpiresAt)"
                      class="user-tag user-tag--access-expired"
                    >
                      Expirado
                    </span>
                    <template v-else>{{ formatAccessDate(user.accessExpiresAt) }}</template>
                  </dd>
                </div>
              </dl>

              <div class="user-mobile-actions" @click.stop>
                <button
                  v-if="canResendApprovalEmail(user)"
                  type="button"
                  class="btn-secondary btn-secondary--compact"
                  :disabled="resendingEmailId === user.id"
                  @click="resendApprovalEmail(user)"
                >
                  {{ resendingEmailId === user.id ? 'Enviando e-mail...' : 'Reenviar e-mail de aprova??o' }}
                </button>
                <button
                  v-if="canResendApprovalWhatsapp(user)"
                  type="button"
                  class="btn-secondary btn-secondary--compact"
                  :disabled="resendingWhatsappId === user.id"
                  @click="resendApprovalWhatsapp(user)"
                >
                  {{ resendingWhatsappId === user.id ? 'Enviando WhatsApp...' : 'Reenviar WhatsApp de aprova??o' }}
                </button>
                <button
                  v-if="canEditWhatsappMessage(user)"
                  type="button"
                  class="btn-secondary btn-secondary--compact"
                  @click="openIndividualWhatsappModal(user)"
                >
                  Editar msg WhatsApp
                </button>
                <button type="button" class="icon-btn" title="Editar" @click="openEditModal(user)">
                  <Edit3 class="icon-xs" />
                </button>
                <button type="button" class="icon-btn icon-btn--danger" title="Remover" @click="handleDelete(user.id)">
                  <Trash2 class="icon-xs" />
                </button>
              </div>
            </article>
          </div>

          <div v-else-if="!usersError" class="users-table-card empty-state">
            <UserPlus class="empty-icon" />
            <h3>{{ searchQuery ? 'Nenhuma aluna encontrada' : 'Nenhuma aluna cadastrada' }}</h3>
            <p>{{ searchQuery ? 'Tente outro termo na busca.' : 'Clique em Adicionar aluna para come?ar.' }}</p>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <form class="modal-card" @submit.prevent="createPatient">
          <h3>{{ creatingFromRequest ? 'Aprovar solicita??o' : 'Nova paciente' }}</h3>
          <p v-if="creatingFromRequest" class="modal-hint">
            A senha j? foi definida pela aluna. Informe o plano e at? quando ela ter? acesso.
          </p>

          <div class="modal-fields">
            <div class="field field--float">
              <label for="create-name">Nome</label>
              <input id="create-name" v-model="createForm.name" required placeholder="Nome completo" />
            </div>

            <div class="field field--float">
              <label for="create-email">E-mail</label>
              <input id="create-email" v-model="createForm.email" type="email" required placeholder="email@exemplo.com" />
            </div>

            <div v-if="!creatingFromRequest" class="field field--float">
              <label for="create-password">Senha inicial</label>
              <input
                id="create-password"
                v-model="createForm.password"
                type="password"
                required
                minlength="8"
                placeholder="M?nimo 8 caracteres"
              />
            </div>

            <p v-else class="field-hint field-hint--password">
              A aluna j? escolheu a senha no app. Ap?s aprovar, ela entra direto com e-mail e senha.
            </p>

            <div class="field field--float">
              <label for="create-plan">Plano</label>
              <SharedCfSelect
                id="create-plan"
                v-model="createForm.plan"
                :options="planOptions"
              />
            </div>

            <div class="field field--float">
              <label for="create-access-expires">
                Acesso v?lido at?
                <span v-if="creatingFromRequest" class="label-required">*</span>
              </label>
              <SharedCfDateInput
                id="create-access-expires"
                v-model="createForm.accessExpiresAt"
                :min="minAccessDate"
                :required="creatingFromRequest"
              />
            </div>
          </div>

          <p v-if="!creatingFromRequest" class="field-hint">Opcional. Deixe em branco para acesso sem data limite.</p>
          <p v-if="createError" class="create-error">{{ createError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn-primary modal-submit" :disabled="creating">
              {{ creating ? 'Salvando...' : (creatingFromRequest ? 'Aprovar e liberar acesso' : 'Criar paciente') }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <form class="modal-card" @submit.prevent="saveEdit">
          <h3>Editar aluna</h3>
          <p class="modal-hint">{{ editForm.email }}</p>

          <div class="modal-fields">
            <div class="field field--float">
              <label for="edit-name">Nome</label>
              <input id="edit-name" v-model="editForm.name" required placeholder="Nome completo" />
            </div>

            <div class="field field--float">
              <label for="edit-phone">WhatsApp / telefone</label>
              <input
                id="edit-phone"
                v-model="editForm.phone"
                type="tel"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div class="field field--float">
              <label for="edit-plan">Plano</label>
              <SharedCfSelect
                id="edit-plan"
                v-model="editForm.plan"
                :options="planOptions"
              />
            </div>

            <div class="field field--float">
              <label for="edit-status">Status</label>
              <SharedCfSelect
                id="edit-status"
                v-model="editForm.status"
                :options="statusOptions"
              />
            </div>

            <div class="field field--float">
              <label for="edit-access-expires">Acesso v?lido at?</label>
              <SharedCfDateInput
                id="edit-access-expires"
                v-model="editForm.accessExpiresAt"
                :min="minAccessDate"
              />
            </div>
          </div>

          <p class="field-hint">Deixe em branco para acesso sem data limite.</p>
          <p v-if="editError" class="create-error">{{ editError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showEditModal = false">Cancelar</button>
            <button type="submit" class="btn-primary modal-submit" :disabled="savingEdit">
              {{ savingEdit ? 'Salvando...' : 'Salvar altera??es' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showGlobalWhatsappModal" class="modal-overlay" @click.self="showGlobalWhatsappModal = false">
        <form class="modal-card modal-card--wide" @submit.prevent="saveGlobalWhatsappTemplate">
          <h3>Mensagem geral de aprova??o (WhatsApp)</h3>
          <p class="modal-hint">
            Formata??o do WhatsApp: *negrito*, _it?lico_, ~riscado~. Placeholders:
            <span v-pre>{{nome}}</span>, <span v-pre>{{primeiroNome}}</span>,
            <span v-pre>{{linkApp}}</span>, <span v-pre>{{acessoAte}}</span>.
            Deixe o link em linha separada para o preview.
          </p>

          <div class="modal-fields modal-fields--split">
            <div class="field">
              <label for="global-whatsapp-message">Texto da mensagem</label>
              <textarea
                id="global-whatsapp-message"
                v-model="globalWhatsappForm.message"
                rows="12"
                required
                placeholder="Mensagem enviada ao aprovar cadastro..."
              />
            </div>
            <div class="whatsapp-preview">
              <p class="whatsapp-preview-label">Pr?via no WhatsApp</p>
              <div class="whatsapp-preview-stage">
                <div class="whatsapp-preview-bubble">
                  <div class="whatsapp-link-preview">
                    <img src="/pwa/apple-touch-icon.png" alt="" class="whatsapp-link-preview__thumb">
                    <div class="whatsapp-link-preview__body">
                      <strong>Clube Florescer</strong>
                      <span>Toque para abrir o app e entrar com seu e-mail e senha.</span>
                      <small>app.nutrisabellajardim.com.br</small>
                    </div>
                  </div>
                  <div v-html="globalWhatsappPreviewHtml" />
                </div>
              </div>
            </div>
          </div>

          <p v-if="globalWhatsappError" class="create-error">{{ globalWhatsappError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showGlobalWhatsappModal = false">Cancelar</button>
            <button type="button" class="btn-secondary" @click="resetGlobalWhatsappTemplate">Restaurar padr?o</button>
            <button type="submit" class="btn-primary modal-submit" :disabled="savingGlobalWhatsapp">
              {{ savingGlobalWhatsapp ? 'Salvando...' : 'Salvar mensagem geral' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showIndividualWhatsappModal" class="modal-overlay" @click.self="showIndividualWhatsappModal = false">
        <form class="modal-card modal-card--wide modal-card--whatsapp" @submit.prevent="saveIndividualWhatsappMessage">
          <h3>Mensagem individual de aprova??o</h3>
          <p class="modal-hint">
            {{ individualWhatsappUser?.name }} ? {{ individualWhatsappUser?.phone || 'Sem telefone' }}
          </p>
          <p class="field-hint">
            A mensagem geral j? vem preenchida. Edite se quiser um texto diferente para esta aluna.
            Use *negrito* e deixe <span v-pre>{{linkApp}}</span> em linha separada.
          </p>

          <div class="modal-fields modal-fields--split">
            <div class="field">
              <label for="individual-whatsapp-message">Mensagem</label>
              <textarea
                id="individual-whatsapp-message"
                v-model="individualWhatsappForm.message"
                rows="12"
                required
                placeholder="Carregando mensagem..."
              />
            </div>
            <div class="whatsapp-preview">
              <p class="whatsapp-preview-label">Pr?via no WhatsApp</p>
              <div class="whatsapp-preview-stage">
                <div class="whatsapp-preview-bubble">
                  <div class="whatsapp-link-preview">
                    <img src="/pwa/apple-touch-icon.png" alt="" class="whatsapp-link-preview__thumb">
                    <div class="whatsapp-link-preview__body">
                      <strong>Clube Florescer</strong>
                      <span>Toque para abrir o app e entrar com seu e-mail e senha.</span>
                      <small>app.nutrisabellajardim.com.br</small>
                    </div>
                  </div>
                  <div v-html="individualWhatsappPreviewHtml" />
                </div>
              </div>
            </div>
          </div>

          <p v-if="individualWhatsappError" class="create-error">{{ individualWhatsappError }}</p>
          <div class="modal-actions modal-actions--single">
            <button type="submit" class="btn-primary modal-submit" :disabled="savingIndividualWhatsapp || loadingIndividualWhatsapp">
              {{ savingIndividualWhatsapp ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard',
  middleware: 'nutri-only',
})

const config = useRuntimeConfig()
const apiBase = useApiBase()

import { Search, UserPlus, Edit3, Trash2 } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError } from '~/utils/resolve-api-base.mjs'
import { isPatientAccessExpired } from '~/utils/patient-access'
import { formatWhatsappTextForDisplay } from '~/composables/whatsapp/useWhatsappUtils.js'

const users = ref([])
const registrationRequests = ref([])
const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingUserId = ref('')
const creatingFromRequest = ref(false)
const approvingRequestId = ref('')
const rejectingRequestId = ref('')
const resendingEmailId = ref('')
const resendingWhatsappId = ref('')
const resendingWhatsappBulk = ref(false)
const showGlobalWhatsappModal = ref(false)
const showIndividualWhatsappModal = ref(false)
const savingGlobalWhatsapp = ref(false)
const savingIndividualWhatsapp = ref(false)
const globalWhatsappError = ref('')
const individualWhatsappError = ref('')
const individualWhatsappUser = ref(null)
const defaultWhatsappTemplate = ref('')
const cachedGeneralWhatsappMessage = ref('')
const loadingIndividualWhatsapp = ref(false)
const creating = ref(false)
const savingEdit = ref(false)
const createError = ref('')
const editError = ref('')
const usersLoading = ref(true)
const requestsLoading = ref(true)
const usersError = ref('')
const requestsError = ref('')

const createForm = reactive({
  name: '',
  email: '',
  password: '',
  plan: 'FREE',
  accessExpiresAt: '',
})

const editForm = reactive({
  name: '',
  email: '',
  phone: '',
  plan: 'FREE',
  status: 'ATIVO',
  accessExpiresAt: '',
})

const globalWhatsappForm = reactive({
  message: '',
})

const individualWhatsappForm = reactive({
  message: '',
})

const whatsappPreviewSample = {
  nome: 'Maria Silva',
  primeiroNome: 'Maria',
  linkApp: 'https://app.nutrisabellajardim.com.br/abrir?source=approval-whatsapp',
  acessoAte: 'Seu acesso est? liberado at? *25 de junho de 2026*.',
}

function renderWhatsappPreview(template, user = null) {
  const name = user?.name || whatsappPreviewSample.nome
  const firstName = name.split(' ')[0] || name
  const text = String(template || '')
    .split('{{nome}}').join(name)
    .split('{{primeiroNome}}').join(firstName)
    .split('{{linkApp}}').join(whatsappPreviewSample.linkApp)
    .split('{{acessoAte}}').join(whatsappPreviewSample.acessoAte)

  return formatWhatsappTextForDisplay(text)
}

const globalWhatsappPreviewHtml = computed(() => renderWhatsappPreview(globalWhatsappForm.message))
const individualWhatsappPreviewHtml = computed(() =>
  renderWhatsappPreview(individualWhatsappForm.message, individualWhatsappUser.value),
)

const planOptions = [
  { value: 'FREE', label: 'Gratuito' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'PLATINUM', label: 'Platinum' },
]

const statusOptions = [
  { value: 'ATIVO', label: 'Ativa' },
  { value: 'INATIVO', label: 'Inativa' },
  { value: 'PENDENTE', label: 'Pendente' },
]

const minAccessDate = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

const authHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function resolveFetchError(err, fallback) {
  const status = err?.statusCode || err?.status || err?.response?.status

  if (status === 401 || status === 403) {
    return 'Sem permiss?o ou sess?o expirada. Fa?a login novamente.'
  }

  if (isApiConnectionError(err)) {
    return apiConnectionErrorMessage({
      hostname: window.location.hostname,
      dev: process.env.NODE_ENV !== 'production',
    })
  }

  return err?.data?.error || err?.data?.message || fallback
}

const fetchRegistrationRequests = async () => {
  requestsLoading.value = true
  requestsError.value = ''

  try {
    const data = await $fetch(`${apiBase.value}/registration-requests`, {
      headers: authHeaders(),
    })
    registrationRequests.value = data?.requests || []
  } catch (err) {
    registrationRequests.value = []
    requestsError.value = resolveFetchError(err, 'N?o foi poss?vel carregar as solicita??es.')
  } finally {
    requestsLoading.value = false
  }
}

const fetchPatients = async () => {
  usersLoading.value = true
  usersError.value = ''

  try {
    const usersData = await $fetch(`${apiBase.value}/users`, { headers: authHeaders() })
    users.value = Array.isArray(usersData)
      ? usersData.filter((u) => u.role === 'PACIENTE')
      : []
  } catch (err) {
    users.value = []
    usersError.value = resolveFetchError(err, 'N?o foi poss?vel carregar os alunos.')
  } finally {
    usersLoading.value = false
  }
}

const fetchUsers = async () => {
  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('user_role')

  if (!token || role !== 'NUTRICIONISTA') {
    usersLoading.value = false
    requestsLoading.value = false
    const sessionError = 'Sess?o expirada. Fa?a login novamente como nutricionista.'
    usersError.value = sessionError
    requestsError.value = sessionError
    return
  }

  await Promise.all([fetchPatients(), fetchRegistrationRequests()])
}

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(u =>
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const activeCount = computed(() =>
  users.value.filter((u) => (u.status || 'ATIVO').toUpperCase() === 'ATIVO').length,
)

const pendingApprovalEmailCount = computed(() =>
  users.value.filter(
    (u) => (u.status || 'ATIVO').toUpperCase() === 'ATIVO' && !u.approvalEmailSentAt,
  ).length,
)

const pendingApprovalWhatsappCount = computed(() =>
  users.value.filter(
    (u) =>
      (u.status || 'ATIVO').toUpperCase() === 'ATIVO' &&
      Boolean(u.phone?.trim()) &&
      !u.approvalWhatsappSentAt,
  ).length,
)

function formatPlan(plan) {
  const key = (plan || 'FREE').toUpperCase()
  if (key === 'PREMIUM') return 'Premium'
  if (key === 'PLATINUM') return 'Platinum'
  return 'Gratuito'
}

function formatStatus(status) {
  const key = (status || 'ATIVO').toUpperCase()
  if (key === 'INATIVO') return 'Inativa'
  if (key === 'PENDENTE') return 'Pendente'
  return 'Ativa'
}

function statusTagClass(status) {
  const key = (status || 'ATIVO').toLowerCase()
  return `user-tag--status-${key}`
}

function isActivePatient(user) {
  return (user.status || 'ATIVO').toUpperCase() === 'ATIVO'
}

function approvalEmailLabel(user) {
  if (!isActivePatient(user)) return 'N/A'
  return user.approvalEmailSentAt ? 'Enviado' : 'N?o enviado'
}

function approvalEmailTagClass(user) {
  if (!isActivePatient(user)) return 'user-tag--email-na'
  return user.approvalEmailSentAt ? 'user-tag--email-sent' : 'user-tag--email-pending'
}

function canResendApprovalEmail(user) {
  return isActivePatient(user) && !user.approvalEmailSentAt
}

const resendApprovalEmail = async (user) => {
  resendingEmailId.value = user.id
  try {
    const updated = await $fetch(`${apiBase.value}/users/${user.id}/resend-approval-email`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const index = users.value.findIndex((item) => item.id === user.id)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updated }
    }
  } catch (err) {
    alert(err.data?.error || 'Erro ao reenviar e-mail de aprova??o.')
  } finally {
    resendingEmailId.value = ''
  }
}

function approvalWhatsappLabel(user) {
  if (!isActivePatient(user)) return 'N/A'
  if (!user.phone?.trim()) return 'Sem telefone'
  return user.approvalWhatsappSentAt ? 'Enviado' : 'N?o enviado'
}

function approvalWhatsappTagClass(user) {
  if (!isActivePatient(user)) return 'user-tag--email-na'
  if (!user.phone?.trim()) return 'user-tag--whatsapp-no-phone'
  return user.approvalWhatsappSentAt ? 'user-tag--email-sent' : 'user-tag--email-pending'
}

function canResendApprovalWhatsapp(user) {
  return isActivePatient(user) && Boolean(user.phone?.trim())
}

function canEditWhatsappMessage(user) {
  return isActivePatient(user) && Boolean(user.phone?.trim())
}

const resendApprovalWhatsapp = async (user) => {
  resendingWhatsappId.value = user.id
  try {
    const updated = await $fetch(`${apiBase.value}/users/${user.id}/resend-approval-whatsapp`, {
      method: 'POST',
      headers: authHeaders(),
    })
    const index = users.value.findIndex((item) => item.id === user.id)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updated }
    }
  } catch (err) {
    alert(err.data?.error || 'Erro ao reenviar WhatsApp de aprova??o.')
  } finally {
    resendingWhatsappId.value = ''
  }
}

const resendPendingApprovalWhatsapp = async () => {
  if (!pendingApprovalWhatsappCount.value) return

  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Reenviar WhatsApp pendentes',
    message: `Enviar mensagem de aprova??o por WhatsApp para ${pendingApprovalWhatsappCount.value} aluna(s)?`,
    confirmLabel: 'Enviar',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return

  resendingWhatsappBulk.value = true
  try {
    const result = await $fetch(`${apiBase.value}/users/resend-approval-whatsapp-pending`, {
      method: 'POST',
      headers: authHeaders(),
    })

    await fetchUsers()

    if (result.failedCount) {
      alert(`Enviados: ${result.sentCount}. Falhas: ${result.failedCount}. Verifique se o WhatsApp est? conectado.`)
    }
  } catch (err) {
    alert(err.data?.error || 'Erro ao reenviar WhatsApp pendentes.')
  } finally {
    resendingWhatsappBulk.value = false
  }
}

const openGlobalWhatsappModal = async () => {
  globalWhatsappError.value = ''
  showGlobalWhatsappModal.value = true

  try {
    const data = await $fetch(`${apiBase.value}/users/approval-whatsapp-template`, {
      headers: authHeaders(),
    })
    globalWhatsappForm.message = data.message || ''
    defaultWhatsappTemplate.value = data.defaultMessage || ''
    cachedGeneralWhatsappMessage.value = data.message || ''
  } catch (err) {
    globalWhatsappError.value = err.data?.error || 'Erro ao carregar mensagem.'
  }
}

const resetGlobalWhatsappTemplate = () => {
  if (defaultWhatsappTemplate.value) {
    globalWhatsappForm.message = defaultWhatsappTemplate.value
  }
}

const saveGlobalWhatsappTemplate = async () => {
  savingGlobalWhatsapp.value = true
  globalWhatsappError.value = ''

  try {
    const data = await $fetch(`${apiBase.value}/users/approval-whatsapp-template`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { message: globalWhatsappForm.message },
    })
    globalWhatsappForm.message = data.message
    cachedGeneralWhatsappMessage.value = data.message
    showGlobalWhatsappModal.value = false
  } catch (err) {
    globalWhatsappError.value = err.data?.error || 'Erro ao salvar mensagem.'
  } finally {
    savingGlobalWhatsapp.value = false
  }
}

const loadGeneralWhatsappTemplate = async () => {
  if (cachedGeneralWhatsappMessage.value) {
    return cachedGeneralWhatsappMessage.value
  }

  const data = await $fetch(`${apiBase.value}/users/approval-whatsapp-template`, {
    headers: authHeaders(),
  })

  cachedGeneralWhatsappMessage.value = data.message || ''
  defaultWhatsappTemplate.value = data.defaultMessage || defaultWhatsappTemplate.value
  return cachedGeneralWhatsappMessage.value
}

const openIndividualWhatsappModal = async (user) => {
  individualWhatsappUser.value = user
  individualWhatsappError.value = ''
  individualWhatsappForm.message = ''
  loadingIndividualWhatsapp.value = true
  showIndividualWhatsappModal.value = true

  try {
    const generalMessage = await loadGeneralWhatsappTemplate()
    individualWhatsappForm.message = user.approvalWhatsappMessage?.trim() || generalMessage
  } catch (err) {
    individualWhatsappError.value = err.data?.error || 'Erro ao carregar mensagem.'
    individualWhatsappForm.message = user.approvalWhatsappMessage || ''
  } finally {
    loadingIndividualWhatsapp.value = false
  }
}

const saveIndividualWhatsappMessage = async () => {
  if (!individualWhatsappUser.value) return

  savingIndividualWhatsapp.value = true
  individualWhatsappError.value = ''

  try {
    const message = individualWhatsappForm.message.trim()
    const generalMessage = cachedGeneralWhatsappMessage.value.trim()
    const payload = message === generalMessage ? null : message

    const updated = await $fetch(
      `${apiBase.value}/users/${individualWhatsappUser.value.id}/approval-whatsapp-message`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: { message: payload },
      },
    )

    const index = users.value.findIndex((item) => item.id === individualWhatsappUser.value.id)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updated }
    }

    showIndividualWhatsappModal.value = false
    individualWhatsappUser.value = null
  } catch (err) {
    individualWhatsappError.value = err.data?.error || 'Erro ao salvar mensagem individual.'
  } finally {
    savingIndividualWhatsapp.value = false
  }
}

const goToPatient = (user) => {
  if (user.role === 'PACIENTE') {
    navigateTo(`/usuarios/${user.id}`)
  }
}

const openCreateModal = () => {
  creatingFromRequest.value = false
  approvingRequestId.value = ''
  createForm.name = ''
  createForm.email = ''
  createForm.password = ''
  createForm.plan = 'FREE'
  createForm.accessExpiresAt = ''
  createError.value = ''
  showCreateModal.value = true
}

const openCreateFromRequest = (req) => {
  creatingFromRequest.value = true
  approvingRequestId.value = req.id
  createForm.name = req.name
  createForm.email = req.email
  createForm.password = ''
  createForm.plan = 'FREE'
  createForm.accessExpiresAt = ''
  createError.value = ''
  showCreateModal.value = true
}

const rejectRequest = async (req) => {
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Reprovar solicita??o',
    message: `Deseja reprovar o acesso de ${req.name}? Ela poder? enviar uma nova solicita??o depois.`,
    confirmLabel: 'Reprovar',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return

  rejectingRequestId.value = req.id
  try {
    await $fetch(`${apiBase.value}/registration-requests/${req.id}/reject`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    registrationRequests.value = registrationRequests.value.filter((r) => r.id !== req.id)
  } catch (err) {
    alert(err.data?.error || 'Erro ao reprovar solicita??o.')
  } finally {
    rejectingRequestId.value = ''
  }
}

const createPatient = async () => {
  creating.value = true
  createError.value = ''

  if (creatingFromRequest.value && !createForm.accessExpiresAt) {
    createError.value = 'Informe at? quando a aluna ter? acesso.'
    creating.value = false
    return
  }

  try {
    const body = {
      name: createForm.name,
      email: createForm.email,
      plan: createForm.plan,
      accessExpiresAt: createForm.accessExpiresAt || null,
    }

    if (creatingFromRequest.value) {
      body.registrationRequestId = approvingRequestId.value
    } else {
      body.password = createForm.password
    }

    const user = await $fetch(`${apiBase.value}/users`, {
      method: 'POST',
      headers: authHeaders(),
      body,
    })
    showCreateModal.value = false
    creatingFromRequest.value = false
    approvingRequestId.value = ''
    createForm.name = ''
    createForm.email = ''
    createForm.password = ''
    createForm.plan = 'FREE'
    createForm.accessExpiresAt = ''
    await fetchUsers()
    navigateTo(`/usuarios/${user.id}`)
  } catch (err) {
    createError.value = err.data?.error || 'Erro ao criar paciente.'
  } finally {
    creating.value = false
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDateInputValue(value) {
  if (!value) return ''
  const d = new Date(value)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatAccessDate = (date) => {
  if (!date) return 'Sem limite'
  return formatDate(date)
}

const openEditModal = (user) => {
  editingUserId.value = user.id
  editForm.name = user.name
  editForm.email = user.email
  editForm.phone = user.phone || ''
  editForm.plan = user.plan || 'FREE'
  editForm.status = user.status || 'ATIVO'
  editForm.accessExpiresAt = toDateInputValue(user.accessExpiresAt)
  editError.value = ''
  showEditModal.value = true
}

const saveEdit = async () => {
  if (!editingUserId.value) return
  savingEdit.value = true
  editError.value = ''

  try {
    const updated = await $fetch(`${apiBase.value}/users/${editingUserId.value}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: {
        name: editForm.name,
        phone: editForm.phone || null,
        plan: editForm.plan,
        status: editForm.status,
        accessExpiresAt: editForm.accessExpiresAt || null,
      },
    })

    const index = users.value.findIndex((user) => user.id === editingUserId.value)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updated }
    }

    showEditModal.value = false
    editingUserId.value = ''
  } catch (err) {
    editError.value = err.data?.error || 'Erro ao salvar altera??es.'
  } finally {
    savingEdit.value = false
  }
}

const handleDelete = async (id) => {
  const { confirm } = useConfirm()
  const ok = await confirm({
    title: 'Remover acesso',
    message: 'Deseja realmente remover o acesso desta paciente?',
    confirmLabel: 'Remover',
    cancelLabel: 'Cancelar',
  })
  if (!ok) return
  try {
    await $fetch(`${apiBase.value}/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    fetchUsers()
  } catch (err) {
    alert('Erro ao excluir usu?rio.')
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.users-container {
  --primary: #8B967C;
  --primary-light: #a3ad98;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.users-page {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.page-header-copy {
  min-width: 0;
  max-width: 100%;
}

.page-header-copy p {
  max-width: none;
}

.users-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 0.75rem 1rem;
  align-items: start;
  margin-bottom: 1.25rem;
}

.users-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
  max-width: 100%;
}

.users-toolbar-actions .btn-secondary,
.users-toolbar-actions .btn-primary {
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
}

.search-bar {
  position: relative;
  min-width: 0;
  width: 100%;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  left: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  width: 17px;
  height: 17px;
  pointer-events: none;
}

.search-bar input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.65rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}

.search-bar input:focus {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.1);
}

.btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.users-table-card {
  background: #fff;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.users-table th {
  padding: 0.75rem 0.65rem;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #888;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.users-table th:nth-child(1) { width: 18%; }
.users-table th:nth-child(2) { width: 7%; }
.users-table th:nth-child(3) { width: 7%; }
.users-table th:nth-child(4) { width: 14%; }
.users-table th:nth-child(5) { width: 14%; }
.users-table th:nth-child(6) { width: 9%; }
.users-table th:nth-child(7) { width: 9%; }
.users-table th:nth-child(8) { width: 7%; }

.users-table-wrap {
  display: block;
  min-width: 0;
  max-width: 100%;
}

.users-panel {
  min-width: 0;
  max-width: 100%;
}

.users-mobile-list {
  display: none;
}

.email-status-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.email-status-date {
  font-size: 0.72rem;
  color: #9ca3af;
  line-height: 1.2;
}

.email-resend-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  max-width: 100%;
  white-space: normal;
  text-align: left;
  line-height: 1.25;
}

.email-resend-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.user-tag--email-sent {
  background: #ecfdf3;
  color: #15803d;
}

.user-tag--email-pending {
  background: #fff7ed;
  color: #c2410c;
}

.user-tag--email-na {
  background: #f3f4f6;
  color: #9ca3af;
}

.user-tag--whatsapp-no-phone {
  background: #f3f4f6;
  color: #6b7280;
}

.modal-card--wide {
  max-width: 640px;
  width: min(640px, calc(100vw - 2rem));
  box-sizing: border-box;
}

.modal-card--whatsapp .modal-actions--single {
  margin-top: 1rem;
}

.modal-card--whatsapp .modal-actions--single .btn-primary {
  width: 100%;
  justify-content: center;
}

.modal-fields--split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.whatsapp-preview-label {
  margin: 0 0 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
}

.whatsapp-preview-stage {
  background: #e5ddd5;
  border-radius: 12px;
  padding: 0.85rem;
  min-height: 220px;
}

.whatsapp-preview-bubble {
  display: inline-block;
  max-width: 100%;
  background: #d9fdd3;
  color: #111b21;
  padding: 0.55rem 0.7rem;
  border-radius: 8px 8px 8px 2px;
  font-size: 0.84rem;
  line-height: 1.45;
  word-break: break-word;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.08);
}

.whatsapp-link-preview {
  display: flex;
  gap: 0.55rem;
  align-items: stretch;
  margin-bottom: 0.45rem;
  padding: 0.45rem;
  border-left: 3px solid #008069;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.55);
}

.whatsapp-link-preview__thumb {
  width: 52px;
  height: 52px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.whatsapp-link-preview__body {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.whatsapp-link-preview__body strong {
  font-size: 0.8rem;
  color: #111b21;
}

.whatsapp-link-preview__body span {
  font-size: 0.72rem;
  color: #667781;
  line-height: 1.35;
}

.whatsapp-link-preview__body small {
  font-size: 0.68rem;
  color: #008069;
  text-transform: lowercase;
}

.whatsapp-preview-bubble :deep(.wa-bold) {
  font-weight: 700;
}

.whatsapp-preview-bubble :deep(.wa-link) {
  color: #008069;
  text-decoration: none;
  word-break: break-all;
}

.whatsapp-preview-bubble :deep(.wa-msg-list) {
  margin: 0.2rem 0;
  padding-left: 1.1rem;
}

.whatsapp-preview-bubble :deep(.wa-msg-li) {
  margin-bottom: 0.45rem;
}

.whatsapp-preview-bubble :deep(.wa-msg-li:last-child) {
  margin-bottom: 0;
}

.whatsapp-preview-bubble :deep(.wa-italic) {
  font-style: italic;
}

.whatsapp-preview-bubble :deep(.wa-strike) {
  text-decoration: line-through;
}

.whatsapp-preview-bubble :deep(.wa-inline-code),
.whatsapp-preview-bubble :deep(.wa-pre) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82em;
}

@media (max-width: 900px) {
  .modal-fields--split {
    grid-template-columns: 1fr;
  }
}

.modal-card textarea {
  width: 100%;
  min-height: 220px;
  padding: 0.85rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.modal-card textarea:focus {
  border-color: #b8d4b4;
  box-shadow: 0 0 0 3px rgba(45, 90, 39, 0.1);
  outline: none;
}

.user-mobile-card {
  background: #fff;
  border: 1px solid var(--admin-border, #e8ece9);
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.user-mobile-card:hover {
  border-color: #d4e5d0;
  box-shadow: 0 2px 8px rgba(45, 90, 39, 0.06);
}

.user-mobile-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.user-mobile-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem 0.85rem;
  margin: 0;
}

.user-mobile-meta-row {
  min-width: 0;
}

.user-mobile-meta-row dt {
  margin: 0 0 0.2rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
}

.user-mobile-meta-row dd {
  margin: 0;
  font-size: 0.84rem;
  color: #525252;
  font-weight: 500;
}

.user-mobile-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.9rem;
  padding-top: 0.85rem;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary--compact {
  flex: 1 1 100%;
  justify-content: center;
  min-height: 38px;
  font-size: 0.82rem;
}

.user-mobile-actions .icon-btn {
  margin-left: 0;
}

.th-actions,
.td-actions {
  width: 72px;
  text-align: right;
  padding-right: 0.5rem !important;
}

.users-table td {
  padding: 0.75rem 0.65rem;
  border-bottom: 1px solid #f3f3f3;
  vertical-align: middle;
  overflow: hidden;
}

.users-table tbody tr:last-child td {
  border-bottom: none;
}

.user-row {
  cursor: pointer;
  transition: background 0.12s;
}

.user-row:hover td {
  background: #fafcfb;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.user-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.user-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #141414;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.8rem;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-tag {
  display: inline-block;
  max-width: 100%;
  padding: 0.22rem 0.55rem;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}

.users-table .user-tag {
  white-space: normal;
  word-break: break-word;
}

.user-tag--plan-free {
  background: #f3f4f6;
  color: #4b5563;
}

.user-tag--plan-premium {
  background: #eff6ff;
  color: #1d4ed8;
}

.user-tag--plan-platinum {
  background: #f5f3ff;
  color: #6d28d9;
}

.user-tag--status-ativo {
  background: #ecfdf3;
  color: #15803d;
}

.user-tag--status-inativo {
  background: #f3f4f6;
  color: #6b7280;
}

.user-tag--status-pendente {
  background: #fff7ed;
  color: #c2410c;
}

.user-tag--access-expired {
  background: #fef2f2;
  color: #b91c1c;
}

.date-cell {
  font-size: 0.84rem;
  color: #737373;
  font-weight: 500;
}

.td-actions {
  white-space: nowrap;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-left: 0.25rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  color: #666;
  cursor: pointer;
  text-decoration: none;
  vertical-align: middle;
  transition: all 0.12s;
}

.icon-btn:hover {
  border-color: #c8dcc4;
  color: var(--primary);
  background: #f8fbf8;
}

.icon-btn--danger:hover {
  border-color: #fecaca;
  color: #dc2626;
  background: #fff5f5;
}

.icon-xs { width: 15px; height: 15px; }

.empty-state {
  padding: 3.5rem 1.5rem;
  text-align: center;
}

.empty-icon {
  width: 2rem;
  height: 2rem;
  color: #ccc;
  margin-bottom: 0.75rem;
}

.empty-state h3 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 700;
  color: #333;
}

.empty-state p {
  margin: 0;
  font-size: 0.88rem;
  color: #888;
}

.load-error {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 0.9rem;
  font-weight: 600;
}

.loading-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 2.5rem;
  color: #666;
  font-weight: 600;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #ddd;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.requests-section {
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #fde68a;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.requests-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.requests-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #92400e;
}

.requests-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
  font-size: 0.7rem;
  font-weight: 800;
}

.requests-loading,
.requests-empty {
  margin: 0;
  font-size: 0.84rem;
  color: #78716c;
}

.requests-error {
  margin: 0;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.request-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  min-width: 0;
}

.request-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex-shrink: 0;
}

.request-body { min-width: 0; }

.request-body strong {
  display: block;
  font-size: 0.88rem;
  margin-bottom: 0.1rem;
}

.request-body p {
  margin: 0;
  font-size: 0.8rem;
  color: #57534e;
}

.request-message {
  margin-top: 0.25rem !important;
  font-style: italic;
  color: #78716c !important;
}

.request-body small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.74rem;
  color: #a8a29e;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  padding: 1rem;
}

.modal-card {
  background: #fff;
  border-radius: var(--cf-radius-surface);
  padding: 1.5rem;
  width: min(420px, 100%);
}

.modal-card h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 800;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1.25rem;
}

.modal-submit { margin: 0; }

.create-error {
  color: #c53030;
  font-size: 0.88rem;
  margin-top: 0.75rem;
}

.modal-hint {
  margin: 0 0 0.75rem;
  font-size: 0.84rem;
  color: #78716c;
  line-height: 1.45;
}

.field-hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #9ca3af;
}

.label-required {
  color: #c2410c;
}

@media (max-width: 1280px) {
  .users-toolbar {
    grid-template-columns: 1fr;
  }

  .search-bar {
    max-width: none;
  }

  .users-toolbar-actions {
    justify-content: stretch;
    width: 100%;
  }

  .users-toolbar-actions .btn-secondary {
    flex: 1 1 calc(50% - 0.25rem);
    justify-content: center;
    font-size: 0.82rem;
  }

  .users-toolbar-actions .btn-primary {
    flex: 1 1 100%;
    justify-content: center;
    font-size: 0.82rem;
  }

  .users-table-wrap { display: none; }
  .users-mobile-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .request-card {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .request-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .request-actions .btn-secondary,
  .request-actions .btn-primary {
    flex: 1 1 calc(50% - 0.25rem);
    min-width: 0;
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .users-page { padding: 1.25rem 1rem 2rem; }

  .requests-section {
    padding: 0.85rem;
  }

  .user-mobile-meta {
    grid-template-columns: 1fr;
  }

  .modal-card {
    width: 100%;
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
  }

  .modal-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .modal-actions .btn-secondary,
  .modal-actions .btn-primary {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .request-actions .btn-secondary,
  .request-actions .btn-primary {
    flex: 1 1 100%;
  }

  .page-header-copy h1 {
    font-size: 1.35rem;
  }

  .page-header-copy p {
    font-size: 0.82rem;
    line-height: 1.45;
  }
}
</style>


