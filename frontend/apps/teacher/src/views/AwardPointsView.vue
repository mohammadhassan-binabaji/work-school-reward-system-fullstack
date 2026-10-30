<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Award,
  Users,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Coins,
  Search,
  UserCheck,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import {
  api,
  toPersianDigits,
  formatNovin,
  type TeacherAssignment,
  type Class,
  type PointTransferTask,
  type PointTaskOption,
} from '@student-reward/shared';

const route = useRoute();
const authStore = useAuthStore();

// Data states
const assignments = ref<TeacherAssignment[]>([]);
const currentClassDetails = ref<Class | null>(null);
const pointTasks = ref<PointTransferTask[]>([]);
const loading = ref(true);
const loadingStudents = ref(false);

// Form selections
const selectedAssignmentId = ref('');
const selectedStudentId = ref('');
const studentSearchQuery = ref('');
const selectedTaskId = ref('');
const selectedOptionId = ref('');
const customReason = ref('');
const customDescription = ref('');
const customAmount = ref<number | null>(null);

// Submit status
const submitting = ref(false);
const awardSuccess = ref(false);
const awardedAmount = ref(0);
const awardedStudentName = ref('');
const errorMessage = ref<string | null>(null);

// Unique classes from assignments
const availableClasses = computed(() => {
  const map = new Map<string, { classId: string; className: string }>();
  assignments.value.forEach((a) => {
    if (a.class) {
      map.set(a.classId, { classId: a.classId, className: a.class.name });
    }
  });
  return Array.from(map.values());
});

// Selected assignment
const currentAssignment = computed(() => {
  return assignments.value.find((a) => a.id === selectedAssignmentId.value) || null;
});

// Filtered students by class and search
const availableStudents = computed(() => {
  if (!currentClassDetails.value?.students) return [];
  const query = studentSearchQuery.value.trim().toLowerCase();
  return currentClassDetails.value.students.filter((s) => {
    if (s.user.accountState !== 'ACTIVE') return false;
    if (!query) return true;
    const name = `${s.user.firstName} ${s.user.lastName}`.toLowerCase();
    return name.includes(query) || s.user.nationalId.includes(query);
  });
});

// Selected Task and Option
const currentTask = computed(() => {
  return pointTasks.value.find((t) => t.id === selectedTaskId.value) || null;
});

const currentOption = computed(() => {
  return currentTask.value?.options.find((o) => o.id === selectedOptionId.value) || null;
});

const selectedStudent = computed(() => {
  return (
    currentClassDetails.value?.students?.find(
      (s) => s.id === selectedStudentId.value,
    ) || null
  );
});

onMounted(async () => {
  await loadInitialData();
});

async function loadInitialData() {
  loading.value = true;
  try {
    const teacherId = authStore.user?.id;
    if (!teacherId) return;

    const [assignmentsList, tasksList] = await Promise.all([
      api.get<TeacherAssignment[]>('/assignments', { teacherId }),
      api.get<PointTransferTask[]>('/points/tasks'),
    ]);

    assignments.value = assignmentsList || [];
    pointTasks.value = (tasksList || []).filter((t) => t.isActive);

    // If assignment query param passed
    const queryAssign = route.query.assignmentId as string;
    const queryStudent = route.query.studentId as string;

    if (queryAssign && assignments.value.some((a) => a.id === queryAssign)) {
      selectedAssignmentId.value = queryAssign;
    } else if (assignments.value.length > 0) {
      selectedAssignmentId.value = assignments.value[0].id;
    }

    if (queryStudent) {
      selectedStudentId.value = queryStudent;
    }
  } catch (err: any) {
    console.error('Error loading initial data', err);
  } finally {
    loading.value = false;
  }
}

// When assignment changes, load class students
watch(
  () => selectedAssignmentId.value,
  async (assignId) => {
    const assign = assignments.value.find((a) => a.id === assignId);
    if (!assign) return;

    loadingStudents.value = true;
    try {
      const cls = await api.get<Class>(`/classes/${assign.classId}`);
      currentClassDetails.value = cls;

      // Reset student if not in this class
      if (!cls.students?.some((s) => s.id === selectedStudentId.value)) {
        selectedStudentId.value = '';
      }
    } catch (e) {
      console.error('Failed to load class students', e);
    } finally {
      loadingStudents.value = false;
    }
  },
  { immediate: true },
);

function onTaskSelectChange() {
  selectedOptionId.value = '';
  if (!selectedTaskId.value) {
    return;
  }
  const task = pointTasks.value.find((t) => t.id === selectedTaskId.value);
  if (task) {
    customReason.value = task.name;
    customDescription.value = task.description || '';
    if (task.options && task.options.length > 0) {
      customAmount.value = task.options[0].points;
      selectedOptionId.value = task.options[0].id;
    }
  }
}

function selectOptionPill(opt: PointTaskOption) {
  selectedOptionId.value = opt.id;
  customAmount.value = opt.points;
}

watch(
  () => customAmount.value,
  (val) => {
    if (currentTask.value) {
      const matchingOpt = currentTask.value.options.find((o) => o.points === val);
      selectedOptionId.value = matchingOpt ? matchingOpt.id : '';
    }
  },
);

async function handleAward() {
  errorMessage.value = null;

  if (!currentAssignment.value) {
    errorMessage.value = 'لطفاً کلاس و درس مربوطه را انتخاب کنید.';
    return;
  }
  if (!selectedStudentId.value) {
    errorMessage.value = 'لطفاً دانش‌آموز مورد نظر را انتخاب کنید.';
    return;
  }
  if (!customReason.value.trim()) {
    errorMessage.value = 'لطفاً دلیل یا عنوان فعالیت را وارد کنید.';
    return;
  }
  const amount = Number(customAmount.value);
  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    errorMessage.value = 'لطفاً مقدار معتبر و مثبتی برای نوین وارد کنید.';
    return;
  }

  if (authStore.pointBalance < amount) {
    errorMessage.value = 'موجودی نوین شما برای این پاداش کافی نیست.';
    return;
  }

  submitting.value = true;
  try {
    await api.post('/points/teacher-award', {
      studentId: selectedStudentId.value,
      classId: currentAssignment.value.classId,
      subjectId: currentAssignment.value.subjectId,
      amount,
      reason: customReason.value.trim(),
      description: customDescription.value.trim() || undefined,
    });

    awardedAmount.value = amount;
    awardedStudentName.value = selectedStudent.value
      ? `${selectedStudent.value.user.firstName} ${selectedStudent.value.user.lastName}`
      : 'دانش‌آموز';

    awardSuccess.value = true;
    await authStore.fetchMe();
  } catch (err: any) {
    errorMessage.value = err.message || 'ثبت پاداش با خطا مواجه شد';
  } finally {
    submitting.value = false;
  }
}

function resetForAnotherAward() {
  awardSuccess.value = false;
  selectedStudentId.value = '';
  selectedTaskId.value = '';
  selectedOptionId.value = '';
  customReason.value = '';
  customDescription.value = '';
  customAmount.value = null;
  errorMessage.value = null;
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header Budget Reminder Banner -->
    <div
      class="bg-gradient-to-r from-indigo-700 to-indigo-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden"
    >
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-xs text-indigo-100 font-medium">موجودی در دسترس شما:</span>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-black tracking-tight">
              {{ formatNovin(authStore.pointBalance) }}
            </span>
          </div>
          <p class="text-[11px] text-indigo-200 mt-1">
            نوین‌ها پس از تایید فوری به حساب دانش‌آموز افزوده می‌شوند.
          </p>
        </div>
        <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          <Award class="w-8 h-8 text-indigo-200" />
        </div>
      </div>
    </div>

    <!-- Success Message Screen -->
    <div
      v-if="awardSuccess"
      class="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm text-center space-y-4"
    >
      <div
        class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"
      >
        <CheckCircle2 class="w-10 h-10" />
      </div>

      <div class="space-y-1">
        <h3 class="text-base font-extrabold text-slate-800">پاداش با موفقیت ثبت شد!</h3>
        <p class="text-xs text-slate-600">
          مقدار
          <strong class="text-emerald-600 font-black">{{ formatNovin(awardedAmount) }}</strong>
          به حساب
          <strong class="text-slate-800">{{ awardedStudentName }}</strong>
          افزوده شد.
        </p>
      </div>

      <button
        class="w-full py-3 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
        @click="resetForAnotherAward"
      >
        ثبت پاداش برای دانش‌آموز دیگر
      </button>
    </div>

    <!-- Award Flow Form -->
    <div v-else class="space-y-4">
      <div v-if="loading" class="py-16 text-center text-slate-500 text-xs">
        در حال بارگذاری اطلاعات کلاس‌ها و فعالیت‌ها...
      </div>

      <template v-else-if="assignments.length > 0">
        <!-- Step 1: Select Assignment (Class & Subject) -->
        <div class="bg-white rounded-3xl p-4.5 border border-slate-200 shadow-xs space-y-2">
          <label class="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users class="w-4 h-4 text-indigo-600" />
            <span>۱. انتخاب کلاس و درس:</span>
          </label>

          <select
            v-model="selectedAssignmentId"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option v-for="a in assignments" :key="a.id" :value="a.id">
              {{ a.class?.name }} — درس {{ a.subject?.name }}
            </option>
          </select>
        </div>

        <!-- Step 2: Select Student -->
        <div class="bg-white rounded-3xl p-4.5 border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <UserCheck class="w-4 h-4 text-indigo-600" />
              <span>۲. انتخاب دانش‌آموز:</span>
            </label>
            <span class="text-[11px] text-slate-400">
              ({{ toPersianDigits(availableStudents.length) }} دانش‌آموز)
            </span>
          </div>

          <!-- Search filter input -->
          <div class="relative">
            <input
              v-model="studentSearchQuery"
              type="text"
              placeholder="جستجوی نام یا کد ملی دانش‌آموز..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
            <Search class="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </div>

          <!-- Students Scrollable List -->
          <div class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            <div v-if="loadingStudents" class="py-4 text-center text-xs text-slate-400">
              در حال دریافت لیست دانش‌آموزان...
            </div>

            <template v-else-if="availableStudents.length > 0">
              <div
                v-for="s in availableStudents"
                :key="s.id"
                :class="[
                  'p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                  selectedStudentId === s.id
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700',
                ]"
                @click="selectedStudentId = s.id"
              >
                <div>
                  <span class="text-xs font-bold block">
                    {{ s.user.firstName }} {{ s.user.lastName }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-normal">
                    کد ملی: {{ toPersianDigits(s.user.nationalId) }}
                  </span>
                </div>

                <div class="text-left">
                  <span class="text-[11px] text-slate-500 font-semibold block">
                    {{ formatNovin(s.currentBalance) }}
                  </span>
                </div>
              </div>
            </template>

            <div v-else class="py-4 text-center text-xs text-slate-400">
              دانش‌آموزی با این مشخصات یافت نشد.
            </div>
          </div>
        </div>

        <!-- Step 3: Custom Reason, Amount & Templates -->
        <div class="bg-white rounded-3xl p-4.5 border border-slate-200 shadow-xs space-y-3.5">
          <label class="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <BookOpen class="w-4 h-4 text-indigo-600" />
            <span>۳. فعالیت و مقدار نوین:</span>
          </label>

          <!-- Template selector -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>الگوی آماده (اختیاری):</span>
              <button
                v-if="selectedTaskId"
                type="button"
                class="text-indigo-600 hover:underline text-[10px]"
                @click="selectedTaskId = ''; onTaskSelectChange()"
              >
                پاک کردن الگو
              </button>
            </div>
            <select
              v-model="selectedTaskId"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
              @change="onTaskSelectChange"
            >
              <option value="">فعالیت سفارشی (بدون الگو)...</option>
              <option v-for="t in pointTasks" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <!-- Reason / Title Input -->
          <div class="space-y-1">
            <label class="block text-[11px] text-slate-600 font-bold">
              عنوان فعالیت / دلیل پاداش <span class="text-rose-500">*</span>:
            </label>
            <input
              v-model="customReason"
              type="text"
              maxlength="150"
              placeholder="مثلاً حل تمرین پای تخته، انضباط کلاسی..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          <!-- Template Option Pills (if template chosen) -->
          <div v-if="currentTask && currentTask.options.length > 0" class="space-y-1.5 pt-0.5">
            <span class="text-[11px] text-slate-500 font-medium block">
              مقادیر پیشنهادی این الگو:
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="opt in currentTask.options"
                :key="opt.id"
                type="button"
                :class="[
                  'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center',
                  selectedOptionId === opt.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                ]"
                @click="selectOptionPill(opt)"
              >
                <span class="text-xs font-black">{{ formatNovin(opt.points) }}</span>
                <span
                  v-if="opt.label"
                  :class="[
                    'text-[10px] mt-0.5',
                    selectedOptionId === opt.id ? 'text-indigo-100' : 'text-slate-500',
                  ]"
                >
                  {{ opt.label }}
                </span>
              </button>
            </div>
          </div>

          <!-- Amount Input -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="block text-[11px] text-slate-600 font-bold">
                مقدار نوین پرداختی <span class="text-rose-500">*</span>:
              </label>
              <span v-if="customAmount" class="text-[10px] font-bold text-indigo-600">
                {{ formatNovin(customAmount) }}
              </span>
            </div>
            <div class="relative">
              <input
                v-model.number="customAmount"
                type="number"
                min="1"
                step="1"
                placeholder="مثلاً ۱۰"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl pr-3 pl-12 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-bold"
              />
              <span class="absolute left-3 top-2 text-[10px] text-slate-400 pointer-events-none">
                نوین
              </span>
            </div>
          </div>

          <!-- Description / Note Input (Optional) -->
          <div class="space-y-1">
            <label class="block text-[11px] text-slate-600 font-bold">
              توضیحات تکمیلی (اختیاری):
            </label>
            <textarea
              v-model="customDescription"
              rows="2"
              maxlength="500"
              placeholder="توضیحاتی در صورت تمایل..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 resize-none font-medium"
            ></textarea>
          </div>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Submit Button -->
        <button
          :disabled="submitting || !selectedStudentId || !customReason.trim() || !customAmount || customAmount <= 0"
          class="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          @click="handleAward"
        >
          <RefreshCw v-if="submitting" class="w-4 h-4 animate-spin" />
          <Award v-else class="w-4 h-4" />
          <span>
            {{ submitting ? 'در حال ثبت پاداش...' : 'تایید و اهدای نوین' }}
          </span>
        </button>
      </template>

      <!-- No Assignments Fallback -->
      <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-200">
        شما به کلاسی تخصیص داده نشده‌اید. لطفاً با مدیر سیستم تماس بگیرید.
      </div>
    </div>
  </div>
</template>
