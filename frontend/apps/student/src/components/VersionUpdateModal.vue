<script setup lang="ts">
import { computed } from 'vue';
import { useVersionStore } from '../stores/version';
import { Download, AlertTriangle, RefreshCw, X, ShieldAlert } from 'lucide-vue-next';

const versionStore = useVersionStore();

const isMandatory = computed(() => versionStore.isMandatoryUpdate);
const isOptional = computed(() => versionStore.isOptionalUpdate);
const hasError = computed(() => versionStore.hasError && !versionStore.isChecking);

const result = computed(() => versionStore.result);

function onUpdate() {
  versionStore.performUpdate();
}

function onDismissOptional() {
  versionStore.dismissOptionalUpdate();
}

function onRetry() {
  versionStore.checkVersion();
}
</script>

<template>
  <!-- 1. Mandatory Blocking Full-Screen Modal (RTL, Dark Gaming Theme) -->
  <Teleport to="body">
    <div
      v-if="isMandatory"
      class="fixed inset-0 z-[9999] bg-[#0A0E1A] flex flex-col items-center justify-center p-6 text-center select-none"
      dir="rtl"
    >
      <div class="w-full max-w-sm bg-[#121722] border-2 border-neon-red/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,61,0,0.3)] flex flex-col items-center">
        <!-- Icon -->
        <div class="w-16 h-16 rounded-2xl bg-neon-red/10 border border-neon-red/40 flex items-center justify-center text-neon-red mb-5 shadow-[0_0_20px_rgba(255,61,0,0.2)]">
          <ShieldAlert class="w-9 h-9" />
        </div>

        <h2 class="text-xl font-bold text-white mb-2">
          به‌روزرسانی الزامی برنامه
        </h2>

        <p class="text-slate-300 text-sm leading-relaxed mb-4">
          {{ result?.message || 'برای ادامه استفاده از سامانه پاداش دانش‌آموزی، نصب جدیدترین نسخه الزامی است.' }}
        </p>

        <!-- Version Comparison Badges -->
        <div class="w-full bg-[#0B0E14] rounded-xl p-3 border border-slate-800 mb-6 flex justify-around text-xs">
          <div class="text-slate-400">
            نسخه فعلی شما:
            <span class="text-neon-red font-mono font-bold block mt-1">{{ result?.installedVersion }}</span>
          </div>
          <div class="w-px bg-slate-800"></div>
          <div class="text-slate-400">
            حداقل نسخه مجاز:
            <span class="text-neon-green font-mono font-bold block mt-1">{{ result?.minimumVersion }}</span>
          </div>
        </div>

        <!-- Action Button -->
        <button
          type="button"
          class="w-full py-3.5 px-4 rounded-xl bg-neon-red text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,61,0,0.4)] hover:brightness-110 active:scale-95 transition-all"
          @click="onUpdate"
        >
          <Download class="w-5 h-5" />
          <span>دریافت و نصب نسخه جدید</span>
        </button>
      </div>
    </div>
  </Teleport>

  <!-- 2. Non-Blocking Optional Update Toast/Banner -->
  <Teleport to="body">
    <div
      v-if="isOptional && !isMandatory"
      class="fixed bottom-20 inset-x-4 max-w-md mx-auto z-40 bg-[#121722]/95 backdrop-blur-md border border-neon-cyan/40 rounded-2xl p-4 shadow-[0_4px_25px_rgba(0,229,255,0.2)]"
      dir="rtl"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shrink-0 mt-0.5">
          <Download class="w-5 h-5" />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-white">
              نسخه جدید در دسترس است
            </h4>
            <button
              type="button"
              class="text-slate-400 hover:text-white p-1"
              @click="onDismissOptional"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <p class="text-xs text-slate-300 mt-1">
            نسخه {{ result?.latestVersion }} منتشر شده است. پیشنهاد می‌کنیم برنامه را به‌روزرسانی فرمایید.
          </p>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="py-1.5 px-3 rounded-lg bg-neon-cyan text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
              @click="onUpdate"
            >
              <Download class="w-3.5 h-3.5" />
              <span>به‌روزرسانی</span>
            </button>
            <button
              type="button"
              class="py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
              @click="onDismissOptional"
            >
              بعداً
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 3. Network / Check Error Retry Banner (Non-Blocking) -->
  <Teleport to="body">
    <div
      v-if="hasError && !isMandatory"
      class="fixed top-3 inset-x-4 max-w-md mx-auto z-40 bg-amber-950/90 border border-amber-600/40 rounded-xl p-3 shadow-lg flex items-center justify-between text-xs text-amber-200"
      dir="rtl"
    >
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-amber-400 shrink-0" />
        <span>عدم دسترسی به سرور نسخه.</span>
      </div>
      <button
        type="button"
        class="flex items-center gap-1 bg-amber-800/80 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg transition-colors font-medium"
        @click="onRetry"
      >
        <RefreshCw class="w-3 h-3" />
        <span>تلاش مجدد</span>
      </button>
    </div>
  </Teleport>
</template>
