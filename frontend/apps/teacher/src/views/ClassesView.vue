<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Users, ChevronDown, ChevronUp, Award, Search } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import {
  api,
  toPersianDigits,
  formatNovin,
  type TeacherAssignment,
  type Class,
} from '@student-reward/shared';

const router = useRouter();
const authStore = useAuthStore();

const assignments = ref<TeacherAssignment[]>([]);
const classDataMap = ref<Record<string, Class>>({});
const expandedClassId = ref<string | null>(null);
const loading = ref(true);
const searchQuery = ref('');

onMounted(async () => {
  await loadClasses();
});

async function loadClasses() {
  loading.value = true;
  try {
    const teacherId = authStore.user?.id;
    if (!teacherId) return;

    const list = await api.get<TeacherAssignment[]>('/assignments', { teacherId });
    assignments.value = list || [];

    // Automatically expand first class and load details
    if (assignments.value.length > 0) {
      await toggleClass(assignments.value[0].classId);
    }
  } catch (e) {
    console.error('Failed to load classes', e);
  } finally {
    loading.value = false;
  }
}

async function toggleClass(classId: string) {
  if (expandedClassId.value === classId) {
    expandedClassId.value = null;
    return;
  }
  expandedClassId.value = classId;

  if (!classDataMap.value[classId]) {
    try {
      const cls = await api.get<Class>(`/classes/${classId}`);
      classDataMap.value[classId] = cls;
    } catch (e) {
      console.error('Failed to load class details', e);
    }
  }
}

function quickAward(assignmentId: string, studentId: string) {
  router.push({
    path: '/',
    query: { assignmentId, studentId },
  });
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Users class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-extrabold text-slate-800">کلاس‌های تحت تدریس شما</h2>
          <p class="text-xs text-slate-500">مشاهده دانش‌آموزان، موجودی‌ها و وضعیت پیشرفت</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال دریافت کلاس‌ها...
    </div>

    <!-- Assignments List -->
    <div v-else-if="assignments.length > 0" class="space-y-3">
      <div
        v-for="a in assignments"
        :key="a.id"
        class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
      >
        <!-- Class Header Accordion Trigger -->
        <div
          class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          @click="toggleClass(a.classId)"
        >
          <div>
            <h3 class="text-sm font-extrabold text-slate-800">
              {{ a.class?.name }}
            </h3>
            <span class="text-xs text-indigo-600 font-semibold mt-0.5 block">
              درس: {{ a.subject?.name }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-medium">
              {{ toPersianDigits(classDataMap[a.classId]?.students?.length ?? '') }} دانش‌آموز
            </span>
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <ChevronUp v-if="expandedClassId === a.classId" class="w-4 h-4" />
              <ChevronDown v-else class="w-4 h-4" />
            </div>
          </div>
        </div>

        <!-- Expanded Students List -->
        <div
          v-if="expandedClassId === a.classId"
          class="border-t border-slate-100 p-4 bg-slate-50/50 space-y-3"
        >
          <div v-if="!classDataMap[a.classId]" class="py-4 text-center text-xs text-slate-400">
            در حال بارگذاری دانش‌آموزان...
          </div>

          <template v-else-if="classDataMap[a.classId].students?.length">
            <div
              v-for="s in classDataMap[a.classId].students"
              :key="s.id"
              class="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
            >
              <div>
                <span class="text-xs font-bold text-slate-800 block">
                  {{ s.user.firstName }} {{ s.user.lastName }}
                </span>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                  >
                    سطح {{ toPersianDigits(s.currentTier?.tierNumber ?? 1) }}
                  </span>
                  <span class="text-[11px] font-bold text-indigo-700">
                    {{ formatNovin(s.currentBalance) }}
                  </span>
                </div>
              </div>

              <button
                class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1"
                @click="quickAward(a.id, s.id)"
              >
                <Award class="w-3.5 h-3.5" />
                <span>اهدای نوین</span>
              </button>
            </div>
          </template>

          <div v-else class="py-4 text-center text-xs text-slate-400">
            دانش‌آموزی در این کلاس ثبت نشده است.
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-200">
      کلاسی به شما تخصیص داده نشده است.
    </div>
  </div>
</template>
