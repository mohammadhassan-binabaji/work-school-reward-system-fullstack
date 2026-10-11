<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';
import AdminLayout from './components/AdminLayout.vue';

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
