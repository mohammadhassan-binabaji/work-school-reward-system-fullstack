import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type UserMe, type Role } from '@student-reward/shared';

export const useAuthStore = defineStore('adminAuth', () => {
  const user = ref<UserMe | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value && !!api.getSessionId());
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  async function fetchMe(): Promise<boolean> {
    const sessionId = api.getSessionId();
    if (!sessionId) {
      user.value = null;
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const data = await api.get<UserMe>('/auth/me');
      user.value = data;
      return true;
    } catch (err: any) {
      console.warn('Failed to fetch admin profile:', err);
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

      if (res.role !== 'ADMIN') {
        api.clearSession();
        error.value = 'این پنل فقط مخصوص مدیران سیستم است.';
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
      // Ignore
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
    isAdmin,
    fetchMe,
    login,
    logout,
  };
});
