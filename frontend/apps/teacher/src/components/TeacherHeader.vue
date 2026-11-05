<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, Bell, Coins, LogOut, X } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { toPersianDigits, formatNovin, resolveFileUrl } from '@student-reward/shared';

const router = useRouter();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();
const isLogoutConfirmationOpen = ref(false);
const isLoggingOut = ref(false);

const teacherName = computed(() => {
  if (!authStore.user) return 'همکار گرامی';
  return `${authStore.user.firstName} ${authStore.user.lastName}`;
});

async function confirmLogout() {
  if (isLoggingOut.value) return;

  isLoggingOut.value = true;
  try {
    await authStore.logout();
    await router.push('/login');
    isLogoutConfirmationOpen.value = false;
  } finally {
    isLoggingOut.value = false;
  }
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
        @click="isLogoutConfirmationOpen = true"
      >
        <LogOut class="w-4 h-4" />
      </button>
    </div>
  </header>

  <Teleport to="body">
    <div
      v-if="isLogoutConfirmationOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="presentation"
      @click.self="!isLoggingOut && (isLogoutConfirmationOpen = false)"
    >
      <section
        class="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-logout-title"
        dir="rtl"
      >
        <div class="mb-4 flex items-start justify-between">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="بستن"
            :disabled="isLoggingOut"
            @click="isLogoutConfirmationOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <h2 id="teacher-logout-title" class="text-base font-extrabold text-slate-800">
          خروج از حساب کاربری
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          آیا برای خروج از حساب کاربری اطمینان دارید؟
        </p>
        <div class="mt-6 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
            :disabled="isLoggingOut"
            @click="isLogoutConfirmationOpen = false"
          >
            انصراف
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
            :disabled="isLoggingOut"
            @click="confirmLogout"
          >
            {{ isLoggingOut ? 'در حال خروج...' : 'بله، خارج می‌شوم' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
