import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  type VersionCheckResult,
  type UpdateChannelId,
  resolveVersionConfigUrl,
  fetchRemoteVersionConfig,
  getInstalledAppInfo,
  evaluateVersion,
  openUpdateUrl,
  isNativeAndroidPlatform,
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

    // Version alerts and update modals apply exclusively to native Android Capacitor builds
    if (!isNativeAndroidPlatform()) {
      const skippedResult: VersionCheckResult = {
        status: 'UP_TO_DATE',
        installedVersion: 'web',
      };
      result.value = skippedResult;
      isChecking.value = false;
      return skippedResult;
    }

    let installedVersion = 'unknown';
    let installedBuild: string | undefined;
    try {
      const installedInfo = await getInstalledAppInfo();
      installedVersion = installedInfo.version;
      installedBuild = String(installedInfo.versionCode);
      const url = resolveVersionConfigUrl();
      const config = await fetchRemoteVersionConfig(url);
      const evalResult = evaluateVersion(
        installedInfo.version,
        installedInfo.versionCode,
        config,
      );
      result.value = evalResult;
      return evalResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'خطا در بررسی نسخه برنامه';
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

  function performUpdate(channelId: UpdateChannelId): void {
    const channel = result.value?.channels?.find((item) => item.id === channelId);
    if (!channel) {
      throw new Error(`کانال به‌روزرسانی "${channelId}" در نتیجه فعلی وجود ندارد.`);
    }
    openUpdateUrl(channel.updateUrl);
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
