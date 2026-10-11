<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Gift,
  Star,
  CheckCircle2,
  Clock,
  Package,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import BottomSheet from '../components/BottomSheet.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  type Reward,
  type RewardRequest,
} from '@student-reward/shared';

const authStore = useAuthStore();

// State
const activeTab = ref<'active' | 'history'>('active');
const rewards = ref<Reward[]>([]);
const myRequests = ref<RewardRequest[]>([]);
const loading = ref(true);

// Detail / Redemption Modal State
const isDetailOpen = ref(false);
const selectedReward = ref<Reward | null>(null);
const isConfirming = ref(false);
const submitting = ref(false);
const redeemSuccess = ref(false);
const redeemError = ref<string | null>(null);

// History Detail Modal State (for declined reason & refund notice)
const isHistoryDetailOpen = ref(false);
const selectedRequest = ref<RewardRequest | null>(null);

const studentBalance = computed(() => authStore.currentBalance);

// Pending reward IDs to enforce duplicate pending request rule
const pendingRewardIds = computed(() => {
  const set = new Set<string>();
  myRequests.value.forEach((r) => {
    if (r.status === 'PENDING_TO_APPROVE' || r.status === 'PENDING_TO_RECEIVE') {
      set.add(r.rewardId);
    }
  });
  return set;
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [rewardsList, requestsList] = await Promise.all([
      api.get<Reward[]>('/rewards'),
      api.get<RewardRequest[]>('/reward-requests'),
    ]);
    rewards.value = (rewardsList || []).filter((r) => r.status === 'ACTIVE');
    myRequests.value = requestsList || [];
  } catch (e) {
    console.error('Failed to load rewards data', e);
  } finally {
    loading.value = false;
  }
}

function openDetail(r: Reward) {
  selectedReward.value = r;
  isConfirming.value = false;
  redeemError.value = null;
  redeemSuccess.value = false;
  isDetailOpen.value = true;
}

function openHistoryDetail(req: RewardRequest) {
  selectedRequest.value = req;
  isHistoryDetailOpen.value = true;
}

async function confirmRedemption() {
  if (!selectedReward.value) return;

  submitting.value = true;
  redeemError.value = null;

  try {
    await api.post('/reward-requests', {
      rewardId: selectedReward.value.id,
    });

    redeemSuccess.value = true;
    await authStore.fetchMe();
    await loadData();

    setTimeout(() => {
      isDetailOpen.value = false;
    }, 1500);
  } catch (err: any) {
    redeemError.value = err.message || 'ثبت درخواست با خطا مواجه شد';
  } finally {
    submitting.value = false;
  }
}

// 4 Distinct Button States on Active Catalog Cards
function getButtonState(r: Reward): {
  disabled: boolean;
  label: string;
  style: string;
} {
  if (r.inventoryQuantity !== null && r.inventoryQuantity <= 0) {
    return {
      disabled: true,
      label: 'ناموجود',
      style: 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700',
    };
  }

  if (pendingRewardIds.value.has(r.id)) {
    return {
      disabled: true,
      label: 'در حال بررسی',
      style: 'bg-cyan-500/10 text-cyan-400 cursor-not-allowed border border-cyan-500/30',
    };
  }

  if (studentBalance.value < r.pointPrice) {
    return {
      disabled: true,
      label: 'نوین ناکافی',
      style: 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700',
    };
  }

  return {
    disabled: false,
    label: 'دریافت',
    style: 'bg-neon-green text-[#0B0E14] hover:bg-neon-green-light shadow-neon-green font-black',
  };
}

function getRequestStatusBadge(status: string): { label: string; style: string; icon: any } {
  switch (status) {
    case 'PENDING_TO_APPROVE':
      return {
        label: 'در انتظار تایید',
        style: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
        icon: Clock,
      };
    case 'PENDING_TO_RECEIVE':
      return {
        label: 'در انتظار دریافت',
        style: 'bg-cyan-500 text-slate-900 border-cyan-400 font-black shadow-[0_0_12px_rgba(6,182,212,0.5)]',
        icon: Package,
      };
    case 'COMPLETED':
      return {
        label: 'تحویل شده',
        style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.3)]',
        icon: CheckCircle2,
      };
    case 'DECLINED':
      return {
        label: 'رد شده',
        style: 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        style: 'bg-slate-800 text-slate-400 border-slate-700',
        icon: Clock,
      };
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header with Balance Pill Badge -->
    <div class="flex items-center justify-between px-1">
      <h2 class="text-base font-extrabold text-white flex items-center gap-2">
        <Gift class="w-5 h-5 text-neon-green" />
        <span>جوایز و پاداش‌ها</span>
      </h2>

      <!-- Balance Pill (1100 ★ نوین) -->
      <div
        class="bg-dark-card border border-neon-gold/50 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-neon-gold"
      >
        <span class="text-xs font-black text-white">
          {{ toPersianDigits(studentBalance) }}
        </span>
        <Star class="w-3.5 h-3.5 text-neon-gold fill-neon-gold" />
        <span class="text-[11px] font-bold text-neon-gold">نوین</span>
      </div>
    </div>

    <!-- 2-Segment Tab Toggle: Active Awards vs History -->
    <div class="p-1 bg-[#161C28] rounded-2xl border border-slate-700/80 flex">
      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'active'
            ? 'bg-neon-green text-[#0B0E14] shadow-neon-green'
            : 'text-slate-400 hover:text-white',
        ]"
        @click="activeTab = 'active'"
      >
        جوایز فعال
      </button>

      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all relative',
          activeTab === 'history'
            ? 'bg-neon-green text-[#0B0E14] shadow-neon-green'
            : 'text-slate-400 hover:text-white',
        ]"
        @click="activeTab = 'history'"
      >
        <span>تاریخچه درخواست‌ها</span>
        <span
          v-if="myRequests.length > 0"
          :class="[
            'inline-block mr-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
            activeTab === 'history' ? 'bg-[#0B0E14] text-neon-green' : 'bg-slate-700 text-slate-300',
          ]"
        >
          {{ toPersianDigits(myRequests.length) }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری جوایز...
    </div>

    <!-- Tab 1: Active Awards (2-Column Grid) -->
    <div v-else-if="activeTab === 'active'">
      <div v-if="rewards.length > 0" class="grid grid-cols-2 gap-3">
        <div
          v-for="r in rewards"
          :key="r.id"
          class="bg-dark-card rounded-3xl p-3.5 border-1.5 neon-border-green flex flex-col justify-between cursor-pointer hover:bg-[#161D2B] transition-all"
          @click="openDetail(r)"
        >
          <!-- Top Area: Image / Mascot & Badge -->
          <div>
            <div
              class="w-full h-28 rounded-2xl bg-[#0F1420] border border-slate-800 flex items-center justify-center overflow-hidden relative mb-2.5"
            >
              <img
                v-if="r.imageUrl"
                :src="r.imageUrl"
                :alt="r.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex flex-col items-center justify-center text-slate-600">
                <Gift class="w-10 h-10 text-emerald-400/60" />
              </div>
            </div>

            <!-- Title (2-line clamp) -->
            <h3 class="text-xs font-extrabold text-white line-clamp-2 leading-snug min-h-[32px]">
              {{ r.name }}
            </h3>

            <!-- Price with Star -->
            <div class="mt-2 flex items-center gap-1 text-neon-gold text-xs font-extrabold">
              <Star class="w-3.5 h-3.5 fill-neon-gold" />
              <span>{{ formatNovin(r.pointPrice) }}</span>
            </div>

            <!-- Inventory -->
            <span class="text-[10px] text-slate-400 block mt-1">
              موجودی:
              {{ r.inventoryQuantity !== null ? toPersianDigits(r.inventoryQuantity) : 'نامحدود' }}
            </span>
          </div>

          <!-- Bottom Pill Button -->
          <div class="mt-3 pt-2">
            <button
              :disabled="getButtonState(r).disabled"
              :class="[
                'w-full py-2 rounded-xl text-xs font-bold transition-all',
                getButtonState(r).style,
              ]"
              @click.stop="openDetail(r)"
            >
              {{ getButtonState(r).label }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="py-16 text-center text-slate-500 text-xs">
        در حال حاضر جایزه فعالی در سامانه وجود ندارد.
      </div>
    </div>

    <!-- Tab 2: History (List of Requests) -->
    <div v-else-if="activeTab === 'history'">
      <div v-if="myRequests.length > 0" class="space-y-3">
        <div
          v-for="req in myRequests"
          :key="req.id"
          :class="[
            'bg-dark-card rounded-3xl p-4 border transition-all cursor-pointer relative overflow-hidden',
            req.status === 'DECLINED'
              ? 'border-rose-500/50 hover:bg-rose-500/5'
              : req.status === 'COMPLETED'
              ? 'border-emerald-500/40 hover:bg-emerald-500/5'
              : 'border-cyan-500/40 hover:bg-cyan-500/5',
          ]"
          @click="openHistoryDetail(req)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <h3 class="text-xs font-extrabold text-white">
                {{ req.reward?.name || 'جایزه درخواست‌شده' }}
              </h3>

              <div class="mt-1.5 flex items-center gap-1 text-neon-gold text-xs font-bold">
                <Star class="w-3.5 h-3.5 fill-neon-gold" />
                <span>{{ formatNovin(req.priceAtRequest) }}</span>
              </div>
            </div>

            <!-- Glowing Semantic Status Badge -->
            <div
              :class="[
                'px-3 py-1.5 rounded-2xl text-[11px] font-bold border flex items-center gap-1.5 shrink-0',
                getRequestStatusBadge(req.status).style,
              ]"
            >
              <component :is="getRequestStatusBadge(req.status).icon" class="w-3.5 h-3.5" />
              <span>{{ getRequestStatusBadge(req.status).label }}</span>
            </div>
          </div>

          <!-- Declined Preview Banner -->
          <div
            v-if="req.status === 'DECLINED'"
            class="mt-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between"
          >
            <span>علت رد: {{ req.declineReason || 'نوین به حسابتان بازگردانده شد' }}</span>
            <span class="text-[10px] underline font-bold">مشاهده جزییات ›</span>
          </div>
        </div>
      </div>

      <div v-else class="py-16 text-center text-slate-500 text-xs">
        شما تاکنون جایزه‌ای درخواست نکرده‌اید.
      </div>
    </div>

    <!-- Bottom Sheet: Reward Detail & Confirmation Modal -->
    <BottomSheet
      :is-open="isDetailOpen"
      :title="selectedReward?.name || 'جزییات جایزه'"
      border-color="green"
      @close="isDetailOpen = false"
    >
      <div v-if="selectedReward" class="space-y-4">
        <!-- Full Image -->
        <div
          class="w-full h-44 rounded-2xl bg-[#0F1420] border border-slate-800 flex items-center justify-center overflow-hidden"
        >
          <img
            v-if="selectedReward.imageUrl"
            :src="selectedReward.imageUrl"
            :alt="selectedReward.name"
            class="w-full h-full object-cover"
          />
          <Gift v-else class="w-16 h-16 text-emerald-400/60" />
        </div>

        <!-- Price & Inventory Info -->
        <div class="flex items-center justify-between p-3 rounded-2xl bg-[#161C28] border border-slate-700">
          <div>
            <span class="text-[11px] text-slate-400 block">هزینه نوین:</span>
            <span class="text-sm font-extrabold text-neon-gold flex items-center gap-1 mt-0.5">
              <Star class="w-4 h-4 fill-neon-gold" />
              {{ formatNovin(selectedReward.pointPrice) }}
            </span>
          </div>

          <div class="text-left">
            <span class="text-[11px] text-slate-400 block">موجودی باقی‌مانده:</span>
            <span class="text-xs font-bold text-white mt-0.5 block">
              {{ selectedReward.inventoryQuantity !== null ? toPersianDigits(selectedReward.inventoryQuantity) : 'نامحدود' }}
            </span>
          </div>
        </div>

        <!-- Description -->
        <div>
          <h4 class="text-xs font-bold text-slate-300 mb-1">توضیحات و نحوه دریافت:</h4>
          <p class="text-xs text-slate-400 leading-relaxed font-normal">
            {{ selectedReward.description || 'توضیحات خاصی برای این جایزه ثبت نشده است.' }}
          </p>
        </div>

        <!-- Confirmation Warning Box -->
        <div
          v-if="isConfirming"
          class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5"
        >
          <div class="flex items-center gap-2 font-bold">
            <AlertTriangle class="w-4 h-4 text-amber-400 shrink-0" />
            <span>توجه: نوین پس از ثبت درخواست رزرو خواهد شد</span>
          </div>
          <p class="text-[11px] text-amber-200/80 leading-relaxed">
            درخواست دریافت جایزه غیرقابل لغو توسط دانش‌آموز است. در صورت تایید مدیر، جایزه را به صورت فیزیکی تحویل خواهید گرفت.
          </p>
        </div>

        <!-- Alert messages -->
        <div
          v-if="redeemError"
          class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs"
        >
          {{ redeemError }}
        </div>

        <div
          v-if="redeemSuccess"
          class="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold"
        >
          درخواست دریافت جایزه با موفقیت ثبت شد!
        </div>

        <!-- Action Button -->
        <template v-if="!redeemSuccess">
          <div v-if="!isConfirming">
            <button
              :disabled="getButtonState(selectedReward).disabled"
              :class="[
                'w-full py-3 rounded-2xl text-xs font-extrabold transition-all',
                getButtonState(selectedReward).style,
              ]"
              @click="isConfirming = true"
            >
              {{ getButtonState(selectedReward).label }}
            </button>
          </div>

          <div v-else class="flex gap-2">
            <button
              :disabled="submitting"
              class="flex-1 py-3 rounded-2xl bg-neon-green text-[#0B0E14] font-black text-xs shadow-neon-green disabled:opacity-50 flex items-center justify-center gap-2"
              @click="confirmRedemption"
            >
              <RefreshCw v-if="submitting" class="w-4 h-4 animate-spin" />
              <span>{{ submitting ? 'در حال ثبت...' : 'تایید نهایی و کسر نوین' }}</span>
            </button>
            <button
              class="px-4 py-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              @click="isConfirming = false"
            >
              انصراف
            </button>
          </div>
        </template>
      </div>
    </BottomSheet>

    <!-- Bottom Sheet: Declined Explanation & Refund Notice Modal -->
    <BottomSheet
      :is-open="isHistoryDetailOpen"
      :title="selectedRequest?.reward?.name || 'جزییات درخواست رد شده'"
      border-color="red"
      @close="isHistoryDetailOpen = false"
    >
      <div v-if="selectedRequest" class="space-y-4">
        <!-- Rejection Explanation -->
        <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 space-y-2">
          <span class="text-[11px] font-bold text-rose-400 block">علت رد درخواست توسط مدیر:</span>
          <p class="text-xs font-semibold text-white leading-relaxed">
            {{ selectedRequest.declineReason || 'دلیلی توسط مدیر ثبت نشده است.' }}
          </p>
        </div>

        <!-- Static Point Refund Notice -->
        <div class="p-4 rounded-2xl bg-[#161C28] border border-neon-cyan/40 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-neon-cyan/20 text-neon-cyan flex items-center justify-center shrink-0">
            <CheckCircle2 class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-white">بازگشت خودکار نوین</h4>
            <p class="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              نوین‌های کسر شده برای این درخواست به حساب شما بازگردانده شد.
            </p>
          </div>
        </div>

        <button
          class="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          @click="isHistoryDetailOpen = false"
        >
          بستن
        </button>
      </div>
    </BottomSheet>
  </div>
</template>
