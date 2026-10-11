import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, type Notification } from '@student-reward/shared';

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0);
  const notifications = ref<Notification[]>([]);
  const loading = ref(false);

  async function fetchUnreadCount(): Promise<void> {
    try {
      const res = await api.get<{ unreadCount: number }>('/notifications/unread-count');
      unreadCount.value = res.unreadCount;
    } catch {
      // Ignore
    }
  }

  async function fetchNotifications(): Promise<void> {
    loading.value = true;
    try {
      const res = await api.get<{ notifications: Notification[]; total: number }>('/notifications');
      notifications.value = res.notifications || [];
      await fetchUnreadCount();
    } catch {
      // Ignore
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(id: string): Promise<void> {
    try {
      await api.patch(`/notifications/${id}/read`);
      const item = notifications.value.find((n) => n.id === id);
      if (item && item.readStatus === 'UNREAD') {
        item.readStatus = 'READ';
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch {
      // Ignore
    }
  }

  async function markAllAsRead(): Promise<void> {
    try {
      await api.patch('/notifications/read-all');
      notifications.value.forEach((n) => (n.readStatus = 'READ'));
      unreadCount.value = 0;
    } catch {
      // Ignore
    }
  }

  return {
    unreadCount,
    notifications,
    loading,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
});
