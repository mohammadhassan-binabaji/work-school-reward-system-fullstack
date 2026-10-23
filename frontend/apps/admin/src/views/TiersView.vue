<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Layers, CheckCircle2, AlertCircle, RefreshCw, X, Plus } from 'lucide-vue-next';
import {
  api,
  toPersianDigits,
  TIER_THEME_LIST,
  getTierTheme,
  getDefaultThemeId,
  type TierConfiguration,
} from '@student-reward/shared';

const tiers = ref<TierConfiguration[]>([]);
const newMessages = ref<Record<number, string>>({});
const loading = ref(true);
const saving = ref(false);
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadTiers();
});

async function loadTiers() {
  loading.value = true;
  try {
    const list = await api.get<TierConfiguration[]>('/tiers');
    tiers.value = (list || []).map((t: TierConfiguration) => ({
      ...t,
      themeId: t.themeId || getDefaultThemeId(t.tierNumber),
      motivationalMessages: t.motivationalMessages ? [...t.motivationalMessages] : [],
    })).sort((a: TierConfiguration, b: TierConfiguration) => a.tierNumber - b.tierNumber);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در دریافت سطوح';
  } finally {
    loading.value = false;
  }
}

function handleAddMessage(tierNumber: number) {
  const text = (newMessages.value[tierNumber] || '').trim();
  if (!text) return;

  const tier = tiers.value.find((t) => t.tierNumber === tierNumber);
  if (tier) {
    if (!tier.motivationalMessages) {
      tier.motivationalMessages = [];
    }
    tier.motivationalMessages.push(text);
    newMessages.value[tierNumber] = '';
  }
}

function handleRemoveMessage(tierNumber: number, index: number) {
  const tier = tiers.value.find((t) => t.tierNumber === tierNumber);
  if (tier && tier.motivationalMessages) {
    tier.motivationalMessages.splice(index, 1);
  }
}

async function handleSaveTiers() {
  saving.value = true;
  errorMessage.value = null;
  try {
    const payload = {
      tiers: tiers.value.map((t: TierConfiguration) => ({
        tierNumber: t.tierNumber,
        name: t.name.trim(),
        minPointsThreshold: Number(t.minPointsThreshold),
        themeId: t.themeId || getDefaultThemeId(t.tierNumber),
        motivationalMessages: (t.motivationalMessages || []).map((m) => m.trim()).filter(Boolean),
      })),
    };

    await api.put('/tiers', payload);
    successMessage.value = 'پیکربندی سطوح با موفقیت ذخیره شد.';
    await loadTiers();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ذخیره سطوح';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Layers class="w-6 h-6 text-blue-600" />
          <span>پیکربندی ۵ سطح دانش‌آموزی (Tiers)</span>
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          تعریف حداقل آستانه نوین، عنوان، تم رنگی و پیام‌های انگیزشی اختصاصی هر سطح
        </p>
      </div>

      <button
        :disabled="saving"
        class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 shrink-0"
        @click="handleSaveTiers"
      >
        <RefreshCw v-if="saving" class="w-4 h-4 animate-spin" />
        <span>ذخیره تغییرات سطوح</span>
      </button>
    </div>

    <!-- Alert Notifications -->
    <div
      v-if="successMessage"
      class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <div
      v-if="errorMessage"
      class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Tiers List Form -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال دریافت سطوح...
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="t in tiers"
        :key="t.tierNumber"
        class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start gap-5 transition-all"
      >
        <!-- Right Column (Tier Identity) -->
        <div class="flex items-center gap-3 shrink-0 md:w-44">
          <div
            class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-lg flex items-center justify-center shrink-0 shadow-xs"
          >
            {{ toPersianDigits(t.tierNumber) }}
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-slate-800">
              سطح شماره {{ toPersianDigits(t.tierNumber) }}
            </h3>
            <span class="text-[11px] text-slate-400">شناسه سطح {{ t.tierNumber }}</span>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 w-full space-y-4">
          <!-- Top Row (Right-to-Left inputs) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- 1. Color Theme Dropdown -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-bold text-slate-600">
                  انتخاب تم رنگی (Color Theme):
                </label>
                <!-- Color swatch preview dot -->
                <span
                  class="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs inline-block"
                  :style="{ backgroundColor: getTierTheme(t.themeId, t.tierNumber).primary }"
                  :title="getTierTheme(t.themeId, t.tierNumber).nameFa"
                ></span>
              </div>
              <div class="relative">
                <select
                  v-model="t.themeId"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 transition-colors appearance-none cursor-pointer"
                >
                  <option
                    v-for="theme in TIER_THEME_LIST"
                    :key="theme.id"
                    :value="theme.id"
                  >
                    {{ theme.nameFa }}
                  </option>
                </select>
                <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                  ▼
                </div>
              </div>
            </div>

            <!-- 2. Tier Title Input -->
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">عنوان سطح:</label>
              <input
                v-model="t.name"
                type="text"
                placeholder="مثال: برنز، نقره‌ای..."
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <!-- 3. Minimum Points Input -->
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">حداقل نوین:</label>
              <input
                v-model="t.minPointsThreshold"
                type="number"
                min="0"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <!-- Bottom Row (Motivational Messages) -->
          <div class="pt-3 border-t border-slate-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold text-slate-600">
                پیام‌های انگیزشی (Motivation Messages):
              </span>
              <span class="text-[10px] text-slate-400">
                {{ toPersianDigits(t.motivationalMessages?.length || 0) }} پیام ثبت شده
              </span>
            </div>

            <!-- Chips list -->
            <div class="flex flex-wrap items-center gap-2">
              <div
                v-for="(msg, idx) in t.motivationalMessages"
                :key="idx"
                class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 transition-colors"
              >
                <span>{{ msg }}</span>
                <button
                  type="button"
                  class="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="حذف پیام"
                  @click="handleRemoveMessage(t.tierNumber, idx)"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>

              <!-- Inline Add Message Form -->
              <div class="inline-flex items-center gap-1.5 min-w-[220px] flex-1 sm:flex-initial">
                <input
                  v-model="newMessages[t.tierNumber]"
                  type="text"
                  placeholder="+ افزودن پیام جدید..."
                  class="bg-slate-50 border border-dashed border-slate-300 rounded-full px-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all w-full sm:w-64"
                  @keydown.enter.prevent="handleAddMessage(t.tierNumber)"
                />
                <button
                  type="button"
                  class="p-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
                  title="افزودن پیام"
                  @click="handleAddMessage(t.tierNumber)"
                >
                  <Plus class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
