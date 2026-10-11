<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, CheckCheck, ChevronRight } from 'lucide-vue-next';
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
        class="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
        @click="router.back()"
      >
        <ChevronRight class="w-4 h-4" />
        <span>بازگشت</span>
      </button>

      <button
        v-if="notifStore.unreadCount > 0"
        class="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
        @click="notifStore.markAllAsRead"
      >
        <CheckCheck class="w-4 h-4" />
        <span>خواندن همه</span>
      </button>
    </div>

    <!-- Title Card -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Bell class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-sm font-extrabold text-slate-800">اعلان‌ها و پیام‌ها</h2>
        <span class="text-xs text-slate-500">اطلاع‌رسانی‌های سیستمی و مدیریت نوین</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="notifStore.loading" class="py-16 text-center text-slate-400 text-xs">
      در حال دریافت اعلان‌ها...
    </div>

    <!-- Notifications List -->
    <div v-else-if="notifStore.notifications.length > 0" class="space-y-2.5">
      <div
        v-for="item in notifStore.notifications"
        :key="item.id"
        :class="[
          'p-4 rounded-3xl border transition-all cursor-pointer',
          item.readStatus === 'UNREAD'
            ? 'bg-indigo-50/60 border-indigo-300 shadow-xs'
            : 'bg-white border-slate-200 opacity-80',
        ]"
        @click="handleItemClick(item.id)"
      >
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            <span
              v-if="item.readStatus === 'UNREAD'"
              class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"
            ></span>
            <span>{{ item.subject }}</span>
          </h4>
          <span class="text-[10px] text-slate-400">
            {{ formatJalaliDateTime(item.createdAt) }}
          </span>
        </div>

        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          {{ item.body }}
        </p>
      </div>
    </div>

    <div v-else class="py-16 text-center text-slate-400 text-xs">
      اعلانی برای نمایش وجود ندارد.
    </div>
  </div>
</template>
