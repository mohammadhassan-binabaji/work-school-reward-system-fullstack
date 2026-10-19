import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type UserMe, type Role, type TierConfiguration } from '@student-reward/shared';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserMe | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const tierConfigurations = ref<TierConfiguration[]>([]);
  const tiersLoading = ref(false);

  const isAuthenticated = computed(() => !!user.value && !!api.getSessionId());
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
    const sessionId = api.getSessionId();
    if (!sessionId) {
      user.value = null;
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const [userData] = await Promise.all([
        api.get<UserMe>('/auth/me'),
        fetchTierConfigurations(),
      ]);
      user.value = userData;
      return true;
    } catch (err: any) {
      console.warn('Failed to fetch user profile:', err);
      api.clearSession();
      user.value = null;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function login(nationalId: string, password: string): Promise<{ success: boolean; message?: string }> {
    loading.value = true;
    error.value = null;
    try {
      const res = await api.post<{ sessionId: string; role: Role; user: any }>('/auth/login', {
        nationalId,
        password,
      });

      if (res.role !== 'STUDENT') {
        api.clearSession();
        error.value = 'این پنل فقط مخصوص دانش‌آموزان است.';
        return { success: false, message: error.value };
      }

      api.setSessionId(res.sessionId);
      await fetchMe();
      return { success: true };
    } catch (err: any) {
      error.value = err.message || 'ورود با خطا مواجه شد';
      return { success: false, message: error.value || undefined };
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    } finally {
      api.clearSession();
      user.value = null;
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
