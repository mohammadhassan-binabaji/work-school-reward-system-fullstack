<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shield,
  GraduationCap,
  Briefcase,
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileText,
  X,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import {
  api,
  toPersianDigits,
  type User,
  type Role,
  type AccountState,
  type Class,
  type BulkImportErrorItem,
  type BulkImportResult,
} from '@student-reward/shared';

const users = ref<User[]>([]);
const classes = ref<Class[]>([]);
const loading = ref(true);

// Filters
const filterRole = ref<Role | ''>('');
const filterState = ref<AccountState | ''>('');
const searchQuery = ref('');

// Create User Modal
const isCreateModalOpen = ref(false);
const newNationalId = ref('');
const newFirstName = ref('');
const newLastName = ref('');
const newUsername = ref('');
const newPassword = ref('');
const newRole = ref<Role>('STUDENT');
const newClassId = ref('');
const creatingUser = ref(false);

// Change State Modal
const isStateModalOpen = ref(false);
const selectedUser = ref<User | null>(null);
const updatedState = ref<AccountState>('ACTIVE');
const updatingState = ref(false);

// Messages
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (filterRole.value) params.role = filterRole.value;
    if (filterState.value) params.accountState = filterState.value;
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim();

    const [uList, cList] = await Promise.all([
      api.get<User[]>('/users', params),
      api.get<Class[]>('/classes'),
    ]);
    users.value = uList || [];
    classes.value = cList || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری کاربران';
  } finally {
    loading.value = false;
  }
}

async function handleCreateUser() {
  if (
    !newNationalId.value.trim() ||
    !newFirstName.value.trim() ||
    !newLastName.value.trim() ||
    !newUsername.value.trim() ||
    !newPassword.value
  ) {
    errorMessage.value = 'لطفاً تمامی فیلدهای الزامی را پر کنید.';
    return;
  }

  creatingUser.value = true;
  errorMessage.value = null;

  try {
    await api.post('/users', {
      nationalId: newNationalId.value.trim(),
      firstName: newFirstName.value.trim(),
      lastName: newLastName.value.trim(),
      username: newUsername.value.trim(),
      password: newPassword.value,
      role: newRole.value,
      classId: newRole.value === 'STUDENT' && newClassId.value ? newClassId.value : undefined,
    });

    successMessage.value = 'کاربر جدید با موفقیت ایجاد شد.';
    isCreateModalOpen.value = false;
    resetCreateForm();
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ساخت کاربر';
  } finally {
    creatingUser.value = false;
  }
}

function resetCreateForm() {
  newNationalId.value = '';
  newFirstName.value = '';
  newLastName.value = '';
  newUsername.value = '';
  newPassword.value = '';
  newRole.value = 'STUDENT';
  newClassId.value = '';
}

function openChangeState(u: User) {
  selectedUser.value = u;
  updatedState.value = u.accountState;
  isStateModalOpen.value = true;
}

async function handleUpdateState() {
  if (!selectedUser.value) return;

  updatingState.value = true;
  errorMessage.value = null;

  try {
    await api.patch(`/users/${selectedUser.value.id}/state`, {
      accountState: updatedState.value,
    });

    successMessage.value = `وضعیت حساب کاربر به ${updatedState.value} تغییر یافت.`;
    isStateModalOpen.value = false;
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در تغییر وضعیت حساب کاربر';
  } finally {
    updatingState.value = false;
  }
}

// Bulk Import Modal State
const isBulkImportModalOpen = ref(false);
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const downloadingTemplate = ref(false);
const bulkImportErrors = ref<BulkImportErrorItem[]>([]);
const bulkImportErrorMessage = ref<string | null>(null);
const isDragging = ref(false);

function openBulkImportModal() {
  selectedFile.value = null;
  bulkImportErrors.value = [];
  bulkImportErrorMessage.value = null;
  isBulkImportModalOpen.value = true;
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    setFile(target.files[0]);
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    setFile(e.dataTransfer.files[0]);
  }
}

function setFile(file: File) {
  if (!file.name.endsWith('.xlsx')) {
    bulkImportErrorMessage.value = 'فرمت فایل نامعتبر است. لطفاً فایل با پسوند xlsx. انتخاب نمایید.';
    selectedFile.value = null;
    return;
  }
  selectedFile.value = file;
  bulkImportErrors.value = [];
  bulkImportErrorMessage.value = null;
}

function removeSelectedFile() {
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

async function handleDownloadTemplate() {
  downloadingTemplate.value = true;
  try {
    const blob = await api.downloadFile('/users/import/template');
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'قالب-ثبت-گروهی-دانش‌آموزان.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در دریافت قالب اکسل';
  } finally {
    downloadingTemplate.value = false;
  }
}

function fieldToPersianLabel(field: string): string {
  const map: Record<string, string> = {
    nationalId: 'کد ملی',
    firstName: 'نام',
    lastName: 'نام خانوادگی',
    username: 'نام کاربری',
    password: 'رمز عبور',
    className: 'نام کلاس',
  };
  return map[field] || field;
}

async function handleBulkImport() {
  if (!selectedFile.value) {
    bulkImportErrorMessage.value = 'لطفاً فایل اکسل تکمیل‌شده را انتخاب کنید.';
    return;
  }

  importing.value = true;
  bulkImportErrors.value = [];
  bulkImportErrorMessage.value = null;

  try {
    const res = await api.upload<BulkImportResult>('/users/import/excel', selectedFile.value);
    successMessage.value = res.message || `${res.count} دانش‌آموز با موفقیت ایجاد شدند.`;
    isBulkImportModalOpen.value = false;
    selectedFile.value = null;
    await loadData();
    setTimeout(() => (successMessage.value = null), 4000);
  } catch (err: any) {
    if (err.errors && Array.isArray(err.errors)) {
      bulkImportErrors.value = err.errors;
    }
    bulkImportErrorMessage.value = err.message || 'خطا در بارگذاری و اعتبارسنجی فایل اکسل';
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">مدیریت کاربران</h1>
        <p class="text-xs text-slate-500 mt-0.5">مشاهده، ایجاد و مدیریت وضعیت حساب‌های دانش‌آموزان، معلمان و مدیران</p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="openBulkImportModal"
        >
          <FileSpreadsheet class="w-4 h-4" />
          <span>افزودن دسته‌ای (اکسل)</span>
        </button>

        <button
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isCreateModalOpen = true"
        >
          <UserPlus class="w-4 h-4" />
          <span>ایجاد کاربر جدید</span>
        </button>
      </div>
    </div>

    <!-- Alert notifications -->
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

    <!-- Filter Bar -->
    <div class="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
      <div class="relative w-full md:w-80">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="جستجوی نام، نام کاربری یا کد ملی..."
          class="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
          @keyup.enter="loadData"
        />
        <Search class="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto">
        <select
          v-model="filterRole"
          class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium"
          @change="loadData"
        >
          <option value="">تمام نقش‌ها</option>
          <option value="STUDENT">دانش‌آموز</option>
          <option value="TEACHER">معلم</option>
          <option value="ADMIN">مدیر سیستم</option>
        </select>

        <select
          v-model="filterState"
          class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium"
          @change="loadData"
        >
          <option value="">تمام وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="INACTIVE">غیرفعال</option>
          <option value="DEACTIVATED">مسدود شده</option>
          <option value="DEPARTED">ترک مدرسه</option>
        </select>

        <button
          class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          title="تازه‌سازی"
          @click="loadData"
        >
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">نام و نام خانوادگی</th>
              <th class="p-3.5">کد ملی</th>
              <th class="p-3.5">نام کاربری</th>
              <th class="p-3.5">نقش</th>
              <th class="p-3.5">وضعیت حساب</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                  در حال بارگذاری کاربران...
                </td>
              </tr>
            </template>
            <template v-else-if="users.length > 0">
              <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ u.firstName }} {{ u.lastName }}
                </td>
                <td class="p-3.5 text-slate-600">
                  {{ toPersianDigits(u.nationalId) }}
                </td>
                <td class="p-3.5 text-slate-600 font-mono">
                  {{ u.username }}
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      u.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : u.role === 'TEACHER'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    ]"
                  >
                    {{ u.role === 'ADMIN' ? 'مدیر' : u.role === 'TEACHER' ? 'معلم' : 'دانش‌آموز' }}
                  </span>
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      u.accountState === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{ u.accountState === 'ACTIVE' ? 'فعال' : u.accountState }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left">
                  <button
                    class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    @click="openChangeState(u)"
                  >
                    تغییر وضعیت
                  </button>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-12 text-center text-slate-400">
                کاربری یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Create User -->
    <AdminModal
      :is-open="isCreateModalOpen"
      title="ایجاد کاربر جدید"
      max-width="max-w-md"
      @close="isCreateModalOpen = false"
    >
      <div class="space-y-3.5">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">نام:</label>
            <input
              v-model="newFirstName"
              type="text"
              placeholder="مثال: علی"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">نام خانوادگی:</label>
            <input
              v-model="newLastName"
              type="text"
              placeholder="مثال: رضایی"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">کد ملی (۱۰ رقم):</label>
            <input
              v-model="newNationalId"
              type="text"
              maxlength="10"
              placeholder="۱۲۳۴۵۶۷۸۹۰"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">نام کاربری:</label>
            <input
              v-model="newUsername"
              type="text"
              placeholder="ali.rezaei"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">رمز عبور (حداقل ۸ کاراکتر):</label>
          <input
            v-model="newPassword"
            type="password"
            placeholder="رمز عبور اولیه"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نقش سازمانی:</label>
          <select
            v-model="newRole"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
          >
            <option value="STUDENT">دانش‌آموز</option>
            <option value="TEACHER">معلم</option>
            <option value="ADMIN">مدیر سیستم</option>
          </select>
        </div>

        <!-- Class selection if student -->
        <div v-if="newRole === 'STUDENT'">
          <label class="block text-xs font-bold text-slate-700 mb-1">کلاس تحصیلی (اختیاری):</label>
          <select
            v-model="newClassId"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          >
            <option value="">بدون انتساب اولیه</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">
              {{ c.name }} ({{ c.gradeLevel || 'پایه نامشخص' }})
            </option>
          </select>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
          @click="isCreateModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="creatingUser"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleCreateUser"
        >
          <RefreshCw v-if="creatingUser" class="w-3.5 h-3.5 animate-spin" />
          <span>ایجاد حساب کاربری</span>
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Change Account State -->
    <AdminModal
      :is-open="isStateModalOpen"
      :title="`تغییر وضعیت حساب: ${selectedUser?.firstName} ${selectedUser?.lastName}`"
      @close="isStateModalOpen = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">وضعیت جدید حساب کاربری:</label>
          <select
            v-model="updatedState"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold"
          >
            <option value="ACTIVE">فعال (ACTIVE)</option>
            <option value="INACTIVE">غیرفعال (INACTIVE)</option>
            <option value="DEACTIVATED">مسدود شده (DEACTIVATED)</option>
            <option value="DEPARTED">ترک مدرسه / خدمت (DEPARTED)</option>
          </select>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
          @click="isStateModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="updatingState"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleUpdateState"
        >
          <RefreshCw v-if="updatingState" class="w-3.5 h-3.5 animate-spin" />
          <span>ثبت تغییر وضعیت</span>
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Bulk Import via Excel -->
    <AdminModal
      :is-open="isBulkImportModalOpen"
      title="افزودن دسته‌ای دانش‌آموزان از طریق اکسل"
      max-width="max-w-2xl"
      @close="isBulkImportModalOpen = false"
    >
      <div class="space-y-4">
        <!-- Download Template Banner -->
        <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-0.5">
            <h4 class="text-xs font-black text-blue-900 flex items-center gap-1.5">
              <Download class="w-4 h-4 text-blue-600 shrink-0" />
              <span>قالب استاندارد اکسل را دانلود کنید</span>
            </h4>
            <p class="text-[11px] text-blue-700 font-medium">
              فایل شامل ستون‌های کد ملی، نام، نام خانوادگی، نام کاربری، رمز عبور و نام کلاس است.
            </p>
          </div>
          <button
            :disabled="downloadingTemplate"
            class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
            @click="handleDownloadTemplate"
          >
            <RefreshCw v-if="downloadingTemplate" class="w-3.5 h-3.5 animate-spin" />
            <Download v-else class="w-3.5 h-3.5" />
            <span>دانلود قالب نمونه</span>
          </button>
        </div>

        <!-- File Upload Zone -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">فایل اکسل دانش‌آموزان (.xlsx):</label>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx"
            class="hidden"
            @change="onFileChange"
          />

          <div
            v-if="!selectedFile"
            :class="[
              'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors',
              isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            ]"
            @click="triggerFileInput"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <UploadCloud class="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p class="text-xs font-bold text-slate-700">
              فایل اکسل را اینجا بکشید یا برای انتخاب <span class="text-blue-600 underline">کلیک کنید</span>
            </p>
            <p class="text-[10px] text-slate-400 mt-1">حداکثر حجم مجاز: ۵ مگابایت (تنها فرمت .xlsx)</p>
          </div>

          <!-- Selected File Card -->
          <div
            v-else
            class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet class="w-4 h-4" />
              </div>
              <div class="overflow-hidden">
                <p class="text-xs font-bold text-slate-800 truncate" :title="selectedFile.name">
                  {{ selectedFile.name }}
                </p>
                <p class="text-[10px] text-slate-400 font-medium">
                  {{ toPersianDigits((selectedFile.size / 1024).toFixed(1)) }} کیلوبایت
                </p>
              </div>
            </div>
            <button
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="حذف فایل"
              @click="removeSelectedFile"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Bulk Error Alert Message -->
        <div
          v-if="bulkImportErrorMessage"
          class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{{ bulkImportErrorMessage }}</span>
        </div>

        <!-- Row-by-Row Errors Table -->
        <div v-if="bulkImportErrors.length > 0" class="space-y-1.5">
          <p class="text-[11px] font-bold text-rose-700 flex items-center justify-between">
            <span>جزئیات خطاهای فایل اکسل (هیچ کاربری ثبت نشد):</span>
            <span class="text-[10px] bg-rose-100 px-2 py-0.5 rounded-full font-mono">
              {{ toPersianDigits(bulkImportErrors.length) }} خطا
            </span>
          </p>
          <div class="max-h-48 overflow-y-auto rounded-xl border border-rose-200 bg-white">
            <table class="w-full text-right text-xs">
              <thead class="bg-rose-50 text-rose-800 font-bold sticky top-0 border-b border-rose-100 text-[10px]">
                <tr>
                  <th class="p-2 pr-3">سطر</th>
                  <th class="p-2">فیلد</th>
                  <th class="p-2">مقدار ارسالی</th>
                  <th class="p-2 pl-3">علت خطا</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-rose-50 text-[11px]">
                <tr v-for="(err, idx) in bulkImportErrors" :key="idx" class="hover:bg-rose-50/40">
                  <td class="p-2 pr-3 font-mono font-bold text-slate-700">
                    سطر {{ toPersianDigits(err.row) }}
                  </td>
                  <td class="p-2 text-slate-800 font-medium">
                    {{ fieldToPersianLabel(err.field) }}
                  </td>
                  <td class="p-2 text-slate-500 font-mono text-[10px] truncate max-w-[120px]" :title="err.value">
                    {{ err.value || '—' }}
                  </td>
                  <td class="p-2 pl-3 text-rose-700 font-medium">
                    {{ err.message }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
          @click="isBulkImportModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="importing || !selectedFile"
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleBulkImport"
        >
          <RefreshCw v-if="importing" class="w-3.5 h-3.5 animate-spin" />
          <UploadCloud v-else class="w-3.5 h-3.5" />
          <span>شروع ثبت دسته‌ای</span>
        </button>
      </template>
    </AdminModal>
  </div>
</template>
