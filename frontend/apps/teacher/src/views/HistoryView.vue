<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Clock, Plus, Minus, Award } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  formatAuditLogDescription,
  resolveTeacherPointDelta,
  type PointAuditLog,
} from '@student-reward/shared';

const authStore = useAuthStore();
const logs = ref<PointAuditLog[]>([]);
const loading = ref(true);

function getTeacherDelta(item: PointAuditLog): number {
  return resolveTeacherPointDelta(item, authStore.user?.id);
}

onMounted(async () => {
  await fetchHistory();
});

async function fetchHistory() {
  loading.value = true;
  try {
    const res = await api.get<{ data: PointAuditLog[]; total: number }>('/reports/point-flow', {
      limit: 50,
    });
    logs.value = res.data || [];
  } catch (e) {
    console.error('Failed to load history', e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Clock class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-sm font-extrabold text-slate-800">سوابق پاداش‌های اهدا شده</h2>
        <p class="text-xs text-slate-500">لیست آخرین تراکنش‌های ثبت‌شده توسط شما</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری سوابق...
    </div>

    <!-- Log Items -->
    <div v-else-if="logs.length > 0" class="space-y-2.5">
      <div
        v-for="item in logs"
        :key="item.id"
        class="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0',
              getTeacherDelta(item) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
            ]"
          >
            <Plus v-if="getTeacherDelta(item) >= 0" class="w-4 h-4" />
            <Minus v-else class="w-4 h-4" />
          </div>

          <div>
            <span class="text-xs font-bold text-slate-800 block">
              {{ formatAuditLogDescription(item) }}
            </span>
            <span class="text-[10px] text-slate-400 block mt-0.5">
              {{ formatJalaliDateTime(item.createdAt) }}
            </span>
          </div>
        </div>

        <div class="text-left shrink-0">
          <span
            :class="[
              'text-xs font-black',
              getTeacherDelta(item) >= 0 ? 'text-emerald-600' : 'text-rose-600',
            ]"
          >
            {{ formatNovin(getTeacherDelta(item), { showSign: true }) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-200">
      شما تاکنون پاداشی ثبت نکرده‌اید.
    </div>
  </div>
</template>
