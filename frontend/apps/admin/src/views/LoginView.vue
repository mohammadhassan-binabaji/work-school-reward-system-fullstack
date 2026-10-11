<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogIn, Lock, User, RefreshCw, AlertCircle, Shield } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

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
    <!-- Top Branding -->
    <div class="text-center space-y-3 mb-8">
      <div
        class="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30"
      >
        <Shield class="w-9 h-9" />
      </div>
      <h1 class="text-xl font-black text-slate-800 tracking-tight">
        سامانه پاداش دانش‌آموزی
      </h1>
      <p class="text-xs text-slate-500 font-medium">
        ورود به پنل مدیریت سیستم (Admin)
      </p>
    </div>

    <!-- Login Card -->
    <div class="w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">کد ملی (۱۰ رقم):</label>
        <div class="relative">
          <input
            v-model="nationalId"
            type="text"
            maxlength="10"
            placeholder="مثال: ۱۱۱۱۱۱۱۱۱۱"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-sans"
            @keyup.enter="handleLogin"
          />
          <User class="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1.5">رمز عبور مدیر:</label>
        <div class="relative">
          <input
            v-model="password"
            type="password"
            placeholder="رمز عبور حساب کاربری"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
            @keyup.enter="handleLogin"
          />
          <Lock class="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>
      </div>

      <!-- Error alert -->
      <div
        v-if="errorMessage"
        class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2"
      >
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Submit button -->
      <button
        :disabled="loading"
        class="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold text-xs shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
        @click="handleLogin"
      >
        <RefreshCw v-if="loading" class="w-4 h-4 animate-spin" />
        <LogIn v-else class="w-4 h-4" />
        <span>{{ loading ? 'در حال احراز هویت...' : 'ورود به پنل مدیریت' }}</span>
      </button>
    </div>

    <!-- Security notice -->
    <p class="text-[11px] text-slate-400 text-center mt-6">
      این بخش محرمانه است و تمامی فعالیت‌ها ثبت و ممیزی می‌شوند.
    </p>
  </div>
</template>
