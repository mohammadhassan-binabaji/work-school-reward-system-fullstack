<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import AdminLayout from './components/AdminLayout.vue';
import { createNotificationCountRefresh, createNotificationEventStream } from '@student-reward/shared';

const route = useRoute();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();
const notificationRefresh = createNotificationCountRefresh({
  fetchUnreadCount: () => notifStore.fetchUnreadCount(),
});
function reconcileNotifications(): void {
  void notifStore.fetchUnreadCount();
  if (route.path === '/notifications') {
    void notifStore.fetchNotifications(1);
  }
}
const notificationEvents = createNotificationEventStream({
  onNotification: reconcileNotifications,
  onConnected: reconcileNotifications,
});
const stopAuthWatch = watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    notificationRefresh.setAuthenticated(isAuthenticated);
    if (isAuthenticated) {
      notificationEvents.start();
    } else {
      notificationEvents.stop();
    }
  },
  { immediate: true },
);
const removeRouteHook = router.afterEach((to, _from, failure) => {
  if (!failure && to.meta.requiresAuth && authStore.isAuthenticated) {
    void notifStore.fetchUnreadCount();
  }
});

const isAuthPage = computed(() => route.path === '/login');

onMounted(() => {
  notificationRefresh.start(authStore.isAuthenticated);
});

onUnmounted(() => {
  stopAuthWatch();
  removeRouteHook();
  notificationRefresh.stop();
  notificationEvents.stop();
});
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 font-sans select-none">
    <template v-if="isAuthPage">
      <router-view />
    </template>

    <template v-else>
      <AdminLayout>
        <router-view />
      </AdminLayout>
    </template>
  </div>
</template>
