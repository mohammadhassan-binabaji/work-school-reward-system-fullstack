<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Clock, Plus, Award } from 'lucide-vue-next';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  type PointAuditLog,
} from '@student-reward/shared';

const logs = ref<PointAuditLog[]>([]);
const loading = ref(true);

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
            class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0"
          >
            <Plus class="w-4 h-4" />
          </div>

          <div>
            <span class="text-xs font-bold text-slate-800 block">
              {{ item.taskOrReason || 'اهدای پاداش نوین' }}
            </span>
            <span class="text-[10px] text-slate-400 block mt-0.5">
              {{ formatJalaliDateTime(item.createdAt) }}
            </span>
          </div>
        </div>

        <div class="text-left shrink-0">
          <span class="text-xs font-black text-emerald-600">
            {{ formatNovin(item.amount, { showSign: true }) }}
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
