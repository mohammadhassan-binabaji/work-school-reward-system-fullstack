<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Flag,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  Unlock,
  AlertCircle,
  FileText,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  resolveFileUrl,
  type Activity,
  type VerificationRequest,
  type ActivityType,
} from '@student-reward/shared';

const activeTab = ref<'verifications' | 'activities'>('verifications');
const loading = ref(true);

const verifications = ref<VerificationRequest[]>([]);
const activities = ref<Activity[]>([]);

// Reject modal
const isRejectModalOpen = ref(false);
const rejectTargetId = ref('');
const rejectReason = ref('');
const rejecting = ref(false);

// Create Activity Modal
const isCreateModalOpen = ref(false);
const actType = ref<ActivityType>('CHALLENGE');
const actTitle = ref('');
const actDesc = ref('');
const actPoints = ref<number | ''>(50);
const actLimit = ref<number | ''>(1);
const creating = ref(false);

// Unban Modal
const isUnbanModalOpen = ref(false);
const unbanStudentId = ref('');
const unbanActivityId = ref('');
const unbanReason = ref('');
const unbanning = ref(false);

// Confirm Dialog
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve());
const confirmLoading = ref(false);

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [vList, aList] = await Promise.all([
      api.get<VerificationRequest[]>('/verifications'),
      api.get<Activity[]>('/activities'),
    ]);
    verifications.value = vList || [];
    activities.value = aList || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری چالش‌ها';
  } finally {
    loading.value = false;
  }
}

async function handleAccept(id: string) {
  try {
    await api.post(`/verifications/${id}/accept`);
    successMessage.value = 'مدرک تایید شد و پاداش نوین به دانش‌آموز تعلق گرفت.';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در تایید مدرک');
  }
}

function openRejectModal(id: string) {
  rejectTargetId.value = id;
  rejectReason.value = '';
  isRejectModalOpen.value = true;
}

async function handleReject() {
  if (!rejectReason.value.trim()) return;
  rejecting.value = true;
  try {
    await api.post(`/verifications/${rejectTargetId.value}/reject`, {
      rejectionReason: rejectReason.value.trim(),
    });
    isRejectModalOpen.value = false;
    successMessage.value = 'مدرک رد شد.';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در رد مدرک');
  } finally {
    rejecting.value = false;
  }
}

async function handleCreateActivity() {
  if (!actTitle.value.trim() || actPoints.value === '' || actLimit.value === '') return;
  creating.value = true;
  try {
    await api.post('/activities', {
      type: actType.value,
      title: actTitle.value.trim(),
      description: actDesc.value.trim(),
      pointValue: Number(actPoints.value),
      completionLimit: Number(actLimit.value),
    });
    isCreateModalOpen.value = false;
    actTitle.value = '';
    actDesc.value = '';
    actPoints.value = 50;
    actLimit.value = 1;
    await loadData();
    successMessage.value = 'چالش جدید با موفقیت ایجاد شد.';
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در ایجاد چالش');
  } finally {
    creating.value = false;
  }
}

function askDeleteActivity(id: string) {
  confirmTitle.value = 'حذف چالش';
  confirmMessage.value = 'آیا از حذف این چالش اطمینان دارید؟';
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.delete(`/activities/${id}`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در حذف چالش');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}

function openUnbanModal(studentId: string, activityId: string) {
  unbanStudentId.value = studentId;
  unbanActivityId.value = activityId;
  unbanReason.value = 'رفع مسدودیت توسط مدیریت';
  isUnbanModalOpen.value = true;
}

async function handleUnban() {
  if (!unbanStudentId.value || !unbanActivityId.value) return;
  unbanning.value = true;
  try {
    await api.post(`/students/${unbanStudentId.value}/unban`, {
      activityId: unbanActivityId.value,
      reason: unbanReason.value,
    });
    isUnbanModalOpen.value = false;
    successMessage.value = 'مسدودیت دانش‌آموز با موفقیت رفع شد.';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در رفع مسدودیت');
  } finally {
    unbanning.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">چالش‌ها و بررسی مدارک</h1>
        <p class="text-xs text-slate-500 mt-0.5">بررسی شواهد ارسالی دانش‌آموزان و مدیریت ماموریت‌های ویژه</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="activeTab === 'activities'"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isCreateModalOpen = true"
        >
          <Plus class="w-4 h-4" />
          <span>تعریف چالش جدید</span>
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

    <!-- Tab navigation -->
    <div class="p-1 bg-white border border-slate-200 rounded-2xl flex max-w-md">
      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'verifications' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600',
        ]"
        @click="activeTab = 'verifications'"
      >
        مدارک ارسالی ({{ toPersianDigits(verifications.length) }})
      </button>

      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'activities' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600',
        ]"
        @click="activeTab = 'activities'"
      >
        تعریف چالش‌ها ({{ toPersianDigits(activities.length) }})
      </button>
    </div>

    <!-- Tab 1: Verifications Review Table -->
    <div v-if="activeTab === 'verifications'" class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">دانش‌آموز</th>
              <th class="p-3.5">عنوان فعالیت</th>
              <th class="p-3.5">شرح و توضیحات دانش‌آموز</th>
              <th class="p-3.5">مدرک پیوست</th>
              <th class="p-3.5">وضعیت</th>
              <th class="p-3.5 pl-5 text-left">اقدام</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">در حال دریافت مدارک...</td>
              </tr>
            </template>
            <template v-else-if="verifications.length > 0">
              <tr v-for="v in verifications" :key="v.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ v.student?.firstName }} {{ v.student?.lastName }}
                </td>
                <td class="p-3.5 font-bold text-slate-700">{{ v.activity?.title }}</td>
                <td class="p-3.5 text-slate-600 max-w-xs truncate">{{ v.textDescription }}</td>
                <td class="p-3.5">
                  <a
                    v-if="v.fileAttachmentUrl"
                    :href="resolveFileUrl(v.fileAttachmentUrl)"
                    target="_blank"
                    class="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                    <span>مشاهده فایل</span>
                  </a>
                  <span v-else class="text-slate-400">ندارد</span>
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      v.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : v.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{ v.status === 'PENDING' ? 'در انتظار بررسی' : v.status === 'ACCEPTED' ? 'تایید شده' : 'رد شده' }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left flex items-center justify-end gap-2">
                  <template v-if="v.status === 'PENDING'">
                    <button
                      class="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      @click="handleAccept(v.id)"
                    >
                      تایید و اهدای نوین
                    </button>
                    <button
                      class="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                      @click="openRejectModal(v.id)"
                    >
                      رد مدرک
                    </button>
                  </template>
                  <span v-else class="text-slate-400 text-xs">پایان‌یافته</span>

                  <button
                    v-if="v.status === 'REJECTED'"
                    class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                    title="رفع مسدودیت در صورت ۳ بار رد شدن"
                    @click="openUnbanModal(v.studentId, v.activityId)"
                  >
                    <Unlock class="w-3.5 h-3.5" />
                    <span>رفع مسدودیت</span>
                  </button>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-12 text-center text-slate-400">مدرکی یافت نشد.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Activities Grid -->
    <div v-if="activeTab === 'activities'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="act in activities"
        :key="act.id"
        class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {{ act.type === 'CHALLENGE' ? 'چالش ویژه' : 'ماموریت مستمر' }}
              </span>
              <h3 class="text-sm font-extrabold text-slate-800 mt-1.5">{{ act.title }}</h3>
            </div>
            <button
              class="text-slate-400 hover:text-rose-600 p-1"
              @click="askDeleteActivity(act.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <p class="text-xs text-slate-500 leading-relaxed min-h-[36px]">{{ act.description }}</p>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <span class="text-xs font-black text-emerald-600">{{ formatNovin(act.pointValue) }}</span>
            <span class="text-xs text-slate-400 font-medium">
              سقف انجام: {{ toPersianDigits(act.completionLimit) }} بار
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Reject Verification -->
    <AdminModal :is-open="isRejectModalOpen" title="رد مدرک ارسالی دانش‌آموز" @close="isRejectModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">دلیل رد مدرک (الزامی):</label>
          <textarea
            v-model="rejectReason"
            rows="3"
            placeholder="مثال: تصویر ناخوانا است، گزارش ناقص می‌باشد..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-600"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isRejectModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="rejecting || !rejectReason.trim()"
          class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
          @click="handleReject"
        >
          ثبت رد مدرک
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Create Activity -->
    <AdminModal :is-open="isCreateModalOpen" title="تعریف چالش / ماموریت جدید" max-width="max-w-md" @close="isCreateModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نوع فعالیت:</label>
          <select v-model="actType" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold">
            <option value="CHALLENGE">چالش ویژه (یک‌بار یا محدود)</option>
            <option value="MISSION">ماموریت مستمر (تکرارشونده)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">عنوان چالش:</label>
          <input
            v-model="actTitle"
            type="text"
            placeholder="مثال: نمایشگاه علمی، کتابخوانی هفتگی..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">دستورالعمل و توضیحات:</label>
          <textarea v-model="actDesc" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">پاداش نوین ثابت:</label>
            <input v-model="actPoints" type="number" min="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">سقف دفعات انجام:</label>
            <input v-model="actLimit" type="number" min="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans" />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isCreateModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="creating || !actTitle.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          @click="handleCreateActivity"
        >
          ایجاد فعالیت
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Unban Student -->
    <AdminModal :is-open="isUnbanModalOpen" title="رفع مسدودیت چالش برای دانش‌آموز" @close="isUnbanModalOpen = false">
      <div class="space-y-3.5">
        <p class="text-xs text-slate-600">
          با این عملیات، شمارنده ریجکت‌های دانش‌آموز ریست شده و امکان شرکت مجدد در چالش فعال می‌شود.
        </p>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">علت رفع مسدودیت (اختیاری):</label>
          <input v-model="unbanReason" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800" />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isUnbanModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="unbanning"
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          @click="handleUnban"
        >
          تایید رفع مسدودیت
        </button>
      </template>
    </AdminModal>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :loading="confirmLoading"
      is-destructive
      @confirm="confirmAction"
      @cancel="isConfirmOpen = false"
    />
  </div>
</template>
