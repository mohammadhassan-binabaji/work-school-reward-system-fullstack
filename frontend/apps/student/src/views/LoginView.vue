<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogIn, Lock, User, RefreshCw, AlertCircle } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import brandImage from '../assets/images/brand.png';

const router = useRouter();
const authStore = useAuthStore();

const nationalId = ref('');
const password = ref('');
const errorMessage = ref<string | null>(null);
const loading = ref(false);

async function handleLogin() {
  errorMessage.value = null;

  if (!nationalId.value.trim() || nationalId.value.trim().length !== 10) {
    errorMessage.value = 'کد ملی باید دقیقاً ۱۰ رقم باشد.';
    return;
  }

  if (!password.value) {
    errorMessage.value = 'لطفاً رمز عبور را وارد کنید.';
    return;
  }

  loading.value = true;
  try {
    const res = await authStore.login(nationalId.value.trim(), password.value);
    if (res.success) {
      router.push('/');
    } else {
      errorMessage.value = res.message || 'ورود ناموفق بود';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center px-5 py-8 max-w-sm mx-auto">
    <!-- Top Brand & Welcome -->
    <div class="text-center space-y-3 mb-8">
      <div class="w-72 h-72 mx-auto flex items-center justify-center">
        <img :src="brandImage" alt="نوین من" class="w-full h-full object-contain" />
      </div>
      <h1 class="text-2xl font-black text-white tracking-tight">
        نوین من
      </h1>
      <p class="text-sm font-bold text-slate-300">
        سامانه پاداش دانش‌آموزی
      </p>
      <p class="text-xs text-slate-400">
        ورود به پنل دانش‌آموز با کد ملی و رمز عبور
      </p>
    </div>

    <!-- Login Card -->
    <div
      class="w-full bg-dark-card rounded-3xl p-6 border-1.5 neon-border-green shadow-2xl space-y-4"
    >
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">کد ملی (۱۰ رقم):</label>
        <div class="relative">
          <input
            v-model="nationalId"
            type="text"
            maxlength="10"
            placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
            class="w-full bg-[#0F1420] border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-green transition-colors font-sans"
            @keyup.enter="handleLogin"
          />
          <User class="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">رمز عبور:</label>
        <div class="relative">
          <input
            v-model="password"
            type="password"
            placeholder="رمز عبور حساب کاربری"
            class="w-full bg-[#0F1420] border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-green transition-colors"
            @keyup.enter="handleLogin"
          />
          <Lock class="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>
      </div>

      <!-- Error alert -->
      <div
        v-if="errorMessage"
        class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
      >
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Submit button -->
      <button
        :disabled="loading"
        class="w-full py-3.5 rounded-2xl bg-neon-green text-[#0B0E14] font-black text-xs shadow-neon-green hover:bg-neon-green-light disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
        @click="handleLogin"
      >
        <RefreshCw v-if="loading" class="w-4 h-4 animate-spin" />
        <LogIn v-else class="w-4 h-4" />
        <span>{{ loading ? 'در حال ورود...' : 'ورود به سامانه' }}</span>
      </button>
    </div>

    <!-- Info note -->
    <p class="text-[11px] text-slate-500 text-center mt-6">
      در صورت فراموشی رمز عبور یا مشکل در ورود، به مدیر مدرسه مراجعه کنید.
    </p>
  </div>
</template>
