import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVersionStore } from './version';
import * as versionService from '../services/versionService';
import type { AppVersionConfig } from '../services/versionService';

const config: AppVersionConfig = {
  schemaVersion: 2,
  platform: 'android',
  minimumVersion: '1.0.0',
  minimumVersionCode: 1,
  releases: [
    { version: '1.0.0', versionCode: 1, notes: [] },
    { version: '1.1.0', versionCode: 2, notes: ['بهبود عملکرد'] },
  ],
  channels: [
    {
      id: 'direct',
      version: '1.1.0',
      versionCode: 2,
      updateUrl: 'https://example.com/student.apk',
    },
  ],
};

describe('useVersionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bypasses remote checks on web and PWA', async () => {
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

  it('checks the v2 manifest and identifies a forced update by versionCode', async () => {
    vi.spyOn(versionService, 'isNativeAndroidPlatform').mockReturnValue(true);
    vi.spyOn(versionService, 'getInstalledAppInfo').mockResolvedValue({
      version: '0.9.0',
      versionCode: 1,
    });
    vi.spyOn(versionService, 'resolveVersionConfigUrl').mockReturnValue(
      'https://example.com/app-version-v2.json',
    );
    vi.spyOn(versionService, 'fetchRemoteVersionConfig').mockResolvedValue({
      ...config,
      minimumVersion: '1.1.0',
      minimumVersionCode: 2,
    });

    const store = useVersionStore();
    const result = await store.checkVersion();

    expect(result.status).toBe('FORCE_UPDATE');
    expect(store.isMandatoryUpdate).toBe(true);
    expect(store.isOptionalUpdate).toBe(false);
  });

  it('turns installed-app-info failures into a visible check error', async () => {
    vi.spyOn(versionService, 'isNativeAndroidPlatform').mockReturnValue(true);
    vi.spyOn(versionService, 'getInstalledAppInfo').mockRejectedValue(
      new Error('versionCode unavailable'),
    );

    const store = useVersionStore();
    const result = await store.checkVersion();

    expect(result.status).toBe('ERROR');
    expect(result.error).toBe('versionCode unavailable');
    expect(store.hasError).toBe(true);
    expect(store.isChecking).toBe(false);
  });

  it('opens only a channel included in the current update result', async () => {
    vi.spyOn(versionService, 'isNativeAndroidPlatform').mockReturnValue(true);
    vi.spyOn(versionService, 'getInstalledAppInfo').mockResolvedValue({
      version: '1.0.0',
      versionCode: 1,
    });
    vi.spyOn(versionService, 'resolveVersionConfigUrl').mockReturnValue(
      'https://example.com/app-version-v2.json',
    );
    vi.spyOn(versionService, 'fetchRemoteVersionConfig').mockResolvedValue(config);
    const openSpy = vi.spyOn(versionService, 'openUpdateUrl').mockImplementation(() => {});

    const store = useVersionStore();
    await store.checkVersion();
    store.performUpdate('direct');

    expect(openSpy).toHaveBeenCalledWith('https://example.com/student.apk');
    expect(() => store.performUpdate('myket')).toThrowError(/وجود ندارد/);
  });
});
