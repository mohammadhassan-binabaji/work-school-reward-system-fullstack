import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  isValidSemver,
  parseSemver,
  compareSemver,
  validateVersionConfig,
  evaluateVersion,
  fetchRemoteVersionConfig,
  getInstalledAppInfo,
  type AppVersionConfig,
} from './versionService';

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
  },
}));

const createConfig = (): AppVersionConfig => ({
  schemaVersion: 2,
  platform: 'android',
  minimumVersion: '2.0.0',
  minimumVersionCode: 8,
  releases: [
    { version: '2.0.0', versionCode: 8, notes: [] },
    { version: '2.0.1', versionCode: 8, notes: ['بهبود تجربه کاربری'] },
    { version: '2.0.2', versionCode: 9, notes: ['رفع چند مشکل'] },
    { version: '2.0.3', versionCode: 10, notes: ['افزودن امکانات جدید'] },
  ],
  channels: [
    {
      id: 'cafeBazaar',
      version: '2.0.2',
      versionCode: 9,
      updateUrl: 'https://cafebazaar.ir/app/example',
    },
    {
      id: 'myket',
      version: '2.0.3',
      versionCode: 10,
      updateUrl: 'https://myket.ir/app/example',
    },
    {
      id: 'direct',
      version: '2.0.3',
      versionCode: 10,
      updateUrl: '/download/student.apk',
    },
  ],
});

describe('versionService', () => {
  describe('semantic version parsing', () => {
    it('validates and parses semantic and Android versions', () => {
      expect(isValidSemver('1.0.0')).toBe(true);
      expect(isValidSemver('v1.2.3')).toBe(true);
      expect(isValidSemver('0.1.0-beta.1')).toBe(true);
      expect(isValidSemver('abc.def.ghi')).toBe(false);
      expect(parseSemver('1.2.3')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
      });
      expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    });
  });

  describe('validateVersionConfig', () => {
    it('ships a valid v2 manifest', () => {
      const manifest = JSON.parse(
        readFileSync(new URL('../../public/app-version-v2.json', import.meta.url), 'utf8'),
      ) as unknown;
      const config = validateVersionConfig(manifest);

      expect(config.channels.map((channel) => channel.id)).toEqual(['direct']);
      expect(config.channels[0]).toMatchObject({ version: '4.0.0', versionCode: 11 });
    });

    it('keeps the legacy manifest schema and points it at the current release', () => {
      const legacy = JSON.parse(
        readFileSync(new URL('../../public/app-version.json', import.meta.url), 'utf8'),
      ) as Record<string, unknown>;

      expect(legacy.latestVersion).toBe('4.0.0');
      expect(legacy.minimumVersion).toBe('3.2.0');
      expect(legacy.updateUrl).toBe('/download/student.apk');
      expect(legacy.schemaVersion).toBeUndefined();
    });

    it('accepts a valid v2 manifest', () => {
      const result = validateVersionConfig(createConfig());

      expect(result.minimumVersionCode).toBe(8);
      expect(result.channels).toHaveLength(3);
    });

    it('rejects unsupported schema and malformed version names', () => {
      expect(() =>
        validateVersionConfig({ ...createConfig(), schemaVersion: 1 }),
      ).toThrowError(/schemaVersion/);

      const invalid = createConfig();
      invalid.releases[2].version = 'latest';
      expect(() => validateVersionConfig(invalid)).toThrowError(/version/);
    });

    it('rejects a minimum build that does not match the minimum release', () => {
      expect(() =>
        validateVersionConfig({
          ...createConfig(),
          minimumVersionCode: 7,
        }),
      ).toThrowError(/minimum/);
    });

    it('rejects duplicate or unknown channels', () => {
      const duplicateChannel = createConfig();
      duplicateChannel.channels[2].id = 'myket';
      expect(() => validateVersionConfig(duplicateChannel)).toThrowError(/کانال/);

      const base = createConfig();
      const unknownChannel = {
        ...base,
        channels: base.channels.map((channel, index) =>
          index === 0 ? { ...channel, id: 'unknown' } : channel,
        ),
      };
      expect(() => validateVersionConfig(unknownChannel)).toThrowError(/کانال/);
    });

    it('rejects a channel whose version and build do not match a release', () => {
      const invalid = createConfig();
      invalid.channels[0].versionCode = 10;
      expect(() => validateVersionConfig(invalid)).toThrowError(/نسخه|کانال/);
    });

    it('requires the newest release to have a higher versionCode than its predecessor', () => {
      const invalid = createConfig();
      invalid.releases[2].versionCode = 10;
      invalid.releases[3].versionCode = 10;
      invalid.channels[0].versionCode = 10;

      expect(() => validateVersionConfig(invalid)).toThrowError(/versionCode/);
    });

    it('rejects unsupported update URL protocols', () => {
      const invalid = createConfig();
      invalid.channels[0].updateUrl = 'javascript:alert(1)';
      expect(() => validateVersionConfig(invalid)).toThrowError(/آدرس/);
    });
  });

  describe('evaluateVersion', () => {
    it('forces updates below the minimum versionCode and offers only the newest target', () => {
      const result = evaluateVersion('1.9.9', 7, createConfig());

      expect(result.status).toBe('FORCE_UPDATE');
      expect(result.minimumVersion).toBe('2.0.0');
      expect(result.latestVersion).toBe('2.0.3');
      expect(result.channels?.map((channel) => channel.id)).toEqual(['myket', 'direct']);
    });

    it('makes an update optional between the minimum and newest build', () => {
      const result = evaluateVersion('2.0.0', 8, createConfig());

      expect(result.status).toBe('OPTIONAL_UPDATE');
      expect(result.latestVersionCode).toBe(10);
    });

    it('includes notes newer than the installed version through the target release', () => {
      const result = evaluateVersion('2.0.0', 8, createConfig());

      expect(result.releaseNotes?.map((release) => release.version)).toEqual([
        '2.0.1',
        '2.0.2',
        '2.0.3',
      ]);
    });

    it('uses versionCode rather than versionName for update eligibility', () => {
      const result = evaluateVersion('99.0.0', 8, createConfig());

      expect(result.status).toBe('OPTIONAL_UPDATE');
    });

    it('shows the target release notes when only versionCode differs', () => {
      const result = evaluateVersion('2.0.3', 9, createConfig());

      expect(result.status).toBe('OPTIONAL_UPDATE');
      expect(result.releaseNotes?.map((release) => release.version)).toEqual(['2.0.3']);
    });

    it('reports up to date when installed versionCode equals or exceeds the target', () => {
      expect(evaluateVersion('2.0.3', 10, createConfig()).status).toBe('UP_TO_DATE');
      expect(evaluateVersion('2.0.3', 11, createConfig()).status).toBe('UP_TO_DATE');
    });
  });

  describe('fetchRemoteVersionConfig', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches and resolves root-relative channel URLs against the manifest origin', async () => {
      const config = createConfig();
      config.channels[2].updateUrl = '/download/student.apk';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        url: 'https://student.example.com/app-version-v2.json',
        json: async () => config,
      } as unknown as Response);

      const result = await fetchRemoteVersionConfig(
        'https://student.example.com/app-version-v2.json',
      );

      expect(result.channels[2].updateUrl).toBe(
        'https://student.example.com/download/student.apk',
      );
    });

    it('surfaces HTTP and network errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);
      await expect(fetchRemoteVersionConfig('https://student.example.com/app-version-v2.json'))
        .rejects.toThrowError(/404/);

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await expect(fetchRemoteVersionConfig('https://student.example.com/app-version-v2.json'))
        .rejects.toThrowError('Network error');
    });

    it('surfaces request timeouts', async () => {
      global.fetch = vi.fn().mockImplementation((_url, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
      );

      await expect(
        fetchRemoteVersionConfig('https://student.example.com/app-version-v2.json', 10),
      ).rejects.toThrowError(/زمان انتظار/);
    });

    describe('getInstalledAppInfo', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('reads and validates the native Android versionCode', async () => {
        vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
        vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
        vi.mocked(App.getInfo).mockResolvedValue({
          id: 'ir.mhbj.student',
          name: 'Student',
          version: '3.2.6',
          build: '10',
        });

        await expect(getInstalledAppInfo()).resolves.toEqual({
          version: '3.2.6',
          versionCode: 10,
        });
      });

      it('rejects missing or invalid native build codes', async () => {
        vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
        vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
        vi.mocked(App.getInfo).mockResolvedValue({
          id: 'ir.mhbj.student',
          name: 'Student',
          version: '3.2.6',
          build: 'not-a-number',
        });

        await expect(getInstalledAppInfo()).rejects.toThrowError(/versionCode/);
      });
    });
  });
});
