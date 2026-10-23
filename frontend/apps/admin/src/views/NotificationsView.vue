<script setup lang="ts">
import { onBeforeUnmount, onMounted, type Directive } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useNotificationsStore } from '../stores/notifications';
import {
  formatJalaliDateTime,
  NotificationVisibilityTracker,
  toPersianDigits,
} from '@student-reward/shared';

const router = useRouter();
const notifStore = useNotificationsStore();
const visibilityTracker = new NotificationVisibilityTracker((id) => notifStore.markAsRead(id));
const vAutoRead: Directive<HTMLElement, { id: string; unread: boolean }> = {
  mounted(element, binding) {
    visibilityTracker.observe(element, binding.value.id, binding.value.unread);
  },
  updated(element, binding) {
    visibilityTracker.observe(element, binding.value.id, binding.value.unread);
  },
  unmounted(element) {
    visibilityTracker.unobserve(element);
  },
};

onMounted(async () => {
  await notifStore.fetchNotifications();
});

onBeforeUnmount(() => visibilityTracker.disconnect());
</script>

<template>
  <div class="space-y-4 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Bell class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-base font-extrabold text-slate-800">صندوق اعلان‌های مدیر</h1>
          <span class="text-xs text-slate-400">پیام‌ها و هشدارهای سیستمی</span>
        </div>
      </div>

      <button
        v-if="notifStore.unreadCount > 0"
        class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1.5"
        @click="notifStore.markAllAsRead"
      >
        <CheckCheck class="w-4 h-4" />
        <span>خواندن همه اعلان‌ها</span>
      </button>
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
          'p-4 rounded-3xl border transition-all bg-white',
          item.readStatus === 'UNREAD'
            ? 'border-blue-400 shadow-xs ring-1 ring-blue-100'
            : 'border-slate-200 opacity-80',
        ]"
        v-auto-read="{ id: item.id, unread: item.readStatus === 'UNREAD' }"
      >
        <div class="flex items-center justify-between gap-2">
          <h4 class="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            <span v-if="item.readStatus === 'UNREAD'" class="w-2 h-2 rounded-full bg-blue-600"></span>
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

    <div v-else class="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200">
      اعلان جدیدی وجود ندارد.
    </div>

    <div
      v-if="!notifStore.loading && notifStore.totalPages > 0"
      class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3"
    >
      <button
        class="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 disabled:opacity-40"
        :disabled="notifStore.currentPage <= 1 || notifStore.loading"
        aria-label="صفحه قبلی"
        @click="notifStore.goToPage(notifStore.currentPage - 1)"
      >
        <ChevronRight class="h-4 w-4" />
        <span>قبلی</span>
      </button>
      <span class="text-xs font-semibold text-slate-600">
        صفحه {{ toPersianDigits(notifStore.currentPage) }} از {{ toPersianDigits(notifStore.totalPages) }}
      </span>
      <button
        class="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 disabled:opacity-40"
        :disabled="notifStore.currentPage >= notifStore.totalPages || notifStore.loading"
        aria-label="صفحه بعدی"
        @click="notifStore.goToPage(notifStore.currentPage + 1)"
      >
        <span>بعدی</span>
        <ChevronLeft class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
