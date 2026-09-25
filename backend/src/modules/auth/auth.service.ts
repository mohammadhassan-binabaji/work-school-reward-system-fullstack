import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from './password.service';
import { InitialAdminDto, LoginDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private passwordService: PasswordService,
    private configService: ConfigService,
  ) {}

  async createInitialAdmin(dto: InitialAdminDto) {
    const adminExists = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });

    if (adminExists) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'ADMIN_ALREADY_EXISTS',
        message: 'Initial administrator has already been provisioned',
      });
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    const admin = await this.prisma.user.create({
      data: {
        nationalId: dto.nationalId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username,
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        accountState: 'ACTIVE',
      },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return admin;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { nationalId: dto.nationalId },
      include: {
        teacherProfile: true,
        studentProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid National ID or password',
      });
    }

    const isValid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid National ID or password',
      });
    }

    if (user.accountState !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.accountState.toLowerCase()}`,
      });
    }

    const sessionId = uuidv4();
    const sessionTtl = this.configService.get<number>('app.sessionTtlSeconds') || 86400;

    await this.redisService.createSession(
      sessionId,
      {
        userId: user.id,
        nationalId: user.nationalId,
        username: user.username,
        role: user.role,
        accountState: user.accountState,
      },
      sessionTtl,
    );

    return {
      sessionId,
      role: user.role,
      user: {
        id: user.id,
        nationalId: user.nationalId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        accountState: user.accountState,
      },
    };
  }

  async logout(sessionId: string) {
    if (sessionId) {
      await this.redisService.deleteSession(sessionId);
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        teacherProfile: true,
        studentProfile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    return user;
  }
}
