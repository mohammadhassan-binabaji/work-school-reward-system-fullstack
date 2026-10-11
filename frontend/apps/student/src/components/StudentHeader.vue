<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, LogOut } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { toPersianDigits } from '@student-reward/shared';

const router = useRouter();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();

const studentName = computed(() => {
  if (!authStore.user) return 'دانش‌آموز';
  return `${authStore.user.firstName} ${authStore.user.lastName}`;
});

const tierLabel = computed(() => {
  const tier = authStore.currentTier;
  if (!tier) return 'سطح ۱';
  return `سطح ${toPersianDigits(tier.tierNumber)} (${tier.name})`;
});

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <header
    class="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between"
  >
    <!-- Right side: Student Profile Avatar & Info -->
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[2px] shadow-sm"
      >
        <div
          class="w-full h-full rounded-full bg-[#131822] flex items-center justify-center font-bold text-sm text-cyan-300"
        >
          {{ authStore.user?.firstName?.[0] || 'د' }}
        </div>
      </div>
      <div class="text-right">
        <h2 class="text-sm font-bold text-white leading-tight">
          {{ studentName }}
        </h2>
        <span
          class="inline-block mt-0.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
        >
          {{ tierLabel }}
        </span>
      </div>
    </div>

    <!-- Left side: Notifications & Logout Actions -->
    <div class="flex items-center gap-2">
      <button
        class="relative w-9 h-9 rounded-xl bg-[#161C28] border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
        title="اعلان‌ها"
        @click="router.push('/notifications')"
      >
        <Bell class="w-4 h-4" />
        <span
          v-if="notifStore.unreadCount > 0"
          class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-green text-[#0B0E14] text-[10px] font-extrabold flex items-center justify-center shadow-neon-green"
        >
          {{ toPersianDigits(notifStore.unreadCount) }}
        </span>
      </button>

      <button
        class="w-9 h-9 rounded-xl bg-[#161C28] border border-slate-700/60 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
        title="خروج از حساب"
        @click="handleLogout"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>
