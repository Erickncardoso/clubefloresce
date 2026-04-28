<template>
  <NuxtLayout name="dashboard">
    <div class="finance-container">
      <div class="finance-page">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1>Centro Financeiro</h1>
            <p>Monitore seu faturamento, membros ativos e desempenho do portal.</p>
          </div>
          <button class="btn-export">
            <Download class="btn-icon" />
            Exportar RelatÃ³rio
          </button>
        </div>

        <!-- KPIs: MÃ©tricas de Impacto -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon-box blue">
              <TrendingUp />
            </div>
            <div class="stat-data">
              <span class="stat-label">Faturamento Total</span>
              <h2 class="stat-value">{{ formatCurrency(summary.totalRevenue) }}</h2>
              <span class="stat-change positive">+{{ summary.growth }}% este mÃªs</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-box green">
              <Users />
            </div>
            <div class="stat-data">
              <span class="stat-label">Membros Ativos</span>
              <h2 class="stat-value">{{ summary.activeMembers }}</h2>
              <span class="stat-change positive">+4 novos (7 dias)</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-box purple">
              <CreditCard />
            </div>
            <div class="stat-data">
              <span class="stat-label">Ticket MÃ©dio</span>
              <h2 class="stat-value">R$ 189,90</h2>
              <span class="stat-change">EstÃ¡vel</span>
            </div>
          </div>
        </div>

        <!-- Chart & Transactions -->
        <div class="finance-content">
          <!-- GrÃ¡fico Simulado (Elite Style) -->
          <div class="chart-section">
            <div class="section-header">
              <h3>EvoluÃ§Ã£o de Receita</h3>
              <div class="period-selector">
                <button class="period-btn active">7D</button>
                <button class="period-btn">30D</button>
                <button class="period-btn">12M</button>
              </div>
            </div>
            <div class="chart-container">
              <!-- Placeholder para grÃ¡fico botÃ¢nico -->
              <div class="mock-chart">
                <div class="chart-line" v-for="(h, i) in [40, 65, 50, 85, 70, 95, 80]" :key="i" :style="{ height: h + '%' }">
                  <div class="chart-tooltip">R$ {{ (h * 50).toFixed(0) }}</div>
                </div>
              </div>
              <div class="chart-labels">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
              </div>
            </div>
          </div>

          <!-- TransaÃ§Ãµes Recentes -->
          <div class="transactions-section">
            <div class="section-header">
              <h3>Vendas Recentes</h3>
              <NuxtLink to="#" class="see-all">Ver tudo</NuxtLink>
            </div>
            <div class="transactions-list">
              <div v-for="tx in summary.recentTransactions" :key="tx.id" class="tx-item">
                <div class="tx-user">
                  <div class="tx-avatar">{{ tx.user?.name?.charAt(0) || 'U' }}</div>
                  <div>
                    <h5 class="tx-name">{{ tx.user?.name || 'Cliente' }}</h5>
                    <span class="tx-date">{{ formatDate(tx.createdAt) }}</span>
                  </div>
                </div>
                <div class="tx-amount">
                  <span class="tx-value">{{ formatCurrency(tx.amount) }}</span>
                  <span class="tx-status" :class="tx.status.toLowerCase()">{{ tx.status }}</span>
                </div>
              </div>
              
              <!-- Mock if empty -->
              <div v-if="!summary.recentTransactions?.length" class="empty-tx">
                <p>Nenhuma transaÃ§Ã£o recente encontrada.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const whatsappApiBase = config.public.whatsappApiBase

import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Download
} from 'lucide-vue-next'

const summary = ref({
  totalRevenue: 2450.00,
  activeMembers: 12,
  growth: 15,
  recentTransactions: []
})

const fetchFinancial = async () => {
  try {
    const token = localStorage.getItem('auth_token')
    const data = await $fetch(`${apiBase}/financial/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    summary.value = data
  } catch (err) {
    console.warn('Usando dados simulados para o dashboard financeiro.')
  }
}

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR')
}

onMounted(fetchFinancial)
</script>

<style scoped>
.finance-container {
  min-height: 100%;
  background-color: #fcfcfc;
}

.finance-page {
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

.btn-export {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #eee;
  padding: 0.7rem 1.4rem;
  border-radius: 12px;
  font-weight: 700;
  color: #444;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #f8fbf8;
  border-color: var(--primary-light);
  color: var(--primary);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  border: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.03);
}

.stat-icon-box {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-box svg { width: 28px; height: 28px; }

.stat-icon-box.green { background: #f0fdf4; color: #16a34a; }
.stat-icon-box.blue { background: #eff6ff; color: #2563eb; }
.stat-icon-box.purple { background: #faf5ff; color: #9333ea; }

.stat-label { font-size: 0.85rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 1.8rem; font-weight: 800; color: #111; margin: 4px 0; }
.stat-change { font-size: 0.85rem; font-weight: 700; color: #aaa; }
.stat-change.positive { color: #16a34a; }

/* Content Area */
.finance-content {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 2.5rem;
}

.chart-section, .transactions-section {
  background: white;
  border-radius: 24px;
  padding: 2.2rem;
  border: 1px solid #f0f0f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h3 { font-size: 1.25rem; font-weight: 800; color: #111; }

.period-selector {
  background: #f8f8f8;
  padding: 4px;
  border-radius: 10px;
  display: flex;
  gap: 4px;
}

.period-btn {
  border: none;
  background: transparent;
  padding: 0.4rem 0.8rem;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #777;
  cursor: pointer;
  transition: 0.2s;
}

.period-btn.active { background: white; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

/* Mock Chart */
.chart-container {
  height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.mock-chart {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  height: 200px;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f8f8f8;
}

.chart-line {
  flex: 1;
  background: linear-gradient(to top, var(--primary), var(--primary-light));
  border-radius: 8px 8px 4px 4px;
  position: relative;
  transition: all 0.3s;
  opacity: 0.8;
}

.chart-line:hover { opacity: 1; transform: scaleY(1.05); }

.chart-tooltip {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: 0.2s;
}

.chart-line:hover .chart-tooltip { opacity: 1; top: -45px; }

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #bbb;
  padding: 0 0.5rem;
}

/* Transactions */
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0;
}

.tx-user { display: flex; align-items: center; gap: 1rem; }

.tx-avatar {
  width: 40px;
  height: 40px;
  background: #f8fbf8;
  color: var(--primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  border: 1px solid #eff6ef;
}

.tx-name { font-size: 0.95rem; font-weight: 700; color: #111; margin-bottom: 2px; }
.tx-date { font-size: 0.8rem; color: #bbb; font-weight: 600; }

.tx-amount { text-align: right; }
.tx-value { display: block; font-size: 1rem; font-weight: 800; color: #111; margin-bottom: 4px; }
.tx-status {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 5px;
}

.tx-status.paid { background: #f0fdf4; color: #16a34a; }
.tx-status.pending { background: #fffbeb; color: #d97706; }

.see-all { font-size: 0.85rem; font-weight: 700; color: var(--primary); text-decoration: none; }
.empty-tx { text-align: center; color: #ccc; padding: 2rem 0; font-size: 0.9rem; }
</style>

