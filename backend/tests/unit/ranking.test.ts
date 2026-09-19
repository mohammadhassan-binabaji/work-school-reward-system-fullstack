import { describe, it, expect } from 'vitest';

export interface StudentScore {
  id: string;
  name: string;
  currentPoints: number;
  accountState: string;
}

export interface RankedStudent {
  id: string;
  name: string;
  currentPoints: number;
  rank: number;
}

export function computeStandardCompetitionRanking(
  students: StudentScore[]
): RankedStudent[] {
  // 1. Exclude non-active students
  const active = students.filter((s) => s.accountState === 'Active');

  // 2. Sort descending by points, then stable by name
  active.sort((a, b) => {
    if (b.currentPoints !== a.currentPoints) {
      return b.currentPoints - a.currentPoints;
    }
    return a.name.localeCompare(b.name);
  });

  // 3. Assign 1224 standard competition ranking
  const ranked: RankedStudent[] = [];
  for (let i = 0; i < active.length; i++) {
    let rank = i + 1;
    if (i > 0 && active[i].currentPoints === active[i - 1].currentPoints) {
      rank = ranked[i - 1].rank;
    }
    ranked.push({
      id: active[i].id,
      name: active[i].name,
      currentPoints: active[i].currentPoints,
      rank
    });
  }

  return ranked;
}

export function projectStudentPrivacyView(
  ranked: RankedStudent[],
  currentStudentId: string,
  topN = 5
) {
  const self = ranked.find((s) => s.id === currentStudentId);
  const leaderboard = ranked.slice(0, topN).map((s) => ({
    rank: s.rank,
    name: s.name,
    currentPoints: s.currentPoints
  }));

  return {
    studentRank: self?.rank ?? null,
    studentPoints: self?.currentPoints ?? null,
    populationCount: ranked.length,
    summary: self ? `Rank ${self.rank} of ${ranked.length}` : 'Unranked',
    leaderboard
  };
}

describe('Standard Competition Ranking Unit Tests (US7)', () => {
  it('correctly calculates 1224 rankings with ties and skips', () => {
    const data: StudentScore[] = [
      { id: '1', name: 'Alice', currentPoints: 100, accountState: 'Active' },
      { id: '2', name: 'Bob', currentPoints: 80, accountState: 'Active' },
      { id: '3', name: 'Charlie', currentPoints: 80, accountState: 'Active' },
      { id: '4', name: 'David', currentPoints: 50, accountState: 'Active' }
    ];

    const result = computeStandardCompetitionRanking(data);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it('excludes non-active students from rankings', () => {
    const data: StudentScore[] = [
      { id: '1', name: 'Alice', currentPoints: 100, accountState: 'Active' },
      { id: '2', name: 'InactiveIan', currentPoints: 95, accountState: 'Inactive' },
      { id: '3', name: 'DepartedDan', currentPoints: 90, accountState: 'Departed' },
      { id: '4', name: 'Bob', currentPoints: 80, accountState: 'Active' }
    ];

    const result = computeStandardCompetitionRanking(data);
    expect(result.length).toBe(2);
    expect(result.map((r) => r.id)).toEqual(['1', '4']);
    expect(result.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('projects student privacy-safe view with Top-N and redacted non-top peers', () => {
    const ranked: RankedStudent[] = [
      { id: 's1', name: 'Student 1', currentPoints: 100, rank: 1 },
      { id: 's2', name: 'Student 2', currentPoints: 90, rank: 2 },
      { id: 's3', name: 'Student 3', currentPoints: 80, rank: 3 },
      { id: 's4', name: 'Student 4', currentPoints: 70, rank: 4 },
      { id: 's5', name: 'Student 5', currentPoints: 60, rank: 5 },
      { id: 's6', name: 'Student 6 (Self)', currentPoints: 50, rank: 6 },
      { id: 's7', name: 'Student 7', currentPoints: 40, rank: 7 }
    ];

    const view = projectStudentPrivacyView(ranked, 's6', 3);
    expect(view.studentRank).toBe(6);
    expect(view.studentPoints).toBe(50);
    expect(view.populationCount).toBe(7);
    expect(view.summary).toBe('Rank 6 of 7');
    expect(view.leaderboard.length).toBe(3);
    expect(view.leaderboard.map((s) => s.rank)).toEqual([1, 2, 3]);
    // Student 6 and 7 are not in the leaderboard
    expect(view.leaderboard.some((s) => s.name.includes('Student 6'))).toBe(false);
  });
});
