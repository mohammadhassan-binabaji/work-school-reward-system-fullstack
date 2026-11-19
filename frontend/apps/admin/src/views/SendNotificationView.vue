<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  GraduationCap,
  Search,
  Send,
  Users,
} from "lucide-vue-next";
import { api, toPersianDigits, type Class } from "@student-reward/shared";
import { useAuthStore } from "../stores/auth";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import {
  getClassOptionsForGrade,
  NO_CLASS_FILTER,
  NO_GRADE_FILTER,
  reconcileClassFilter,
} from "../utils/classGradeFilters";
import {
  filterNotificationRecipients,
  type NotificationRecipient,
  type NotificationRecipientRole,
} from "../utils/notificationRecipientFilters";

interface StudentRecipient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  gradeLevel: string | null;
}

interface TeacherRecipient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
}

const authStore = useAuthStore();
const students = ref<NotificationRecipient[]>([]);
const teachers = ref<NotificationRecipient[]>([]);
const classes = ref<Class[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);

const recipientRole = ref<NotificationRecipientRole>("STUDENT");
const selectedRecipientIds = ref<string[]>([]);
const searchQuery = ref("");
const filterClassName = ref("");
const filterGradeLevel = ref("");
const subject = ref("");
const body = ref("");
const submitting = ref(false);
const isConfirmationOpen = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const isAdmin = computed(() => authStore.isAdmin);
const currentRecipients = computed(() =>
  recipientRole.value === "STUDENT" ? students.value : teachers.value,
);
const classFilterOptions = computed(() =>
  getClassOptionsForGrade(classes.value, filterGradeLevel.value),
);
const gradeLevelOptions = computed(() =>
  [
    ...new Set(
      classes.value
        .map((classItem) => classItem.gradeLevel?.trim())
        .filter((grade): grade is string => Boolean(grade)),
    ),
  ].sort((a, b) => a.localeCompare(b)),
);
const filteredRecipients = computed(() =>
  filterNotificationRecipients(
    currentRecipients.value,
    recipientRole.value,
    searchQuery.value,
    recipientRole.value === "STUDENT" ? filterClassName.value : "",
    recipientRole.value === "STUDENT" ? filterGradeLevel.value : "",
  ),
);
const selectedStudentCount = computed(
  () =>
    students.value.filter((student) =>
      selectedRecipientIds.value.includes(student.id),
    ).length,
);
const selectedTeacherCount = computed(
  () =>
    teachers.value.filter((teacher) =>
      selectedRecipientIds.value.includes(teacher.id),
    ).length,
);

watch(filterGradeLevel, (gradeFilter) => {
  filterClassName.value = reconcileClassFilter(
    classes.value,
    filterClassName.value,
    gradeFilter,
  );
});

onMounted(loadRecipients);

async function loadRecipients() {
  loading.value = true;
  loadError.value = null;
  try {
    const [studentList, classList, teacherList] = await Promise.all([
      api.get<StudentRecipient[]>("/users/students"),
      api.get<Class[]>("/classes"),
      isAdmin.value
        ? api.get<TeacherRecipient[]>("/users/teachers")
        : Promise.resolve([] as TeacherRecipient[]),
    ]);

    students.value = studentList.map((student) => ({
      ...student,
      role: "STUDENT",
    }));
    teachers.value = teacherList.map((teacher) => ({
      ...teacher,
      role: "TEACHER",
    }));
    classes.value = classList;
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "خطا در بارگذاری فهرست گیرندگان";
  } finally {
    loading.value = false;
  }
}

function setRecipientRole(role: NotificationRecipientRole) {
  recipientRole.value = role;
  searchQuery.value = "";
  filterClassName.value = "";
  filterGradeLevel.value = "";
}

function toggleRecipient(recipientId: string) {
  selectedRecipientIds.value = selectedRecipientIds.value.includes(recipientId)
    ? selectedRecipientIds.value.filter((id) => id !== recipientId)
    : [...selectedRecipientIds.value, recipientId];
}

function toggleFilteredRecipients() {
  const visibleIds = filteredRecipients.value.map((recipient) => recipient.id);
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedRecipientIds.value.includes(id));

  selectedRecipientIds.value = allVisibleSelected
    ? selectedRecipientIds.value.filter((id) => !visibleIds.includes(id))
    : Array.from(new Set([...selectedRecipientIds.value, ...visibleIds]));
}

function openConfirmation() {
  errorMessage.value = null;
  successMessage.value = null;

  if (selectedRecipientIds.value.length === 0) {
    errorMessage.value = "لطفاً حداقل یک گیرنده را انتخاب کنید.";
    return;
  }
  if (!subject.value.trim() || !body.value.trim()) {
    errorMessage.value = "وارد کردن عنوان و متن اعلان الزامی است.";
    return;
  }

  isConfirmationOpen.value = true;
}

async function sendNotification() {
  submitting.value = true;
  errorMessage.value = null;

  try {
    const result = await api.post<{ sentCount: number }>(
      "/notifications/custom",
      {
        recipientIds: [...selectedRecipientIds.value],
        subject: subject.value.trim(),
        body: body.value.trim(),
      },
    );

    successMessage.value = `اعلان با موفقیت برای ${toPersianDigits(result.sentCount)} گیرنده ارسال شد.`;
    selectedRecipientIds.value = [];
    subject.value = "";
    body.value = "";
    isConfirmationOpen.value = false;
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : "خطا در ارسال اعلان";
    isConfirmationOpen.value = false;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <div class="flex items-start gap-3">
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
      >
        <Bell class="h-5 w-5" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">
          ارسال اعلان اختصاصی
        </h1>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          برای دانش‌آموزان{{ isAdmin ? " و معلمان" : "" }} اعلان شخصی‌سازی‌شده
          ارسال کنید.
        </p>
      </div>
    </div>

    <div
      v-if="successMessage"
      class="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800"
      role="status"
    >
      <CheckCircle2 class="h-5 w-5 shrink-0 text-emerald-600" />
      <span>{{ successMessage }}</span>
    </div>
    <div
      v-if="errorMessage || loadError"
      class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
      role="alert"
    >
      <AlertCircle class="h-5 w-5 shrink-0 text-rose-600" />
      <span>{{ errorMessage || loadError }}</span>
    </div>

    <div class="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section
        class="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-extrabold text-slate-800">
              انتخاب گیرندگان
            </h2>
            <p class="mt-1 text-[11px] text-slate-400">
              {{ toPersianDigits(selectedRecipientIds.length) }} گیرنده
              انتخاب‌شده
              <span v-if="selectedStudentCount">
                · {{ toPersianDigits(selectedStudentCount) }} دانش‌آموز</span
              >
              <span v-if="selectedTeacherCount">
                · {{ toPersianDigits(selectedTeacherCount) }} معلم</span
              >
            </p>
          </div>
          <div
            v-if="isAdmin"
            class="flex rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="نوع گیرنده"
          >
            <button
              type="button"
              :aria-pressed="recipientRole === 'STUDENT'"
              :class="[
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                recipientRole === 'STUDENT'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500',
              ]"
              @click="setRecipientRole('STUDENT')"
            >
              <GraduationCap class="h-4 w-4" />
              دانش‌آموزان
            </button>
            <button
              type="button"
              :aria-pressed="recipientRole === 'TEACHER'"
              :class="[
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                recipientRole === 'TEACHER'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500',
              ]"
              @click="setRecipientRole('TEACHER')"
            >
              <Users class="h-4 w-4" />
              معلمان
            </button>
          </div>
        </div>

        <div
          class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
          <div class="relative w-full md:max-w-xs">
            <input
              v-model="searchQuery"
              type="search"
              dir="rtl"
              aria-label="جستجو بر اساس نام یا کد ملی"
              placeholder="جستجوی نام یا کد ملی..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <Search class="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <div
            v-if="recipientRole === 'STUDENT'"
            dir="ltr"
            class="grid grid-cols-2 gap-2"
          >
            <select
              v-model="filterClassName"
              dir="rtl"
              aria-label="فیلتر بر اساس کلاس"
              class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700"
            >
              <option value="">تمام کلاس‌ها</option>
              <option
                v-if="classFilterOptions.includeNoClass"
                :value="NO_CLASS_FILTER"
              >
                بدون کلاس
              </option>
              <option
                v-for="className in classFilterOptions.classNames"
                :key="className"
                :value="className"
              >
                {{ className }}
              </option>
            </select>
            <select
              v-model="filterGradeLevel"
              dir="rtl"
              aria-label="فیلتر بر اساس پایه تحصیلی"
              class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700"
            >
              <option value="">تمام پایه‌ها</option>
              <option :value="NO_GRADE_FILTER">بدون پایه</option>
              <option
                v-for="gradeLevel in gradeLevelOptions"
                :key="gradeLevel"
                :value="gradeLevel"
              >
                {{ gradeLevel }}
              </option>
            </select>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-slate-100 pt-3"
        >
          <span class="text-[11px] text-slate-400">
            {{ toPersianDigits(filteredRecipients.length) }}
            {{ recipientRole === "STUDENT" ? "دانش‌آموز" : "معلم" }}
          </span>
          <button
            type="button"
            class="text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="filteredRecipients.length === 0 || loading"
            @click="toggleFilteredRecipients"
          >
            {{
              filteredRecipients.length > 0 &&
              filteredRecipients.every((recipient) =>
                selectedRecipientIds.includes(recipient.id),
              )
                ? "لغو انتخاب نتایج"
                : "انتخاب همه نتایج"
            }}
          </button>
        </div>

        <div class="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          <button
            v-for="recipient in filteredRecipients"
            :key="recipient.id"
            type="button"
            :aria-pressed="selectedRecipientIds.includes(recipient.id)"
            :class="[
              'flex w-full items-center justify-between rounded-xl border p-3 text-right transition-colors',
              selectedRecipientIds.includes(recipient.id)
                ? 'border-blue-500 bg-blue-50 text-blue-950'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
            ]"
            @click="toggleRecipient(recipient.id)"
          >
            <span class="min-w-0 text-xs font-bold">
              <span class="block truncate"
                >{{ recipient.firstName }} {{ recipient.lastName }}</span
              >
              <span class="mt-1 block text-[10px] font-normal text-slate-400">
                کد ملی: {{ toPersianDigits(recipient.nationalId) }}
                <template
                  v-if="recipientRole === 'STUDENT' && recipient.className"
                >
                  · {{ recipient.className }}
                </template>
              </span>
            </span>
            <CheckCircle2
              :class="[
                'mr-3 h-4 w-4 shrink-0',
                selectedRecipientIds.includes(recipient.id)
                  ? 'text-blue-600'
                  : 'text-slate-300',
              ]"
            />
          </button>

          <div v-if="loading" class="py-8 text-center text-xs text-slate-400">
            در حال دریافت فهرست گیرندگان...
          </div>
          <div
            v-else-if="!loadError && filteredRecipients.length === 0"
            class="py-8 text-center text-xs text-slate-400"
          >
            گیرنده‌ای با این مشخصات یافت نشد.
          </div>
        </div>
      </section>

      <section
        class="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div>
          <h2 class="text-sm font-extrabold text-slate-800">متن اعلان</h2>
          <p class="mt-1 text-[11px] text-slate-400">
            عنوان و متن اعلان در صندوق پیام و اعلان گوشی نمایش داده می‌شود.
          </p>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label
              for="notification-subject"
              class="text-xs font-bold text-slate-700"
              >عنوان اعلان:</label
            >
            <span class="text-[10px] text-slate-400"
              >{{ toPersianDigits(subject.length) }} / ۲۰۰</span
            >
          </div>
          <input
            id="notification-subject"
            v-model="subject"
            type="text"
            maxlength="200"
            dir="rtl"
            placeholder="عنوان کوتاه اعلان را وارد کنید"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            for="notification-body"
            class="mb-1.5 block text-xs font-bold text-slate-700"
            >متن پیام:</label
          >
          <textarea
            id="notification-body"
            v-model="body"
            rows="8"
            dir="rtl"
            placeholder="متن اعلان را بنویسید..."
            class="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
          ></textarea>
        </div>

        <button
          type="button"
          :disabled="loading || submitting"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="openConfirmation"
        >
          <Send class="h-4 w-4" />
          <span>بررسی و ارسال اعلان</span>
        </button>
      </section>
    </div>

    <ConfirmDialog
      :is-open="isConfirmationOpen"
      title="تأیید ارسال اعلان"
      :message="`این اعلان برای ${toPersianDigits(selectedRecipientIds.length)} گیرنده ارسال شود؟`"
      confirm-label="ارسال اعلان"
      :loading="submitting"
      @confirm="sendNotification"
      @cancel="isConfirmationOpen = false"
    />
  </div>
</template>
