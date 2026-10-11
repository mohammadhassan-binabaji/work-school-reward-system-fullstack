<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Trophy, Camera, RefreshCw, CheckCircle2 } from 'lucide-vue-next';
import {
  api,
  toPersianDigits,
  formatNovin,
  type Class,
  type StaffRankingView,
} from '@student-reward/shared';

const tab = ref<'school' | 'class'>('school');
const classes = ref<Class[]>([]);
const selectedClassId = ref('');
const schoolRankings = ref<StaffRankingView | null>(null);
const classRankings = ref<StaffRankingView | null>(null);
const loading = ref(true);

const triggering = ref(false);
const successMessage = ref<string | null>(null);

onMounted(async () => {
  await loadInitial();
});

async function loadInitial() {
  loading.value = true;
  try {
    const [cList, sRank] = await Promise.all([
      api.get<Class[]>('/classes'),
      api.get<StaffRankingView>('/rankings/school'),
    ]);
    classes.value = cList || [];
    schoolRankings.value = sRank;
    if (classes.value.length > 0) {
      selectedClassId.value = classes.value[0].id;
    }
  } catch (e) {
    console.error('Failed to load rankings', e);
  } finally {
    loading.value = false;
  }
}

async function loadClassRankings() {
  if (!selectedClassId.value) return;
  loading.value = true;
  try {
    const res = await api.get<StaffRankingView>(`/rankings/class/${selectedClassId.value}`);
    classRankings.value = res;
  } catch (e) {
    console.error('Failed to load class rankings', e);
  } finally {
    loading.value = false;
  }
}

async function triggerSnapshot() {
  triggering.value = true;
  try {
    await api.post('/rankings/snapshots/trigger');
    successMessage.value = 'اسنپ‌شات وضعیت روزانه رتبه‌بندی‌ها با موفقیت در پایگاه داده ثبت گردید.';
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در ثبت اسنپ‌شات');
  } finally {
    triggering.value = false;
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) return 'bg-amber-400 text-amber-950 font-black';
  if (rank === 2) return 'bg-slate-300 text-slate-800 font-extrabold';
  if (rank === 3) return 'bg-amber-700 text-amber-100 font-extrabold';
  return 'bg-slate-100 text-slate-600 font-bold';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Trophy class="w-6 h-6 text-amber-500" />
          <span>رتبه‌بندی دانش‌آموزان و اسنپ‌شات روزانه</span>
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          مشاهده رتبه‌بندی استاندارد مسابقه‌ای (۱، ۲، ۲، ۴...) در سطح مدرسه و کلاس‌ها
        </p>
      </div>

      <button
        :disabled="triggering"
        class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
        @click="triggerSnapshot"
      >
        <Camera class="w-4 h-4" />
        <span>{{ triggering ? 'در حال ثبت...' : 'ثبت دستی اسنپ‌شات امروز' }}</span>
      </button>
    </div>

    <!-- Alert Message -->
    <div
      v-if="successMessage"
      class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Tab Toggle -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="p-1 bg-white border border-slate-200 rounded-2xl flex max-w-sm">
        <button
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
            tab === 'school' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600',
          ]"
          @click="tab = 'school'"
        >
          رتبه‌بندی کل مدرسه
        </button>

        <button
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
            tab === 'class' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600',
          ]"
          @click="tab = 'class'; loadClassRankings()"
        >
          رتبه‌بندی بر اساس کلاس
        </button>
      </div>

      <!-- Class selector if on class tab -->
      <div v-if="tab === 'class'" class="flex items-center gap-2">
        <select
          v-model="selectedClassId"
          class="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold"
          @change="loadClassRankings"
        >
          <option v-for="c in classes" :key="c.id" :value="c.id">
            {{ c.name }} ({{ c.gradeLevel || 'بدون پایه' }})
          </option>
        </select>
      </div>
    </div>

    <!-- Rankings Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5 w-20">رتبه</th>
              <th class="p-3.5">نام دانش‌آموز</th>
              <th class="p-3.5">نام کاربری</th>
              <th class="p-3.5 pl-5 text-left">مجموع موجودی نوین</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="4" class="py-12 text-center text-slate-400">در حال محاسبه رتبه‌ها...</td>
              </tr>
            </template>
            <template v-else-if="(tab === 'school' ? schoolRankings : classRankings)?.rankings?.length">
              <tr
                v-for="r in (tab === 'school' ? schoolRankings : classRankings)?.rankings"
                :key="r.studentId"
                class="hover:bg-slate-50/80 transition-colors"
              >
                <td class="p-3.5 pr-5">
                  <span
                    :class="[
                      'w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs',
                      getRankBadge(r.rank),
                    ]"
                  >
                    {{ toPersianDigits(r.rank) }}
                  </span>
                </td>
                <td class="p-3.5 font-bold text-slate-800">{{ r.studentName }}</td>
                <td class="p-3.5 text-slate-500 font-mono">{{ r.username }}</td>
                <td class="p-3.5 pl-5 text-left font-black text-indigo-700">
                  {{ formatNovin(r.points) }}
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="4" class="py-12 text-center text-slate-400">دانش‌آموزی ثبت نشده است.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
