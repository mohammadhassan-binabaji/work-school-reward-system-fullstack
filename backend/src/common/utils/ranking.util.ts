export interface RawStudentScore {
  studentId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  username: string;
  imageUrl?: string | null;
  points: number;
}

export interface RankedStudent {
  rank: number;
  studentId: string;
  studentName: string;
  username: string;
  imageUrl?: string | null;
  points: number;
}

export interface StudentRankingView {
  totalActiveStudents: number;
  selfRank?: {
    rank: number;
    studentName: string;
    imageUrl?: string | null;
    points: number;
  };
  topStudents: {
    rank: number;
    studentName: string;
    imageUrl?: string | null;
    points: number;
  }[];
}

export interface StaffRankingView {
  totalActiveStudents: number;
  rankings: RankedStudent[];
}

export class RankingUtil {
  /**
   * Computes standard competition ranking (1, 2, 2, 4...) for a list of student scores.
   * Input list MUST be sorted in descending order by points.
   */
  static computeStandardCompetitionRanking(students: RawStudentScore[]): RankedStudent[] {
    const ranked: RankedStudent[] = [];
    let previousPoints: number | null = null;
    let previousRank = 1;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      let currentRank: number;

      if (previousPoints !== null && student.points === previousPoints) {
        currentRank = previousRank;
      } else {
        currentRank = i + 1;
      }

      ranked.push({
        rank: currentRank,
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        username: student.username,
        imageUrl: student.imageUrl,
        points: student.points,
      });

      previousPoints = student.points;
      previousRank = currentRank;
    }

    return ranked;
  }

  /**
   * Masks student ranking results to protect non-top peer privacy (FR-058).
   * Returns top 3 students (or top tie bracket) and self rank only.
   */
  static applyStudentPrivacyMask(
    rankedStudents: RankedStudent[],
    currentStudentId: string,
    topBoardLimit = 3,
  ): StudentRankingView {
    const totalActiveStudents = rankedStudents.length;
    const topStudents = rankedStudents
      .filter((s) => s.rank <= topBoardLimit)
      .map((s) => ({
        rank: s.rank,
        studentName: s.studentName,
        imageUrl: s.imageUrl,
        points: s.points,
      }));

    const self = rankedStudents.find((s) => s.studentId === currentStudentId);

    return {
      totalActiveStudents,
      selfRank: self
        ? {
            rank: self.rank,
            studentName: self.studentName,
            imageUrl: self.imageUrl,
            points: self.points,
          }
        : undefined,
      topStudents,
    };
  }
}
