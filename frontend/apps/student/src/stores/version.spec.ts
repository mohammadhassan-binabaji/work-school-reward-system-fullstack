import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVersionStore } from './version';
import * as versionService from '../services/versionService';

describe('useVersionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bypasses remote check and reports UP_TO_DATE when running on web / PWA', async () => {
    vi.spyOn(versionService, 'isNativeAndroidPlatform').mockReturnValue(false);
    const fetchSpy = vi.spyOn(versionService, 'fetchRemoteVersionConfig');

    const store = useVersionStore();
    const result = await store.checkVersion();

    expect(result.status).toBe('UP_TO_DATE');
    expect(result.installedVersion).toBe('web');
    expect(store.isMandatoryUpdate).toBe(false);
    expect(store.isOptionalUpdate).toBe(false);
    expect(store.hasError).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('performs version check and identifies FORCE_UPDATE when running on native Android', async () => {
    vi.spyOn(versionService, 'isNativeAndroidPlatform').mockReturnValue(true);
    vi.spyOn(versionService, 'getInstalledAppInfo').mockResolvedValue({
      version: '1.0.0',
      build: '1',
    });
    vi.spyOn(versionService, 'resolveVersionConfigUrl').mockReturnValue('/app-version.json');
    vi.spyOn(versionService, 'fetchRemoteVersionConfig').mockResolvedValue({
      platform: 'android',
      latestVersion: '2.0.0',
      minimumVersion: '1.5.0',
      updateUrl: 'https://example.com/app.apk',
    });

    const store = useVersionStore();
    const result = await store.checkVersion();

    expect(result.status).toBe('FORCE_UPDATE');
    expect(store.isMandatoryUpdate).toBe(true);
    expect(store.isOptionalUpdate).toBe(false);
  });
});
