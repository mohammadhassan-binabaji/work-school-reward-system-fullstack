import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidSemver,
  parseSemver,
  compareSemver,
  validateVersionConfig,
  evaluateVersion,
  fetchRemoteVersionConfig,
  type AppVersionConfig,
} from './versionService';

describe('versionService', () => {
  describe('semver parsing and validation', () => {
    it('validates correct semantic and Android versions', () => {
      expect(isValidSemver('1.0.0')).toBe(true);
      expect(isValidSemver('1.0')).toBe(true);
      expect(isValidSemver('v1.0')).toBe(true);
      expect(isValidSemver('v1.2.3')).toBe(true);
      expect(isValidSemver('0.1.0-beta.1')).toBe(true);
      expect(isValidSemver('2.15.8')).toBe(true);
    });

    it('rejects invalid versions', () => {
      expect(isValidSemver('latest')).toBe(false);
      expect(isValidSemver('')).toBe(false);
      expect(isValidSemver('abc.def.ghi')).toBe(false);
    });

    it('parses version components accurately', () => {
      expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: undefined });
      expect(parseSemver('1.0')).toEqual({ major: 1, minor: 0, patch: 0, prerelease: undefined });
      expect(parseSemver('v2.0.1-rc.1')).toEqual({ major: 2, minor: 0, patch: 1, prerelease: 'rc.1' });
    });
  });

  describe('compareSemver (non-lexicographical comparison)', () => {
    it('handles 2-part and 3-part version parity', () => {
      // 1.0 is equivalent to 1.0.0
      expect(compareSemver('1.0', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0', '1.0')).toBe(0);
      expect(compareSemver('1.0', '1.0.1')).toBeLessThan(0);
      expect(compareSemver('1.1', '1.0.9')).toBeGreaterThan(0);
    });

    it('handles major version differences', () => {
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('handles minor version differences with multi-digit numbers', () => {
      // Critical: 1.10.0 must be greater than 1.9.0 (lexicographical comparison would fail this!)
      expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
      expect(compareSemver('1.9.0', '1.10.0')).toBeLessThan(0);
    });

    it('handles patch version differences', () => {
      expect(compareSemver('1.0.11', '1.0.2')).toBeGreaterThan(0);
      expect(compareSemver('1.0.2', '1.0.11')).toBeLessThan(0);
    });

    it('recognizes identical versions as 0', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
    });
  });

  describe('validateVersionConfig', () => {
    it('accepts valid configuration object', () => {
      const valid = {
        platform: 'android',
        latestVersion: '2.0.0',
        minimumVersion: '1.5.0',
        updateUrl: 'https://cdn.example.com/student-app.apk',
        message: 'پیام تست به‌روزرسانی',
      };
      const result = validateVersionConfig(valid);
      expect(result.platform).toBe('android');
      expect(result.latestVersion).toBe('2.0.0');
      expect(result.minimumVersion).toBe('1.5.0');
      expect(result.updateUrl).toBe('https://cdn.example.com/student-app.apk');
      expect(result.message).toBe('پیام تست به‌روزرسانی');
    });

    it('throws error for non-android platform', () => {
      const invalid = {
        platform: 'ios',
        latestVersion: '2.0.0',
        minimumVersion: '1.0.0',
        updateUrl: 'https://example.com/app',
      };
      expect(() => validateVersionConfig(invalid)).toThrowError(/پلتفرم/);
    });

    it('throws error for malformed version strings', () => {
      const invalid = {
        platform: 'android',
        latestVersion: 'invalid',
        minimumVersion: '1.0.0',
        updateUrl: 'https://example.com/app',
      };
      expect(() => validateVersionConfig(invalid)).toThrowError(/latestVersion/);
    });

    it('throws error for invalid update URL', () => {
      const invalid = {
        platform: 'android',
        latestVersion: '2.0.0',
        minimumVersion: '1.0.0',
        updateUrl: 'not-a-valid-url',
      };
      expect(() => validateVersionConfig(invalid)).toThrowError(/updateUrl/);
    });
  });

  describe('evaluateVersion', () => {
    const config: AppVersionConfig = {
      platform: 'android',
      latestVersion: '2.0.0',
      minimumVersion: '1.5.0',
      updateUrl: 'https://example.com/app.apk',
      message: 'بروزرسانی الزامی است',
    };

    it('returns FORCE_UPDATE when installed version is below minimumVersion', () => {
      const result = evaluateVersion('1.4.9', config, '10');
      expect(result.status).toBe('FORCE_UPDATE');
      expect(result.installedVersion).toBe('1.4.9');
      expect(result.minimumVersion).toBe('1.5.0');
      expect(result.updateUrl).toBe('https://example.com/app.apk');
      expect(result.message).toBe('بروزرسانی الزامی است');
    });

    it('returns OPTIONAL_UPDATE when installed version is >= minimumVersion but < latestVersion', () => {
      const result = evaluateVersion('1.5.0', config, '12');
      expect(result.status).toBe('OPTIONAL_UPDATE');
      expect(result.installedVersion).toBe('1.5.0');
      expect(result.latestVersion).toBe('2.0.0');
    });

    it('returns UP_TO_DATE when installed version equals latestVersion', () => {
      const result = evaluateVersion('2.0.0', config, '20');
      expect(result.status).toBe('UP_TO_DATE');
    });

    it('returns UP_TO_DATE when installed version is ahead of latestVersion', () => {
      const result = evaluateVersion('2.1.0', config, '21');
      expect(result.status).toBe('UP_TO_DATE');
    });
  });

  describe('fetchRemoteVersionConfig network and timeout handling', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('successfully fetches and validates remote json', async () => {
      const mockConfig: AppVersionConfig = {
        platform: 'android',
        latestVersion: '1.2.0',
        minimumVersion: '1.0.0',
        updateUrl: 'https://example.com/app.apk',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      } as any);

      const result = await fetchRemoteVersionConfig('https://api.example.com/app-version.json');
      expect(result.latestVersion).toBe('1.2.0');
      expect(result.minimumVersion).toBe('1.0.0');
    });

    it('handles non-200 HTTP responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(
        fetchRemoteVersionConfig('https://api.example.com/app-version.json'),
      ).rejects.toThrowError(/404/);
    });

    it('handles network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fetchRemoteVersionConfig('https://api.example.com/app-version.json'),
      ).rejects.toThrowError('Network error');
    });

    it('handles network timeout via abort signal', async () => {
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });

      await expect(
        fetchRemoteVersionConfig('https://api.example.com/app-version.json', 50),
      ).rejects.toThrowError(/زمان انتظار/);
    });
  });
});
