<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Landmark,
  Coins,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  type SystemPointPool,
  type User,
} from '@student-reward/shared';

const pool = ref<SystemPointPool | null>(null);
const teachers = ref<User[]>([]);
const loading = ref(true);

// Set Pool Balance Form
const isSetPoolModalOpen = ref(false);
const newPoolBalance = ref<number | ''>('');
const settingPool = ref(false);

// Fund Teacher Form
const isFundTeacherModalOpen = ref(false);
const selectedTeacherId = ref('');
const fundAmount = ref<number | ''>('');
const fundingTeacher = ref(false);

// Alerts
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [p, uList] = await Promise.all([
      api.get<SystemPointPool>('/points/pool'),
      api.get<User[]>('/users', { role: 'TEACHER' }),
    ]);
    pool.value = p;
    teachers.value = (uList || []).filter((u: User) => u.role === 'TEACHER');
  } catch (e: any) {
    errorMessage.value = e.message || 'خطا در بارگذاری اطلاعات استخر نوین';
  } finally {
    loading.value = false;
  }
}

async function handleSetPoolBalance() {
  if (newPoolBalance.value === '' || newPoolBalance.value < 0) return;

  settingPool.value = true;
  errorMessage.value = null;
  try {
    await api.post('/points/pool/balance', { balance: Number(newPoolBalance.value) });
    successMessage.value = 'موجودی استخر نوین با موفقیت به‌روزرسانی شد.';
    isSetPoolModalOpen.value = false;
    newPoolBalance.value = '';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در تنظیم موجودی استخر';
  } finally {
    settingPool.value = false;
  }
}

async function handleFundTeacher() {
  if (!selectedTeacherId.value || !fundAmount.value || fundAmount.value <= 0) return;

  fundingTeacher.value = true;
  errorMessage.value = null;
  try {
    await api.post('/points/pool/fund-teacher', {
      teacherId: selectedTeacherId.value,
      amount: Number(fundAmount.value),
    });
    successMessage.value = 'بودجه نوین با موفقیت به معلم تخصیص یافت.';
    isFundTeacherModalOpen.value = false;
    fundAmount.value = '';
    selectedTeacherId.value = '';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در تخصیص بودجه به معلم';
  } finally {
    fundingTeacher.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">استخر نوین و بودجه معلمان</h1>
        <p class="text-xs text-slate-500 mt-0.5">مدیریت موجودی مرکزی مدرسه و تزریق اعتبار پاداش به معلمان</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isFundTeacherModalOpen = true"
        >
          <Send class="w-4 h-4" />
          <span>تخصیص بودجه به معلم</span>
        </button>

        <button
          class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          @click="newPoolBalance = pool?.balance ?? 0; isSetPoolModalOpen = true"
        >
          <Sliders class="w-4 h-4 text-slate-600" />
          <span>تنظیم موجودی استخر</span>
        </button>
      </div>
    </div>

    <!-- Alert Notifications -->
    <div
      v-if="successMessage"
      class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="w-4 h-4 text-emerald-600" />
      <span>{{ successMessage }}</span>
    </div>

    <div
      v-if="errorMessage"
      class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-rose-600" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Central Pool Card -->
    <div class="bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div class="space-y-2">
          <span class="text-xs font-semibold text-indigo-300">موجودی استخر نوین مرکزی مدرسه:</span>
          <div class="flex items-baseline gap-3">
            <span class="text-4xl lg:text-5xl font-black tracking-tight text-white">
              {{ formatNovin(pool?.balance ?? 0) }}
            </span>
          </div>
          <p class="text-xs text-indigo-200/80 max-w-md leading-relaxed mt-2">
            تمامی پاداش‌های معلمان از این استخر تامین می‌شود. بازگشت نوین معلمان پس از خروج نیز مستقیماً به این استخر اضافه می‌گردد.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            class="px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            @click="isFundTeacherModalOpen = true"
          >
            <Coins class="w-4 h-4" />
            <span>شارژ بودجه معلمان</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Teachers Budget List -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-sm font-extrabold text-slate-800">فهرست معلمان و تخصیص بودجه</h2>
        <span class="text-xs text-slate-400">{{ toPersianDigits(teachers.length) }} معلم فعال</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">نام و نام خانوادگی</th>
              <th class="p-3.5">کد ملی</th>
              <th class="p-3.5">نام کاربری</th>
              <th class="p-3.5">وضعیت حساب</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="5" class="py-12 text-center text-slate-400">
                  در حال بارگذاری معلمان...
                </td>
              </tr>
            </template>
            <template v-else-if="teachers.length > 0">
              <tr v-for="t in teachers" :key="t.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ t.firstName }} {{ t.lastName }}
                </td>
                <td class="p-3.5 text-slate-600">
                  {{ toPersianDigits(t.nationalId) }}
                </td>
                <td class="p-3.5 text-slate-600 font-mono">
                  {{ t.username }}
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      t.accountState === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{ t.accountState === 'ACTIVE' ? 'فعال' : t.accountState }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left">
                  <button
                    class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                    @click="selectedTeacherId = t.id; isFundTeacherModalOpen = true"
                  >
                    تخصیص نوین
                  </button>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="5" class="py-12 text-center text-slate-400">
                معلمی در سیستم یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Set Pool Balance -->
    <AdminModal
      :is-open="isSetPoolModalOpen"
      title="تنظیم موجودی استخر نوین"
      @close="isSetPoolModalOpen = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">موجودی جدید استخر (نوین):</label>
          <input
            v-model="newPoolBalance"
            type="number"
            min="0"
            placeholder="مثال: ۱۰۰۰۰"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          @click="isSetPoolModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="settingPool || newPoolBalance === ''"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleSetPoolBalance"
        >
          <RefreshCw v-if="settingPool" class="w-3.5 h-3.5 animate-spin" />
          <span>ثبت موجودی</span>
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Fund Teacher Budget -->
    <AdminModal
      :is-open="isFundTeacherModalOpen"
      title="تخصیص بودجه نوین به معلم"
      @close="isFundTeacherModalOpen = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">معلم دریافت‌کننده:</label>
          <select
            v-model="selectedTeacherId"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="" disabled>معلم را انتخاب کنید...</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.firstName }} {{ t.lastName }} (کد ملی: {{ toPersianDigits(t.nationalId) }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">مقدار نوین جهت انتقال از استخر:</label>
          <input
            v-model="fundAmount"
            type="number"
            min="1"
            placeholder="مثال: ۵۰۰"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-sans"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          @click="isFundTeacherModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="fundingTeacher || !selectedTeacherId || !fundAmount"
          class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleFundTeacher"
        >
          <RefreshCw v-if="fundingTeacher" class="w-3.5 h-3.5 animate-spin" />
          <span>انتقال و شارژ اعتبار</span>
        </button>
      </template>
    </AdminModal>
  </div>
</template>
