import { toAsciiDigits, type User } from '@student-reward/shared';

export interface StudentFilterValues {
  search: string;
  className: string;
  gradeLevel: string;
}

export interface StudentFilterContext {
  firstName: string;
  lastName: string;
  nationalId: string;
  className: string;
  gradeLevel: string;
}

export function getStudentFilterContext(student?: User | null): StudentFilterContext {
  return {
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    nationalId: student?.nationalId || '',
    className: student?.studentProfile?.class?.name?.trim() || '',
    gradeLevel: student?.studentProfile?.class?.gradeLevel?.trim() || '',
  };
}

export function normalizeStudentSearch(value: string): string {
  return toAsciiDigits(value).toLowerCase().trim();
}

export function matchesStudentFilters(
  context: StudentFilterContext,
  filters: StudentFilterValues,
  noClassFilter: string,
  noGradeFilter: string,
): boolean {
  const matchesClass =
    !filters.className ||
    (filters.className === noClassFilter
      ? !context.className
      : context.className === filters.className);
  const matchesGrade =
    !filters.gradeLevel ||
    (filters.gradeLevel === noGradeFilter
      ? !context.gradeLevel
      : context.gradeLevel === filters.gradeLevel);

  if (!matchesClass || !matchesGrade) return false;

  const query = normalizeStudentSearch(filters.search);
  if (!query) return true;

  const name = normalizeStudentSearch(`${context.firstName} ${context.lastName}`);
  return name.includes(query) || normalizeStudentSearch(context.nationalId).includes(query);
}
