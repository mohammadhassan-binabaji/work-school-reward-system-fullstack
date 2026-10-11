<script setup lang="ts">
import { onMounted } from 'vue';
import { Bell, CheckCheck, ChevronRight } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '../stores/notifications';
import { formatJalaliDateTime } from '@student-reward/shared';

const router = useRouter();
const notifStore = useNotificationsStore();

onMounted(async () => {
  await notifStore.fetchNotifications();
});

async function handleItemClick(id: string) {
  await notifStore.markAsRead(id);
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Top Action Row -->
    <div class="flex items-center justify-between px-1">
      <button
        class="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
        @click="router.back()"
      >
        <ChevronRight class="w-4 h-4" />
        <span>بازگشت</span>
      </button>

      <button
        v-if="notifStore.unreadCount > 0"
        class="text-xs font-bold text-neon-green hover:underline flex items-center gap-1"
        @click="notifStore.markAllAsRead"
      >
        <CheckCheck class="w-4 h-4" />
        <span>خواندن همه</span>
      </button>
    </div>

    <!-- Page Title -->
    <div class="bg-dark-card rounded-3xl p-4.5 border border-slate-800 flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-neon-green/15 text-neon-green flex items-center justify-center">
        <Bell class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-sm font-extrabold text-white">اعلان‌ها و پیام‌های سیستم</h2>
        <span class="text-[11px] text-slate-400">آخرین رویدادها و تغییرات وضعیت درخواست‌ها</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="notifStore.loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری اعلان‌ها...
    </div>

    <!-- Notifications List -->
    <div v-else-if="notifStore.notifications.length > 0" class="space-y-2.5">
      <div
        v-for="item in notifStore.notifications"
        :key="item.id"
        :class="[
          'p-4 rounded-3xl border transition-all cursor-pointer',
          item.readStatus === 'UNREAD'
            ? 'bg-[#151D2C] border-neon-green/40 shadow-[0_0_12px_rgba(100,221,23,0.15)]'
            : 'bg-dark-card border-slate-800 opacity-75',
        ]"
        @click="handleItemClick(item.id)"
      >
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-extrabold text-white flex items-center gap-2">
            <span
              v-if="item.readStatus === 'UNREAD'"
              class="w-2 h-2 rounded-full bg-neon-green animate-pulse"
            ></span>
            <span>{{ item.subject }}</span>
          </h4>
          <span class="text-[10px] text-slate-400">
            {{ formatJalaliDateTime(item.createdAt) }}
          </span>
        </div>

        <p class="text-xs text-slate-300 mt-2 leading-relaxed">
          {{ item.body }}
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-16 text-center text-slate-500 text-xs">
      اعلان جدیدی وجود ندارد.
    </div>
  </div>
</template>
