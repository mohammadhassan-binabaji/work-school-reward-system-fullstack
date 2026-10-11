<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { BookOpen, ShieldCheck } from 'lucide-vue-next';
import { api, type GuidanceCard } from '@student-reward/shared';

const guidanceCards = ref<GuidanceCard[]>([]);
const loading = ref(true);

onMounted(async () => {
  await fetchCards();
});

async function fetchCards() {
  loading.value = true;
  try {
    const list = await api.get<GuidanceCard[]>('/guidance-cards');
    guidanceCards.value = list || [];
  } catch (e) {
    console.error('Failed to load guidance cards', e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <BookOpen class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-sm font-extrabold text-slate-800">راهنمای نوین مصوب مدرسه</h2>
        <p class="text-xs text-slate-500">آیین‌نامه و معیارهای تشویقی برای اهدای نوین</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری راهنما...
    </div>

    <!-- Guidance Cards List -->
    <div v-else-if="guidanceCards.length > 0" class="space-y-3">
      <div
        v-for="card in guidanceCards"
        :key="card.id"
        class="bg-white rounded-3xl p-4.5 border border-slate-200 shadow-xs space-y-2"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-xs font-extrabold text-slate-800">
            {{ card.title }}
          </h3>

          <span
            class="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 shrink-0"
          >
            پیشنهادی: {{ card.pointRangeLabel || 'توافقی' }}
          </span>
        </div>

        <p class="text-xs text-slate-600 leading-relaxed">
          {{ card.description }}
        </p>
      </div>
    </div>

    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-200">
      راهنمایی در سامانه ثبت نشده است.
    </div>
  </div>
</template>
