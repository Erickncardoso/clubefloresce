<template>
  <NuxtLayout name="dashboard">
    <div class="users-container">
      <div class="users-page">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1>GestÃ£o de Alunos</h1>
            <p>Gerencie quem tem acesso ao seu conteÃºdo e controle planos de assinatura.</p>
          </div>
          <div class="header-actions">
            <div class="search-bar">
              <Search class="search-icon" />
              <input v-model="searchQuery" placeholder="Buscar por nome ou e-mail..." />
            </div>
            <button class="btn-primary">
              <UserPlus class="btn-icon" />
              Adicionar Aluno
            </button>
          </div>
        </div>

        <!-- Users Table -->
        <div class="users-table-card">
          <table class="users-table">
            <thead>
              <tr>
                <th>UsuÃ¡rio</th>
                <th>Papel</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Membro desde</th>
                <th class="text-right">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ user.name.charAt(0) }}</div>
                    <div class="user-details">
                      <h4 class="user-name">{{ user.name }}</h4>
                      <span class="user-email">{{ user.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-badge" :class="user.role.toLowerCase()">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <span class="plan-badge">
                    {{ user.plan || 'Free' }}
                  </span>
                </td>
                <td>
                  <div class="status-indicator" :class="user.status?.toLowerCase() || 'ativo'">
                    <span class="dot"></span>
                    {{ user.status || 'Ativo' }}
                  </div>
                </td>
                <td class="date-cell">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="text-right">
                  <div class="action-buttons">
                    <button class="btn-action" title="Editar">
                      <Edit3 class="icon-xs" />
                    </button>
                    <button class="btn-action danger" @click="handleDelete(user.id)" title="Deletar">
                      <Trash2 class="icon-xs" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredUsers.length">
                <td colspan="6" class="empty-row">Nenhum aluno encontrado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase

import { Search, UserPlus, Edit3, Trash2 } from 'lucide-vue-next'

const users = ref([])
const searchQuery = ref('')

const fetchUsers = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    users.value = data
  } catch (err) {
    console.warn('Erro ao buscar usuÃ¡rios. Verifique autenticaÃ§Ã£o.')
  }
}

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(u => 
    u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const handleDelete = async (id) => {
  if (!confirm('Deseja realmente remover este acesso?')) return
  try {
    const token = localStorage.getItem('auth_token')
    await $fetch(`${apiBase}/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchUsers()
  } catch (err) {
    alert('Erro ao excluir usuÃ¡rio.')
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.users-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.users-page {
  padding: 3rem;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 3.5rem;
}

.page-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1rem;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.search-bar {
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
  width: 18px;
  height: 18px;
}

.search-bar input {
  width: 100%;
  padding: 0.8rem 1rem 0.8rem 3rem;
  border: 1px solid #eee;
  border-radius: 12px;
  background: white;
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
}

.search-bar input:focus {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.05);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.8rem 1.6rem;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 39, 0.2);
}

/* Table Card */
.users-table-card {
  background: white;
  border-radius: 24px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  text-align: left;
  padding: 1.5rem;
  background: #fafcfb;
  font-size: 0.8rem;
  font-weight: 800;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #f0f0f0;
}

.users-table td {
  padding: 1.5rem;
  border-bottom: 1px solid #f8f8f8;
  vertical-align: middle;
}

.users-table tr:last-child td { border-bottom: none; }

.user-cell {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.user-avatar {
  width: 44px;
  height: 44px;
  background: #f0fdf4;
  color: var(--primary);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
}

.user-name {
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 2px;
}

.user-email {
  font-size: 0.85rem;
  color: #aaa;
  font-weight: 500;
}

/* Badges & Indicators */
.role-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
}

.role-badge.nutricionista { background: #fffbeb; color: #d97706; }
.role-badge.paciente { background: #eff6ff; color: #2563eb; }

.plan-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: #555;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 6px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #555;
}

.status-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.ativo .dot { background: #16a34a; box-shadow: 0 0 8px rgba(22, 163, 74, 0.4); }
.status-indicator.inativo .dot { background: #d1d5db; }

.date-cell { font-size: 0.85rem; color: #888; font-weight: 600; }

.text-right { text-align: right; }

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-action {
  background: transparent;
  border: 1px solid #f0f0f0;
  color: #888;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover { background: #f8fbf8; color: var(--primary); border-color: var(--primary-light); }
.btn-action.danger:hover { background: #fff5f5; color: #e63946; border-color: #ffdada; }

.icon-xs { width: 16px; height: 16px; }

.empty-row {
  text-align: center;
  padding: 4rem !important;
  color: #ccc;
}
</style>


