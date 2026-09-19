import { describe, it, expect } from 'vitest';

export function calculateBanWindow(rejectionCount: number, now = new Date()) {
  const isBanned = rejectionCount >= 3;
  const bannedUntil = isBanned ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  return {
    isBanned,
    bannedUntil
  };
}

export function isBanActive(ban: { bannedUntil: Date; unbannedAt?: Date | null } | null, now = new Date()): boolean {
  if (!ban) return false;
  if (ban.unbannedAt) return false; // Admin unbanned
  return ban.bannedUntil > now; // Still in 30-day window
}

describe('Ban Calculator Unit Tests (US5)', () => {
  it('does not trigger ban when rejections are less than 3', () => {
    expect(calculateBanWindow(0).isBanned).toBe(false);
    expect(calculateBanWindow(1).isBanned).toBe(false);
    expect(calculateBanWindow(2).isBanned).toBe(false);
  });

  it('triggers 30-day ban when rejections reach 3', () => {
    const now = new Date('2026-09-19T12:00:00Z');
    const result = calculateBanWindow(3, now);
    expect(result.isBanned).toBe(true);
    expect(result.bannedUntil).toBeDefined();

    const diffDays = (result.bannedUntil!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(30);
  });

  it('correctly determines if ban is active, expired, or overridden by admin', () => {
    const now = new Date('2026-09-19T12:00:00Z');
    const activeBan = {
      bannedUntil: new Date('2026-10-19T12:00:00Z'),
      unbannedAt: null
    };
    expect(isBanActive(activeBan, now)).toBe(true);

    const expiredBan = {
      bannedUntil: new Date('2026-09-01T12:00:00Z'),
      unbannedAt: null
    };
    expect(isBanActive(expiredBan, now)).toBe(false);

    const overriddenBan = {
      bannedUntil: new Date('2026-10-19T12:00:00Z'),
      unbannedAt: new Date('2026-09-20T12:00:00Z')
    };
    expect(isBanActive(overriddenBan, now)).toBe(false);
  });
});
