import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type UserMe, type Role, type TierConfiguration } from '@student-reward/shared';
import { clearNativeSession, isAndroidApp, storeNativeSession } from '../services/nativeAuth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserMe | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const tierConfigurations = ref<TierConfiguration[]>([]);
  const tiersLoading = ref(false);

  const isAuthenticated = computed(() => !!user.value && (!isAndroidApp() || !!api.getSessionId()));
  const isStudent = computed(() => user.value?.role === 'STUDENT');
  const currentBalance = computed(() => user.value?.studentProfile?.currentBalance ?? 0);
  const reservedBalance = computed(() => user.value?.studentProfile?.reservedBalance ?? 0);
  const currentTierId = computed(() => user.value?.studentProfile?.currentTierId ?? null);

  const currentTier = computed<TierConfiguration | null>(() => {
    if (tierConfigurations.value.length === 0) return null;
    const tierId = currentTierId.value;
    if (!tierId) return tierConfigurations.value[0] ?? null;
    return tierConfigurations.value.find((t) => t.id === tierId) ?? tierConfigurations.value[0] ?? null;
  });

  const nextTier = computed<TierConfiguration | null>(() => {
    if (!currentTier.value) return null;
    const nextTierNumber = currentTier.value.tierNumber + 1;
    return tierConfigurations.value.find((t) => t.tierNumber === nextTierNumber) ?? null;
  });

  async function fetchTierConfigurations(force = false): Promise<TierConfiguration[]> {
    if (!force && tierConfigurations.value.length > 0) {
      return tierConfigurations.value;
    }
    tiersLoading.value = true;
    try {
      const data = await api.get<TierConfiguration[]>('/tiers');
      tierConfigurations.value = [...data].sort((a, b) => a.tierNumber - b.tierNumber);
      return tierConfigurations.value;
    } catch (err: any) {
      console.warn('Failed to fetch tier configurations:', err);
      return [];
    } finally {
      tiersLoading.value = false;
    }
  }

  async function fetchMe(): Promise<boolean> {
    if (isAndroidApp() && !api.getSessionId()) {
      user.value = null;
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      if (!isAndroidApp()) {
        await api.loadCsrfToken();
      }
      const [userData] = await Promise.all([
        api.get<UserMe>('/auth/me'),
        fetchTierConfigurations(),
      ]);
      user.value = userData;
      return true;
    } catch (err: any) {
      console.warn('Failed to fetch user profile:', err);
      user.value = null;
      if (isAndroidApp() && err?.statusCode === 401) {
        try {
          await clearNativeSession();
        } catch (cleanupError) {
          console.error('Failed to clear the expired Android session:', cleanupError);
        }
      }
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function login(
    nationalId: string,
    password: string,
    rememberMe = false,
  ): Promise<{ success: boolean; message?: string }> {
    loading.value = true;
    error.value = null;
    let mobileSessionId: string | null = null;
    try {
      const nativeApp = isAndroidApp();
      const res = await api.post<{ sessionId?: string; role: Role; user: any }>(
        nativeApp ? '/auth/mobile-login' : '/auth/login',
        {
        nationalId,
        password,
          rememberMe,
          client: 'student',
        },
      );

      if (res.role !== 'STUDENT') {
        error.value = 'این پنل فقط مخصوص دانش‌آموزان است.';
        return { success: false, message: error.value };
      }

      if (nativeApp) {
        if (!res.sessionId) {
          throw new Error('نشست امن برنامه دانش‌آموز دریافت نشد.');
        }
        mobileSessionId = res.sessionId;
        await storeNativeSession(res.sessionId, rememberMe);
      }

      if (!(await fetchMe())) {
        await api.post('/auth/logout').catch((logoutError) => {
          console.error('Failed to revoke student session after profile loading failed:', logoutError);
        });
        try {
          await clearNativeSession();
        } catch (cleanupError) {
          console.error('Failed to clear the Android session after profile loading failed:', cleanupError);
        }
        error.value = 'ورود انجام شد، اما دریافت اطلاعات حساب ناموفق بود. دوباره تلاش کنید.';
        return { success: false, message: error.value };
      }
      return { success: true };
    } catch (err: any) {
      if (mobileSessionId) {
        api.setNativeSessionId(mobileSessionId);
        await api.post('/auth/logout').catch((logoutError) => {
          console.error('Failed to revoke Android session after login completion failed:', logoutError);
        });
        try {
          await clearNativeSession();
        } catch (cleanupError) {
          console.error('Failed to clear the Android session after login failed:', cleanupError);
        }
      }
      error.value = err.message || 'ورود با خطا مواجه شد';
      return { success: false, message: error.value || undefined };
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Failed to log out student session:', error);
    } finally {
      user.value = null;
      try {
        await clearNativeSession();
      } catch (error) {
        console.error('Failed to clear the protected Android session:', error);
      }
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isStudent,
    currentBalance,
    reservedBalance,
    currentTierId,
    currentTier,
    nextTier,
    tierConfigurations,
    tiersLoading,
    fetchTierConfigurations,
    fetchMe,
    login,
    logout,
  };
});
