<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ListPlus, Plus, Trash2, Edit2, AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  type PointTransferTask,
  type PointTaskOption,
} from '@student-reward/shared';

const tasks = ref<PointTransferTask[]>([]);
const loading = ref(true);

// Modal state
const isModalOpen = ref(false);
const taskName = ref('');
const taskDesc = ref('');
const optionsList = ref<{ points: number; label: string }[]>([
  { points: 5, label: 'تلاش مناسب' },
  { points: 10, label: 'عالی / نمره کامل' },
]);
const saving = ref(false);

// Confirm Dialog
const isConfirmOpen = ref(false);
const deleteTargetId = ref('');
const deleting = ref(false);

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadTasks();
});

async function loadTasks() {
  loading.value = true;
  try {
    const list = await api.get<PointTransferTask[]>('/points/tasks');
    tasks.value = list || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری فعالیت‌ها';
  } finally {
    loading.value = false;
  }
}

function addOptionRow() {
  optionsList.value.push({ points: 10, label: '' });
}

function removeOptionRow(idx: number) {
  if (optionsList.value.length <= 1) return;
  optionsList.value.splice(idx, 1);
}

async function handleCreateTask() {
  if (!taskName.value.trim() || optionsList.value.length === 0) return;

  saving.value = true;
  try {
    await api.post('/points/tasks', {
      name: taskName.value.trim(),
      description: taskDesc.value.trim() || undefined,
      options: optionsList.value.map((o) => ({
        points: Number(o.points),
        label: o.label.trim() || undefined,
      })),
    });

    isModalOpen.value = false;
    taskName.value = '';
    taskDesc.value = '';
    optionsList.value = [
      { points: 5, label: 'تلاش مناسب' },
      { points: 10, label: 'عالی' },
    ];
    await loadTasks();
    successMessage.value = 'فعالیت اهدای نوین با موفقیت ایجاد شد.';
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ساخت فعالیت';
  } finally {
    saving.value = false;
  }
}

function askDeleteTask(id: string) {
  deleteTargetId.value = id;
  isConfirmOpen.value = true;
}

async function handleDeleteTask() {
  deleting.value = true;
  try {
    await api.delete(`/points/tasks/${deleteTargetId.value}`);
    isConfirmOpen.value = false;
    await loadTasks();
  } catch (err: any) {
    alert(err.message || 'خطا در حذف فعالیت');
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">فعالیت‌های پیش‌فرض اهدای نوین</h1>
        <p class="text-xs text-slate-500 mt-0.5">تعریف عناوین فعالیت‌های کلاسی و مقادیر مجاز برای اهدای نوین توسط معلمان</p>
      </div>

      <button
        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        @click="isModalOpen = true"
      >
        <Plus class="w-4 h-4" />
        <span>تعریف فعالیت جدید</span>
      </button>
    </div>

    <!-- Alert Messages -->
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

    <!-- Tasks Grid -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری فعالیت‌ها...
    </div>

    <div v-else-if="tasks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="t in tasks"
        :key="t.id"
        class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-extrabold text-slate-800">{{ t.name }}</h3>
            <button
              class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
              title="حذف"
              @click="askDeleteTask(t.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <p class="text-xs text-slate-500 leading-relaxed min-h-[32px]">
            {{ t.description || 'بدون توضیح تکمیلی' }}
          </p>

          <!-- Discrete options -->
          <div class="space-y-1.5 pt-2">
            <span class="text-[11px] font-bold text-slate-400 block">گزینه‌های نوین مجاز:</span>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="opt in t.options"
                :key="opt.id"
                class="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold"
              >
                {{ formatNovin(opt.points) }} {{ opt.label ? `(${opt.label})` : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200">
      فعالیتی تعریف نشده است.
    </div>

    <!-- Modal: Create Task -->
    <AdminModal :is-open="isModalOpen" title="تعریف عنوان فعالیت جدید" max-width="max-w-md" @close="isModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نام فعالیت:</label>
          <input
            v-model="taskName"
            type="text"
            placeholder="مثال: حل تمرین، مشارکت کلاسی، سرگروهی..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات (اختیاری):</label>
          <textarea
            v-model="taskDesc"
            rows="2"
            placeholder="توضیح معیارها و نحوه ارزیابی توسط معلم..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>

        <!-- Options rows -->
        <div class="space-y-2 pt-1">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700">گزینه‌های نوین و برچسب‌ها:</label>
            <button
              type="button"
              class="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              @click="addOptionRow"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>افزودن گزینه</span>
            </button>
          </div>

          <div v-for="(opt, idx) in optionsList" :key="idx" class="flex items-center gap-2">
            <input
              v-model="opt.points"
              type="number"
              min="1"
              placeholder="نوین"
              class="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
            />
            <input
              v-model="opt.label"
              type="text"
              placeholder="برچسب (مثال: نمره کامل)"
              class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
            <button
              type="button"
              class="text-slate-400 hover:text-rose-600 p-2"
              @click="removeOptionRow(idx)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="saving || !taskName.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleCreateTask"
        >
          ثبت فعالیت
        </button>
      </template>
    </AdminModal>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      title="حذف فعالیت"
      message="آیا از حذف این فعالیت اطمینان دارید؟"
      :loading="deleting"
      is-destructive
      @confirm="handleDeleteTask"
      @cancel="isConfirmOpen = false"
    />
  </div>
</template>
