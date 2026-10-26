<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, LogOut, Coins } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { toPersianDigits, formatNovin, resolveFileUrl } from '@student-reward/shared';

const router = useRouter();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();

const teacherName = computed(() => {
  if (!authStore.user) return 'همکار گرامی';
  return `${authStore.user.firstName} ${authStore.user.lastName}`;
});

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <header
    class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs"
  >
    <!-- Right side: Teacher Info -->
    <div class="flex items-center gap-2.5">
      <div
        class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 p-[2px] shadow-xs overflow-hidden"
      >
        <img
          v-if="authStore.user?.imageUrl"
          :src="resolveFileUrl(authStore.user.imageUrl)"
          :alt="teacherName"
          class="w-full h-full rounded-full object-cover"
        />
        <div
          v-else
          class="w-full h-full rounded-full bg-indigo-50 flex items-center justify-center font-bold text-sm text-indigo-700"
        >
          {{ authStore.user?.firstName?.[0] || 'م' }}
        </div>
      </div>
      <div class="text-right">
        <h2 class="text-sm font-bold text-slate-800 leading-tight">
          {{ teacherName }}
        </h2>
        <span class="text-[11px] font-medium text-slate-500">معلم</span>
      </div>
    </div>

    <!-- Center/Left: Point Budget Badge & Actions -->
    <div class="flex items-center gap-2">
      <!-- Point Balance Badge -->
      <div
        class="bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-indigo-900"
      >
        <Coins class="w-3.5 h-3.5 text-indigo-600" />
        <span class="text-xs font-black">
          {{ formatNovin(authStore.pointBalance) }}
        </span>
      </div>

      <!-- Notifications -->
      <button
        class="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
        title="اعلان‌ها"
        @click="router.push('/notifications')"
      >
        <Bell class="w-4 h-4" />
        <span
          v-if="notifStore.unreadCount > 0"
          class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
        >
          {{ toPersianDigits(notifStore.unreadCount) }}
        </span>
      </button>

      <!-- Logout -->
      <button
        class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
        title="خروج از حساب"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>
