import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const UPDATE_CHANNEL_IDS = ['cafeBazaar', 'myket', 'direct'] as const;

export type UpdateChannelId = (typeof UPDATE_CHANNEL_IDS)[number];

function isUpdateChannelId(value: unknown): value is UpdateChannelId {
  return UPDATE_CHANNEL_IDS.some((id) => id === value);
}

export interface AppRelease {
  version: string;
  versionCode: number;
  notes: string[];
}

export interface UpdateChannel {
  id: UpdateChannelId;
  version: string;
  versionCode: number;
  updateUrl: string;
}

export interface AppVersionConfig {
  schemaVersion: 2;
  platform: 'android';
  minimumVersion: string;
  minimumVersionCode: number;
  releases: AppRelease[];
  channels: UpdateChannel[];
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
  latestVersionCode?: number;
  minimumVersion?: string;
  minimumVersionCode?: number;
  releaseNotes?: AppRelease[];
  channels?: UpdateChannel[];
  message?: string;
  error?: string;
}

const SEMVER_REGEX = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?$/;

export function isValidSemver(version: string): boolean {
  return typeof version === 'string' && SEMVER_REGEX.test(version.trim());
}

export function parseSemver(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const trimmed = version.trim().replace(/^v/, '');
  const match = SEMVER_REGEX.exec(trimmed);
  if (!match) {
    throw new Error(`فرمت نسخه نامعتبر است: "${version}"`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: match[2] !== undefined ? parseInt(match[2], 10) : 0,
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0,
    prerelease: match[4],
  };
}

export function compareSemver(version1: string, version2: string): number {
  const first = parseSemver(version1);
  const second = parseSemver(version2);

  if (first.major !== second.major) return first.major - second.major;
  if (first.minor !== second.minor) return first.minor - second.minor;
  if (first.patch !== second.patch) return first.patch - second.patch;
  if (!first.prerelease && second.prerelease) return 1;
  if (first.prerelease && !second.prerelease) return -1;
  if (first.prerelease && second.prerelease) {
    return first.prerelease.localeCompare(second.prerelease);
  }
  return 0;
}

function isPositiveVersionCode(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validateUpdateUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('آدرس دریافت به‌روزرسانی مشخص نشده است.');
  }

  const updateUrl = value.trim();
  try {
    const isAbsoluteHttpUrl = /^https?:\/\//i.test(updateUrl);
    const isRootRelativeUrl = updateUrl.startsWith('/') && !updateUrl.startsWith('//');
    const parsedUrl = new URL(updateUrl, 'https://version-config.invalid');
    if (
      (!isAbsoluteHttpUrl && !isRootRelativeUrl) ||
      !['http:', 'https:'].includes(parsedUrl.protocol)
    ) {
      throw new Error('Unsupported URL protocol');
    }
  } catch {
    throw new Error(`آدرس اینترنتی کانال معتبر نیست: "${value}"`);
  }

  return updateUrl;
}

export function validateVersionConfig(data: unknown): AppVersionConfig {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('محتوای فایل نسخه نامعتبر است.');
  }

  const record = data as Record<string, unknown>;
  if (record.schemaVersion !== 2) {
    throw new Error(`مقدار schemaVersion پشتیبانی نمی‌شود: "${String(record.schemaVersion)}"`);
  }
  if (record.platform !== 'android') {
    throw new Error(`پلتفرم پیکربندی نشده یا نامعتبر است: "${String(record.platform)}"`);
  }
  if (typeof record.minimumVersion !== 'string' || !isValidSemver(record.minimumVersion)) {
    throw new Error(`مقدار minimumVersion نامعتبر است: "${String(record.minimumVersion)}"`);
  }
  if (!isPositiveVersionCode(record.minimumVersionCode)) {
    throw new Error('مقدار minimumVersionCode باید یک عدد صحیح مثبت باشد.');
  }
  if (!Array.isArray(record.releases) || record.releases.length === 0) {
    throw new Error('فهرست نسخه‌های منتشرشده معتبر یا کامل نیست.');
  }

  const releases: AppRelease[] = [];
  const releaseVersions = new Set<string>();
  for (const [index, rawRelease] of record.releases.entries()) {
    if (typeof rawRelease !== 'object' || rawRelease === null || Array.isArray(rawRelease)) {
      throw new Error(`اطلاعات نسخه شماره ${index + 1} نامعتبر است.`);
    }
    const release = rawRelease as Record<string, unknown>;
    if (typeof release.version !== 'string' || !isValidSemver(release.version)) {
      throw new Error(`مقدار version در نسخه شماره ${index + 1} نامعتبر است.`);
    }
    if (!isPositiveVersionCode(release.versionCode)) {
      throw new Error(`مقدار versionCode در نسخه ${release.version} نامعتبر است.`);
    }
    if (
      !Array.isArray(release.notes) ||
      release.notes.some((note) => typeof note !== 'string' || note.trim() === '')
    ) {
      throw new Error(`یادداشت‌های نسخه ${release.version} باید فهرستی از متن‌های معتبر باشند.`);
    }

    const version = release.version.trim();
    if (releaseVersions.has(version)) {
      throw new Error(`نسخه ${version} بیش از یک بار در فهرست ثبت شده است.`);
    }
    if (releases.length > 0) {
      const previous = releases[releases.length - 1];
      if (compareSemver(version, previous.version) <= 0) {
        throw new Error('نسخه‌ها باید بر اساس version از قدیم به جدید مرتب شده باشند.');
      }
      if (release.versionCode < previous.versionCode) {
        throw new Error('versionCode نسخه‌ها نمی‌تواند با افزایش version کاهش یابد.');
      }
      if (
        index === record.releases.length - 1 &&
        release.versionCode === previous.versionCode
      ) {
        throw new Error('versionCode انتشار جدید باید از نسخه قبلی بیشتر باشد.');
      }
    }
    releaseVersions.add(version);
    releases.push({
      version,
      versionCode: release.versionCode,
      notes: release.notes.map((note) => note.trim()),
    });
  }

  const minimumVersion = record.minimumVersion.trim();
  const minimumRelease = releases.find(
    (release) =>
      release.version === minimumVersion &&
      release.versionCode === record.minimumVersionCode,
  );
  if (!minimumRelease) {
    throw new Error('minimumVersion و minimumVersionCode باید به یک نسخه ثبت‌شده اشاره کنند.');
  }

  if (!Array.isArray(record.channels) || record.channels.length === 0 || record.channels.length > 3) {
    throw new Error('فهرست کانال‌های به‌روزرسانی باید بین یک تا سه کانال داشته باشد.');
  }

  const channelIds = new Set<string>();
  const channels: UpdateChannel[] = [];
  for (const [index, rawChannel] of record.channels.entries()) {
    if (typeof rawChannel !== 'object' || rawChannel === null || Array.isArray(rawChannel)) {
      throw new Error(`اطلاعات کانال شماره ${index + 1} نامعتبر است.`);
    }
    const channel = rawChannel as Record<string, unknown>;
    if (!isUpdateChannelId(channel.id) || channelIds.has(channel.id)) {
      throw new Error(`شناسه کانال شماره ${index + 1} نامعتبر یا تکراری است.`);
    }
    if (typeof channel.version !== 'string' || !isValidSemver(channel.version)) {
      throw new Error(`مقدار version کانال ${channel.id} نامعتبر است.`);
    }
    if (!isPositiveVersionCode(channel.versionCode)) {
      throw new Error(`مقدار versionCode کانال ${channel.id} نامعتبر است.`);
    }

    const channelVersion = channel.version.trim();
    const release = releases.find(
      (entry) =>
        entry.version === channelVersion && entry.versionCode === channel.versionCode,
    );
    if (!release) {
      throw new Error(`نسخه کانال ${channel.id} در فهرست نسخه‌های منتشرشده وجود ندارد.`);
    }

    channelIds.add(channel.id);
    channels.push({
      id: channel.id,
      version: release.version,
      versionCode: release.versionCode,
      updateUrl: validateUpdateUrl(channel.updateUrl),
    });
  }

  const newestBuild = Math.max(...channels.map((channel) => channel.versionCode));
  const newestChannels = channels.filter((channel) => channel.versionCode === newestBuild);
  const newestVersion = newestChannels[0].version;
  if (newestChannels.some((channel) => channel.version !== newestVersion)) {
    throw new Error('کانال‌های دارای بالاترین versionCode باید یک versionName داشته باشند.');
  }
  if (newestBuild < record.minimumVersionCode) {
    throw new Error('حداقل نسخه پشتیبانی‌شده از جدیدترین نسخه موجود بالاتر است.');
  }
  if (record.message !== undefined && typeof record.message !== 'string') {
    throw new Error('مقدار message باید متن باشد.');
  }

  return {
    schemaVersion: 2,
    platform: 'android',
    minimumVersion: record.minimumVersion.trim(),
    minimumVersionCode: record.minimumVersionCode,
    releases,
    channels,
    message: typeof record.message === 'string' ? record.message.trim() : undefined,
  };
}

export function evaluateVersion(
  installedVersion: string,
  installedVersionCode: number,
  config: AppVersionConfig,
): VersionCheckResult {
  if (!isValidSemver(installedVersion)) {
    throw new Error(`نسخه نصب‌شده نامعتبر است: "${installedVersion}"`);
  }
  if (!isPositiveVersionCode(installedVersionCode)) {
    throw new Error('versionCode نصب‌شده معتبر نیست.');
  }

  const latestChannel = config.channels.reduce((latest, channel) =>
    channel.versionCode > latest.versionCode ? channel : latest,
  );
  const latestChannels = config.channels.filter(
    (channel) =>
      channel.versionCode === latestChannel.versionCode &&
      channel.version === latestChannel.version,
  );
  const releaseNotes = config.releases.filter(
    (release) =>
      (compareSemver(release.version, installedVersion) > 0 ||
        (release.version === latestChannel.version &&
          installedVersionCode < latestChannel.versionCode)) &&
      compareSemver(release.version, latestChannel.version) <= 0 &&
      release.notes.length > 0,
  );

  const result: VersionCheckResult = {
    status: 'UP_TO_DATE',
    installedVersion,
    installedBuild: String(installedVersionCode),
    latestVersion: latestChannel.version,
    latestVersionCode: latestChannel.versionCode,
    minimumVersion: config.minimumVersion,
    minimumVersionCode: config.minimumVersionCode,
  };

  if (installedVersionCode < config.minimumVersionCode) {
    return {
      ...result,
      status: 'FORCE_UPDATE',
      releaseNotes,
      channels: latestChannels,
      message: config.message,
    };
  }

  if (installedVersionCode < latestChannel.versionCode) {
    return {
      ...result,
      status: 'OPTIONAL_UPDATE',
      releaseNotes,
      channels: latestChannels,
      message: config.message,
    };
  }

  return result;
}

export function isNativeAndroidPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function resolveVersionConfigUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_APP_VERSION_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim();
  }
  if (!isNativeAndroidPlatform()) {
    return '/app-version-v2.json';
  }
  throw new Error('VITE_APP_VERSION_URL must point to app-version-v2.json for Android builds.');
}

export async function fetchRemoteVersionConfig(
  url: string,
  timeoutMs = 6000,
): Promise<AppVersionConfig> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const separator = url.includes('?') ? '&' : '?';
  const fetchUrl = `${url}${separator}_t=${Date.now()}`;

  try {
    const response = await fetch(fetchUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`خطای دریافت فایل نسخه از سرور (کد: ${response.status})`);
    }

    const config = validateVersionConfig(await response.json());
    const configBaseUrl = response.url || fetchUrl;
    return {
      ...config,
      channels: config.channels.map((channel) => ({
        ...channel,
        updateUrl: new URL(channel.updateUrl, configBaseUrl).toString(),
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('زمان انتظار برای دریافت وضعیت نسخه به پایان رسید.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function getInstalledAppInfo(): Promise<{
  version: string;
  versionCode: number;
}> {
  if (!isNativeAndroidPlatform()) {
    return { version: '1.0.0', versionCode: 1 };
  }

  const info = await App.getInfo();
  const version = info.version?.trim();
  const build = info.build?.trim();
  if (!build || !/^\d+$/.test(build)) {
    throw new Error('دریافت versionCode نصب‌شده از Android ناموفق بود.');
  }
  const versionCode = Number(build);
  if (!version || !isValidSemver(version)) {
    throw new Error('نسخه نصب‌شده از Android معتبر نیست.');
  }
  if (!isPositiveVersionCode(versionCode)) {
    throw new Error('دریافت versionCode نصب‌شده از Android ناموفق بود.');
  }

  return { version, versionCode };
}

export function openUpdateUrl(url: string): void {
  if (!url) return;
  try {
    const target = isNativeAndroidPlatform() ? '_system' : '_blank';
    window.open(url, target, 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
}
