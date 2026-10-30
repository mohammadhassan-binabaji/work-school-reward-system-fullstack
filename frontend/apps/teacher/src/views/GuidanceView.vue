<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  ShieldCheck,
  Trophy,
  Star,
  Award,
  Coins,
  ArrowLeft,
  X,
} from 'lucide-vue-next';
import {
  api,
  toPersianDigits,
  type GuidanceCard,
  type GuidanceCategory,
} from '@student-reward/shared';

const router = useRouter();
const categories = ref<GuidanceCategory[]>([]);
const loading = ref(true);

// Multi-expand accordion state
const expandedCategoryIds = reactive(new Set<string>());

// Card detail modal state
const isModalOpen = ref(false);
const selectedCard = ref<GuidanceCard | null>(null);
const selectedCategoryTitle = ref<string>('');

const totalCardsCount = computed(() => {
  return categories.value.reduce((acc, cat) => acc + (cat.cards?.length || 0), 0);
});

onMounted(async () => {
  await fetchGuidanceData();
});

async function fetchGuidanceData() {
  loading.value = true;
  try {
    const list = await api.get<GuidanceCategory[]>('/guidance-categories');
    categories.value = list || [];
    // Automatically expand the first category by default
    if (categories.value.length > 0) {
      expandedCategoryIds.add(categories.value[0].id);
    }
  } catch (e) {
    console.error('Failed to load guidance categories', e);
  } finally {
    loading.value = false;
  }
}

function toggleCategory(categoryId: string) {
  if (expandedCategoryIds.has(categoryId)) {
    expandedCategoryIds.delete(categoryId);
  } else {
    expandedCategoryIds.add(categoryId);
  }
}

function isExpanded(categoryId: string): boolean {
  return expandedCategoryIds.has(categoryId);
}

function openCardModal(card: GuidanceCard, categoryTitle: string) {
  selectedCard.value = card;
  selectedCategoryTitle.value = categoryTitle;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  selectedCard.value = null;
}

function goToAward() {
  closeModal();
  router.push('/');
}

// Lock body scrolling when modal is open
watch(
  () => isModalOpen.value,
  (open) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = open ? 'hidden' : '';
    }
  },
);

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

function getCategoryIcon(iconKey?: string | null) {
  switch (iconKey) {
    case 'graduation-cap':
      return GraduationCap;
    case 'shield':
      return ShieldCheck;
    case 'trophy':
      return Trophy;
    case 'star':
      return Star;
    default:
      return Award;
  }
}

function getCategoryColor(idx: number, iconKey?: string | null) {
  if (iconKey === 'graduation-cap') {
    return {
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    };
  }
  if (iconKey === 'shield') {
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    };
  }
  if (iconKey === 'trophy') {
    return {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }
  if (iconKey === 'star') {
    return {
      text: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badge: 'text-purple-700 bg-purple-50 border-purple-200',
    };
  }

  const cycle = idx % 3;
  if (cycle === 0) {
    return {
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    };
  } else if (cycle === 1) {
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    };
  } else {
    return {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'text-amber-700 bg-amber-50 border-amber-200',
    };
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Header Banner -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <BookOpen class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-extrabold text-slate-800">راهنمای نوین مصوب مدرسه</h2>
          <p class="text-xs text-slate-500">آیین‌نامه و معیارهای تشویقی برای اهدای نوین</p>
        </div>
      </div>

      <span
        v-if="totalCardsCount > 0"
        class="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 shrink-0"
      >
        {{ toPersianDigits(totalCardsCount) }} فعالیت
      </span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری راهنمای نوین...
    </div>

    <!-- Categories Accordion List -->
    <div v-else-if="categories.length > 0 && totalCardsCount > 0" class="space-y-3">
      <div
        v-for="(cat, idx) in categories"
        :key="cat.id"
        class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
      >
        <!-- Category Accordion Header -->
        <button
          type="button"
          class="w-full p-4 flex items-center justify-between gap-3 text-right cursor-pointer select-none transition-colors hover:bg-slate-50/80"
          @click="toggleCategory(cat.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              :class="[
                'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border',
                getCategoryColor(idx, cat.iconKey).bg,
                getCategoryColor(idx, cat.iconKey).text,
                getCategoryColor(idx, cat.iconKey).border,
              ]"
            >
              <component :is="getCategoryIcon(cat.iconKey)" class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <h3 class="text-xs font-extrabold text-slate-800 truncate">
                {{ cat.title }}
              </h3>
              <span class="text-[11px] text-slate-400 font-medium block mt-0.5">
                {{ toPersianDigits(cat.cards?.length || 0) }} فعالیت مصوب
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <div
              :class="[
                'w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-all duration-200',
                isExpanded(cat.id) ? 'rotate-180 bg-indigo-50 text-indigo-600' : '',
              ]"
            >
              <ChevronDown class="w-4 h-4" />
            </div>
          </div>
        </button>

        <!-- Category Content: Activity Table -->
        <div v-show="isExpanded(cat.id)" class="border-t border-slate-100 bg-slate-50/50">
          <div v-if="cat.cards && cat.cards.length > 0" class="w-full">
            <!-- Table Header -->
            <div
              class="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 bg-slate-100/60"
            >
              <span class="col-span-7">عنوان فعالیت</span>
              <span class="col-span-3 text-center">امتیاز پیشنهادی</span>
              <span class="col-span-2 text-left">اقدام</span>
            </div>

            <!-- Table Rows -->
            <div class="divide-y divide-slate-100">
              <div
                v-for="card in cat.cards"
                :key="card.id"
                class="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-white transition-colors cursor-pointer group"
                @click="openCardModal(card, cat.title)"
              >
                <!-- Title & snippet -->
                <div class="col-span-7 min-w-0 pr-1">
                  <span
                    class="text-xs font-bold text-slate-800 block truncate group-hover:text-indigo-600 transition-colors"
                  >
                    {{ card.title }}
                  </span>
                  <span class="text-[10px] text-slate-400 truncate block mt-0.5">
                    {{ card.description }}
                  </span>
                </div>

                <!-- Suggested Points -->
                <div class="col-span-3 text-center">
                  <span
                    :class="[
                      'inline-block text-[11px] font-black px-2.5 py-1 rounded-xl border shrink-0',
                      getCategoryColor(idx, cat.iconKey).badge,
                    ]"
                  >
                    {{ toPersianDigits(card.pointRangeLabel || 'توافقی') }}
                  </span>
                </div>

                <!-- Quick Action Button -->
                <div class="col-span-2 flex items-center justify-end">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all shadow-2xs flex items-center gap-1 shrink-0"
                    title="اهدای پاداش"
                    @click.stop="goToAward"
                  >
                    <span>اهدا</span>
                    <ArrowLeft class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- No cards in this category -->
          <div v-else class="py-6 px-4 text-center text-xs text-slate-400 font-medium">
            فعالیتی در این دسته‌بندی تعریف نشده است.
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="bg-white rounded-3xl p-8 text-center text-slate-500 text-xs border border-slate-200 space-y-2"
    >
      <div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
        <BookOpen class="w-6 h-6" />
      </div>
      <p class="font-bold text-slate-700">راهنمایی در سامانه ثبت نشده است.</p>
      <p class="text-[11px] text-slate-400">به زودی آیین‌نامه و معیارهای تشویقی جدید توسط مدرسه اضافه خواهد شد.</p>
    </div>

    <!-- Activity Detail Modal -->
    <Teleport to="body">
      <div
        v-if="isModalOpen"
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <div
          class="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden transition-all my-8 animate-in fade-in zoom-in-95 duration-150"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen class="w-4 h-4" />
              </div>
              <h3 class="text-xs font-extrabold text-slate-800">
                جزئیات فعالیت تشویقی
              </h3>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              @click="closeModal"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Body -->
          <div v-if="selectedCard" class="p-5 space-y-4 text-right">
            <div>
              <span
                class="inline-block text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg mb-1.5"
              >
                {{ selectedCategoryTitle }}
              </span>
              <h4 class="text-sm font-extrabold text-slate-900 leading-snug">
                {{ selectedCard.title }}
              </h4>
            </div>

            <!-- Points info box -->
            <div
              class="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between"
            >
              <div class="flex items-center gap-2 text-indigo-900 text-xs font-bold">
                <Coins class="w-4 h-4 text-indigo-600" />
                <span>نوین پیشنهادی مصوب:</span>
              </div>
              <span class="text-xs font-black text-indigo-700">
                {{ toPersianDigits(selectedCard.pointRangeLabel || 'توافقی') }}
              </span>
            </div>

            <!-- Description -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold text-slate-500 block">شرح و شرایط آیین‌نامه:</span>
              <div
                class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap"
              >
                {{ selectedCard.description }}
              </div>
            </div>

            <!-- Action CTA -->
            <div class="pt-2">
              <button
                type="button"
                class="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                @click="goToAward"
              >
                <span>ثبت و اهدای نوین برای این فعالیت</span>
                <ArrowLeft class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

