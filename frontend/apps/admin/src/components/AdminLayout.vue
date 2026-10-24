<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  Landmark,
  Users,
  GraduationCap,
  ListPlus,
  SlidersHorizontal,
  Gift,
  Flag,
  Send,
  BookOpen,
  Layers,
  Trophy,
  FileSpreadsheet,
  Bell,
  LogOut,
  Menu,
  X,
  Camera,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { toPersianDigits, api } from '@student-reward/shared';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const notifStore = useNotificationsStore();

const isMobileMenuOpen = ref(false);
const triggeringSnapshot = ref(false);
const snapshotMessage = ref<string | null>(null);

const navItems = [
  { title: 'داشبورد مدیریتی', path: '/', icon: LayoutDashboard },
  { title: 'استخر نوین و بودجه معلمان', path: '/pool', icon: Landmark },
  { title: 'مدیریت کاربران', path: '/users', icon: Users },
  { title: 'ساختار آموزشی (کلاس و درس)', path: '/academic', icon: GraduationCap },
  { title: 'فعالیت‌های اهدای نوین', path: '/tasks', icon: ListPlus },
  { title: 'تنظیم مستقیم نوین', path: '/adjust', icon: SlidersHorizontal },
  { title: 'جوایز و درخواست‌ها', path: '/rewards', icon: Gift },
  { title: 'چالش‌ها و تایید مدارک', path: '/activities', icon: Flag },
  { title: 'پیشنهادهای فعالیت', path: '/proposals', icon: Send },
  { title: 'راهنمای نوین', path: '/guidance', icon: BookOpen },
  { title: 'پیکربندی سطوح (Tier)', path: '/tiers', icon: Layers },
  { title: 'رتبه‌بندی و ثبت اسنپ‌شات', path: '/rankings', icon: Trophy },
  { title: 'گزارشات و خروجی اکسل/PDF', path: '/reports', icon: FileSpreadsheet },
  { title: 'اعلان‌ها', path: '/notifications', icon: Bell },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

async function handleTriggerSnapshot() {
  triggeringSnapshot.value = true;
  snapshotMessage.value = null;
  try {
    await api.post('/rankings/snapshots/trigger');
    snapshotMessage.value = 'اسنپ‌شات روزانه رتبه‌ها با موفقیت ثبت شد.';
    setTimeout(() => (snapshotMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در ثبت اسنپ‌شات');
  } finally {
    triggeringSnapshot.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans select-none">
    <!-- Top Mobile Header -->
    <header
      class="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs"
    >
      <div class="flex items-center gap-3">
        <button
          class="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <Menu v-if="!isMobileMenuOpen" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </button>
        <h1 class="text-xs font-black text-slate-800">سامانه پاداش دانش‌آموزی | مدیریت</h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="relative p-2 rounded-xl bg-slate-100 text-slate-700"
          @click="router.push('/notifications')"
        >
          <Bell class="w-4 h-4" />
          <span
            v-if="notifStore.unreadCount > 0"
            class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {{ toPersianDigits(notifStore.unreadCount) }}
          </span>
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Desktop Sidebar & Mobile Drawer -->
      <aside
        :class="[
          'fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 shadow-2xl lg:shadow-none',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
        ]"
      >
        <!-- Brand Logo / Title -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
              نوین
            </div>
            <div>
              <h2 class="text-sm font-black text-white leading-tight">پنل مدیریت سیستم</h2>
              <span class="text-[11px] text-slate-400">سامانه پاداش دانش‌آموزی</span>
            </div>
          </div>
          <button
            class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            @click="isMobileMenuOpen = false"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 overflow-y-auto p-3 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all',
              isActive(item.path)
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200',
            ]"
            @click="isMobileMenuOpen = false"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ item.title }}</span>
            <span
              v-if="item.path === '/notifications' && notifStore.unreadCount > 0"
              class="mr-auto px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold"
            >
              {{ toPersianDigits(notifStore.unreadCount) }}
            </span>
          </router-link>
        </nav>

        <!-- Admin Profile & Quick Logout -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <div class="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center text-xs font-black shrink-0 overflow-hidden">
              <img
                v-if="authStore.user?.imageUrl"
                :src="authStore.user.imageUrl"
                :alt="authStore.user.firstName"
                class="w-full h-full object-cover"
              />
              <span v-else>
                {{ authStore.user?.firstName?.[0] || 'م' }}
              </span>
            </div>
            <div class="truncate">
              <span class="text-xs font-bold text-white block truncate">
                {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
              </span>
              <span class="text-[10px] text-slate-400">مدیر سامانه</span>
            </div>
          </div>

          <button
            class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="خروج"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </aside>

      <!-- Backdrop for mobile drawer -->
      <div
        v-if="isMobileMenuOpen"
        class="lg:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs"
        @click="isMobileMenuOpen = false"
      ></div>

      <!-- Main Content Container -->
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <!-- Desktop Topbar with Action Buttons -->
        <div
          class="hidden lg:flex sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-3.5 items-center justify-between"
        >
          <div class="text-xs font-bold text-slate-500">
            سامانه پاداش دانش‌آموزی &bull; پنل نظارت و مدیریت کلان
          </div>

          <div class="flex items-center gap-3">
            <!-- Trigger Snapshot Button -->
            <button
              :disabled="triggeringSnapshot"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              title="ثبت اسنپ‌شات رتبه‌بندی‌های امروز برای نمودارها"
              @click="handleTriggerSnapshot"
            >
              <Camera class="w-3.5 h-3.5 text-blue-600" />
              <span>{{ triggeringSnapshot ? 'در حال ثبت...' : 'ثبت اسنپ‌شات رتبه‌ها' }}</span>
            </button>

            <!-- Notifications button -->
            <button
              class="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="اعلان‌ها"
              @click="router.push('/notifications')"
            >
              <Bell class="w-4 h-4" />
              <span
                v-if="notifStore.unreadCount > 0"
                class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {{ toPersianDigits(notifStore.unreadCount) }}
              </span>
            </button>
          </div>
        </div>

        <!-- Snapshot Success Alert Toast -->
        <div
          v-if="snapshotMessage"
          class="mx-8 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
        >
          <span>{{ snapshotMessage }}</span>
        </div>

        <!-- Inner Route Content -->
        <main class="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          <slot></slot>
        </main>
      </div>
    </div>
  </div>
</template>
