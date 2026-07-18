import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { usePatientApi } from '@/hooks/usePatientApi';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionPath?: string | null;
};

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const dayDiff = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (dayDiff === 0) {
    if (diffHours < 1) return 'Agora';
    return `Há ${diffHours}h`;
  }
  if (dayDiff === 1) return 'Ontem';
  if (dayDiff < 7) return `${dayDiff} dias`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function getNotificationGroup(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'ANTERIORES';

  const now = new Date();
  const dayDiff = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDiff === 0) return 'HOJE';
  if (dayDiff === 1) return 'ONTEM';
  if (dayDiff < 7) return 'ESTA SEMANA';
  return 'ANTERIORES';
}

export function usePatientNotifications() {
  const router = useRouter();
  const { request } = usePatientApi();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasUnread = unreadCount > 0;

  const grouped = useMemo(() => {
    const labels = ['HOJE', 'ONTEM', 'ESTA SEMANA', 'ANTERIORES'];
    return labels
      .map((label) => ({
        label,
        items: items.filter((entry) => getNotificationGroup(entry.createdAt) === label),
      }))
      .filter((group) => group.items.length > 0);
  }, [items]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<{ items?: NotificationItem[]; unreadCount?: number }>('/notifications');
      const list = data?.items || [];
      setItems(list);
      setUnreadCount(
        typeof data?.unreadCount === 'number'
          ? data.unreadCount
          : list.filter((item) => !item.read).length,
      );
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  const markRead = useCallback(async (notificationId: string) => {
    const data = await request<{ unreadCount?: number }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    setItems((prev) => prev.map((item) => (
      item.id === notificationId ? { ...item, read: true } : item
    )));
    setUnreadCount(data?.unreadCount ?? unreadCount);
  }, [request, unreadCount]);

  const markAllRead = useCallback(async () => {
    const data = await request<{ unreadCount?: number }>('/notifications/read-all', {
      method: 'PATCH',
    });
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(data?.unreadCount ?? 0);
  }, [request]);

  const openNotification = useCallback(async (notification: NotificationItem) => {
    if (!notification?.id) return;
    if (!notification.read) {
      try {
        await markRead(notification.id);
      } catch {
        /* mantém navegação */
      }
    }
    if (notification.actionPath) {
      router.push(notification.actionPath as never);
    }
  }, [markRead, router]);

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
    formatNotificationTime,
  };
}
