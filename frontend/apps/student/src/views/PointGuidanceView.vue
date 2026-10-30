<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import {
  BookOpen,
  ChevronDown,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Trophy,
  Award,
  Star,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import OwlMascot from '../components/OwlMascot.vue';
import BottomSheet from '../components/BottomSheet.vue';
import {
  api,
  toPersianDigits,
  type GuidanceCard,
  type GuidanceCategory,
} from '@student-reward/shared';

const authStore = useAuthStore();
const categories = ref<GuidanceCategory[]>([]);
const loading = ref(true);

const expandedCategoryIds = reactive(new Set<string>());

// Modal state
const isModalOpen = ref(false);
const selectedCard = ref<GuidanceCard | null>(null);
const selectedCategoryTitle = ref<string>('');

const studentName = computed(() => {
  if (!authStore.user) return 'دانش‌آموز عزیز';
  return `${authStore.user.firstName} ${authStore.user.lastName}`;
});

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
    // Automatically expand the first category by default if available
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
      text: 'text-neon-cyan',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      badge: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25',
    };
  }
  if (iconKey === 'shield') {
    return {
      text: 'text-neon-green',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      badge: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
    };
  }
  if (iconKey === 'trophy') {
    return {
      text: 'text-neon-gold',
      bg: 'bg-amber-500/10 border-amber-500/30',
      badge: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
    };
  }

  const cycle = idx % 3;
  if (cycle === 0) {
    return {
      text: 'text-neon-cyan',
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      badge: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25',
    };
  } else if (cycle === 1) {
    return {
      text: 'text-neon-green',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      badge: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
    };
  } else {
    return {
      text: 'text-neon-gold',
      bg: 'bg-amber-500/10 border-amber-500/30',
      badge: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
    };
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Hero Orientation Banner -->
    <div class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-red relative overflow-hidden">
      <!-- Background Ambient Glow -->
      <div
        class="absolute -top-16 -right-16 w-36 h-36 bg-neon-red/15 rounded-full blur-2xl pointer-events-none"
      ></div>

      <div class="flex items-center justify-between">
        <div class="space-y-2">
          <span class="text-xs font-semibold text-slate-300">
            سلام، {{ studentName }}!
          </span>
          <h2 class="text-base font-extrabold text-white flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-neon-gold" />
            <span>چطور نوین بگیری؟</span>
          </h2>
          <!-- Explanation pill -->
          <div
            class="inline-block bg-[#0E131D] border border-slate-700/80 px-3 py-1.5 rounded-2xl text-[11px] text-slate-300 leading-tight"
          >
            نوین‌ها توسط معلمان ثبت و به حساب شما افزوده می‌شوند.
          </div>
        </div>
        <OwlMascot size="md" variant="guidance" />
      </div>
    </div>

    <!-- Section Heading -->
    <div class="flex items-center justify-between px-1 pt-1">
      <div class="flex items-center gap-2">
        <BookOpen class="w-4 h-4 text-neon-cyan" />
        <h3 class="text-xs font-bold text-slate-300">
          فعالیت‌های مؤثر برای کسب نوین
        </h3>
      </div>
      <span
        v-if="totalCardsCount > 0"
        class="text-[11px] font-bold text-slate-400 bg-dark-card border border-slate-800 px-2 py-0.5 rounded-full"
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
        class="bg-dark-card rounded-2xl border border-slate-800 overflow-hidden transition-all shadow-xs"
      >
        <!-- Accordion Header (Tap to toggle) -->
        <button
          type="button"
          class="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-right cursor-pointer select-none transition-colors hover:bg-white/[0.03] active:bg-white/[0.06]"
          @click="toggleCategory(cat.id)"
        >
          <!-- Right (Leading) Category Title & Icon -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              :class="[
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border',
                getCategoryColor(idx, cat.iconKey).bg,
                getCategoryColor(idx, cat.iconKey).text,
              ]"
            >
              <component :is="getCategoryIcon(cat.iconKey)" class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <span class="text-xs font-extrabold text-white block truncate">
                {{ cat.title }}
              </span>
              <span class="text-[10px] text-slate-400">
                {{ toPersianDigits(cat.cards?.length || 0) }} مورد
              </span>
            </div>
          </div>

          <!-- Left (Trailing) Chevron Toggle Indicator -->
          <div class="flex items-center gap-2 shrink-0">
            <ChevronDown
              :class="[
                'w-4 h-4 text-slate-400 transition-transform duration-250 ease-out',
                isExpanded(cat.id) ? 'rotate-180 text-neon-cyan' : '',
              ]"
            />
          </div>
        </button>

        <!-- Accordion Content: Activity Table -->
        <div
          v-show="isExpanded(cat.id)"
          class="border-t border-slate-800/80 bg-[#0E131D]/60 transition-all"
        >
          <div v-if="cat.cards && cat.cards.length > 0" class="w-full">
            <!-- Table Header -->
            <div
              class="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
            >
              <span>عنوان فعالیت</span>
              <span>امتیاز پیشنهادی</span>
            </div>

            <!-- Table Rows -->
            <div class="divide-y divide-slate-800/40">
              <div
                v-for="card in cat.cards"
                :key="card.id"
                class="flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] cursor-pointer transition-all hover:bg-white/[0.03] active:bg-neon-green/10"
                @click="openCardModal(card, cat.title)"
              >
                <!-- Right: Activity Title -->
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-bold text-slate-200 line-clamp-1 leading-relaxed">
                    {{ card.title }}
                  </h4>
                </div>

                <!-- Left: Suggested Point Pill -->
                <div class="shrink-0">
                  <span
                    :class="[
                      'inline-block px-2.5 py-1 rounded-xl text-[10px] font-extrabold border',
                      getCategoryColor(idx, cat.iconKey).badge,
                    ]"
                  >
                    {{ toPersianDigits(card.pointRangeLabel || 'توافقی') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- No cards in this category -->
          <div v-else class="py-6 px-4 text-center text-xs text-slate-500 font-medium">
            فعالیتی در این دسته‌بندی تعریف نشده است.
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="py-14 text-center space-y-3 bg-dark-card rounded-3xl p-6 border border-slate-800"
    >
      <OwlMascot size="lg" variant="guidance" class="mx-auto" />
      <h3 class="text-sm font-bold text-white">
        هنوز راهنمایی برای کسب نوین ثبت نشده است
      </h3>
      <p class="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
        به زودی فعالیت‌های جدید توسط مدرسه اضافه خواهد شد. در این فاصله می‌توانید چالش‌ها و جوایز دیگر را بررسی کنید!
      </p>
    </div>

    <!-- Activity Detail Modal (Overlaid Sheet) -->
    <BottomSheet
      :is-open="isModalOpen"
      title="جزئیات فعالیت"
      border-color="green"
      @close="closeModal"
    >
      <div v-if="selectedCard" class="space-y-4 py-2 text-right">
        <!-- Activity Name & Category -->
        <div class="space-y-1.5">
          <div
            v-if="selectedCategoryTitle"
            class="inline-block text-[11px] font-bold text-neon-cyan bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg"
          >
            {{ selectedCategoryTitle }}
          </div>
          <h4 class="text-sm font-extrabold text-white leading-relaxed">
            {{ selectedCard.title }}
          </h4>
        </div>

        <!-- Suggested Point Badge -->
        <div
          class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between"
        >
          <span class="text-xs font-semibold text-slate-300">مقدار نوین پیشنهادی:</span>
          <span class="text-xs font-black text-neon-green">
            {{ toPersianDigits(selectedCard.pointRangeLabel || 'توافقی') }}
          </span>
        </div>

        <!-- Description Body -->
        <div class="space-y-1.5">
          <span class="text-xs font-bold text-slate-400">توضیحات و شرایط انجام:</span>
          <p
            class="text-xs text-slate-300 leading-relaxed font-normal bg-[#0B0E14] p-3.5 rounded-2xl border border-slate-800 whitespace-pre-line"
          >
            {{ selectedCard.description }}
          </p>
        </div>
      </div>

      <template #footer>
        <button
          class="w-full py-3 rounded-2xl bg-neon-green hover:bg-neon-green/90 active:scale-[0.99] text-slate-950 font-black text-xs transition-all shadow-neon-green flex items-center justify-center gap-2 cursor-pointer"
          @click="closeModal"
        >
          <span>متوجه شدم</span>
        </button>
      </template>
    </BottomSheet>
  </div>
</template>
