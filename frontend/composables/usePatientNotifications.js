import { CalendarCheck, Sparkles, Users, BookOpen, Bell } from 'lucide-vue-next'

const TYPE_ICONS = {
  bella: Sparkles,
  checkin: CalendarCheck,
  community: Users,
  content: BookOpen,
  general: Bell,
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatNotificationTime(createdAt) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const dayDiff = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / (1000 * 60 * 60 * 24),
  )
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (dayDiff === 0) {
    if (diffHours < 1) return 'Agora'
    return `Há ${diffHours}h`
  }
  if (dayDiff === 1) return 'Ontem'
  if (dayDiff < 7) return `${dayDiff} dias`
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function getNotificationGroup(createdAt) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'ANTERIORES'

  const now = new Date()
  const dayDiff = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / (1000 * 60 * 60 * 24),
  )

  if (dayDiff === 0) return 'HOJE'
  if (dayDiff === 1) return 'ONTEM'
  if (dayDiff < 7) return 'ESTA SEMANA'
  return 'ANTERIORES'
}

export function mapNotificationItem(item) {
  return {
    ...item,
    icon: TYPE_ICONS[item.type] || TYPE_ICONS.general,
    text: item.body,
    time: formatNotificationTime(item.createdAt),
    group: getNotificationGroup(item.createdAt),
  }
}

export function usePatientNotifications() {
  const apiBase = useApiBase()
  const { authHeaders } = usePatientAuth()

  const items = useState('patient-notifications', () => [])
  const unreadCount = useState('patient-notifications-unread', () => 0)
  const loading = useState('patient-notifications-loading', () => false)
  const error = useState('patient-notifications-error', () => '')

  const hasUnread = computed(() => unreadCount.value > 0)

  const grouped = computed(() => {
    const labels = ['HOJE', 'ONTEM', 'ESTA SEMANA', 'ANTERIORES']
    const mapped = items.value.map(mapNotificationItem)
    return labels
      .map((label) => ({
        label,
        items: mapped.filter((entry) => entry.group === label),
      }))
      .filter((group) => group.items.length > 0)
  })

  async function fetchNotifications() {
    loading.value = true
    error.value = ''
    try {
      const data = await $fetch(`${apiBase.value}/notifications`, {
        headers: authHeaders(),
      })
      items.value = data?.items || []
      unreadCount.value = data?.unreadCount || 0
    } catch (err) {
      error.value = err?.data?.message || 'Não foi possível carregar as notificações.'
    } finally {
      loading.value = false
    }
  }

  async function markRead(notificationId) {
    const data = await $fetch(`${apiBase.value}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    items.value = items.value.map((item) => (
      item.id === notificationId ? { ...item, read: true } : item
    ))
    unreadCount.value = data?.unreadCount ?? unreadCount.value
  }

  async function markAllRead() {
    const data = await $fetch(`${apiBase.value}/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    items.value = items.value.map((item) => ({ ...item, read: true }))
    unreadCount.value = data?.unreadCount ?? 0
  }

  async function openNotification(notification) {
    if (!notification?.id) return
    if (!notification.read) {
      try {
        await markRead(notification.id)
      } catch {
        /* mantém navegação mesmo se falhar marcar como lida */
      }
    }
    if (notification.actionPath) {
      await navigateTo(notification.actionPath)
    }
  }

  return {
    items,
    grouped,
    unreadCount,
    hasUnread,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    openNotification,
  }
}
