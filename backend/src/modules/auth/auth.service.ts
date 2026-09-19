import { hash, verify } from '@node-rs/argon2';
import { prisma } from '../../core/prisma.js';
import { SessionStore, SessionData } from '../../core/session.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError
} from '../../core/errors.js';
import {
  ProvisionAdminInput,
  CreateUserInput,
  LoginInput,
  UserResponse
} from './auth.schemas.js';

export class AuthService {
  static async provisionAdmin(input: ProvisionAdminInput): Promise<UserResponse> {
    const adminCount = await prisma.administrator.count();
    if (adminCount > 0) {
      throw new ConflictError(
        'Initial administrator already provisioned. Use /auth/users with administrator credentials to create accounts.'
      );
    }

    const existingUser = await this.findUserByNationalIdOrUsername(input.nationalId, input.username);
    if (existingUser) {
      throw new ConflictError('National ID or username already exists');
    }

    const passwordHash = await hash(input.password);
    const admin = await prisma.administrator.create({
      data: {
        nationalId: input.nationalId,
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        accountState: 'Active'
      }
    });

    return {
      id: admin.id,
      nationalId: admin.nationalId,
      username: admin.username,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: 'ADMIN',
      accountState: admin.accountState,
      createdAt: admin.createdAt.toISOString()
    };
  }

  static async createUser(input: CreateUserInput): Promise<UserResponse> {
    const existing = await this.findUserByNationalIdOrUsername(input.nationalId, input.username);
    if (existing) {
      if (existing.nationalId === input.nationalId) {
        throw new ConflictError('National ID is already registered');
      }
      throw new ConflictError('Username is already taken');
    }

    const passwordHash = await hash(input.password);

    if (input.role === 'ADMIN') {
      const admin = await prisma.administrator.create({
        data: {
          nationalId: input.nationalId,
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash,
          accountState: 'Active'
        }
      });
      return {
        id: admin.id,
        nationalId: admin.nationalId,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'ADMIN',
        accountState: admin.accountState,
        createdAt: admin.createdAt.toISOString()
      };
    }

    if (input.role === 'TEACHER') {
      const teacher = await prisma.teacher.create({
        data: {
          nationalId: input.nationalId,
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash,
          accountState: 'Active',
          pointBalance: 0
        }
      });
      return {
        id: teacher.id,
        nationalId: teacher.nationalId,
        username: teacher.username,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        role: 'TEACHER',
        accountState: teacher.accountState,
        pointBalance: teacher.pointBalance,
        createdAt: teacher.createdAt.toISOString()
      };
    }

    if (input.role === 'STUDENT') {
      if (input.classId) {
        const cls = await prisma.class.findUnique({ where: { id: input.classId } });
        if (!cls) {
          throw new BadRequestError('Assigned class does not exist');
        }
      }

      // Find initial Tier 1 (lowest minPoints)
      const tier1 = await prisma.studentTier.findFirst({
        orderBy: { tierIndex: 'asc' }
      });

      const student = await prisma.student.create({
        data: {
          nationalId: input.nationalId,
          username: input.username,
          firstName: input.firstName,
          lastName: input.lastName,
          passwordHash,
          accountState: 'Active',
          currentPoints: 0,
          reservedPoints: 0,
          highestBalance: 0,
          classId: input.classId,
          currentTierId: tier1?.id
        }
      });

      return {
        id: student.id,
        nationalId: student.nationalId,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        role: 'STUDENT',
        accountState: student.accountState,
        classId: student.classId,
        currentPoints: student.currentPoints,
        reservedPoints: student.reservedPoints,
        highestBalance: student.highestBalance,
        createdAt: student.createdAt.toISOString()
      };
    }

    throw new BadRequestError('Invalid role specified');
  }

  static async login(input: LoginInput): Promise<{ sessionId: string; user: UserResponse }> {
    const userRecord = await this.findUserByNationalId(input.nationalId);
    if (!userRecord) {
      throw new UnauthorizedError('Invalid national ID or password', 'INVALID_CREDENTIALS');
    }

    const isValid = await verify(userRecord.passwordHash, input.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid national ID or password', 'INVALID_CREDENTIALS');
    }

    if (userRecord.accountState !== 'Active') {
      throw new UnauthorizedError('Account is not active. Access denied.', 'ACCOUNT_INACTIVE');
    }

    const session = await SessionStore.createSession({
      userId: userRecord.id,
      role: userRecord.role,
      nationalId: userRecord.nationalId,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      accountState: userRecord.accountState
    });

    const userResponse = await this.getMe(userRecord.id, userRecord.role);
    return {
      sessionId: session.sessionId,
      user: userResponse
    };
  }

  static async logout(sessionId: string): Promise<void> {
    await SessionStore.destroySession(sessionId);
  }

  static async getMe(userId: string, role: SessionData['role']): Promise<UserResponse> {
    if (role === 'ADMIN') {
      const admin = await prisma.administrator.findUnique({ where: { id: userId } });
      if (!admin) throw new NotFoundError('User not found');
      return {
        id: admin.id,
        nationalId: admin.nationalId,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'ADMIN',
        accountState: admin.accountState,
        createdAt: admin.createdAt.toISOString()
      };
    }

    if (role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
      if (!teacher) throw new NotFoundError('User not found');
      return {
        id: teacher.id,
        nationalId: teacher.nationalId,
        username: teacher.username,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        role: 'TEACHER',
        accountState: teacher.accountState,
        pointBalance: teacher.pointBalance,
        createdAt: teacher.createdAt.toISOString()
      };
    }

    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { id: userId } });
      if (!student) throw new NotFoundError('User not found');
      return {
        id: student.id,
        nationalId: student.nationalId,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        role: 'STUDENT',
        accountState: student.accountState,
        classId: student.classId,
        currentPoints: student.currentPoints,
        reservedPoints: student.reservedPoints,
        highestBalance: student.highestBalance,
        createdAt: student.createdAt.toISOString()
      };
    }

    throw new NotFoundError('User role not recognized');
  }

  private static async findUserByNationalId(nationalId: string) {
    const admin = await prisma.administrator.findUnique({ where: { nationalId } });
    if (admin) return { ...admin, role: 'ADMIN' as const };

    const teacher = await prisma.teacher.findUnique({ where: { nationalId } });
    if (teacher) return { ...teacher, role: 'TEACHER' as const };

    const student = await prisma.student.findUnique({ where: { nationalId } });
    if (student) return { ...student, role: 'STUDENT' as const };

    return null;
  }

  private static async findUserByNationalIdOrUsername(nationalId: string, username: string) {
    const admin = await prisma.administrator.findFirst({
      where: { OR: [{ nationalId }, { username }] }
    });
    if (admin) return { ...admin, role: 'ADMIN' as const };

    const teacher = await prisma.teacher.findFirst({
      where: { OR: [{ nationalId }, { username }] }
    });
    if (teacher) return { ...teacher, role: 'TEACHER' as const };

    const student = await prisma.student.findFirst({
      where: { OR: [{ nationalId }, { username }] }
    });
    if (student) return { ...student, role: 'STUDENT' as const };

    return null;
  }
}
