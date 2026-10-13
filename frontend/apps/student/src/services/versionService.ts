import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export interface AppVersionConfig {
  platform: 'android';
  latestVersion: string;
  minimumVersion: string;
  updateUrl: string;
  message?: string;
}

export type VersionCheckStatus =
  | 'UP_TO_DATE'
  | 'OPTIONAL_UPDATE'
  | 'FORCE_UPDATE'
  | 'ERROR';

export interface VersionCheckResult {
  status: VersionCheckStatus;
  installedVersion: string;
  installedBuild?: string;
  latestVersion?: string;
  minimumVersion?: string;
  updateUrl?: string;
  message?: string;
  error?: string;
}

const SEMVER_REGEX = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/**
 * Validates whether a version string matches semver syntax (major.minor.patch[-prerelease])
 */
export function isValidSemver(v: string): boolean {
  if (typeof v !== 'string') return false;
  return SEMVER_REGEX.test(v.trim());
}

/**
 * Parses a semantic version string into numeric parts.
 */
export function parseSemver(v: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const trimmed = v.trim().replace(/^v/, '');
  const match = SEMVER_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(`فرمت نسخه نامعتبر است: "${v}"`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Compares two semantic version strings numerically.
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, and 0 if v1 === v2.
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;

  // Versions without pre-release have higher precedence than versions with pre-release
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}

/**
 * Validates the runtime payload of app-version.json
 */
export function validateVersionConfig(data: unknown): AppVersionConfig {
  if (typeof data !== 'object' || data === null) {
    throw new Error('محتوای فایل پیکربندی نسخه نامعتبر است (شیء JSON یافت نشد).');
  }

  const record = data as Record<string, unknown>;

  if (record.platform !== 'android') {
    throw new Error(`پلتفرم پیکربندی نشده یا نامعتبر است: "${String(record.platform)}"`);
  }

  if (typeof record.latestVersion !== 'string' || !isValidSemver(record.latestVersion)) {
    throw new Error(`مقدار latestVersion نامعتبر است: "${String(record.latestVersion)}"`);
  }

  if (typeof record.minimumVersion !== 'string' || !isValidSemver(record.minimumVersion)) {
    throw new Error(`مقدار minimumVersion نامعتبر است: "${String(record.minimumVersion)}"`);
  }

  if (typeof record.updateUrl !== 'string' || record.updateUrl.trim() === '') {
    throw new Error('آدرس دریافت به‌روزرسانی (updateUrl) مشخص نشده است.');
  }

  try {
    // Validate valid URL syntax
    new URL(record.updateUrl);
  } catch {
    throw new Error(`آدرس اینترنتی updateUrl ساختار معتبری ندارد: "${record.updateUrl}"`);
  }

  return {
    platform: 'android',
    latestVersion: record.latestVersion.trim(),
    minimumVersion: record.minimumVersion.trim(),
    updateUrl: record.updateUrl.trim(),
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}

/**
 * Pure evaluation function that determines the update state
 */
export function evaluateVersion(
  installedVersion: string,
  config: AppVersionConfig,
  build?: string,
): VersionCheckResult {
  const isBelowMin = compareSemver(installedVersion, config.minimumVersion) < 0;
  if (isBelowMin) {
    return {
      status: 'FORCE_UPDATE',
      installedVersion,
      installedBuild: build,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      updateUrl: config.updateUrl,
      message: config.message,
    };
  }

  const isBelowLatest = compareSemver(installedVersion, config.latestVersion) < 0;
  if (isBelowLatest) {
    return {
      status: 'OPTIONAL_UPDATE',
      installedVersion,
      installedBuild: build,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      updateUrl: config.updateUrl,
      message: config.message,
    };
  }

  return {
    status: 'UP_TO_DATE',
    installedVersion,
    installedBuild: build,
    latestVersion: config.latestVersion,
    minimumVersion: config.minimumVersion,
  };
}

/**
 * Resolves the absolute URL to app-version.json
 */
export function resolveVersionConfigUrl(): string {
  // 1. Explicitly configured URL from environment
  const envUrl = (import.meta as any).env?.VITE_APP_VERSION_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim();
  }

  // 2. If running on Web / Dev browser, relative path is fine
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    return '/app-version.json';
  }

  // 3. In Native Android, relative path resolves to local WebView origin (https://localhost/app-version.json),
  // which will never receive updates pushed to the server. If VITE_API_BASE_URL is set, derive origin.
  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (apiBase && typeof apiBase === 'string') {
    try {
      const parsed = new URL(apiBase);
      return `${parsed.origin}/app-version.json`;
    } catch {
      // Fallback
    }
  }

  // Fallback to relative path
  return '/app-version.json';
}

/**
 * Fetches the public static JSON over HTTPS with timeout
 */
export async function fetchRemoteVersionConfig(
  url: string,
  timeoutMs = 6000,
): Promise<AppVersionConfig> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Append timestamp for cache busting instead of sending custom/non-safelisted request headers.
  // This keeps the request as a CORS "simple request", preventing browser/WebView from sending an OPTIONS preflight.
  const separator = url.includes('?') ? '&' : '?';
  const fetchUrl = `${url}${separator}_t=${Date.now()}`;

  try {
    const res = await fetch(fetchUrl, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`خطای دریافت فایل نسخه از سرور (کد: ${res.status})`);
    }

    const data = await res.json();
    return validateVersionConfig(data);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('زمان انتظار برای دریافت وضعیت نسخه به پایان رسید.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Gets the actual native Android installed version through Capacitor App plugin.
 */
export async function getInstalledAppInfo(): Promise<{ version: string; build: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      return {
        version: info.version || '1.0.0',
        build: info.build || '1',
      };
    } catch (e) {
      console.warn('عدم موفقیت در دریافت مشخصات نسخه محلی از Capacitor App:', e);
    }
  }

  // Fallback for web or dev environment
  return {
    version: '1.0.0',
    build: '1',
  };
}

/**
 * Opens the external update URL safely.
 */
export function openUpdateUrl(url: string): void {
  if (!url) return;
  try {
    const target = Capacitor.isNativePlatform() ? '_system' : '_blank';
    window.open(url, target, 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
}
