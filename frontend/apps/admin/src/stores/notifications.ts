import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  api,
  type Notification,
  type PaginatedNotificationsResponse,
} from '@student-reward/shared';

export const useNotificationsStore = defineStore('adminNotifications', () => {
  const unreadCount = ref(0);
  const notifications = ref<Notification[]>([]);
  const loading = ref(false);
  const currentPage = ref(1);
  const totalPages = ref(0);

  async function fetchUnreadCount(): Promise<void> {
    try {
      const res = await api.get<{ unreadCount: number }>('/notifications/unread-count');
      unreadCount.value = res.unreadCount;
    } catch {
      // Ignore
    }
  }

  async function fetchNotifications(page = currentPage.value): Promise<void> {
    loading.value = true;
    try {
      const res = await api.get<PaginatedNotificationsResponse>('/notifications', { page });
      notifications.value = res.data;
      currentPage.value = res.meta.currentPage;
      totalPages.value = res.meta.totalPages;
      await fetchUnreadCount();
    } catch {
      // Ignore
    } finally {
      loading.value = false;
    }
  }

  async function goToPage(page: number): Promise<void> {
    if (loading.value || page < 1 || page > totalPages.value || page === currentPage.value) {
      return;
    }
    await fetchNotifications(page);
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
    currentPage,
    totalPages,
    fetchUnreadCount,
    fetchNotifications,
    goToPage,
    markAsRead,
    markAllAsRead,
  };
});
