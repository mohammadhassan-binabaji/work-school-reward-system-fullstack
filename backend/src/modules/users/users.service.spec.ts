import { AccountState, Role } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService.findActiveStudentsForAdjustment', () => {
  const findMany = jest.fn();
  let service: UsersService;

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      {
        id: 'graded-student',
        nationalId: '1111111111',
        firstName: 'Graded',
        lastName: 'Student',
        studentProfile: { class: { gradeLevel: 'هفتم' } },
      },
      {
        id: 'no-grade-student',
        nationalId: '2222222222',
        firstName: 'No Grade',
        lastName: 'Student',
        studentProfile: { class: null },
      },
    ]);

    service = Object.create(UsersService.prototype) as UsersService;
    Object.defineProperty(service, 'prisma', {
      value: { user: { findMany } },
    });
  });

  it('returns each active student with a nullable grade level', async () => {
    await expect(service.findActiveStudentsForAdjustment()).resolves.toEqual([
      {
        id: 'graded-student',
        nationalId: '1111111111',
        firstName: 'Graded',
        lastName: 'Student',
        gradeLevel: 'هفتم',
      },
      {
        id: 'no-grade-student',
        nationalId: '2222222222',
        firstName: 'No Grade',
        lastName: 'Student',
        gradeLevel: null,
      },
    ]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: Role.STUDENT,
          accountState: AccountState.ACTIVE,
        },
      }),
    );
  });
});
