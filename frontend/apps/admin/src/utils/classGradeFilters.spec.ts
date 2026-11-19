import { describe, expect, it } from 'vitest';
import {
  getClassOptionsForGrade,
  NO_CLASS_FILTER,
  NO_GRADE_FILTER,
  reconcileClassFilter,
  type ClassGradeOption,
} from './classGradeFilters';

const classes: ClassGradeOption[] = [
  { name: 'Class 701', gradeLevel: '7' },
  { name: 'Class 702', gradeLevel: '7' },
  { name: 'Class 801', gradeLevel: '8' },
  { name: 'Ungraded class', gradeLevel: null },
  { name: '  ', gradeLevel: '' },
];

describe('grade-dependent class filters', () => {
  it('shows every named class and the no-class option when all grades are selected', () => {
    expect(getClassOptionsForGrade(classes, '')).toEqual({
      classNames: ['Class 701', 'Class 702', 'Class 801', 'Ungraded class'],
      includeNoClass: true,
    });
  });

  it('shows only matching classes and hides no-class for a specific grade', () => {
    expect(getClassOptionsForGrade(classes, '7')).toEqual({
      classNames: ['Class 701', 'Class 702'],
      includeNoClass: false,
    });
  });

  it('shows ungraded classes and no-class for the no-grade selection', () => {
    expect(getClassOptionsForGrade(classes, NO_GRADE_FILTER)).toEqual({
      classNames: ['Ungraded class'],
      includeNoClass: true,
    });
  });

  it('resets a class selection that no longer matches the selected grade', () => {
    expect(reconcileClassFilter(classes, 'Class 701', '8')).toBe('');
    expect(reconcileClassFilter(classes, 'Class 801', '8')).toBe('Class 801');
  });

  it('resets no-class for a specific grade but preserves it for all or no grade', () => {
    expect(reconcileClassFilter(classes, NO_CLASS_FILTER, '7')).toBe('');
    expect(reconcileClassFilter(classes, NO_CLASS_FILTER, '')).toBe(NO_CLASS_FILTER);
    expect(reconcileClassFilter(classes, NO_CLASS_FILTER, NO_GRADE_FILTER)).toBe(NO_CLASS_FILTER);
  });
});
