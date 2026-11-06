<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Gift,
  Plus,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  Star,
  Pencil,
  UploadCloud,
  X,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  resolveFileUrl,
  type Reward,
  type RewardRequest,
  type RewardRequestStatus,
} from '@student-reward/shared';

const activeTab = ref<'requests' | 'catalog'>('requests');
const loading = ref(true);

const requests = ref<RewardRequest[]>([]);
const catalog = ref<Reward[]>([]);
const filterStatus = ref<RewardRequestStatus | ''>('');

// Decline Request Modal
const isDeclineModalOpen = ref(false);
const declineTargetId = ref('');
const declineReason = ref('');
const declining = ref(false);

// Create / Edit Reward Modal
const isRewardModalOpen = ref(false);
const editingReward = ref<Reward | null>(null);
const rewardName = ref('');
const rewardDesc = ref('');
const rewardPrice = ref<number | ''>(50);
const rewardRequiresApproval = ref(true);
const rewardInventory = ref<number | ''>('');
const rewardImageUrl = ref('');
const rewardImageFile = ref<File | null>(null);
const rewardImagePreview = ref<string | null>(null);
const rewardImageInputRef = ref<HTMLInputElement | null>(null);
const creatingReward = ref(false);

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
    const params: Record<string, any> = {};
    if (filterStatus.value) params.status = filterStatus.value;

    const [reqs, rewards] = await Promise.all([
      api.get<RewardRequest[]>('/reward-requests', params),
      api.get<Reward[]>('/rewards'),
    ]);
    requests.value = reqs || [];
    catalog.value = rewards || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در دریافت اطلاعات جوایز';
  } finally {
    loading.value = false;
  }
}

async function handleApproveRequest(id: string) {
  try {
    await api.post(`/reward-requests/${id}/approve`);
    successMessage.value = 'درخواست جایزه با موفقیت تایید شد و به وضعیت «در انتظار تحویل» تغییر یافت.';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در تایید درخواست');
  }
}

function openDeclineModal(id: string) {
  declineTargetId.value = id;
  declineReason.value = '';
  isDeclineModalOpen.value = true;
}

async function handleDeclineRequest() {
  if (!declineReason.value.trim()) return;

  declining.value = true;
  try {
    await api.post(`/reward-requests/${declineTargetId.value}/decline`, {
      declineReason: declineReason.value.trim(),
    });
    isDeclineModalOpen.value = false;
    successMessage.value = 'درخواست رد شد و نوین مربوطه به موجودی دانش‌آموز بازگردانده شد.';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در رد درخواست');
  } finally {
    declining.value = false;
  }
}

async function handleConfirmReceive(id: string) {
  try {
    await api.post(`/reward-requests/${id}/receive`);
    successMessage.value = 'تحویل فیزیکی جایزه تایید شد و درخواست نهایی گردید.';
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در ثبت تحویل جایزه');
  }
}

function resetRewardForm() {
  if (rewardImagePreview.value) URL.revokeObjectURL(rewardImagePreview.value);
  editingReward.value = null;
  rewardName.value = '';
  rewardDesc.value = '';
  rewardPrice.value = 50;
  rewardRequiresApproval.value = true;
  rewardInventory.value = '';
  rewardImageUrl.value = '';
  rewardImageFile.value = null;
  rewardImagePreview.value = null;
  if (rewardImageInputRef.value) rewardImageInputRef.value.value = '';
}

function openCreateRewardModal() {
  resetRewardForm();
  isRewardModalOpen.value = true;
}

function openEditReward(reward: Reward) {
  resetRewardForm();
  editingReward.value = reward;
  rewardName.value = reward.name;
  rewardDesc.value = reward.description;
  rewardInventory.value = reward.inventoryQuantity ?? '';
  rewardImageUrl.value = reward.imageUrl || '';
  isRewardModalOpen.value = true;
}

function closeRewardModal() {
  isRewardModalOpen.value = false;
  resetRewardForm();
}

function clearRewardImageFile() {
  if (rewardImagePreview.value) URL.revokeObjectURL(rewardImagePreview.value);
  rewardImageFile.value = null;
  rewardImagePreview.value = null;
  if (rewardImageInputRef.value) rewardImageInputRef.value.value = '';
}

function onRewardImageChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    alert('فرمت تصویر باید JPEG، PNG یا WebP باشد.');
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('حجم تصویر نباید بیش از ۵ مگابایت باشد.');
    input.value = '';
    return;
  }

  clearRewardImageFile();
  rewardImageFile.value = file;
  rewardImageUrl.value = '';
  rewardImagePreview.value = URL.createObjectURL(file);
}

function onRewardImageUrlInput() {
  if (rewardImageUrl.value.trim() && rewardImageFile.value) {
    clearRewardImageFile();
  }
}

function clearRewardImage() {
  clearRewardImageFile();
  rewardImageUrl.value = '';
}

async function handleSaveReward() {
  if (!rewardName.value.trim()) return;
  if (!editingReward.value && (rewardPrice.value === '' || rewardPrice.value <= 0)) return;
  const requiresInventory = editingReward.value
    ? !editingReward.value.requiresApproval
    : !rewardRequiresApproval.value;
  if (requiresInventory && rewardInventory.value === '') {
    alert('برای این جایزه وارد کردن تعداد موجودی الزامی است.');
    return;
  }

  const isEditing = !!editingReward.value;
  creatingReward.value = true;
  try {
    const formData = new FormData();
    formData.append('name', rewardName.value.trim());
    formData.append('description', rewardDesc.value.trim());

    if (editingReward.value) {
      formData.append('inventoryQuantity', rewardInventory.value === '' ? '' : String(rewardInventory.value));
      if (rewardImageFile.value) {
        formData.append('image', rewardImageFile.value);
      } else {
        formData.append('imageUrl', rewardImageUrl.value.trim());
      }
      await api.patchFormData(`/rewards/${editingReward.value.id}`, formData);
    } else {
      formData.append('pointPrice', String(rewardPrice.value));
      formData.append('requiresApproval', String(rewardRequiresApproval.value));
      if (rewardInventory.value !== '') {
        formData.append('inventoryQuantity', String(rewardInventory.value));
      }
      if (rewardImageFile.value) {
        formData.append('image', rewardImageFile.value);
      } else if (rewardImageUrl.value.trim()) {
        formData.append('imageUrl', rewardImageUrl.value.trim());
      }
      await api.uploadFormData('/rewards', formData);
    }

    closeRewardModal();
    await loadData();
    successMessage.value = isEditing
      ? 'اطلاعات جایزه با موفقیت به‌روزرسانی شد.'
      : 'جایزه جدید به کاتالوگ اضافه شد.';
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || (isEditing ? 'خطا در ویرایش جایزه' : 'خطا در ایجاد جایزه'));
  } finally {
    creatingReward.value = false;
  }
}

function askDeleteReward(id: string) {
  confirmTitle.value = 'حذف جایزه از کاتالوگ';
  confirmMessage.value = 'آیا از حذف این جایزه اطمینان دارید؟';
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.delete(`/rewards/${id}`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در حذف جایزه');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">جوایز و درخواست‌های پاداش</h1>
        <p class="text-xs text-slate-500 mt-0.5">بررسی درخواست‌های دریافت جایزه دانش‌آموزان و مدیریت کاتالوگ هدایا</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="activeTab === 'catalog'"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="openCreateRewardModal"
        >
          <Plus class="w-4 h-4" />
          <span>افزودن جایزه به کاتالوگ</span>
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

    <!-- Tab Toggle -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="p-1 bg-white border border-slate-200 rounded-2xl flex max-w-md">
        <button
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
            activeTab === 'requests' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600',
          ]"
          @click="activeTab = 'requests'"
        >
          درخواست‌های دانش‌آموزان ({{ toPersianDigits(requests.length) }})
        </button>

        <button
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
            activeTab === 'catalog' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600',
          ]"
          @click="activeTab = 'catalog'"
        >
          کاتالوگ جوایز ({{ toPersianDigits(catalog.length) }})
        </button>
      </div>

      <!-- Status filter if on requests tab -->
      <div v-if="activeTab === 'requests'" class="flex items-center gap-2">
        <select
          v-model="filterStatus"
          class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium"
          @change="loadData"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING_TO_APPROVE">در انتظار تایید</option>
          <option value="PENDING_TO_RECEIVE">در انتظار تحویل</option>
          <option value="COMPLETED">تحویل شده (تکمیل)</option>
          <option value="DECLINED">رد شده</option>
        </select>
      </div>
    </div>

    <!-- Tab 1: Reward Requests Table -->
    <div v-if="activeTab === 'requests'" class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">دانش‌آموز</th>
              <th class="p-3.5">عنوان جایزه</th>
              <th class="p-3.5">هزینه نوین</th>
              <th class="p-3.5">تاریخ درخواست</th>
              <th class="p-3.5">وضعیت</th>
              <th class="p-3.5 pl-5 text-left">اقدام مدیر</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">در حال بارگذاری درخواست‌ها...</td>
              </tr>
            </template>
            <template v-else-if="requests.length > 0">
              <tr v-for="req in requests" :key="req.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ req.student?.firstName }} {{ req.student?.lastName }}
                </td>
                <td class="p-3.5 font-bold text-slate-700">{{ req.reward?.name }}</td>
                <td class="p-3.5 font-black text-amber-600">{{ formatNovin(req.priceAtRequest) }}</td>
                <td class="p-3.5 text-slate-500">{{ formatJalaliDateTime(req.createdAt) }}</td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      req.status === 'PENDING_TO_APPROVE'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : req.status === 'PENDING_TO_RECEIVE'
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : req.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{
                      req.status === 'PENDING_TO_APPROVE'
                        ? 'در انتظار تایید'
                        : req.status === 'PENDING_TO_RECEIVE'
                        ? 'در انتظار تحویل'
                        : req.status === 'COMPLETED'
                        ? 'تحویل شده'
                        : 'رد شده'
                    }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left flex items-center justify-end gap-2">
                  <template v-if="req.status === 'PENDING_TO_APPROVE'">
                    <button
                      class="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      @click="handleApproveRequest(req.id)"
                    >
                      تایید
                    </button>
                    <button
                      class="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                      @click="openDeclineModal(req.id)"
                    >
                      رد درخواست
                    </button>
                  </template>
                  <template v-else-if="req.status === 'PENDING_TO_RECEIVE'">
                    <button
                      class="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1"
                      @click="handleConfirmReceive(req.id)"
                    >
                      <PackageCheck class="w-3.5 h-3.5" />
                      <span>تایید تحویل فیزیکی</span>
                    </button>
                  </template>
                  <span v-else class="text-slate-400 text-xs">عملیات پایان‌یافته</span>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-12 text-center text-slate-400">درخواستی یافت نشد.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Catalog Grid -->
    <div v-if="activeTab === 'catalog'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="r in catalog"
        :key="r.id"
        class="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div class="space-y-2">
          <div class="w-full h-32 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden mb-2">
            <img v-if="r.imageUrl" :src="resolveFileUrl(r.imageUrl)" :alt="r.name" class="w-full h-full object-cover" />
            <Gift v-else class="w-10 h-10 text-slate-400" />
          </div>

          <h3 class="text-xs font-extrabold text-slate-800 line-clamp-1">{{ r.name }}</h3>
          <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{{ r.description }}</p>

          <div class="flex items-center justify-between pt-2">
            <span class="text-xs font-black text-amber-600">{{ formatNovin(r.pointPrice) }}</span>
            <span class="text-[10px] text-slate-400 font-medium">
              موجودی: {{ r.inventoryQuantity !== null ? toPersianDigits(r.inventoryQuantity) : 'نامحدود' }}
            </span>
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-slate-100 flex justify-between">
          <button
            class="text-xs font-bold text-blue-600 hover:text-blue-800 p-1 flex items-center gap-1"
            @click="openEditReward(r)"
          >
            <Pencil class="w-3.5 h-3.5" />
            <span>ویرایش</span>
          </button>
          <button
            class="text-xs font-bold text-rose-600 hover:text-rose-800 p-1 flex items-center gap-1"
            @click="askDeleteReward(r.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>حذف</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Decline Request -->
    <AdminModal :is-open="isDeclineModalOpen" title="رد درخواست دریافت جایزه" @close="isDeclineModalOpen = false">
      <div class="space-y-3.5">
        <p class="text-xs text-slate-600">
          با رد این درخواست، نوین‌های کسر شده به صورت خودکار به موجودی دانش‌آموز بازگردانده می‌شود.
        </p>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">دلیل رد درخواست (الزامی):</label>
          <textarea
            v-model="declineReason"
            rows="3"
            placeholder="مثال: اتمام موجودی فیزیکی، عدم مراجعه..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-600"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isDeclineModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="declining || !declineReason.trim()"
          class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
          @click="handleDeclineRequest"
        >
          تایید رد و بازگشت نوین
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Create / Edit Reward -->
    <AdminModal
      :is-open="isRewardModalOpen"
      :title="editingReward ? 'ویرایش جایزه' : 'افزودن جایزه جدید به کاتالوگ'"
      max-width="max-w-md"
      @close="closeRewardModal"
    >
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نام جایزه:</label>
          <input
            v-model="rewardName"
            type="text"
            placeholder="مثال: دفترچه یادداشت، خودکار، هدیه نقدی..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات و نحوه تحویل:</label>
          <textarea
            v-model="rewardDesc"
            rows="2"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>

        <div :class="['grid gap-3', editingReward ? 'grid-cols-1' : 'grid-cols-2']">
          <div v-if="!editingReward">
            <label class="block text-xs font-bold text-slate-700 mb-1">قیمت (نوین):</label>
            <input
              v-model="rewardPrice"
              type="number"
              min="1"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              تعداد موجودی {{ (editingReward ? editingReward.requiresApproval : rewardRequiresApproval) ? '(خالی = نامحدود)' : '(الزامی)' }}:
            </label>
            <input
              v-model="rewardInventory"
              type="number"
              min="0"
              :placeholder="(editingReward ? editingReward.requiresApproval : rewardRequiresApproval) ? 'نامحدود' : 'الزامی'"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">تصویر جایزه (اختیاری):</label>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <input
              ref="rewardImageInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="onRewardImageChange"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              @click="rewardImageInputRef?.click()"
            >
              <UploadCloud class="w-4 h-4" />
              بارگذاری تصویر
            </button>
            <span class="text-[10px] text-slate-500">JPEG، PNG یا WebP؛ حداکثر ۵ مگابایت</span>
          </div>
          <input
            v-model="rewardImageUrl"
            type="url"
            placeholder="یا آدرس تصویر را وارد کنید: https://..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
            @input="onRewardImageUrlInput"
          />
          <div v-if="rewardImagePreview || rewardImageUrl" class="mt-2 flex items-center gap-3">
            <img
              :src="rewardImagePreview || resolveFileUrl(rewardImageUrl)"
              alt="پیش‌نمایش تصویر جایزه"
              class="w-16 h-16 rounded-xl object-cover border border-slate-200"
            />
            <button
              type="button"
              class="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              @click="clearRewardImage"
            >
              <X class="w-3.5 h-3.5" />
              حذف تصویر
            </button>
          </div>
        </div>

        <div v-if="!editingReward" class="flex items-center gap-2 pt-1">
          <input
            id="requiresApproval"
            v-model="rewardRequiresApproval"
            type="checkbox"
            class="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="requiresApproval" class="text-xs font-bold text-slate-700">
            نیازمند تایید مدیر قبل از تحویل
          </label>
        </div>
      </div>

      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="closeRewardModal">
          انصراف
        </button>
        <button
          :disabled="creatingReward || !rewardName.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          @click="handleSaveReward"
        >
          {{ editingReward ? 'ذخیره تغییرات' : 'افزودن به کاتالوگ' }}
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
