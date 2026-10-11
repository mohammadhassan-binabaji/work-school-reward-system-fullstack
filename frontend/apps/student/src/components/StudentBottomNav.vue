<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Gift, BookOpen, Trophy, Flag, Send } from 'lucide-vue-next';

const route = useRoute();

interface NavItem {
  title: string;
  path: string;
  icon: any;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'جوایز',
    path: '/rewards',
    icon: Gift,
  },
  {
    title: 'راهنمای نوین',
    path: '/guidance',
    icon: BookOpen,
  },
  {
    title: 'رتبه‌بندی و پروفایل',
    path: '/',
    icon: Trophy,
    isCenter: true,
  },
  {
    title: 'چالش‌ها',
    path: '/challenges',
    icon: Flag,
  },
  {
    title: 'پیشنهاد فعالیت',
    path: '/proposals',
    icon: Send,
  },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 bg-[#121722]/95 backdrop-blur-lg border-t border-neon-green/30 px-2 py-1 max-w-lg mx-auto shadow-[0_-5px_20px_rgba(100,221,23,0.15)]"
  >
    <div class="flex items-center justify-around relative">
      <template v-for="item in navItems" :key="item.path">
        <!-- Central Raised Hexagon Item: Ranking & Profile -->
        <router-link
          v-if="item.isCenter"
          :to="item.path"
          class="relative -top-5 flex flex-col items-center group focus:outline-none"
        >
          <div
            :class="[
              'w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg',
              isActive(item.path)
                ? 'bg-neon-green text-[#0B0E14] shadow-neon-green scale-110'
                : 'bg-[#161C28] text-slate-400 border border-slate-700 hover:text-white',
            ]"
            style="width: 52px; height: 52px;"
          >
            <component :is="item.icon" class="w-6 h-6" />
          </div>
          <span
            :class="[
              'text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full transition-colors whitespace-nowrap',
              isActive(item.path)
                ? 'text-neon-green bg-neon-green/10 font-black'
                : 'text-slate-400 group-hover:text-slate-300',
            ]"
          >
            {{ item.title }}
          </span>
        </router-link>

        <!-- Standard Bottom Nav Items -->
        <router-link
          v-else
          :to="item.path"
          class="flex flex-col items-center py-1 px-1.5 rounded-xl transition-all duration-200 group focus:outline-none flex-1"
        >
          <div
            :class="[
              'p-1.5 rounded-xl transition-all',
              isActive(item.path)
                ? 'text-neon-green bg-neon-green/10 shadow-[0_0_10px_rgba(100,221,23,0.3)]'
                : 'text-slate-400 group-hover:text-slate-200',
            ]"
          >
            <component :is="item.icon" class="w-5 h-5" />
          </div>
          <span
            :class="[
              'text-[10px] font-medium mt-0.5 text-center transition-colors truncate max-w-[64px]',
              isActive(item.path) ? 'text-neon-green font-bold' : 'text-slate-400 group-hover:text-slate-300',
            ]"
          >
            {{ item.title }}
          </span>
        </router-link>
      </template>
    </div>
  </nav>
</template>
