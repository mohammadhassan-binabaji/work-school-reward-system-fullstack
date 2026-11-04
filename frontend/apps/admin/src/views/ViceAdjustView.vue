<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SlidersHorizontal, RefreshCw, CheckCircle2, AlertCircle, Coins, Wallet } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { api, toPersianDigits, formatNovin } from '@student-reward/shared';

const authStore = useAuthStore();
interface StudentAdjustmentTarget {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
}

const students = ref<StudentAdjustmentTarget[]>([]);
const loading = ref(true);

const selectedStudentId = ref('');
const adjustAmount = ref<number | ''>('');
const adjustType = ref<'credit' | 'debit'>('credit');
const adjustReason = ref('');

const submitting = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const vpBalance = ref(0);

onMounted(async () => {
  await Promise.all([loadStudents(), loadProfile()]);
});

async function loadProfile() {
  await authStore.fetchMe();
  vpBalance.value = authStore.user?.teacherProfile?.pointBalance || 0;
}

async function loadStudents() {
  loading.value = true;
  try {
    const list = await api.get<StudentAdjustmentTarget[]>('/users/students');
    students.value = list || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری دانش‌آموزان';
  } finally {
    loading.value = false;
  }
}

async function handleAdjust() {
  errorMessage.value = null;

  if (!selectedStudentId.value) {
    errorMessage.value = 'لطفاً دانش‌آموز را انتخاب کنید.';
    return;
  }

  if (adjustAmount.value === '' || adjustAmount.value <= 0) {
    errorMessage.value = 'لطفاً مقدار نوین معتبر (بزرگتر از صفر) وارد کنید.';
    return;
  }

  if (!adjustReason.value.trim()) {
    errorMessage.value = 'وارد کردن علت تنظیم مستقیم نوین الزامی است.';
    return;
  }

  const requestedAmount = Number(adjustAmount.value);

  // Client-side balance check for credit (giving to student from VP balance)
  if (adjustType.value === 'credit' && requestedAmount > vpBalance.value) {
    errorMessage.value = `موجودی شما (${formatNovin(vpBalance.value)}) برای اهدای ${formatNovin(requestedAmount)} کافی نیست.`;
    return;
  }

  const finalAmount = adjustType.value === 'credit' ? requestedAmount : -requestedAmount;

  submitting.value = true;
  try {
    const res = await api.post<{ vicePrincipalRemainingBalance: number }>('/points/vice-adjust', {
      studentId: selectedStudentId.value,
      amount: finalAmount,
      reason: adjustReason.value.trim(),
    });

    if (res && typeof res.vicePrincipalRemainingBalance === 'number') {
      vpBalance.value = res.vicePrincipalRemainingBalance;
    } else {
      await loadProfile();
    }

    successMessage.value = `تنظیم موجودی دانش‌آموز (${formatNovin(finalAmount, { showSign: true })}) با موفقیت اعمال شد.`;
    selectedStudentId.value = '';
    adjustAmount.value = '';
    adjustReason.value = '';
    setTimeout(() => (successMessage.value = null), 4000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در اعمال تغییر موجودی';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        <SlidersHorizontal class="w-6 h-6 text-blue-600" />
        <span>تنظیم مستقیم موجودی نوین دانش‌آموز (معاونت)</span>
      </h1>
      <p class="text-xs text-slate-500 mt-0.5">
        اعطای پاداش یا کسر نوین از حساب دانش‌آموز بر اساس موجودی اعتبار شما با ثبت در تاریخچه
      </p>
    </div>

    <!-- VP Balance Card -->
    <div class="bg-linear-to-l from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
          <Wallet class="w-6 h-6 text-white" />
        </div>
        <div>
          <span class="text-xs font-bold text-blue-100 block">اعتبار نوین در اختیار شما</span>
          <span class="text-2xl font-black tracking-tight">{{ formatNovin(vpBalance) }}</span>
        </div>
      </div>
      <button
        class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
        title="تازه‌سازی موجودی"
        @click="loadProfile"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <!-- Alert Messages -->
    <div
      v-if="successMessage"
      class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <div
      v-if="errorMessage"
      class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
    >
      <AlertCircle class="w-5 h-5 text-rose-600 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Form Card -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
      <!-- Select Student -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">انتخاب دانش‌آموز:</label>
        <select
          v-model="selectedStudentId"
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600"
        >
          <option value="" disabled>دانش‌آموز مورد نظر را انتخاب کنید...</option>
          <option v-for="s in students" :key="s.id" :value="s.id">
            {{ s.firstName }} {{ s.lastName }} (کد ملی: {{ toPersianDigits(s.nationalId) }})
          </option>
        </select>
      </div>

      <!-- Action Type Toggle -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">نوع عملیات:</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            :class="[
              'p-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2',
              adjustType === 'credit'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
            ]"
            @click="adjustType = 'credit'"
          >
            <span>+ افزایش نوین (اهدای پاداش از اعتبار من)</span>
          </button>

          <button
            type="button"
            :class="[
              'p-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2',
              adjustType === 'debit'
                ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
            ]"
            @click="adjustType = 'debit'"
          >
            <span>− کسر نوین (بازگشت به اعتبار من)</span>
          </button>
        </div>
      </div>

      <!-- Amount Input -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">مقدار نوین:</label>
        <div class="relative">
          <input
            v-model="adjustAmount"
            type="number"
            min="1"
            placeholder="مثال: ۱۰"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pr-3.5 pl-16 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600"
          />
          <span class="absolute left-3.5 top-2.5 text-xs text-slate-400 font-medium">نوین</span>
        </div>
      </div>

      <!-- Reason Textarea -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">علت و توضیحات تنظیم:</label>
        <textarea
          v-model="adjustReason"
          rows="3"
          placeholder="علت پاداش یا اصلاح موجودی را با دقت و به صورت مستند بنویسید..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
        ></textarea>
      </div>

      <!-- Submit Button -->
      <button
        type="button"
        :disabled="submitting || loading"
        class="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
        @click="handleAdjust"
      >
        <Coins v-if="!submitting" class="w-4 h-4" />
        <RefreshCw v-else class="w-4 h-4 animate-spin" />
        <span>{{ submitting ? 'در حال ثبت تغییر...' : 'ثبت تنظیم مستقیم نوین' }}</span>
      </button>
    </div>
  </div>
</template>
