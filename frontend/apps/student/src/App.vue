<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createNotificationCountRefresh, createNotificationEventStream } from '@student-reward/shared';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import { useVersionStore } from './stores/version';
import { setupMobileNavigation } from './services/mobileNavigation';
import { createStudentPushNotifications } from './services/pushNotifications';
import StudentHeader from './components/StudentHeader.vue';
import StudentBottomNav from './components/StudentBottomNav.vue';
import StudentConfirmDialog from './components/StudentConfirmDialog.vue';
import VersionUpdateModal from './components/VersionUpdateModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();
const versionStore = useVersionStore();
const isExitConfirmationOpen = ref(false);
const notificationRefresh = createNotificationCountRefresh({
  fetchUnreadCount: () => notifStore.fetchUnreadCount(),
  subscribeToAppState: Capacitor.isNativePlatform()
    ? async (listener) => {
        const handle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          listener(isActive);
        });
        return () => {
          void handle.remove().catch((error) => {
            console.error('Failed to remove the app state listener:', error);
          });
        };
      }
    : undefined,
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
const studentPushNotifications = createStudentPushNotifications(() => {
  void router.isReady().then(() => router.push('/notifications'));
});
let removeAppStateListener: (() => void) | undefined;
const stopAuthWatch = watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    notificationRefresh.setAuthenticated(isAuthenticated);
    if (isAuthenticated) {
      notificationEvents.start();
      void studentPushNotifications.start();
    } else {
      notificationEvents.stop();
      void studentPushNotifications.stop();
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

onMounted(async () => {
  notificationRefresh.start(authStore.isAuthenticated);

  if (Capacitor.isNativePlatform()) {
    try {
      const handle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        notificationEvents.setActive(isActive);
        if (isActive && authStore.isAuthenticated) {
          void studentPushNotifications.start();
        }
      });
      removeAppStateListener = () => {
        void handle.remove().catch((error) => {
          console.error('Failed to remove notification app-state listener:', error);
        });
      };
    } catch (error) {
      console.error('Failed to subscribe to notification app-state changes:', error);
    }
  }

  setupMobileNavigation(router, {
    isMandatoryUpdateActive: () => versionStore.isMandatoryUpdate,
    onExitConfirmationRequested: () => {
      isExitConfirmationOpen.value = true;
    },
  });

  // Non-blocking version check
  versionStore.checkVersion().catch((e) => {
    console.warn('Initial app version check failed:', e);
  });
});

onUnmounted(() => {
  stopAuthWatch();
  removeRouteHook();
  notificationRefresh.stop();
  notificationEvents.stop();
  void studentPushNotifications.stop();
  removeAppStateListener?.();
});

async function confirmAppExit() {
  isExitConfirmationOpen.value = false;
  await CapacitorApp.exitApp();
}
</script>

<template>
  <div class="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans select-none">
    <!-- Version update modal / notifications -->
    <VersionUpdateModal />
    <StudentConfirmDialog
      :is-open="isExitConfirmationOpen"
      title="خروج از برنامه"
      message="مطمئنی می‌خواهی از برنامه خارج شوی؟"
      confirm-label="خروج از برنامه"
      @confirm="confirmAppExit"
      @cancel="isExitConfirmationOpen = false"
    />

    <!-- Login page layout -->
    <template v-if="isAuthPage">
      <router-view />
    </template>

    <!-- Main Authenticated Mobile App Shell -->
    <template v-else>
      <div class="w-full max-w-lg mx-auto flex flex-col min-h-screen relative shadow-2xl bg-[#0B0E14]">
        <StudentHeader />
        <main class="flex-1 px-4 py-2">
          <router-view />
        </main>
        <StudentBottomNav />
      </div>
    </template>
  </div>
</template>
