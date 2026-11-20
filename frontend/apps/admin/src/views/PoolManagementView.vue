<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Landmark,
  Coins,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-vue-next";
import AdminModal from "../components/AdminModal.vue";
import {
  api,
  toPersianDigits,
  formatNovin,
  type SystemPointPool,
  type User,
} from "@student-reward/shared";

const pool = ref<SystemPointPool | null>(null);
const teachers = ref<User[]>([]);
const vicePrincipals = ref<User[]>([]);
const activeTab = ref<"teachers" | "vicePrincipals">("teachers");
const loading = ref(true);

type BudgetDirection = "FUND" | "RETURN";

// Set Pool Balance Form
const isSetPoolModalOpen = ref(false);
const newPoolBalance = ref<number | "">("");
const settingPool = ref(false);

// Fund Teacher Form
const isFundTeacherModalOpen = ref(false);
const selectedTeacherId = ref("");
const fundAmount = ref<number | "">("");
const fundingTeacher = ref(false);
const teacherDirection = ref<BudgetDirection>("FUND");
const teacherReturnReason = ref("");

// Fund Vice Principal Form
const isFundVpModalOpen = ref(false);
const selectedVpId = ref("");
const fundVpAmount = ref<number | "">("");
const fundingVp = ref(false);
const vicePrincipalDirection = ref<BudgetDirection>("FUND");
const vicePrincipalReturnReason = ref("");

// Alerts
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [p, uList, vpList] = await Promise.all([
      api.get<SystemPointPool>("/points/pool"),
      api.get<User[]>("/users", { role: "TEACHER" }),
      api.get<User[]>("/users", { role: "VICE_PRINCIPAL" }),
    ]);
    pool.value = p;
    teachers.value = (uList || []).filter((u: User) => u.role === "TEACHER");
    vicePrincipals.value = (vpList || []).filter(
      (u: User) => u.role === "VICE_PRINCIPAL",
    );
  } catch (e: any) {
    errorMessage.value = e.message || "خطا در بارگذاری اطلاعات استخر نوین";
  } finally {
    loading.value = false;
  }
}

function openTeacherBudgetModal(teacherId = "") {
  selectedTeacherId.value = teacherId;
  fundAmount.value = "";
  teacherReturnReason.value = "";
  teacherDirection.value = "FUND";
  isFundTeacherModalOpen.value = true;
}

function openVicePrincipalBudgetModal(vicePrincipalId = "") {
  selectedVpId.value = vicePrincipalId;
  fundVpAmount.value = "";
  vicePrincipalReturnReason.value = "";
  vicePrincipalDirection.value = "FUND";
  isFundVpModalOpen.value = true;
}

function getTeacherBalance(teacherId: string) {
  return (
    teachers.value.find((teacher) => teacher.id === teacherId)?.teacherProfile
      ?.pointBalance ?? 0
  );
}

function getVicePrincipalBalance(vicePrincipalId: string) {
  return (
    vicePrincipals.value.find(
      (vicePrincipal) => vicePrincipal.id === vicePrincipalId,
    )?.teacherProfile?.pointBalance ?? 0
  );
}

async function handleSetPoolBalance() {
  if (newPoolBalance.value === "" || newPoolBalance.value < 0) return;

  settingPool.value = true;
  errorMessage.value = null;
  try {
    await api.post("/points/pool/balance", {
      balance: Number(newPoolBalance.value),
    });
    successMessage.value = "موجودی استخر نوین با موفقیت به‌روزرسانی شد.";
    isSetPoolModalOpen.value = false;
    newPoolBalance.value = "";
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || "خطا در تنظیم موجودی استخر";
  } finally {
    settingPool.value = false;
  }
}

async function handleFundTeacher() {
  const amount = Number(fundAmount.value);
  if (
    !selectedTeacherId.value ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    (teacherDirection.value === "RETURN" &&
      amount > getTeacherBalance(selectedTeacherId.value)) ||
    (teacherDirection.value === "RETURN" && !teacherReturnReason.value.trim())
  ) {
    return;
  }

  fundingTeacher.value = true;
  errorMessage.value = null;
  try {
    if (teacherDirection.value === "RETURN") {
      await api.post("/points/pool/return-teacher", {
        teacherId: selectedTeacherId.value,
        amount,
        reason: teacherReturnReason.value.trim(),
      });
      successMessage.value =
        "نوین با موفقیت از بودجه معلم به استخر بازگردانده شد.";
    } else {
      await api.post("/points/pool/fund-teacher", {
        teacherId: selectedTeacherId.value,
        amount,
      });
      successMessage.value = "بودجه نوین با موفقیت به معلم تخصیص یافت.";
    }
    isFundTeacherModalOpen.value = false;
    fundAmount.value = "";
    teacherReturnReason.value = "";
    selectedTeacherId.value = "";
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value =
      err.message ||
      (teacherDirection.value === "RETURN"
        ? "خطا در بازگرداندن نوین به استخر"
        : "خطا در تخصیص بودجه به معلم");
  } finally {
    fundingTeacher.value = false;
  }
}

async function handleFundVicePrincipal() {
  const amount = Number(fundVpAmount.value);
  if (
    !selectedVpId.value ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    (vicePrincipalDirection.value === "RETURN" &&
      amount > getVicePrincipalBalance(selectedVpId.value)) ||
    (vicePrincipalDirection.value === "RETURN" &&
      !vicePrincipalReturnReason.value.trim())
  ) {
    return;
  }

  fundingVp.value = true;
  errorMessage.value = null;
  try {
    if (vicePrincipalDirection.value === "RETURN") {
      await api.post("/points/pool/return-vice-principal", {
        vicePrincipalId: selectedVpId.value,
        amount,
        reason: vicePrincipalReturnReason.value.trim(),
      });
      successMessage.value =
        "نوین با موفقیت از موجودی معاون به استخر بازگردانده شد.";
    } else {
      await api.post("/points/pool/fund-vice-principal", {
        vicePrincipalId: selectedVpId.value,
        amount,
      });
      successMessage.value = "بودجه نوین با موفقیت به معاون تخصیص یافت.";
    }
    isFundVpModalOpen.value = false;
    fundVpAmount.value = "";
    vicePrincipalReturnReason.value = "";
    selectedVpId.value = "";
    await loadData();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value =
      err.message ||
      (vicePrincipalDirection.value === "RETURN"
        ? "خطا در بازگرداندن نوین به استخر"
        : "خطا در تخصیص بودجه به معاون");
  } finally {
    fundingVp.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">
          استخر نوین و تخصیص بودجه
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          مدیریت موجودی مرکزی مدرسه و تخصیص اعتبار پاداش به معلمان و معاونان
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="openTeacherBudgetModal()"
        >
          <Send class="w-4 h-4" />
          <span>مدیریت بودجه معلمان</span>
        </button>

        <button
          class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          @click="
            newPoolBalance = pool?.balance ?? 0;
            isSetPoolModalOpen = true;
          "
        >
          <Sliders class="w-4 h-4 text-slate-600" />
          <span>تنظیم موجودی استخر</span>
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

    <div
      v-if="errorMessage"
      class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-rose-600" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Central Pool Card -->
    <div
      class="bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
    >
      <div
        class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10"
      >
        <div class="space-y-2">
          <span class="text-xs font-semibold text-indigo-300"
            >موجودی استخر نوین مرکزی مدرسه:</span
          >
          <div class="flex items-baseline gap-3">
            <span
              class="text-4xl lg:text-5xl font-black tracking-tight text-white"
            >
              {{ formatNovin(pool?.balance ?? 0) }}
            </span>
          </div>
          <p class="text-xs text-indigo-200/80 max-w-md leading-relaxed mt-2">
            تمامی پاداش‌های معلمان از این استخر تامین می‌شود. بازگشت نوین معلمان
            پس از خروج نیز مستقیماً به این استخر اضافه می‌گردد.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            class="px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            @click="openTeacherBudgetModal()"
          >
            <Coins class="w-4 h-4" />
            <span>مدیریت بودجه معلمان</span>
          </button>

          <button
            class="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            @click="openVicePrincipalBudgetModal()"
          >
            <Coins class="w-4 h-4" />
            <span>مدیریت بودجه معاونان</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
      <button
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all',
          activeTab === 'teachers'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100',
        ]"
        @click="activeTab = 'teachers'"
      >
        <span>فهرست معلمان ({{ toPersianDigits(teachers.length) }})</span>
      </button>

      <button
        :class="[
          'px-4 py-2 rounded-xl text-xs font-bold transition-all',
          activeTab === 'vicePrincipals'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'text-slate-600 hover:bg-slate-100',
        ]"
        @click="activeTab = 'vicePrincipals'"
      >
        <span
          >فهرست معاونان سامانه ({{
            toPersianDigits(vicePrincipals.length)
          }})</span
        >
      </button>
    </div>

    <!-- Teachers Budget List -->
    <div
      v-if="activeTab === 'teachers'"
      class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
    >
      <div
        class="p-5 border-b border-slate-100 flex items-center justify-between"
      >
        <h2 class="text-sm font-extrabold text-slate-800">
          فهرست معلمان و تخصیص بودجه
        </h2>
        <span class="text-xs text-slate-400"
          >{{ toPersianDigits(teachers.length) }} معلم فعال</span
        >
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead
            class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100"
          >
            <tr>
              <th class="p-3.5 pr-5">نام و نام خانوادگی</th>
              <th class="p-3.5">کد ملی</th>
              <th class="p-3.5">نام کاربری</th>
              <th class="p-3.5">موجودی اعتبار</th>
              <th class="p-3.5">وضعیت حساب</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                  در حال بارگذاری معلمان...
                </td>
              </tr>
            </template>
            <template v-else-if="teachers.length > 0">
              <tr
                v-for="t in teachers"
                :key="t.id"
                class="hover:bg-slate-50/80 transition-colors"
              >
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ t.firstName }} {{ t.lastName }}
                </td>
                <td class="p-3.5 text-slate-600">
                  {{ toPersianDigits(t.nationalId) }}
                </td>
                <td class="p-3.5 text-slate-600 font-mono">
                  {{ t.username }}
                </td>
                <td class="p-3.5 font-bold text-slate-900">
                  {{ formatNovin(t.teacherProfile?.pointBalance || 0) }}
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      t.accountState === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{ t.accountState === "ACTIVE" ? "فعال" : t.accountState }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left">
                  <button
                    :disabled="t.accountState !== 'ACTIVE'"
                    class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    @click="openTeacherBudgetModal(t.id)"
                  >
                    مدیریت اعتبار
                  </button>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-12 text-center text-slate-400">
                معلمی در سیستم یافت نشد.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Vice Principals Budget List -->
    <div
      v-else
      class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden"
    >
      <div
        class="p-5 border-b border-slate-100 flex items-center justify-between"
      >
        <h2 class="text-sm font-extrabold text-slate-800">
          فهرست معاونان سامانه و تخصیص بودجه
        </h2>
        <span class="text-xs text-slate-400"
          >{{ toPersianDigits(vicePrincipals.length) }} معاون فعال</span
        >
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead
            class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100"
          >
            <tr>
              <th class="p-3.5 pr-5">نام و نام خانوادگی</th>
              <th class="p-3.5">کد ملی</th>
              <th class="p-3.5">نام کاربری</th>
              <th class="p-3.5">موجودی اعتبار</th>
              <th class="p-3.5">وضعیت حساب</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                  در حال بارگذاری معاونان...
                </td>
              </tr>
            </template>
            <template v-else-if="vicePrincipals.length > 0">
              <tr
                v-for="vp in vicePrincipals"
                :key="vp.id"
                class="hover:bg-slate-50/80 transition-colors"
              >
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ vp.firstName }} {{ vp.lastName }}
                </td>
                <td class="p-3.5 text-slate-600">
                  {{ toPersianDigits(vp.nationalId) }}
                </td>
                <td class="p-3.5 text-slate-600 font-mono">
                  {{ vp.username }}
                </td>
                <td class="p-3.5 font-bold text-slate-900">
                  {{ formatNovin(vp.teacherProfile?.pointBalance || 0) }}
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      vp.accountState === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{
                      vp.accountState === "ACTIVE" ? "فعال" : vp.accountState
                    }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left">
                  <button
                    :disabled="vp.accountState !== 'ACTIVE'"
                    class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    @click="openVicePrincipalBudgetModal(vp.id)"
                  >
                    مدیریت اعتبار
                  </button>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-12 text-center text-slate-400">
                معاونی در سیستم ثبت نشده است.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Set Pool Balance -->
    <AdminModal
      :is-open="isSetPoolModalOpen"
      title="تنظیم موجودی استخر نوین"
      @close="isSetPoolModalOpen = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5"
            >موجودی جدید استخر (نوین):</label
          >
          <input
            v-model="newPoolBalance"
            type="number"
            min="0"
            placeholder="مثال: ۱۰۰۰۰"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          @click="isSetPoolModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="settingPool || newPoolBalance === ''"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleSetPoolBalance"
        >
          <RefreshCw v-if="settingPool" class="w-3.5 h-3.5 animate-spin" />
          <span>ثبت موجودی</span>
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Fund Teacher Budget -->
    <AdminModal
      :is-open="isFundTeacherModalOpen"
      title="مدیریت بودجه نوین معلم"
      @close="isFundTeacherModalOpen = false"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            :aria-pressed="teacherDirection === 'FUND'"
            :class="[
              'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
              teacherDirection === 'FUND'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600',
            ]"
            @click="teacherDirection = 'FUND'"
          >
            تخصیص از استخر
          </button>
          <button
            type="button"
            :aria-pressed="teacherDirection === 'RETURN'"
            :class="[
              'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
              teacherDirection === 'RETURN'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600',
            ]"
            @click="teacherDirection = 'RETURN'"
          >
            بازگشت به استخر
          </button>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">{{
            teacherDirection === "FUND"
              ? "معلم دریافت‌کننده:"
              : "معلم صاحب بودجه:"
          }}</label>
          <select
            v-model="selectedTeacherId"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
          >
            <option value="" disabled>معلم را انتخاب کنید...</option>
            <option
              v-for="t in teachers"
              :key="t.id"
              :value="t.id"
              :disabled="t.accountState !== 'ACTIVE'"
            >
              {{ t.firstName }} {{ t.lastName }} (کد ملی:
              {{ toPersianDigits(t.nationalId) }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            {{
              teacherDirection === "FUND"
                ? "مقدار نوین جهت تخصیص از استخر:"
                : "مقدار نوین جهت بازگشت به استخر:"
            }}
          </label>
          <input
            v-model="fundAmount"
            type="number"
            min="1"
            step="1"
            :max="
              teacherDirection === 'RETURN'
                ? getTeacherBalance(selectedTeacherId)
                : undefined
            "
            placeholder="مثال: ۵۰۰"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-sans"
          />
          <p
            v-if="teacherDirection === 'RETURN'"
            class="mt-1.5 text-[11px] text-slate-500"
          >
            حداکثر مبلغ قابل بازگشت:
            {{ formatNovin(getTeacherBalance(selectedTeacherId)) }}
          </p>
        </div>

        <div v-if="teacherDirection === 'RETURN'">
          <label class="block text-xs font-bold text-slate-700 mb-1.5"
            >دلیل بازگرداندن نوین:</label
          >
          <textarea
            v-model="teacherReturnReason"
            rows="3"
            required
            class="w-full resize-y bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-sans"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          @click="isFundTeacherModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="
            fundingTeacher ||
            !selectedTeacherId ||
            !fundAmount ||
            (teacherDirection === 'RETURN' &&
              Number(fundAmount) > getTeacherBalance(selectedTeacherId)) ||
            (teacherDirection === 'RETURN' && !teacherReturnReason.trim())
          "
          :class="
            teacherDirection === 'RETURN'
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          "
          class="px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleFundTeacher"
        >
          <RefreshCw v-if="fundingTeacher" class="w-3.5 h-3.5 animate-spin" />
          <span>{{
            teacherDirection === "FUND"
              ? "انتقال و شارژ اعتبار"
              : "بازگرداندن نوین به استخر"
          }}</span>
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Fund Vice Principal Budget -->
    <AdminModal
      :is-open="isFundVpModalOpen"
      title="مدیریت بودجه نوین معاون سامانه"
      @close="isFundVpModalOpen = false"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            :aria-pressed="vicePrincipalDirection === 'FUND'"
            :class="[
              'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
              vicePrincipalDirection === 'FUND'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600',
            ]"
            @click="vicePrincipalDirection = 'FUND'"
          >
            تخصیص از استخر
          </button>
          <button
            type="button"
            :aria-pressed="vicePrincipalDirection === 'RETURN'"
            :class="[
              'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
              vicePrincipalDirection === 'RETURN'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600',
            ]"
            @click="vicePrincipalDirection = 'RETURN'"
          >
            بازگشت به استخر
          </button>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">{{
            vicePrincipalDirection === "FUND"
              ? "معاون دریافت‌کننده:"
              : "معاون صاحب موجودی:"
          }}</label>
          <select
            v-model="selectedVpId"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
          >
            <option value="" disabled>معاون را انتخاب کنید...</option>
            <option
              v-for="vp in vicePrincipals"
              :key="vp.id"
              :value="vp.id"
              :disabled="vp.accountState !== 'ACTIVE'"
            >
              {{ vp.firstName }} {{ vp.lastName }} (کد ملی:
              {{ toPersianDigits(vp.nationalId) }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            {{
              vicePrincipalDirection === "FUND"
                ? "مقدار نوین جهت تخصیص از استخر:"
                : "مقدار نوین جهت بازگشت به استخر:"
            }}
          </label>
          <input
            v-model="fundVpAmount"
            type="number"
            min="1"
            step="1"
            :max="
              vicePrincipalDirection === 'RETURN'
                ? getVicePrincipalBalance(selectedVpId)
                : undefined
            "
            placeholder="مثال: ۵۰۰"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans"
          />
          <p
            v-if="vicePrincipalDirection === 'RETURN'"
            class="mt-1.5 text-[11px] text-slate-500"
          >
            حداکثر مبلغ قابل بازگشت:
            {{ formatNovin(getVicePrincipalBalance(selectedVpId)) }}
          </p>
        </div>

        <div v-if="vicePrincipalDirection === 'RETURN'">
          <label class="block text-xs font-bold text-slate-700 mb-1.5"
            >دلیل بازگرداندن نوین:</label
          >
          <textarea
            v-model="vicePrincipalReturnReason"
            rows="3"
            required
            class="w-full resize-y bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-sans"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          @click="isFundVpModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="
            fundingVp ||
            !selectedVpId ||
            !fundVpAmount ||
            (vicePrincipalDirection === 'RETURN' &&
              Number(fundVpAmount) > getVicePrincipalBalance(selectedVpId)) ||
            (vicePrincipalDirection === 'RETURN' &&
              !vicePrincipalReturnReason.trim())
          "
          :class="
            vicePrincipalDirection === 'RETURN'
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-blue-600 hover:bg-blue-700'
          "
          class="px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          @click="handleFundVicePrincipal"
        >
          <RefreshCw v-if="fundingVp" class="w-3.5 h-3.5 animate-spin" />
          <span>{{
            vicePrincipalDirection === "FUND"
              ? "انتقال و شارژ اعتبار"
              : "بازگرداندن نوین به استخر"
          }}</span>
        </button>
      </template>
    </AdminModal>
  </div>
</template>
