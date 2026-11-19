export interface ClassGradeOption {
  name: string;
  gradeLevel?: string | null;
}

export const NO_GRADE_FILTER = '__NO_GRADE__';
export const NO_CLASS_FILTER = '__NO_CLASS__';

export function getClassOptionsForGrade(
  classes: ClassGradeOption[],
  gradeFilter: string,
): { classNames: string[]; includeNoClass: boolean } {
  const matchingClasses = classes.filter((classOption) => matchesGrade(classOption, gradeFilter));
  const classNames = [
    ...new Set(matchingClasses.map((classOption) => classOption.name.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  return {
    classNames,
    includeNoClass: !gradeFilter || gradeFilter === NO_GRADE_FILTER,
  };
}

export function reconcileClassFilter(
  classes: ClassGradeOption[],
  classFilter: string,
  gradeFilter: string,
): string {
  if (!classFilter) return classFilter;

  if (classFilter === NO_CLASS_FILTER) {
    return !gradeFilter || gradeFilter === NO_GRADE_FILTER ? classFilter : '';
  }

  const selectedClass = classes.find((classOption) => classOption.name.trim() === classFilter);
  return selectedClass && matchesGrade(selectedClass, gradeFilter) ? classFilter : '';
}

function matchesGrade(classOption: ClassGradeOption, gradeFilter: string): boolean {
  if (!gradeFilter) return true;

  const classGrade = classOption.gradeLevel?.trim() || '';
  return gradeFilter === NO_GRADE_FILTER
    ? !classGrade
    : classGrade === gradeFilter;
}
