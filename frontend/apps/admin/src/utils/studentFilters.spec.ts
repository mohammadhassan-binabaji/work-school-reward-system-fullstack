import { describe, expect, it } from 'vitest';
import {
  matchesStudentFilters,
  normalizeStudentSearch,
  type StudentFilterContext,
} from './studentFilters';

const student: StudentFilterContext = {
  firstName: 'علی',
  lastName: 'رضایی',
  nationalId: '۱۲۳۴۵۶۷۸۹۰',
  className: 'الف',
  gradeLevel: 'هفتم',
};

const emptyFilters = { search: '', className: '', gradeLevel: '' };

describe('studentFilters', () => {
  it('normalizes Persian and Arabic-Indic digits', () => {
    expect(normalizeStudentSearch('۱۲۳٤۵')).toBe('12345');
  });

  it('matches name and normalized national ID', () => {
    expect(matchesStudentFilters(student, { ...emptyFilters, search: 'رضایی' }, '__NO_CLASS__', '__NO_GRADE__')).toBe(true);
    expect(matchesStudentFilters(student, { ...emptyFilters, search: '1234567890' }, '__NO_CLASS__', '__NO_GRADE__')).toBe(true);
  });

  it('applies class, grade, and missing-value filters', () => {
    expect(matchesStudentFilters(student, { ...emptyFilters, className: 'ب' }, '__NO_CLASS__', '__NO_GRADE__')).toBe(false);
    expect(matchesStudentFilters(student, { ...emptyFilters, gradeLevel: 'هفتم' }, '__NO_CLASS__', '__NO_GRADE__')).toBe(true);
    expect(matchesStudentFilters({ ...student, className: '' }, { ...emptyFilters, className: '__NO_CLASS__' }, '__NO_CLASS__', '__NO_GRADE__')).toBe(true);
  });
});
