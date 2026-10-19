<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { BookOpen, Award, ShieldCheck, GraduationCap, Sparkles } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import OwlMascot from '../components/OwlMascot.vue';
import { api, type GuidanceCard } from '@student-reward/shared';

const authStore = useAuthStore();
const guidanceCards = ref<GuidanceCard[]>([]);
const loading = ref(true);

const studentName = computed(() => {
  if (!authStore.user) return 'دانش‌آموز عزیز';
  return `${authStore.user.firstName} ${authStore.user.lastName}`;
});

onMounted(async () => {
  await fetchGuidanceCards();
});

async function fetchGuidanceCards() {
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

function getCardTheme(idx: number): {
  border: string;
  glow: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  icon: any;
} {
  const cycle = idx % 3;
  if (cycle === 0) {
    return {
      border: 'neon-border-green',
      glow: 'shadow-neon-green',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
      badgeText: 'text-neon-green',
      icon: ShieldCheck,
    };
  } else if (cycle === 1) {
    return {
      border: 'neon-border-cyan',
      glow: 'shadow-neon-cyan',
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
      badgeText: 'text-neon-cyan',
      icon: GraduationCap,
    };
  } else {
    return {
      border: 'neon-border-gold',
      glow: 'shadow-neon-gold',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/30',
      badgeText: 'text-neon-gold',
      icon: Award,
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
    <div class="flex items-center gap-2 px-1 pt-1">
      <BookOpen class="w-4 h-4 text-neon-cyan" />
      <h3 class="text-xs font-bold text-slate-300">
        فعالیت‌های مؤثر برای کسب نوین
      </h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال بارگذاری راهنمای نوین...
    </div>

    <!-- Guidance Cards Feed (Strictly Read-Only) -->
    <div v-else-if="guidanceCards.length > 0" class="space-y-3.5">
      <div
        v-for="(card, idx) in guidanceCards"
        :key="card.id"
        :class="[
          'bg-dark-card rounded-3xl p-4.5 border-1.5 transition-all select-none',
          getCardTheme(idx).border,
        ]"
      >
        <div class="flex items-start gap-3.5">
          <!-- Icon Category Badge -->
          <div
            :class="[
              'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5',
              getCardTheme(idx).iconBg,
              getCardTheme(idx).iconColor,
            ]"
          >
            <component :is="getCardTheme(idx).icon" class="w-6 h-6" />
          </div>

          <!-- Card Body -->
          <div class="flex-1 space-y-1.5">
            <h4 class="text-sm font-extrabold text-white leading-snug">
              {{ card.title }}
            </h4>
            <p class="text-xs text-slate-400 leading-relaxed font-normal">
              {{ card.description }}
            </p>

            <!-- Suggested Points Pill -->
            <div class="pt-2">
              <span
                :class="[
                  'inline-block px-3 py-1 rounded-xl text-[11px] font-bold border',
                  getCardTheme(idx).badgeBg,
                  getCardTheme(idx).badgeText,
                ]"
              >
                مقدار پیشنهادی: {{ card.pointRangeLabel || 'توافقی' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-14 text-center space-y-3 bg-dark-card rounded-3xl p-6 border border-slate-800">
      <OwlMascot size="lg" variant="guidance" class="mx-auto" />
      <h3 class="text-sm font-bold text-white">
        هنوز راهنمایی برای کسب نوین ثبت نشده است
      </h3>
      <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
        به زودی فعالیت‌های جدید توسط مدرسه اضافه خواهد شد. در این فاصله می‌توانید چالش‌ها و جوایز دیگر را بررسی کنید!
      </p>
    </div>
  </div>
</template>
