<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  color?: 'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose';
}

const props = withDefaults(defineProps<Props>(), {
  color: 'indigo',
});

const colorStyles = {
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
};
</script>

<template>
  <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
    <div class="space-y-1">
      <span class="text-xs font-semibold text-slate-500">{{ title }}</span>
      <h3 class="text-2xl font-black text-slate-800 tracking-tight">
        {{ value }}
      </h3>
      <p v-if="subtitle" class="text-[11px] text-slate-400 font-medium">
        {{ subtitle }}
      </p>
    </div>

    <div
      v-if="icon"
      :class="['w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border', colorStyles[props.color]]"
    >
      <component :is="icon" class="w-6 h-6" />
    </div>
  </div>
</template>
