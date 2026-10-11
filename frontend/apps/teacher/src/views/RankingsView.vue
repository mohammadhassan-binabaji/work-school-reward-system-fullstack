<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Trophy, Medal, Award, Users } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import {
  api,
  toPersianDigits,
  formatNovin,
  type TeacherAssignment,
  type StaffRankingView,
} from '@student-reward/shared';

const authStore = useAuthStore();

const tab = ref<'school' | 'class'>('school');
const assignments = ref<TeacherAssignment[]>([]);
const selectedClassId = ref('');
const schoolRankings = ref<StaffRankingView | null>(null);
const classRankings = ref<StaffRankingView | null>(null);
const loading = ref(true);

onMounted(async () => {
  await loadInitial();
});

async function loadInitial() {
  loading.value = true;
  try {
    const teacherId = authStore.user?.id;
    if (teacherId) {
      const list = await api.get<TeacherAssignment[]>('/assignments', { teacherId });
      assignments.value = list || [];
      if (assignments.value.length > 0) {
        selectedClassId.value = assignments.value[0].classId;
      }
    }

    const sRank = await api.get<StaffRankingView>('/rankings/school');
    schoolRankings.value = sRank;
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
    const cRank = await api.get<StaffRankingView>(`/rankings/class/${selectedClassId.value}`);
    classRankings.value = cRank;
  } catch (e) {
    console.error('Failed to load class rankings', e);
  } finally {
    loading.value = false;
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
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Trophy class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-sm font-extrabold text-slate-800">جدول رتبه‌بندی دانش‌آموزان</h2>
        <p class="text-xs text-slate-500">مشاهده امتیازات و رتبه‌بندی استاندارد مسابقه‌ای</p>
      </div>
    </div>

    <!-- Tab Toggle -->
    <div class="p-1 bg-slate-200/80 rounded-2xl flex">
      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          tab === 'school' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600',
        ]"
        @click="tab = 'school'"
      >
        کل مدرسه
      </button>

      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          tab === 'class' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600',
        ]"
        @click="tab = 'class'; loadClassRankings()"
      >
        کلاس‌های من
      </button>
    </div>

    <!-- Class Selector (if tab === 'class') -->
    <div v-if="tab === 'class' && assignments.length > 0" class="bg-white rounded-2xl p-3 border border-slate-200">
      <label class="block text-xs font-bold text-slate-700 mb-1">انتخاب کلاس:</label>
      <select
        v-model="selectedClassId"
        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
        @change="loadClassRankings"
      >
        <option v-for="a in assignments" :key="a.id" :value="a.classId">
          {{ a.class?.name }} (درس {{ a.subject?.name }})
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال محاسبه رتبه‌بندی...
    </div>

    <!-- Rankings Table / List -->
    <div
      v-else-if="(tab === 'school' ? schoolRankings : classRankings)?.rankings?.length"
      class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100"
    >
      <div
        v-for="item in (tab === 'school' ? schoolRankings : classRankings)?.rankings"
        :key="item.studentId"
        class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div class="flex items-center gap-3">
          <!-- Rank Number Badge -->
          <div
            :class="[
              'w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0',
              getRankBadge(item.rank),
            ]"
          >
            {{ toPersianDigits(item.rank) }}
          </div>

          <div>
            <span class="text-xs font-bold text-slate-800 block">
              {{ item.studentName }}
            </span>
            <span class="text-[10px] text-slate-400">
              نام کاربری: {{ item.username }}
            </span>
          </div>
        </div>

        <div class="text-left">
          <span class="text-xs font-black text-indigo-700">
            {{ formatNovin(item.points) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-200">
      دانش‌آموزی در رتبه‌بندی ثبت نشده است.
    </div>
  </div>
</template>
