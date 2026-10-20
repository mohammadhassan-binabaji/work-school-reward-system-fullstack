<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  Search,
  Calendar,
} from 'lucide-vue-next';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  formatAuditLogDescription,
  formatAuditEntity,
  formatActionType,
  type PointAuditLog,
  type ActionType,
} from '@student-reward/shared';

const logs = ref<PointAuditLog[]>([]);
const totalLogs = ref(0);
const loading = ref(true);
const exporting = ref(false);

// Filters
const filterAction = ref<ActionType | ''>('');
const filterStartDate = ref('');
const filterEndDate = ref('');

onMounted(async () => {
  await loadReports();
});

async function loadReports() {
  loading.value = true;
  try {
    const params: Record<string, any> = { limit: 100 };
    if (filterAction.value) params.actionType = filterAction.value;
    if (filterStartDate.value) params.startDate = filterStartDate.value;
    if (filterEndDate.value) params.endDate = filterEndDate.value;

    const res = await api.get<{ data: PointAuditLog[]; total: number }>('/reports/point-flow', params);
    logs.value = res.data || [];
    totalLogs.value = res.total || 0;
  } catch (err: any) {
    console.error('Error loading reports', err);
  } finally {
    loading.value = false;
  }
}

async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
  exporting.value = true;
  try {
    const params: Record<string, any> = { format };
    if (filterAction.value) params.actionType = filterAction.value;
    if (filterStartDate.value) params.startDate = filterStartDate.value;
    if (filterEndDate.value) params.endDate = filterEndDate.value;

    const blob = await api.downloadFile('/reports/point-flow/export', params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `point-flow-report.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    alert(err.message || 'خطا در دانلود خروجی');
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet class="w-6 h-6 text-emerald-600" />
          <span>گزارش جامع گردش نوین و ممیزی سیستم</span>
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          جستجو و بررسی رکوردهای تغییر موجودی در سامانه به همراه خروجی اکسل، CSV و PDF
        </p>
      </div>

      <!-- Export Actions Dropdown / Buttons -->
      <div class="flex items-center gap-2">
        <button
          :disabled="exporting"
          class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleExport('xlsx')"
        >
          <Download class="w-3.5 h-3.5" />
          <span>خروجی Excel</span>
        </button>

        <button
          :disabled="exporting"
          class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleExport('csv')"
        >
          <Download class="w-3.5 h-3.5" />
          <span>خروجی CSV</span>
        </button>

        <button
          :disabled="exporting"
          class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleExport('pdf')"
        >
          <Download class="w-3.5 h-3.5" />
          <span>خروجی PDF</span>
        </button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
      <div>
        <label class="block text-[11px] font-bold text-slate-500 mb-1">نوع عملیات:</label>
        <select
          v-model="filterAction"
          class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
          @change="loadReports"
        >
          <option value="">همه عملیات‌ها</option>
          <option value="POOL_FUND_TEACHER">تخصیص از استخر به معلم</option>
          <option value="TEACHER_AWARD_STUDENT">اهدای پاداش معلم به دانش‌آموز</option>
          <option value="ADMIN_ADJUST_STUDENT">تنظیم مستقیم مدیر</option>
          <option value="CHALLENGE_AWARD_STUDENT">پاداش تایید چالش</option>
          <option value="PROPOSAL_AWARD_STUDENT">پاداش تکمیل پیشنهاد</option>
          <option value="REWARD_RESERVE_POINTS">رزرو نوین برای جایزه</option>
          <option value="REWARD_DECLINE_RETURN">بازگشت نوین به علت رد جایزه</option>
        </select>
      </div>

      <div class="flex items-end">
        <button
          class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          title="تازه‌سازی"
          @click="loadReports"
        >
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>

      <div class="mr-auto text-xs font-bold text-slate-500">
        مجموع رکوردهای یافت‌شده: {{ toPersianDigits(totalLogs) }}
      </div>
    </div>

    <!-- Reports Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">تاریخ و ساعت</th>
              <th class="p-3.5">اقدام‌کننده</th>
              <th class="p-3.5">گردش (مبدأ ← مقصد)</th>
              <th class="p-3.5">شرح رویداد</th>
              <th class="p-3.5">حجم نوین</th>
              <th class="p-3.5">نوع رویداد</th>
              <th class="p-3.5 pl-5 font-mono">شناسه رهگیری (Correlation ID)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="7" class="py-12 text-center text-slate-400">در حال دریافت داده‌های گزارش...</td>
              </tr>
            </template>
            <template v-else-if="logs.length > 0">
              <tr v-for="l in logs" :key="l.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 text-slate-500 whitespace-nowrap">
                  {{ formatJalaliDateTime(l.createdAt) }}
                </td>
                <td class="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                  {{ l.actor ? `${l.actor.firstName} ${l.actor.lastName} (${l.actor.username})` : 'سیستم' }}
                </td>
                <td class="p-3.5 text-slate-600 whitespace-nowrap">
                  <span class="inline-flex items-center gap-1.5 text-[11px]">
                    <span class="font-medium text-slate-700">{{ formatAuditEntity(l.sourceType) }}</span>
                    <span class="text-slate-400">←</span>
                    <span class="font-medium text-slate-700">{{ formatAuditEntity(l.recipientType) }}</span>
                  </span>
                </td>
                <td class="p-3.5 text-slate-700 max-w-xs truncate">{{ formatAuditLogDescription(l) }}</td>
                <td class="p-3.5 font-black text-slate-900 whitespace-nowrap">
                  {{ formatNovin(l.amount, { showSign: false }) }}
                </td>
                <td class="p-3.5 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">
                    {{ formatActionType(l.actionType) }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                  {{ l.correlationId }}
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="7" class="py-12 text-center text-slate-400">رکوردی مطابق فیلتر یافت نشد.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
