<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SlidersHorizontal, User, RefreshCw, CheckCircle2, AlertCircle, Coins } from 'lucide-vue-next';
import { api, toPersianDigits, formatNovin, type User as UserType } from '@student-reward/shared';

const students = ref<UserType[]>([]);
const loading = ref(true);

const selectedStudentId = ref('');
const adjustAmount = ref<number | ''>('');
const adjustType = ref<'credit' | 'debit'>('credit');
const adjustReason = ref('');

const submitting = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadStudents();
});

async function loadStudents() {
  loading.value = true;
  try {
    const list = await api.get<UserType[]>('/users', { role: 'STUDENT', accountState: 'ACTIVE' });
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

  const finalAmount = adjustType.value === 'credit' ? Number(adjustAmount.value) : -Number(adjustAmount.value);

  submitting.value = true;
  try {
    await api.post('/points/admin-adjust', {
      studentId: selectedStudentId.value,
      amount: finalAmount,
      reason: adjustReason.value.trim(),
    });

    successMessage.value = `تغییر موجودی (${formatNovin(finalAmount, { showSign: true })}) با موفقیت اعمال شد.`;
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
        <span>تنظیم مستقیم موجودی نوین دانش‌آموز</span>
      </h1>
      <p class="text-xs text-slate-500 mt-0.5">
        اصلاح دستی موجودی (افزایش یا کسر) به همراه ثبت دلیل مستند در تاریخچه حسابرسی سیستم
      </p>
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

      <!-- Type: Credit vs Debit -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">نوع تغییر:</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            :class="[
              'py-2.5 rounded-xl border text-xs font-bold transition-all',
              adjustType === 'credit'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs font-black'
                : 'bg-slate-50 border-slate-200 text-slate-600',
            ]"
            @click="adjustType = 'credit'"
          >
            افزایش موجودی (+ پاداش / اصلاح)
          </button>

          <button
            type="button"
            :class="[
              'py-2.5 rounded-xl border text-xs font-bold transition-all',
              adjustType === 'debit'
                ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-2xs font-black'
                : 'bg-slate-50 border-slate-200 text-slate-600',
            ]"
            @click="adjustType = 'debit'"
          >
            کسر موجودی (− جریمه / تصحیح)
          </button>
        </div>
      </div>

      <!-- Amount -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">مقدار نوین:</label>
        <input
          v-model="adjustAmount"
          type="number"
          min="1"
          placeholder="مثال: ۲۵"
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-sans focus:outline-none focus:border-blue-600"
        />
      </div>

      <!-- Reason -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">علت و توضیح مستند (الزامی):</label>
        <textarea
          v-model="adjustReason"
          rows="3"
          placeholder="علت این تغییر موجودی در گزارشات مالی ثبت خواهد شد..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 leading-relaxed"
        ></textarea>
      </div>

      <!-- Submit button -->
      <button
        :disabled="submitting || !selectedStudentId || !adjustAmount || !adjustReason.trim()"
        class="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
        @click="handleAdjust"
      >
        <RefreshCw v-if="submitting" class="w-4 h-4 animate-spin" />
        <Coins v-else class="w-4 h-4" />
        <span>{{ submitting ? 'در حال اعمال تغییر...' : 'ثبت و اعمال تغییر موجودی' }}</span>
      </button>
    </div>
  </div>
</template>
