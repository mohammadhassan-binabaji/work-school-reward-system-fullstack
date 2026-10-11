<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import { useVersionStore } from './stores/version';
import { setupMobileNavigation } from './services/mobileNavigation';
import StudentHeader from './components/StudentHeader.vue';
import StudentBottomNav from './components/StudentBottomNav.vue';
import VersionUpdateModal from './components/VersionUpdateModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();
const versionStore = useVersionStore();

const isAuthPage = computed(() => route.path === '/login');

onMounted(async () => {
  setupMobileNavigation(router, {
    isMandatoryUpdateActive: () => versionStore.isMandatoryUpdate,
  });

  // Non-blocking version check
  versionStore.checkVersion().catch((e) => {
    console.warn('Initial app version check failed:', e);
  });

  if (authStore.isAuthenticated) {
    await notifStore.fetchUnreadCount();
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans select-none">
    <!-- Version update modal / notifications -->
    <VersionUpdateModal />

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
