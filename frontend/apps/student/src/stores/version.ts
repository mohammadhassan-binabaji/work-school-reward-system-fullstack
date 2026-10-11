import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  type VersionCheckResult,
  resolveVersionConfigUrl,
  fetchRemoteVersionConfig,
  getInstalledAppInfo,
  evaluateVersion,
  openUpdateUrl,
} from '../services/versionService';

export const useVersionStore = defineStore('app-version', () => {
  const result = ref<VersionCheckResult | null>(null);
  const isChecking = ref(false);
  const checkError = ref<string | null>(null);
  const isOptionalUpdateDismissed = ref(false);

  const isMandatoryUpdate = computed(() => result.value?.status === 'FORCE_UPDATE');
  const isOptionalUpdate = computed(
    () => result.value?.status === 'OPTIONAL_UPDATE' && !isOptionalUpdateDismissed.value,
  );
  const hasError = computed(() => result.value?.status === 'ERROR' || !!checkError.value);

  async function checkVersion(): Promise<VersionCheckResult> {
    isChecking.value = true;
    checkError.value = null;

    const { version: installedVersion, build: installedBuild } = await getInstalledAppInfo();

    try {
      const url = resolveVersionConfigUrl();
      const config = await fetchRemoteVersionConfig(url);
      const evalResult = evaluateVersion(installedVersion, config, installedBuild);
      result.value = evalResult;
      return evalResult;
    } catch (err: any) {
      const message = err.message || 'خطا در بررسی نسخه برنامه';
      checkError.value = message;
      const errorResult: VersionCheckResult = {
        status: 'ERROR',
        installedVersion,
        installedBuild,
        error: message,
      };
      result.value = errorResult;
      return errorResult;
    } finally {
      isChecking.value = false;
    }
  }

  function dismissOptionalUpdate(): void {
    isOptionalUpdateDismissed.value = true;
  }

  function performUpdate(): void {
    if (result.value?.updateUrl) {
      openUpdateUrl(result.value.updateUrl);
    }
  }

  return {
    result,
    isChecking,
    checkError,
    isOptionalUpdateDismissed,
    isMandatoryUpdate,
    isOptionalUpdate,
    hasError,
    checkVersion,
    dismissOptionalUpdate,
    performUpdate,
  };
});
