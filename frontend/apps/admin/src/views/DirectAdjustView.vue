<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { SlidersHorizontal, RefreshCw, CheckCircle2, AlertCircle, Coins, Search } from 'lucide-vue-next';
import { api, toPersianDigits, toAsciiDigits, formatNovin, type User as UserType } from '@student-reward/shared';

const students = ref<UserType[]>([]);
const loading = ref(true);

const selectedStudentIds = ref<string[]>([]);
const studentSearchQuery = ref('');
const adjustAmount = ref<number | ''>('');
const adjustType = ref<'credit' | 'debit'>('credit');
const adjustReason = ref('');

const submitting = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const filteredStudents = computed(() => {
  const query = normalizeSearch(studentSearchQuery.value);
  if (!query) return students.value;
  return students.value.filter((student) => {
    const name = normalizeSearch(`${student.firstName} ${student.lastName}`);
    return name.includes(query) || toAsciiDigits(student.nationalId).includes(toAsciiDigits(query));
  });
});

function normalizeSearch(value: string) {
  return toAsciiDigits(value).toLowerCase().trim();
}

function toggleStudent(studentId: string) {
  selectedStudentIds.value = selectedStudentIds.value.includes(studentId)
    ? selectedStudentIds.value.filter((id) => id !== studentId)
    : [...selectedStudentIds.value, studentId];
}

function toggleFilteredStudents() {
  const visibleIds = filteredStudents.value.map((student) => student.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.value.includes(id));
  selectedStudentIds.value = allVisibleSelected
    ? selectedStudentIds.value.filter((id) => !visibleIds.includes(id))
    : Array.from(new Set([...selectedStudentIds.value, ...visibleIds]));
}

onMounted(async () => {
  await loadStudents();
});

async function loadStudents() {
  loading.value = true;
  try {
    const list = await api.get<UserType[]>('/users', {
      role: 'STUDENT',
      accountState: 'ACTIVE',
    });
    students.value = list || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری دانش‌آموزان';
  } finally {
    loading.value = false;
  }
}

async function handleAdjust() {
  errorMessage.value = null;

  if (!selectedStudentIds.value.length) {
    errorMessage.value = 'لطفاً حداقل یک دانش‌آموز را انتخاب کنید.';
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
  const studentIds = [...selectedStudentIds.value];

  submitting.value = true;
  try {
    await api.post('/points/admin-adjust/bulk', {
      studentIds,
      amount: finalAmount,
      reason: adjustReason.value.trim(),
    });

    successMessage.value = `تغییر موجودی (${formatNovin(finalAmount, { showSign: true })}) برای ${toPersianDigits(studentIds.length)} دانش‌آموز با موفقیت اعمال شد.`;
    selectedStudentIds.value = [];
    studentSearchQuery.value = '';
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
      <!-- Select Students -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-xs font-bold text-slate-700">انتخاب دانش‌آموزان:</label>
          <span class="text-[11px] text-slate-400"> {{ toPersianDigits(selectedStudentIds.length) }} انتخاب‌شده </span>
        </div>
        <div class="relative">
          <input
            v-model="studentSearchQuery"
            type="text"
            placeholder="جستجوی نام یا کد ملی دانش‌آموز..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
          <Search class="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>
        <div class="flex items-center justify-between mt-2 mb-1">
          <span class="text-[11px] text-slate-400"> {{ toPersianDigits(filteredStudents.length) }} دانش‌آموز </span>
          <button
            type="button"
            class="text-[11px] font-bold text-blue-600 hover:text-blue-700"
            :disabled="filteredStudents.length === 0"
            @click="toggleFilteredStudents"
          >
            {{
              filteredStudents.length > 0 &&
              filteredStudents.every((student) => selectedStudentIds.includes(student.id))
                ? 'لغو انتخاب نتایج'
                : 'انتخاب همه نتایج'
            }}
          </button>
        </div>
        <div class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          <button
            v-for="student in filteredStudents"
            :key="student.id"
            type="button"
            :class="[
              'w-full p-2.5 rounded-xl border flex items-center justify-between text-right transition-all',
              selectedStudentIds.includes(student.id)
                ? 'bg-blue-50 border-blue-500 text-blue-950'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700',
            ]"
            @click="toggleStudent(student.id)"
          >
            <span class="text-xs font-bold">
              {{ student.firstName }} {{ student.lastName }}
              <span class="block text-[10px] text-slate-400 font-normal">
                کد ملی: {{ toPersianDigits(student.nationalId) }}
              </span>
            </span>
            <CheckCircle2
              :class="[
                'w-4 h-4 shrink-0',
                selectedStudentIds.includes(student.id) ? 'text-blue-600' : 'text-slate-300',
              ]"
            />
          </button>
          <div v-if="!loading && filteredStudents.length === 0" class="py-4 text-center text-xs text-slate-400">
            دانش‌آموزی با این مشخصات یافت نشد.
          </div>
          <div v-if="loading" class="py-4 text-center text-xs text-slate-400">در حال دریافت فهرست دانش‌آموزان...</div>
        </div>
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
        :disabled="submitting || !selectedStudentIds.length || !adjustAmount || !adjustReason.trim()"
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
