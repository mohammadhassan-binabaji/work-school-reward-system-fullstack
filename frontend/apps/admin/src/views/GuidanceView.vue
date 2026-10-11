<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { BookOpen, Plus, Trash2, Edit2, AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { api, toPersianDigits, type GuidanceCard } from '@student-reward/shared';

const cards = ref<GuidanceCard[]>([]);
const loading = ref(true);

const isModalOpen = ref(false);
const cardTitle = ref('');
const cardDesc = ref('');
const cardLogoKey = ref('shield');
const cardPointRange = ref('۵۰ تا ۱۵۰ نوین');
const saving = ref(false);

const isConfirmOpen = ref(false);
const deleteTargetId = ref('');
const deleting = ref(false);

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadCards();
});

async function loadCards() {
  loading.value = true;
  try {
    const list = await api.get<GuidanceCard[]>('/guidance-cards');
    cards.value = list || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری کارت‌های راهنما';
  } finally {
    loading.value = false;
  }
}

async function handleCreateCard() {
  if (!cardTitle.value.trim() || !cardDesc.value.trim()) return;

  saving.value = true;
  try {
    await api.post('/guidance-cards', {
      title: cardTitle.value.trim(),
      description: cardDesc.value.trim(),
      logoKey: cardLogoKey.value,
      pointRangeLabel: cardPointRange.value.trim(),
    });

    isModalOpen.value = false;
    cardTitle.value = '';
    cardDesc.value = '';
    cardPointRange.value = '۵۰ تا ۱۵۰ نوین';
    await loadCards();
    successMessage.value = 'کارت راهنما با موفقیت افزوده شد.';
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در افزودن کارت راهنما');
  } finally {
    saving.value = false;
  }
}

function askDelete(id: string) {
  deleteTargetId.value = id;
  isConfirmOpen.value = true;
}

async function handleDelete() {
  deleting.value = true;
  try {
    await api.delete(`/guidance-cards/${deleteTargetId.value}`);
    isConfirmOpen.value = false;
    await loadCards();
  } catch (err: any) {
    alert(err.message || 'خطا در حذف کارت راهنما');
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
        <h1 class="text-xl font-black text-slate-900 tracking-tight">کارت‌های راهنمای نوین</h1>
        <p class="text-xs text-slate-500 mt-0.5">تنظیم و انتشار آیین‌نامه و سرفصل‌های تشویقی قابل مشاهده برای دانش‌آموزان و معلمان</p>
      </div>

      <button
        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        @click="isModalOpen = true"
      >
        <Plus class="w-4 h-4" />
        <span>افزودن کارت راهنما</span>
      </button>
    </div>

    <!-- Alert Notifications -->
    <div
      v-if="successMessage"
      class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="w-4 h-4 text-emerald-600" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Cards Grid -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال دریافت کارت‌های راهنما...
    </div>

    <div v-else-if="cards.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="c in cards"
        :key="c.id"
        class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm font-extrabold text-slate-800">{{ c.title }}</h3>
            <button class="text-slate-400 hover:text-rose-600 p-1" @click="askDelete(c.id)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <p class="text-xs text-slate-500 leading-relaxed min-h-[44px]">{{ c.description }}</p>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl">
              {{ c.pointRangeLabel }}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">وضعیت: فعال</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200">
      کارتی در راهنما ثبت نشده است.
    </div>

    <!-- Modal: Create Card -->
    <AdminModal :is-open="isModalOpen" title="افزودن کارت راهنمای جدید" @close="isModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">عنوان فعالیت (حداکثر ۳۰ کاراکتر):</label>
          <input
            v-model="cardTitle"
            type="text"
            maxlength="30"
            placeholder="مثال: شرکت فعال در مباحث درس"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات تکمیلی:</label>
          <textarea
            v-model="cardDesc"
            rows="3"
            placeholder="شرایط و نحوه شایستگی برای دریافت نوین..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">برچسب بازه نوین پیشنهادی:</label>
          <input
            v-model="cardPointRange"
            type="text"
            placeholder="مثال: ۵۰ تا ۱۵۰ نوین"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="saving || !cardTitle.trim() || !cardDesc.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          @click="handleCreateCard"
        >
          ثبت کارت
        </button>
      </template>
    </AdminModal>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      title="حذف کارت راهنما"
      message="آیا از حذف این کارت راهنما اطمینان دارید؟"
      :loading="deleting"
      is-destructive
      @confirm="handleDelete"
      @cancel="isConfirmOpen = false"
    />
  </div>
</template>
