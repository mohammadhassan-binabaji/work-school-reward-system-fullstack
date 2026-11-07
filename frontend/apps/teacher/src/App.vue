<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import TeacherHeader from './components/TeacherHeader.vue';
import TeacherBottomNav from './components/TeacherBottomNav.vue';
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
  <div class="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans select-none">
    <!-- Login Layout -->
    <template v-if="isAuthPage">
      <router-view />
    </template>

    <!-- Main Authenticated Mobile Shell -->
    <template v-else>
      <div class="w-full max-w-lg mx-auto flex flex-col min-h-screen relative shadow-lg bg-slate-200">
        <TeacherHeader />
        <main class="flex-1 px-4 py-3">
          <router-view />
        </main>
        <TeacherBottomNav />
      </div>
    </template>
  </div>
</template>
