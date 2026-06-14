<template>
  <NuxtLayout name="dashboard">
    <div class="users-container">
      <div class="users-page admin-shell">
        <header class="admin-shell-header">
          <div class="page-header-copy">
            <h1>Gestão de Alunos</h1>
            <p>
              {{ users.length }} {{ users.length === 1 ? 'aluna cadastrada' : 'alunas cadastradas' }}
              <span v-if="activeCount !== users.length"> · {{ activeCount }} ativas</span>
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
          <button type="button" class="btn-primary" @click="openCreateModal">
            <UserPlus class="btn-icon" />
            Adicionar aluna
          </button>
        </div>

        <!-- Users Table -->
        <p v-if="loadError" class="load-error">{{ loadError }}</p>

        <section v-if="registrationRequests.length" class="requests-section">
          <div class="requests-head">
            <h2 class="requests-title">Solicitações pendentes</h2>
            <span class="requests-count">{{ registrationRequests.length }}</span>
          </div>
          <div class="requests-list">
            <article v-for="req in registrationRequests" :key="req.id" class="request-card">
              <PatientAvatar :name="req.name" size="sm" :ring="false" />
              <div class="request-body">
                <strong>{{ req.name }}</strong>
                <p>{{ req.email }}<span v-if="req.phone"> · {{ req.phone }}</span></p>
                <p v-if="req.message" class="request-message">{{ req.message }}</p>
                <small>{{ formatDate(req.createdAt) }}</small>
              </div>
              <button type="button" class="btn-request" @click="openCreateFromRequest(req)">
                Criar conta
              </button>
            </article>
          </div>
        </section>

        <div v-if="loading" class="loading-row">
          <span class="loading-spinner" aria-hidden="true" />
          Carregando alunas...
        </div>

        <div v-else class="users-panel">
          <div class="users-table-card">
            <table v-if="filteredUsers.length" class="users-table">
              <thead>
                <tr>
                  <th>Aluna</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Membro desde</th>
                  <th>Acesso até</th>
                  <th class="th-actions">Ações</th>
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
                  <td class="date-cell">{{ formatDate(user.createdAt) }}</td>
                  <td class="date-cell">{{ formatAccessDate(user.accessExpiresAt) }}</td>
                  <td class="td-actions" @click.stop>
                    <NuxtLink :to="`/usuarios/${user.id}`" class="icon-btn" title="Ver perfil">
                      <Edit3 class="icon-xs" />
                    </NuxtLink>
                    <button type="button" class="icon-btn icon-btn--danger" title="Remover" @click="handleDelete(user.id)">
                      <Trash2 class="icon-xs" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-else-if="!loadError" class="empty-state">
              <UserPlus class="empty-icon" />
              <h3>{{ searchQuery ? 'Nenhuma aluna encontrada' : 'Nenhuma aluna cadastrada' }}</h3>
              <p>{{ searchQuery ? 'Tente outro termo na busca.' : 'Clique em Adicionar aluna para começar.' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <form class="modal-card" @submit.prevent="createPatient">
          <h3>{{ creatingFromRequest ? 'Aprovar solicitação' : 'Nova paciente' }}</h3>
          <p v-if="creatingFromRequest" class="modal-hint">
            Defina até quando a aluna terá acesso, conforme o plano presencial contratado.
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

            <div class="field field--float">
              <label for="create-password">Senha inicial</label>
              <input
                id="create-password"
                v-model="createForm.password"
                type="password"
                required
                minlength="6"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div class="field field--float">
              <label for="create-plan">Plano</label>
              <select id="create-plan" v-model="createForm.plan">
                <option value="FREE">FREE</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="PLATINUM">PLATINUM</option>
              </select>
            </div>

            <div class="field field--float">
              <label for="create-access-expires">
                Acesso válido até
                <span v-if="creatingFromRequest" class="label-required">*</span>
              </label>
              <input
                id="create-access-expires"
                v-model="createForm.accessExpiresAt"
                type="date"
                :required="creatingFromRequest"
                :min="minAccessDate"
              />
            </div>
          </div>

          <p v-if="!creatingFromRequest" class="field-hint">Opcional. Deixe em branco para acesso sem data limite.</p>
          <p v-if="createError" class="create-error">{{ createError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn-primary modal-submit" :disabled="creating">
              {{ creating ? 'Salvando...' : (creatingFromRequest ? 'Aprovar e criar conta' : 'Criar paciente') }}
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
const apiBase = computed(() => config.public.apiBase)

import { Search, UserPlus, Edit3, Trash2 } from 'lucide-vue-next'
import { apiConnectionErrorMessage, isApiConnectionError } from '~/utils/resolve-api-base.mjs'

const users = ref([])
const registrationRequests = ref([])
const searchQuery = ref('')
const showCreateModal = ref(false)
const creatingFromRequest = ref(false)
const creating = ref(false)
const createError = ref('')
const loading = ref(true)
const loadError = ref('')

const createForm = reactive({
  name: '',
  email: '',
  password: '',
  plan: 'FREE',
  accessExpiresAt: '',
})

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

const fetchUsers = async () => {
  loading.value = true
  loadError.value = ''

  const token = localStorage.getItem('auth_token')
  const role = localStorage.getItem('user_role')

  if (!token || role !== 'NUTRICIONISTA') {
    loading.value = false
    loadError.value = 'Sessão expirada. Faça login novamente como nutricionista.'
    return
  }

  try {
    const [usersData, requestsData] = await Promise.all([
      $fetch(`${apiBase.value}/users`, { headers: authHeaders() }),
      $fetch(`${apiBase.value}/users/registration-requests`, { headers: authHeaders() }).catch(() => ({ requests: [] })),
    ])

    users.value = Array.isArray(usersData)
      ? usersData.filter((u) => u.role === 'PACIENTE')
      : []
    registrationRequests.value = requestsData?.requests || []
  } catch (err) {
    users.value = []
    registrationRequests.value = []

    if (err?.statusCode === 401 || err?.statusCode === 403) {
      loadError.value = 'Sem permissão ou sessão expirada. Faça login novamente.'
      return
    }

    if (isApiConnectionError(err)) {
      loadError.value = apiConnectionErrorMessage({
        hostname: window.location.hostname,
        dev: process.env.NODE_ENV !== 'production',
      })
      return
    }

    loadError.value = err.data?.error || err.data?.message || 'Não foi possível carregar os alunos.'
  } finally {
    loading.value = false
  }
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

function formatPlan(plan) {
  const key = (plan || 'FREE').toUpperCase()
  if (key === 'PREMIUM') return 'Premium'
  if (key === 'PLATINUM') return 'Platinum'
  return 'Free'
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

const goToPatient = (user) => {
  if (user.role === 'PACIENTE') {
    navigateTo(`/usuarios/${user.id}`)
  }
}

const openCreateModal = () => {
  creatingFromRequest.value = false
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
  createForm.name = req.name
  createForm.email = req.email
  createForm.password = ''
  createForm.plan = 'FREE'
  createForm.accessExpiresAt = ''
  createError.value = ''
  showCreateModal.value = true
}

const createPatient = async () => {
  creating.value = true
  createError.value = ''

  if (creatingFromRequest.value && !createForm.accessExpiresAt) {
    createError.value = 'Informe até quando a aluna terá acesso.'
    creating.value = false
    return
  }

  try {
    const user = await $fetch(`${apiBase.value}/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        plan: createForm.plan,
        accessExpiresAt: createForm.accessExpiresAt || null,
      },
    })
    showCreateModal.value = false
    creatingFromRequest.value = false
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

const formatAccessDate = (date) => {
  if (!date) return 'Sem limite'
  return formatDate(date)
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
    alert('Erro ao excluir usuário.')
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.users-container {
  --primary: #2d5a27;
  --primary-light: #4c8c4a;
}

.users-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.search-bar {
  position: relative;
  flex: 1;
  min-width: 0;
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

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex-shrink: 0;
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 0.65rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  white-space: nowrap;
  line-height: 1;
  transition: background 0.15s;
}

.btn-primary:hover {
  background: var(--primary-light);
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
  padding: 0.85rem 1.15rem;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #888;
  background: #fafafa;
  border-bottom: 1px solid #eee;
}

.users-table th:nth-child(1) { width: 30%; }
.users-table th:nth-child(2) { width: 10%; }
.users-table th:nth-child(3) { width: 10%; }
.users-table th:nth-child(4) { width: 14%; }
.users-table th:nth-child(5) { width: 14%; }

.th-actions,
.td-actions {
  width: 96px;
  text-align: right;
}

.users-table td {
  padding: 0.85rem 1.15rem;
  border-bottom: 1px solid #f3f3f3;
  vertical-align: middle;
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

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.request-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
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

.btn-request {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  background: #92400e;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
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

.btn-secondary {
  background: #fff;
  color: #444;
  border: 1px solid #e5e7eb;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
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

@media (max-width: 768px) {
  .users-page { padding: 1.25rem 1rem 2rem; }

  .users-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar { max-width: none; }

  .users-toolbar .btn-primary {
    justify-content: center;
  }

  .users-table-card { overflow-x: auto; }

  .users-table { min-width: 640px; }
}
</style>


