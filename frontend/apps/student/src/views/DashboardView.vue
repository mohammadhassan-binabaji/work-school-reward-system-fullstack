<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Trophy,
  TrendingUp,
  ChevronLeft,
  Plus,
  Minus,
  Award,
  Crown,
  Medal,
  Calendar,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import OwlMascot from '../components/OwlMascot.vue';
import BottomSheet from '../components/BottomSheet.vue';
import ScrollableBezierChart from '../components/ScrollableBezierChart.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  formatJalaliDate,
  type DailySnapshot,
  type PointAuditLog,
  type StudentRankingView,
  type StudentBalancePoint,
  type StudentBalanceHistoryResponse,
} from '@student-reward/shared';

const authStore = useAuthStore();

// State
const loading = ref(true);
const snapshotHistory = ref<DailySnapshot[]>([]);
const balanceHistory = ref<StudentBalancePoint[]>([]);
const hasMoreHistory = ref(false);
const nextHistoryCursor = ref<string | null>(null);
const loadingMoreHistory = ref(false);
const recentActivities = ref<PointAuditLog[]>([]);
const allActivities = ref<PointAuditLog[]>([]);
const activityFilter = ref<'all' | 'gain' | 'deduct'>('all');

// Leaderboard Modal State
const isLeaderboardOpen = ref(false);
const leaderboardTab = ref<'school' | 'class'>('school');
const schoolRankings = ref<StudentRankingView | null>(null);
const classRankings = ref<StudentRankingView | null>(null);
const loadingRankings = ref(false);

// Full Activities Modal State
const isActivitiesOpen = ref(false);
const loadingActivities = ref(false);

// Calculations
const currentPoints = computed(() => authStore.currentBalance);
const tier = computed(() => authStore.currentTier);
const nextTier = computed(() => authStore.nextTier);

// Calculate progress to next tier
const progressPercent = computed(() => {
  if (!tier.value) return 50;
  const current = currentPoints.value;
  const currentThreshold = tier.value.minPointsThreshold;

  if (!nextTier.value) {
    // If at max tier
    return 100;
  }

  const nextTarget = nextTier.value.minPointsThreshold;
  if (current >= nextTarget) return 100;
  const range = Math.max(1, nextTarget - currentThreshold);
  const gained = Math.max(0, current - currentThreshold);
  return Math.min(100, Math.max(5, Math.round((gained / range) * 100)));
});

const pointsToNextTier = computed(() => {
  if (!tier.value || !nextTier.value) return 0;
  return Math.max(0, nextTier.value.minPointsThreshold - currentPoints.value);
});

// Latest snapshot for rank
const latestSnapshot = computed(() => {
  if (snapshotHistory.value.length === 0) return null;
  return snapshotHistory.value[snapshotHistory.value.length - 1];
});

const currentRank = computed(() => {
  if (schoolRankings.value?.selfRank) {
    return schoolRankings.value.selfRank.rank;
  }
  return latestSnapshot.value?.schoolRank ?? 1;
});

const totalStudents = computed(() => {
  return schoolRankings.value?.totalActiveStudents ?? 1;
});

// Load Initial Data
onMounted(async () => {
  await loadDashboardData();
});

async function loadDashboardData() {
  loading.value = true;
  try {
    const studentId = authStore.user?.id;
    if (!studentId) return;

    // Load 7-day snapshot history
    try {
      const history = await api.get<DailySnapshot[]>(
        `/rankings/students/${studentId}/snapshot-history`,
        { days: 7 },
      );
      snapshotHistory.value = history || [];
    } catch (e) {
      console.warn('Snapshot history not available yet');
    }

    // Load initial 14 balance history points for scrollable line chart
    try {
      const balanceRes = await api.get<StudentBalanceHistoryResponse>(
        `/rankings/students/${studentId}/balance-history`,
        { limit: 14 },
      );
      balanceHistory.value = balanceRes.data || [];
      hasMoreHistory.value = balanceRes.pagination?.hasMore ?? false;
      nextHistoryCursor.value = balanceRes.pagination?.nextCursor ?? null;
    } catch (e) {
      console.warn('Balance history not available yet');
    }

    // Load recent 3 activities
    try {
      const res = await api.get<{ data: PointAuditLog[]; total: number }>(
        '/reports/point-flow',
        { limit: 3 },
      );
      recentActivities.value = res.data || [];
    } catch (e) {
      console.warn('Point flow report failed');
    }

    // Pre-fetch school ranking overview
    try {
      const sRank = await api.get<StudentRankingView>('/rankings/school');
      schoolRankings.value = sRank;
    } catch (e) {
      console.warn('School rankings failed');
    }
  } finally {
    loading.value = false;
  }
}

async function loadMoreHistory() {
  if (loadingMoreHistory.value || !hasMoreHistory.value || !nextHistoryCursor.value) return;
  const studentId = authStore.user?.id;
  if (!studentId) return;

  loadingMoreHistory.value = true;
  try {
    const res = await api.get<StudentBalanceHistoryResponse>(
      `/rankings/students/${studentId}/balance-history`,
      { limit: 14, beforeDate: nextHistoryCursor.value },
    );
    if (res.data && res.data.length > 0) {
      // Prepend older history to the left
      balanceHistory.value = [...res.data, ...balanceHistory.value];
      hasMoreHistory.value = res.pagination.hasMore;
      nextHistoryCursor.value = res.pagination.nextCursor;
    } else {
      hasMoreHistory.value = false;
    }
  } catch (e) {
    console.error('Failed to load older balance history', e);
  } finally {
    loadingMoreHistory.value = false;
  }
}

async function openLeaderboard() {
  isLeaderboardOpen.value = true;
  await fetchLeaderboard();
}

async function fetchLeaderboard() {
  loadingRankings.value = true;
  try {
    if (leaderboardTab.value === 'school') {
      const sRank = await api.get<StudentRankingView>('/rankings/school');
      schoolRankings.value = sRank;
    } else {
      const classId = authStore.user?.studentProfile?.classId;
      if (classId) {
        const cRank = await api.get<StudentRankingView>(`/rankings/class/${classId}`);
        classRankings.value = cRank;
      }
    }
  } catch (e) {
    console.error('Failed to load leaderboard', e);
  } finally {
    loadingRankings.value = false;
  }
}

async function openFullActivities() {
  isActivitiesOpen.value = true;
  loadingActivities.value = true;
  try {
    const res = await api.get<{ data: PointAuditLog[]; total: number }>(
      '/reports/point-flow',
      { limit: 50 },
    );
    allActivities.value = res.data || [];
  } catch (e) {
    console.error('Failed to load full activities', e);
  } finally {
    loadingActivities.value = false;
  }
}

const filteredActivities = computed(() => {
  if (activityFilter.value === 'gain') {
    return allActivities.value.filter((a) => a.amount > 0);
  }
  if (activityFilter.value === 'deduct') {
    return allActivities.value.filter((a) => a.amount < 0);
  }
  return allActivities.value;
});
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Card 1: Points Card (Red Neon Glow) -->
    <div
      class="bg-dark-card rounded-3xl px-5 py-2.5 border-1.5 neon-border-red relative overflow-hidden transition-all duration-300"
    >
      <!-- Background Ambient Glow -->
      <div
        class="absolute -top-16 -right-16 w-36 h-36 bg-neon-red/15 rounded-full blur-2xl pointer-events-none"
      ></div>

      <div class="flex items-center justify-between">
        <!-- Text & Status -->
        <div>
          <span class="text-xs font-semibold text-slate-400">تعداد نوین شما</span>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-4xl font-extrabold text-white tracking-tight">
              {{ toPersianDigits(currentPoints) }}
            </span>
            <span class="text-base font-bold text-neon-red">نوین</span>
          </div>

          <!-- Motivational note -->
          <p class="text-xs text-slate-300 mt-2 font-medium">
            فوق‌العاده‌ای! به تلاشت ادامه بده...
          </p>

          <p v-if="pointsToNextTier > 0" class="text-[11px] text-neon-red/90 mt-1">
            {{ toPersianDigits(pointsToNextTier) }} نوین دیگر تا ارتقای سطح بعدی
          </p>
        </div>

        <!-- Mascot & Circular Progress Gauge -->
        <div class="relative flex items-center justify-center shrink-0">
          <svg class="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#1E293B"
              stroke-width="8"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#FF3D00"
              stroke-width="8"
              stroke-linecap="round"
              fill="transparent"
              :stroke-dasharray="314.16"
              :stroke-dashoffset="314.16 - (314.16 * progressPercent) / 100"
              class="transition-all duration-1000 ease-out"
            />
          </svg>

          <!-- Center Mascot -->
          <div class="absolute inset-0 flex items-center justify-center">
            <OwlMascot size="sm" variant="cheering" />
          </div>
        </div>
      </div>
    </div>

    <!-- Card 2: Interactive Rank Card (Green Neon Glow) -->
    <div
      class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-green cursor-pointer hover:bg-[#161D2B] transition-all relative overflow-hidden"
      @click="openLeaderboard"
    >
      <div
        class="absolute -top-16 -left-16 w-36 h-36 bg-neon-green/15 rounded-full blur-2xl pointer-events-none"
      ></div>

      <div class="flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold text-slate-400">رتبه شما در مدرسه</span>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-white">
              {{ toPersianDigits(currentRank) }}
            </span>
            <span class="text-xs font-medium text-slate-400">
              از {{ toPersianDigits(totalStudents) }} دانش‌آموز
            </span>
          </div>

          <div class="flex items-center gap-1.5 mt-2 text-neon-green text-xs font-bold">
            <TrendingUp class="w-3.5 h-3.5" />
            <span>روند صعودی در هفته جاری</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-neon-green bg-neon-green/10 px-3 py-2 rounded-2xl border border-neon-green/30">
          <span class="text-xs font-bold">مشاهده رتبه‌بندی</span>
          <ChevronLeft class="w-4 h-4" />
        </div>
      </div>
    </div>

    <!-- Card 3: Weekly Balance History Graph Card (Blue Neon Glow) -->
    <div class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-cyan relative overflow-hidden">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <Calendar class="w-4 h-4 text-neon-cyan" />
          <span>تاریخچه هفتگی نوین</span>
        </h3>
        <span class="text-[11px] text-slate-400">نمایش ۷ روزه (قابل پیمایش)</span>
      </div>

      <!-- Scrollable Bezier Line Chart -->
      <ScrollableBezierChart
        :balance-points="balanceHistory"
        :has-more="hasMoreHistory"
        :loading-more="loadingMoreHistory"
        @load-more="loadMoreHistory"
      />
    </div>

    <!-- Card 4: Latest Activities Card (Blue Neon Glow) -->
    <div class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-cyan relative overflow-hidden">
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <h3 class="text-sm font-bold text-white">آخرین فعالیت‌ها</h3>
        <button
          class="text-xs font-bold text-neon-cyan hover:text-white flex items-center gap-1 bg-neon-cyan/10 px-3 py-1 rounded-xl transition-colors"
          @click="openFullActivities"
        >
          <span>بیشتر</span>
          <ChevronLeft class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Activities List (3 items) -->
      <div v-if="recentActivities.length > 0" class="space-y-3">
        <div
          v-for="item in recentActivities"
          :key="item.id"
          class="flex items-center justify-between p-2.5 rounded-2xl bg-[#0F1420] border border-slate-800/60"
        >
          <div class="flex items-center gap-3">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                item.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
              ]"
            >
              <Plus v-if="item.amount > 0" class="w-4 h-4" />
              <Minus v-else class="w-4 h-4" />
            </div>
            <div>
              <p class="text-xs font-bold text-white line-clamp-1">
                {{ item.taskOrReason || 'تغییر موجودی نوین' }}
              </p>
              <span class="text-[10px] text-slate-400 block mt-0.5">
                {{ formatJalaliDateTime(item.createdAt) }}
              </span>
            </div>
          </div>

          <div
            :class="[
              'text-xs font-black tracking-wide',
              item.amount > 0 ? 'text-neon-green' : 'text-neon-red',
            ]"
          >
            {{ formatNovin(item.amount, { showSign: true }) }}
          </div>
        </div>
      </div>
      <div v-else class="text-center py-6 text-slate-500 text-xs">
        هنوز فعالیتی ثبت نشده است.
      </div>
    </div>

    <!-- Bottom Sheet: Full Leaderboard Modal -->
    <BottomSheet
      :is-open="isLeaderboardOpen"
      title="رتبه‌بندی دانش‌آموزان"
      border-color="green"
      @close="isLeaderboardOpen = false"
    >
      <div class="space-y-5">
        <!-- Tabs: School vs Class -->
        <div class="flex p-1 bg-[#161C28] rounded-2xl border border-slate-700">
          <button
            :class="[
              'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
              leaderboardTab === 'school'
                ? 'bg-neon-green text-[#0B0E14] shadow-neon-green'
                : 'text-slate-400 hover:text-white',
            ]"
            @click="leaderboardTab = 'school'; fetchLeaderboard()"
          >
            کل مدرسه
          </button>
          <button
            :class="[
              'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
              leaderboardTab === 'class'
                ? 'bg-neon-green text-[#0B0E14] shadow-neon-green'
                : 'text-slate-400 hover:text-white',
            ]"
            @click="leaderboardTab = 'class'; fetchLeaderboard()"
          >
            کلاس من
          </button>
        </div>

        <div v-if="loadingRankings" class="py-12 text-center text-slate-400 text-xs">
          در حال بارگذاری رتبه‌بندی...
        </div>

        <div v-else class="space-y-4">
          <!-- Top 3 Podium (Gamified) -->
          <div
            v-if="(leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents?.length"
            class="flex items-end justify-center gap-3 pt-6 pb-2"
          >
            <!-- 2nd Place -->
            <div
              v-if="(leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[1]"
              class="flex flex-col items-center flex-1 max-w-[95px]"
            >
              <div class="w-10 h-10 rounded-full bg-slate-300 text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-md mb-2">
                ۲
              </div>
              <span class="text-[11px] font-bold text-white text-center line-clamp-1">
                {{ (leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[1].studentName }}
              </span>
              <span class="text-[10px] text-slate-400 font-semibold mt-0.5">
                {{ toPersianDigits((leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[1].points) }} نوین
              </span>
              <div class="w-full h-16 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-xl mt-2 flex items-center justify-center">
                <Medal class="w-5 h-5 text-slate-200" />
              </div>
            </div>

            <!-- 1st Place (Center / Taller) -->
            <div
              v-if="(leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[0]"
              class="flex flex-col items-center flex-1 max-w-[105px]"
            >
              <div class="w-12 h-12 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center text-base shadow-neon-gold mb-2 ring-2 ring-amber-300">
                <Crown class="w-6 h-6" />
              </div>
              <span class="text-xs font-extrabold text-white text-center line-clamp-1">
                {{ (leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[0].studentName }}
              </span>
              <span class="text-[11px] text-amber-400 font-bold mt-0.5">
                {{ toPersianDigits((leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[0].points) }} نوین
              </span>
              <div class="w-full h-24 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-xl mt-2 flex items-center justify-center shadow-neon-gold">
                <Trophy class="w-6 h-6 text-amber-950" />
              </div>
            </div>

            <!-- 3rd Place -->
            <div
              v-if="(leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[2]"
              class="flex flex-col items-center flex-1 max-w-[95px]"
            >
              <div class="w-10 h-10 rounded-full bg-amber-700 text-amber-100 font-extrabold flex items-center justify-center text-sm shadow-md mb-2">
                ۳
              </div>
              <span class="text-[11px] font-bold text-white text-center line-clamp-1">
                {{ (leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[2].studentName }}
              </span>
              <span class="text-[10px] text-slate-400 font-semibold mt-0.5">
                {{ toPersianDigits((leaderboardTab === 'school' ? schoolRankings : classRankings)?.topStudents[2].points) }} نوین
              </span>
              <div class="w-full h-12 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-xl mt-2 flex items-center justify-center">
                <Medal class="w-4 h-4 text-amber-200" />
              </div>
            </div>
          </div>

          <!-- Self Rank Highlight Card -->
          <div
            v-if="(leaderboardTab === 'school' ? schoolRankings : classRankings)?.selfRank"
            class="p-4 rounded-2xl bg-neon-green/10 border border-neon-green/40 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-neon-green text-[#0B0E14] font-black flex items-center justify-center text-sm">
                {{ toPersianDigits((leaderboardTab === 'school' ? schoolRankings : classRankings)?.selfRank?.rank) }}
              </div>
              <div>
                <span class="text-xs font-bold text-white">رتبه شما ({{ authStore.user?.firstName }} {{ authStore.user?.lastName }})</span>
                <span class="text-[10px] text-emerald-400 block">
                  مجموع: {{ toPersianDigits((leaderboardTab === 'school' ? schoolRankings : classRankings)?.selfRank?.points) }} نوین
                </span>
              </div>
            </div>
            <Award class="w-6 h-6 text-neon-green" />
          </div>
        </div>
      </div>
    </BottomSheet>

    <!-- Bottom Sheet: Full Activity History Modal -->
    <BottomSheet
      :is-open="isActivitiesOpen"
      title="تاریخچه کامل نوین"
      border-color="cyan"
      @close="isActivitiesOpen = false"
    >
      <div class="space-y-4">
        <!-- Filter Tabs -->
        <div class="flex p-1 bg-[#161C28] rounded-2xl border border-slate-700">
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-bold rounded-xl transition-all',
              activityFilter === 'all'
                ? 'bg-neon-cyan text-[#0B0E14] shadow-neon-cyan'
                : 'text-slate-400 hover:text-white',
            ]"
            @click="activityFilter = 'all'"
          >
            همه
          </button>
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-bold rounded-xl transition-all',
              activityFilter === 'gain'
                ? 'bg-neon-green text-[#0B0E14] shadow-neon-green'
                : 'text-slate-400 hover:text-white',
            ]"
            @click="activityFilter = 'gain'"
          >
            دریافتی‌ها (+)
          </button>
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-bold rounded-xl transition-all',
              activityFilter === 'deduct'
                ? 'bg-neon-red text-white shadow-neon-red'
                : 'text-slate-400 hover:text-white',
            ]"
            @click="activityFilter = 'deduct'"
          >
            کسورات (−)
          </button>
        </div>

        <!-- Activity History List -->
        <div v-if="loadingActivities" class="py-12 text-center text-slate-400 text-xs">
          در حال بارگذاری سوابق...
        </div>
        <div v-else-if="filteredActivities.length > 0" class="space-y-2.5">
          <div
            v-for="item in filteredActivities"
            :key="item.id"
            class="flex items-center justify-between p-3 rounded-2xl bg-[#0F1420] border border-slate-800"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0',
                  item.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400',
                ]"
              >
                <Plus v-if="item.amount > 0" class="w-4 h-4" />
                <Minus v-else class="w-4 h-4" />
              </div>
              <div>
                <p class="text-xs font-bold text-white">
                  {{ item.taskOrReason || 'تراکنش نوین' }}
                </p>
                <span class="text-[10px] text-slate-400 block mt-0.5">
                  {{ formatJalaliDateTime(item.createdAt) }}
                </span>
              </div>
            </div>

            <div
              :class="[
                'text-xs font-black shrink-0 mr-2',
                item.amount > 0 ? 'text-neon-green' : 'text-neon-red',
              ]"
            >
              {{ formatNovin(item.amount, { showSign: true }) }}
            </div>
          </div>
        </div>
        <div v-else class="py-12 text-center text-slate-500 text-xs">
          موردی برای نمایش یافت نشد.
        </div>
      </div>
    </BottomSheet>
  </div>
</template>
