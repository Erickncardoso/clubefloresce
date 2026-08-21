<template>
  <div class="patient-page menu-page">
    <PatientHeader />

    <div class="menu-body">
      <h1 class="menu-heading">Menu</h1>

      <section class="menu-grid" aria-label="Atalhos">
        <button
          v-for="item in gridItems"
          :key="item.to"
          type="button"
          class="menu-tile cf-squircle cf-squircle--control"
          @click="openItem(item.to)"
        >
          <span class="menu-tile-icon" aria-hidden="true">
            <component :is="item.icon" />
          </span>
          <span class="menu-tile-label">{{ item.label }}</span>
          <span v-if="item.badge" class="menu-tile-dot" aria-label="Novidade" />
        </button>
      </section>

      <button type="button" class="menu-logout" @click="logout">
        Sair da conta
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  Bell,
  BookOpen,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UtensilsCrossed,
  Repeat,
} from 'lucide-vue-next'
import CheckinIcon from '~/components/icons/CheckinIcon.vue'

definePageMeta({ layout: 'patient', middleware: 'patient-only' })

const { clearPatientSession } = usePatientApp()
const { hasUnread } = usePatientNotifications()
const { navigateOrGate } = usePatientPremiumGate()

const gridItems = computed(() => [
  { to: '/perfil', label: 'Perfil', icon: UserRound },
  { to: '/dieta', label: 'Dieta', icon: UtensilsCrossed },
  { to: '/check-in', label: 'Check-in', icon: CheckinIcon },
  { to: '/assinatura', label: 'Meu acesso', icon: ShieldCheck },
  {
    to: '/perfil/notificacoes',
    label: 'Avisos',
    icon: Bell,
    badge: hasUnread.value,
  },
  { to: '/perfil/configuracoes', label: 'Ajustes', icon: Settings },
  { to: '/comunidade', label: 'Comunidade', icon: Users },
  { to: '/conteudo', label: 'Biblioteca', icon: BookOpen },
  { to: '/substituicao', label: 'Trocas', icon: Repeat },
])

async function openItem(to) {
  await navigateOrGate(to)
}

function logout() {
  clearPatientSession()
  navigateTo('/')
}
</script>

<style scoped>
.menu-page {
  background: #fff;
}

.menu-body {
  padding: 0.15rem 1.25rem 2.5rem;
}

.menu-heading {
  margin: 0 0 1.2rem;
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.1;
  color: var(--cf-text);
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

.menu-tile {
  position: relative;
  display: flex;
  min-height: 7.1rem;
  padding: 1.05rem 0.4rem 0.9rem;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.7rem;
  border: 1px solid #e4e8dc;
  background: #f6f7f4;
  color: var(--cf-text);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, transform 0.15s ease;
}

.menu-tile:active {
  background: #eef0eb;
  transform: scale(0.98);
}

.menu-tile-icon {
  display: flex;
  width: 1.55rem;
  height: 1.55rem;
  align-items: center;
  justify-content: center;
  color: var(--cf-text);
}

.menu-tile-icon :deep(svg) {
  width: 1.5rem;
  height: 1.5rem;
  stroke-width: 1.85;
}

.menu-tile-label {
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.25;
  text-align: center;
}

.menu-tile-dot {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--cf-green, #8b967c);
}

.menu-logout {
  display: block;
  width: 100%;
  margin-top: 1.35rem;
  padding: 0.95rem;
  border: none;
  background: transparent;
  color: #b42318;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
}

.menu-logout:active {
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .menu-tile {
    transition: none;
  }

  .menu-tile:active {
    transform: none;
  }
}
</style>
