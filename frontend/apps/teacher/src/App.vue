<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import TeacherHeader from './components/TeacherHeader.vue';
import TeacherBottomNav from './components/TeacherBottomNav.vue';

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
  <div class="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans select-none">
    <!-- Login Layout -->
    <template v-if="isAuthPage">
      <router-view />
    </template>

    <!-- Main Authenticated Mobile Shell -->
    <template v-else>
      <div class="w-full max-w-lg mx-auto flex flex-col min-h-screen relative shadow-lg bg-slate-50">
        <TeacherHeader />
        <main class="flex-1 px-4 py-3">
          <router-view />
        </main>
        <TeacherBottomNav />
      </div>
    </template>
  </div>
</template>
