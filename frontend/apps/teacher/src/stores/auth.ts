import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type UserMe, type Role } from '@student-reward/shared';

export const useAuthStore = defineStore('teacherAuth', () => {
  const user = ref<UserMe | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const isTeacher = computed(() => user.value?.role === 'TEACHER');
  const pointBalance = computed(() => user.value?.teacherProfile?.pointBalance ?? 0);

  async function fetchMe(): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await api.loadCsrfToken();
      const data = await api.get<UserMe>('/auth/me');
      user.value = data;
      return true;
    } catch (err: any) {
      console.warn('Failed to fetch teacher profile:', err);
      user.value = null;
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
    try {
      const res = await api.post<{ role: Role; user: any }>('/auth/login', {
        nationalId,
        password,
        rememberMe,
        client: 'teacher',
      });

      if (res.role !== 'TEACHER') {
        error.value = 'این پنل فقط مخصوص معلمان محترم است.';
        return { success: false, message: error.value };
      }

      if (!(await fetchMe())) {
        await api.post('/auth/logout').catch((logoutError) => {
          console.error('Failed to revoke teacher session after profile loading failed:', logoutError);
        });
        error.value = 'ورود انجام شد، اما دریافت اطلاعات حساب ناموفق بود. دوباره تلاش کنید.';
        return { success: false, message: error.value };
      }
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
    } catch (error) {
      console.error('Failed to log out teacher session:', error);
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
    isTeacher,
    pointBalance,
    fetchMe,
    login,
    logout,
  };
});
