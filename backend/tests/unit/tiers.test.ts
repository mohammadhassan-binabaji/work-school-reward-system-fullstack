import { describe, it, expect } from 'vitest';

export interface TierConfig {
  tierIndex: number;
  tierName: string;
  minPoints: number;
}

export function resolveStudentTier(tiers: TierConfig[], currentPoints: number): TierConfig {
  const sorted = [...tiers].sort((a, b) => b.tierIndex - a.tierIndex);
  for (const tier of sorted) {
    if (currentPoints >= tier.minPoints) {
      return tier;
    }
  }
  // Fallback to lowest tier
  return sorted[sorted.length - 1];
}

export function updateHighestBalance(currentHighest: number, newCurrentPoints: number): number {
  return Math.max(currentHighest, newCurrentPoints);
}

describe('Tiers & Highest Balance Unit Tests (US7)', () => {
  const default5Tiers: TierConfig[] = [
    { tierIndex: 1, tierName: 'Bronze', minPoints: 0 },
    { tierIndex: 2, tierName: 'Silver', minPoints: 100 },
    { tierIndex: 3, tierName: 'Gold', minPoints: 300 },
    { tierIndex: 4, tierName: 'Platinum', minPoints: 600 },
    { tierIndex: 5, tierName: 'Diamond', minPoints: 1000 }
  ];

  it('correctly maps current points to dynamic tiers', () => {
    expect(resolveStudentTier(default5Tiers, 0).tierName).toBe('Bronze');
    expect(resolveStudentTier(default5Tiers, 99).tierName).toBe('Bronze');
    expect(resolveStudentTier(default5Tiers, 100).tierName).toBe('Silver');
    expect(resolveStudentTier(default5Tiers, 299).tierName).toBe('Silver');
    expect(resolveStudentTier(default5Tiers, 300).tierName).toBe('Gold');
    expect(resolveStudentTier(default5Tiers, 599).tierName).toBe('Gold');
    expect(resolveStudentTier(default5Tiers, 600).tierName).toBe('Platinum');
    expect(resolveStudentTier(default5Tiers, 999).tierName).toBe('Platinum');
    expect(resolveStudentTier(default5Tiers, 1000).tierName).toBe('Diamond');
    expect(resolveStudentTier(default5Tiers, 5000).tierName).toBe('Diamond');
  });

  it('correctly updates highest balance only when peak is exceeded', () => {
    let highest = 0;
    highest = updateHighestBalance(highest, 50);
    expect(highest).toBe(50);

    highest = updateHighestBalance(highest, 80);
    expect(highest).toBe(80);

    // Spend points -> current points drop to 30, highest remains 80
    highest = updateHighestBalance(highest, 30);
    expect(highest).toBe(80);

    // Earn 60 points -> current points 90, highest updates to 90
    highest = updateHighestBalance(highest, 90);
    expect(highest).toBe(90);
  });
});
