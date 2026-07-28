export const ADMIN_AGENDA_WEEKLY_GOAL = 7

export function useAdminAgendaTopbar() {
  const refreshTick = useState('admin-agenda-topbar-tick', () => 0)

  function refreshAdminAgendaTopbar() {
    refreshTick.value += 1
  }

  return {
    refreshTick,
    refreshAdminAgendaTopbar,
    weeklyGoal: ADMIN_AGENDA_WEEKLY_GOAL,
  }
}
