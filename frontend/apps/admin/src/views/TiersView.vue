<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Layers, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-vue-next';
import { api, toPersianDigits, type TierConfiguration } from '@student-reward/shared';

const tiers = ref<TierConfiguration[]>([]);
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
    tiers.value = (list || []).sort((a: TierConfiguration, b: TierConfiguration) => a.tierNumber - b.tierNumber);
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در دریافت سطوح';
  } finally {
    loading.value = false;
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
  <div class="space-y-6 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Layers class="w-6 h-6 text-blue-600" />
          <span>پیکربندی ۵ سطح دانش‌آموزی (Tiers)</span>
        </h1>
        <p class="text-xs text-slate-500 mt-0.5">
          تعریف حداقل آستانه نوین مورد نیاز و عنوان فارسی هر سطح جهت ارتقای گیمیفیکیشن دانش‌آموزان
        </p>
      </div>

      <button
        :disabled="saving"
        class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
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

    <div v-else class="space-y-3">
      <div
        v-for="t in tiers"
        :key="t.tierNumber"
        class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-lg flex items-center justify-center shrink-0"
          >
            {{ toPersianDigits(t.tierNumber) }}
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-slate-800">
              سطح شماره {{ toPersianDigits(t.tierNumber) }}
            </h3>
            <span class="text-xs text-slate-400">آستانه ورودی به این سطح</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">عنوان سطح:</label>
            <input
              v-model="t.name"
              type="text"
              class="w-full sm:w-44 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">حداقل نوین:</label>
            <input
              v-model="t.minPointsThreshold"
              type="number"
              min="0"
              class="w-full sm:w-36 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
