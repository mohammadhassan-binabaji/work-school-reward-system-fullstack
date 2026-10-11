<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Award, Users, Clock, Trophy, BookOpen } from 'lucide-vue-next';

const route = useRoute();

const navItems = [
  {
    title: 'اهدای نوین',
    path: '/',
    icon: Award,
    isPrimary: true,
  },
  {
    title: 'کلاس‌های من',
    path: '/classes',
    icon: Users,
  },
  {
    title: 'تاریخچه',
    path: '/history',
    icon: Clock,
  },
  {
    title: 'رتبه‌بندی',
    path: '/rankings',
    icon: Trophy,
  },
  {
    title: 'راهنما',
    path: '/guidance',
    icon: BookOpen,
  },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 max-w-lg mx-auto shadow-lg"
  >
    <div class="flex items-center justify-around">
      <template v-for="item in navItems" :key="item.path">
        <!-- Prominent Award Button -->
        <router-link
          v-if="item.isPrimary"
          :to="item.path"
          class="relative -top-3 flex flex-col items-center group focus:outline-none"
        >
          <div
            :class="[
              'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md',
              isActive(item.path)
                ? 'bg-indigo-600 text-white scale-105 shadow-indigo-500/30 ring-4 ring-indigo-100'
                : 'bg-indigo-500 text-white hover:bg-indigo-600',
            ]"
          >
            <component :is="item.icon" class="w-6 h-6" />
          </div>
          <span
            :class="[
              'text-[10px] font-bold mt-0.5 transition-colors',
              isActive(item.path) ? 'text-indigo-600' : 'text-slate-500',
            ]"
          >
            {{ item.title }}
          </span>
        </router-link>

        <!-- Standard Bottom Nav Items -->
        <router-link
          v-else
          :to="item.path"
          class="flex flex-col items-center py-1.5 px-2 rounded-xl transition-all group focus:outline-none flex-1"
        >
          <div
            :class="[
              'p-1.5 rounded-xl transition-all',
              isActive(item.path)
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-slate-400 group-hover:text-slate-600',
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
          </div>
          <span
            :class="[
              'text-[10px] font-medium mt-0.5 text-center transition-colors truncate max-w-[64px]',
              isActive(item.path) ? 'text-indigo-600 font-bold' : 'text-slate-500',
            ]"
          >
            {{ item.title }}
          </span>
        </router-link>
      </template>
    </div>
  </nav>
</template>
