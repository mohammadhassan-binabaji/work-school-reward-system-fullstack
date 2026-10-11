<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Flag,
  Upload,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-vue-next';
import BirdMascot from '../components/BirdMascot.vue';
import BottomSheet from '../components/BottomSheet.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatFileSize,
  type Activity,
} from '@student-reward/shared';

const activities = ref<Activity[]>([]);
const loading = ref(true);

// Submission modal state
const isSubmitModalOpen = ref(false);
const selectedActivity = ref<Activity | null>(null);
const textDescription = ref('');
const fileAttachmentUrl = ref<string | null>(null);
const uploadedFileName = ref('');
const uploadedFileSize = ref(0);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadError = ref<string | null>(null);
const submitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref<string | null>(null);

onMounted(async () => {
  await fetchActivities();
});

async function fetchActivities() {
  loading.value = true;
  try {
    const list = await api.get<Activity[]>('/activities');
    activities.value = list || [];
  } catch (e) {
    console.error('Failed to load activities', e);
  } finally {
    loading.value = false;
  }
}

function openSubmission(act: Activity) {
  if (act.isBanned || act.isDone) return;
  selectedActivity.value = act;
  textDescription.value = '';
  fileAttachmentUrl.value = null;
  uploadedFileName.value = '';
  uploadedFileSize.value = 0;
  uploadError.value = null;
  submitError.value = null;
  submitSuccess.value = false;
  isSubmitModalOpen.value = true;
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploading.value = true;
  uploadError.value = null;
  uploadProgress.value = 30;

  try {
    uploadedFileName.value = file.name;
    uploadedFileSize.value = file.size;

    const res = await api.upload<{ url: string }>('/files/upload', file);
    uploadProgress.value = 100;
    fileAttachmentUrl.value = res.url;
  } catch (err: any) {
    uploadError.value = err.message || 'بارگذاری فایل ناموفق بود';
    fileAttachmentUrl.value = null;
  } finally {
    isUploading.value = false;
  }
}

function removeAttachment() {
  fileAttachmentUrl.value = null;
  uploadedFileName.value = '';
  uploadedFileSize.value = 0;
  uploadProgress.value = 0;
  uploadError.value = null;
}

async function submitVerification() {
  if (!selectedActivity.value) return;
  if (!textDescription.value.trim()) {
    submitError.value = 'لطفاً توضیحات گزارش را وارد کنید.';
    return;
  }

  submitting.value = true;
  submitError.value = null;

  try {
    await api.post(`/activities/${selectedActivity.value.id}/submissions`, {
      textDescription: textDescription.value.trim(),
      fileAttachmentUrl: fileAttachmentUrl.value || undefined,
    });

    submitSuccess.value = true;
    setTimeout(() => {
      isSubmitModalOpen.value = false;
      fetchActivities();
    }, 1500);
  } catch (err: any) {
    submitError.value = err.message || 'ارسال گزارش با خطا مواجه شد';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header Banner -->
    <div class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-green relative overflow-hidden">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-extrabold text-white flex items-center gap-2">
            <Flag class="w-5 h-5 text-neon-green" />
            <span>چالش‌ها و ماموریت‌ها</span>
          </h2>
          <p class="text-xs text-slate-300 mt-1 max-w-[220px]">
            چالش‌های موجود را تکمیل کن، مدرک ارسال کن و نوین کسب کن!
          </p>
        </div>
        <BirdMascot variant="rocket" size="md" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری چالش‌ها...
    </div>

    <!-- Challenges Feed -->
    <div v-else-if="activities.length > 0" class="space-y-3.5">
      <div
        v-for="act in activities"
        :key="act.id"
        :class="[
          'rounded-3xl p-5 transition-all duration-300 relative overflow-hidden',
          act.isBanned
            ? 'bg-[#10141D] opacity-60 grayscale border border-slate-800'
            : act.isDone
            ? 'bg-dark-card border border-emerald-500/40 opacity-80'
            : 'bg-dark-card border-1.5 neon-border-green',
        ]"
      >
        <!-- Banned Banner -->
        <div
          v-if="act.isBanned"
          class="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-bold"
        >
          <Ban class="w-4 h-4 shrink-0" />
          <span>به دلیل ۳ بار رد شدن متوالی، دسترسی شما به این چالش مسدود شده است.</span>
        </div>

        <!-- Completed Banner -->
        <div
          v-else-if="act.isDone"
          class="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-xs font-bold"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0" />
          <span>شما سقف مجاز این چالش را با موفقیت تکمیل کرده‌اید.</span>
        </div>

        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
              >
                {{ act.type === 'CHALLENGE' ? 'چالش ویژه' : 'ماموریت مستمر' }}
              </span>

              <!-- Status badge if pending -->
              <span
                v-if="act.verificationStatus === 'PENDING'"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
              >
                <Clock class="w-3 h-3" />
                <span>در حال بررسی</span>
              </span>
            </div>

            <h3 class="text-sm font-extrabold text-white mt-2">
              {{ act.title }}
            </h3>
            <p class="text-xs text-slate-400 mt-1 leading-relaxed">
              {{ act.description }}
            </p>
          </div>

          <!-- Points Reward Pill -->
          <div
            class="bg-neon-green/10 border border-neon-green/40 px-3 py-1.5 rounded-2xl flex flex-col items-center shrink-0 shadow-neon-green"
          >
            <span class="text-xs font-extrabold text-neon-green">
              {{ formatNovin(act.pointValue) }}
            </span>
            <span class="text-[9px] text-slate-400 font-semibold mt-0.5">پاداش ثابت</span>
          </div>
        </div>

        <!-- Card Footer: Completion Counter & CTA -->
        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div class="text-[11px] text-slate-400 font-medium">
            تکمیل شده:
            <span class="text-white font-bold">
              {{ toPersianDigits(act.completionCount ?? 0) }}
            </span>
            از
            <span class="text-white font-bold">
              {{ toPersianDigits(act.completionLimit) }}
            </span>
          </div>

          <button
            :disabled="act.isBanned || act.isDone"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
              act.isBanned || act.isDone
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-neon-green text-[#0B0E14] hover:bg-neon-green-light shadow-neon-green',
            ]"
            @click="openSubmission(act)"
          >
            <Upload class="w-3.5 h-3.5" />
            <span>ثبت مدرک و گزارش</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-16 text-center space-y-3">
      <BirdMascot variant="inquisitive" size="lg" class="mx-auto" />
      <h3 class="text-sm font-bold text-white">هنوز چالشی تعریف نشده است</h3>
      <p class="text-xs text-slate-400">به زودی چالش‌های جذاب به سامانه اضافه خواهند شد.</p>
    </div>

    <!-- Bottom Sheet: Submission Modal -->
    <BottomSheet
      :is-open="isSubmitModalOpen"
      :title="selectedActivity?.title || 'ارسال مدرک و گزارش'"
      border-color="green"
      @close="isSubmitModalOpen = false"
    >
      <div class="space-y-4">
        <!-- Recap Pill -->
        <div class="p-3 rounded-2xl bg-[#161C28] border border-slate-700 flex items-center justify-between">
          <span class="text-xs text-slate-300 font-medium">پاداش تکمیل این فعالیت:</span>
          <span class="text-xs font-bold text-neon-green">
            {{ formatNovin(selectedActivity?.pointValue) }}
          </span>
        </div>

        <!-- Text Description Field -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            توضیحات و گزارش انجام کار (الزامی):
          </label>
          <textarea
            v-model="textDescription"
            rows="3"
            class="w-full bg-[#0F1420] border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-green transition-colors leading-relaxed"
            placeholder="در مورد نحوه انجام فعالیت و نتیجه آن توضیح دهید..."
          ></textarea>
        </div>

        <!-- Evidence Attachment (Dropzone & Camera Picker) -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">
            تصویر یا مدرک پیوست (اختیاری):
          </label>

          <!-- Upload Dropzone -->
          <div
            v-if="!fileAttachmentUrl"
            class="border-2 border-dashed border-slate-700 hover:border-neon-green/60 rounded-2xl p-4 text-center cursor-pointer transition-colors relative bg-[#0F1420]/50"
          >
            <input
              type="file"
              accept="image/*,.pdf"
              class="absolute inset-0 opacity-0 cursor-pointer"
              :disabled="isUploading"
              @change="handleFileUpload"
            />
            <div class="flex flex-col items-center gap-1.5">
              <Upload class="w-6 h-6 text-neon-green" />
              <span class="text-xs font-bold text-white">انتخاب یا عکس‌برداری مدرک</span>
              <span class="text-[10px] text-slate-500">فرمت‌های مجاز: عکس یا فایل PDF تا حداکثر ۱۰ مگابایت</span>
            </div>

            <!-- In-Flight Progress -->
            <div v-if="isUploading" class="mt-3 flex items-center justify-center gap-2 text-xs text-cyan-400">
              <RefreshCw class="w-4 h-4 animate-spin" />
              <span>در حال بارگذاری فایل...</span>
            </div>
          </div>

          <!-- Attached File Preview -->
          <div
            v-else
            class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
              <div>
                <p class="text-xs font-bold text-white line-clamp-1">{{ uploadedFileName }}</p>
                <span class="text-[10px] text-slate-400">{{ formatFileSize(uploadedFileSize) }}</span>
              </div>
            </div>
            <button
              class="text-xs font-bold text-rose-400 hover:text-rose-300 p-1.5 rounded-lg transition-colors flex items-center gap-1"
              @click="removeAttachment"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>
          </div>

          <!-- Upload Error Banner -->
          <div
            v-if="uploadError"
            class="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ uploadError }}</span>
          </div>
        </div>

        <!-- Submit Error / Success Alert -->
        <div
          v-if="submitError"
          class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5"
        >
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ submitError }}</span>
        </div>

        <div
          v-if="submitSuccess"
          class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold"
        >
          گزارش شما با موفقیت ثبت شد و در انتظار تایید مدیر سیستم است!
        </div>

        <!-- Submit Action -->
        <button
          :disabled="submitting || isUploading || submitSuccess"
          class="w-full py-3 rounded-2xl bg-neon-green text-[#0B0E14] font-extrabold text-xs shadow-neon-green disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
          @click="submitVerification"
        >
          <RefreshCw v-if="submitting" class="w-4 h-4 animate-spin" />
          <span>{{ submitting ? 'در حال ارسال...' : 'ثبت نهایی گزارش' }}</span>
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
