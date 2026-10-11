<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import StudentHeader from './components/StudentHeader.vue';
import StudentBottomNav from './components/StudentBottomNav.vue';

const route = useRoute();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();

const isAuthPage = computed(() => route.path === '/login');

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await notifStore.fetchUnreadCount();
  }
});
</script>

<template>
  <div class="min-h-screen bg-[#0B0E14] text-white flex flex-col font-sans select-none">
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
