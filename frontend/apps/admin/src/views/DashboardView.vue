<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Landmark,
  Users,
  Gift,
  Flag,
  Send,
  Camera,
  Coins,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-vue-next';
import StatCard from '../components/StatCard.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  type SystemPointPool,
  type PointAuditLog,
  type User,
  type RewardRequest,
  type VerificationRequest,
  type StudentTaskProposal,
} from '@student-reward/shared';

const router = useRouter();

const loading = ref(true);
const poolBalance = ref(0);
const usersCount = ref(0);
const pendingRewardsCount = ref(0);
const pendingVerificationsCount = ref(0);
const pendingProposalsCount = ref(0);
const recentLogs = ref<PointAuditLog[]>([]);

onMounted(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  loading.value = true;
  try {
    const [pool, users, rewards, verifications, proposals, logsRes] = await Promise.all([
      api.get<SystemPointPool>('/points/pool').catch(() => ({ balance: 0 })),
      api.get<User[]>('/users').catch(() => []),
      api.get<RewardRequest[]>('/reward-requests', { status: 'PENDING_TO_APPROVE' }).catch(() => []),
      api.get<VerificationRequest[]>('/verifications', { status: 'PENDING' }).catch(() => []),
      api.get<StudentTaskProposal[]>('/proposals', { status: 'PENDING_TO_APPROVE' }).catch(() => []),
      api.get<{ data: PointAuditLog[]; total: number }>('/reports/point-flow', { limit: 8 }).catch(() => ({ data: [], total: 0 })),
    ]);

    poolBalance.value = pool.balance || 0;
    usersCount.value = (users as User[]).length || 0;
    pendingRewardsCount.value = (rewards as RewardRequest[]).length || 0;
    pendingVerificationsCount.value = (verifications as VerificationRequest[]).length || 0;
    pendingProposalsCount.value = (proposals as StudentTaskProposal[]).length || 0;
    recentLogs.value = logsRes.data || [];
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">داشبورد مدیریتی</h1>
        <p class="text-xs text-slate-500 mt-0.5">نمای کلی موجودی‌ها، درخواست‌های نیازمند اقدام و فعالیت‌ها</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="router.push('/pool')"
        >
          <Coins class="w-4 h-4" />
          <span>تخصیص بودجه معلم</span>
        </button>

        <button
          class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          @click="router.push('/reports')"
        >
          <FileSpreadsheet class="w-4 h-4 text-emerald-600" />
          <span>گزارش کامل</span>
        </button>
      </div>
    </div>

    <!-- Stat KPI Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="موجودی استخر نوین"
        :value="formatNovin(poolBalance)"
        subtitle="بودجه کل مدرسه"
        :icon="Landmark"
        color="indigo"
      />

      <StatCard
        title="کل کاربران ثبت‌شده"
        :value="toPersianDigits(usersCount)"
        subtitle="دانش‌آموز، معلم، مدیر"
        :icon="Users"
        color="cyan"
      />

      <StatCard
        title="جوایز در انتظار تایید"
        :value="toPersianDigits(pendingRewardsCount)"
        subtitle="درخواست‌های جدید دانش‌آموزان"
        :icon="Gift"
        color="amber"
        class="cursor-pointer hover:border-amber-300 transition-colors"
        @click="router.push('/rewards')"
      />

      <StatCard
        title="مدارک چالش در انتظار"
        :value="toPersianDigits(pendingVerificationsCount)"
        subtitle="ارزیابی و تایید شواهد"
        :icon="Flag"
        color="rose"
        class="cursor-pointer hover:border-rose-300 transition-colors"
        @click="router.push('/activities')"
      />

      <StatCard
        title="پیشنهادهای در انتظار"
        :value="toPersianDigits(pendingProposalsCount)"
        subtitle="بررسی و قیمت‌گذاری ایده"
        :icon="Send"
        color="emerald"
        class="cursor-pointer hover:border-emerald-300 transition-colors"
        @click="router.push('/proposals')"
      />
    </div>

    <!-- Recent System Point Flow Log Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="text-sm font-extrabold text-slate-800">آخرین تراکنش‌های نوین در سامانه</h2>
          <span class="text-xs text-slate-400">گردش حساب و رویدادهای مالی اخیر</span>
        </div>

        <button
          class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          @click="router.push('/reports')"
        >
          <span>مشاهده همه سوابق</span>
          <ArrowUpRight class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">تاریخ و ساعت</th>
              <th class="p-3.5">اقدام‌کننده</th>
              <th class="p-3.5">عنوان / علت تراکنش</th>
              <th class="p-3.5">مقدار نوین</th>
              <th class="p-3.5 pl-5">نوع عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="5" class="py-12 text-center text-slate-400">
                  در حال دریافت اطلاعات...
                </td>
              </tr>
            </template>
            <template v-else-if="recentLogs.length > 0">
              <tr v-for="log in recentLogs" :key="log.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 text-slate-500 whitespace-nowrap">
                  {{ formatJalaliDateTime(log.createdAt) }}
                </td>
                <td class="p-3.5 font-bold text-slate-700 whitespace-nowrap">
                  {{ log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'سیستم' }}
                </td>
                <td class="p-3.5 text-slate-800 max-w-xs truncate">
                  {{ log.taskOrReason || '—' }}
                </td>
                <td class="p-3.5 font-black text-slate-900 whitespace-nowrap">
                  <span :class="log.amount > 0 ? 'text-emerald-600' : 'text-rose-600'">
                    {{ formatNovin(log.amount, { showSign: true }) }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-slate-500 whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">
                    {{ log.actionType }}
                  </span>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="5" class="py-12 text-center text-slate-400">
                هنوز تراکنشی ثبت نشده است.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
