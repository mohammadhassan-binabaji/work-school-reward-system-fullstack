import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from '../auth/password.service';
import { AcademicService } from '../academic/academic.service';
import {
  CreateUserDto,
  UpdateUserStateDto,
  BulkImportErrorItemDto,
  BulkImportResultDto,
} from './dto/user.dto';
import { Role, AccountState } from '@prisma/client';

function toAsciiDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return res;
}

function getCellStringValue(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) {
    return '';
  }
  if (typeof cell.value === 'object') {
    if ('text' in (cell.value as any)) {
      return String((cell.value as any).text || '').trim();
    }
    if ('result' in (cell.value as any)) {
      return String((cell.value as any).result || '').trim();
    }
    return String(cell.text || '').trim();
  }
  return String(cell.value).trim();
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private passwordService: PasswordService,
    private academicService: AcademicService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ nationalId: dto.nationalId }, { username: dto.username }],
      },
    });

    if (existing) {
      if (existing.nationalId === dto.nationalId) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'DUPLICATE_NATIONAL_ID',
          message: 'A user with this National ID already exists',
        });
      }
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'DUPLICATE_USERNAME',
        message: 'A user with this username already exists',
      });
    }

    if (dto.role === Role.STUDENT && dto.classId) {
      const cls = await this.prisma.class.findUnique({
        where: { id: dto.classId },
      });
      if (!cls) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'CLASS_NOT_FOUND',
          message: 'The specified class does not exist',
        });
      }
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nationalId: dto.nationalId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          username: dto.username,
          passwordHash: hashedPassword,
          role: dto.role,
          accountState: dto.accountState || AccountState.ACTIVE,
        },
      });

      if (dto.role === Role.TEACHER) {
        await tx.teacherProfile.create({
          data: {
            id: user.id,
            pointBalance: 0,
          },
        });
      } else if (dto.role === Role.STUDENT) {
        const lowestTier = await tx.tierConfiguration.findFirst({
          where: { tierNumber: 1 },
        });

        await tx.studentProfile.create({
          data: {
            id: user.id,
            classId: dto.classId || null,
            currentBalance: 0,
            reservedBalance: 0,
            highestBalance: 0,
            currentTierId: lowestTier?.id || null,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          nationalId: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          accountState: true,
          teacherProfile: true,
          studentProfile: {
            include: {
              class: true,
              currentTier: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  }

  async findAll(role?: Role, accountState?: AccountState) {
    const where: any = {};
    if (role) where.role = role;
    if (accountState) where.accountState = accountState;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        teacherProfile: true,
        studentProfile: {
          include: {
            class: true,
            currentTier: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        teacherProfile: true,
        studentProfile: {
          include: {
            class: true,
            currentTier: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        message: `User with ID ${id} not found`,
      });
    }

    return user;
  }

  async updateUserState(
    id: string,
    dto: UpdateUserStateDto,
    adminId?: string,
    correlationId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        message: `User with ID ${id} not found`,
      });
    }

    if (dto.accountState === AccountState.DEPARTED) {
      if (user.role === Role.STUDENT) {
        await this.academicService.handleStudentDeparture(id, adminId, correlationId);
      } else if (user.role === Role.TEACHER) {
        await this.academicService.handleTeacherDeparture(id, adminId, correlationId);
      }
    }

    if (dto.accountState !== AccountState.ACTIVE) {
      await this.redisService.deleteSessionsForUser(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: { accountState: dto.accountState },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        updatedAt: true,
      },
    });
  }

  async generateStudentImportTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('دانش‌آموزان', {
      views: [{ rightToLeft: true }],
    });

    const activeClasses = await this.prisma.class.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const sampleClassName = activeClasses.length > 0 ? activeClasses[0].name : 'کلاس ۷۰۱';

    worksheet.columns = [
      { header: 'کد ملی', key: 'nationalId', width: 18 },
      { header: 'نام', key: 'firstName', width: 18 },
      { header: 'نام خانوادگی', key: 'lastName', width: 22 },
      { header: 'نام کاربری', key: 'username', width: 20 },
      { header: 'رمز عبور', key: 'password', width: 20 },
      { header: 'نام کلاس', key: 'className', width: 22 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 26;

    const sampleRow = worksheet.addRow({
      nationalId: '0123456789',
      firstName: 'علی',
      lastName: 'محمدی',
      username: 'ali.mohammadi',
      password: 'InitialPassword123!',
      className: sampleClassName,
    });
    sampleRow.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getColumn('nationalId').numFmt = '@';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importStudentsFromExcel(buffer: Buffer): Promise<BulkImportResultDto> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_EXCEL_FILE',
        message: 'فایل اکسل ارسالی نامعتبر یا آسیب‌دیده است.',
      });
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'EMPTY_EXCEL_FILE',
        message: 'فایل اکسل بدون ردیف اطلاعاتی است.',
      });
    }

    const TEMPLATE_HEADERS: Record<string, string> = {
      'کد ملی': 'nationalId',
      نام: 'firstName',
      'نام خانوادگی': 'lastName',
      'نام کاربری': 'username',
      'رمز عبور': 'password',
      'نام کلاس': 'className',
    };

    const headerRow = worksheet.getRow(1);
    const colIndexToField: Record<number, string> = {};
    const foundFields = new Set<string>();

    headerRow.eachCell((cell, colNumber) => {
      const headerText = getCellStringValue(cell).trim();
      const field = TEMPLATE_HEADERS[headerText];
      if (field) {
        colIndexToField[colNumber] = field;
        foundFields.add(field);
      }
    });

    const missingHeaders = Object.keys(TEMPLATE_HEADERS).filter(
      (header) => !foundFields.has(TEMPLATE_HEADERS[header]),
    );
    if (missingHeaders.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'MISSING_EXCEL_COLUMNS',
        message: `ستون‌های الزامی در فایل اکسل یافت نشدند: ${missingHeaders.join('، ')}`,
      });
    }

    interface ParsedRow {
      rowNumber: number;
      nationalId: string;
      firstName: string;
      lastName: string;
      username: string;
      password: string;
      className: string;
    }

    const parsedRows: ParsedRow[] = [];
    const errors: BulkImportErrorItemDto[] = [];
    const seenNationalIds = new Map<string, number>();
    const seenUsernames = new Map<string, number>();

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData: Record<string, string> = {};
      let hasAnyValue = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const field = colIndexToField[colNumber];
        if (field) {
          const val = getCellStringValue(cell);
          if (val) hasAnyValue = true;
          rowData[field] = val;
        }
      });

      if (!hasAnyValue) {
        continue;
      }

      let rawNationalId = toAsciiDigits(rowData.nationalId || '').trim();
      if (/^[0-9]{9}$/.test(rawNationalId)) {
        rawNationalId = rawNationalId.padStart(10, '0');
      }
      const rawFirstName = (rowData.firstName || '').trim();
      const rawLastName = (rowData.lastName || '').trim();
      const rawUsername = (rowData.username || '').trim();
      const rawPassword = rowData.password || '';
      const rawClassName = (rowData.className || '').trim();

      // Field level validations
      if (!rawNationalId) {
        errors.push({ row: rowNumber, field: 'nationalId', message: 'کد ملی الزامی است' });
      } else if (!/^[0-9]{10}$/.test(rawNationalId)) {
        errors.push({
          row: rowNumber,
          field: 'nationalId',
          message: 'کد ملی باید دقیقاً ۱۰ رقم عددی باشد',
          value: rawNationalId,
        });
      }

      if (!rawFirstName) {
        errors.push({ row: rowNumber, field: 'firstName', message: 'نام الزامی است' });
      } else if (rawFirstName.length > 100) {
        errors.push({
          row: rowNumber,
          field: 'firstName',
          message: 'نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد',
        });
      }

      if (!rawLastName) {
        errors.push({ row: rowNumber, field: 'lastName', message: 'نام خانوادگی الزامی است' });
      } else if (rawLastName.length > 100) {
        errors.push({
          row: rowNumber,
          field: 'lastName',
          message: 'نام خانوادگی نمی‌تواند بیش از ۱۰۰ کاراکتر باشد',
        });
      }

      if (!rawUsername) {
        errors.push({ row: rowNumber, field: 'username', message: 'نام کاربری الزامی است' });
      } else if (rawUsername.length < 3 || rawUsername.length > 50) {
        errors.push({
          row: rowNumber,
          field: 'username',
          message: 'نام کاربری باید بین ۳ تا ۵۰ کاراکتر باشد',
          value: rawUsername,
        });
      } else if (!/^[a-zA-Z0-9._-]+$/.test(rawUsername)) {
        errors.push({
          row: rowNumber,
          field: 'username',
          message: 'نام کاربری باید تنها شامل حروف انگلیسی، اعداد، نقطه، خط تیره یا زیرخط باشد',
          value: rawUsername,
        });
      }

      if (!rawPassword) {
        errors.push({ row: rowNumber, field: 'password', message: 'رمز عبور الزامی است' });
      } else if (rawPassword.length < 8) {
        errors.push({
          row: rowNumber,
          field: 'password',
          message: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
        });
      }

      if (!rawClassName) {
        errors.push({ row: rowNumber, field: 'className', message: 'نام کلاس الزامی است' });
      }

      // Check intra-file duplicates
      if (rawNationalId && /^[0-9]{10}$/.test(rawNationalId)) {
        if (seenNationalIds.has(rawNationalId)) {
          errors.push({
            row: rowNumber,
            field: 'nationalId',
            message: `کد ملی در سطر ${seenNationalIds.get(rawNationalId)} نیز تکرار شده است`,
            value: rawNationalId,
          });
        } else {
          seenNationalIds.set(rawNationalId, rowNumber);
        }
      }

      if (rawUsername) {
        if (seenUsernames.has(rawUsername)) {
          errors.push({
            row: rowNumber,
            field: 'username',
            message: `نام کاربری در سطر ${seenUsernames.get(rawUsername)} نیز تکرار شده است`,
            value: rawUsername,
          });
        } else {
          seenUsernames.set(rawUsername, rowNumber);
        }
      }

      parsedRows.push({
        rowNumber,
        nationalId: rawNationalId,
        firstName: rawFirstName,
        lastName: rawLastName,
        username: rawUsername,
        password: rawPassword,
        className: rawClassName,
      });
    }

    if (parsedRows.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'EMPTY_EXCEL_FILE',
        message: 'هیچ رکوردی برای افزودن در فایل یافت نشد.',
      });
    }

    // Check database classes existence
    const distinctClassNames = Array.from(
      new Set(parsedRows.map((r) => r.className).filter(Boolean)),
    );
    const existingClasses = await this.prisma.class.findMany({
      where: { name: { in: distinctClassNames } },
      select: { id: true, name: true, isActive: true },
    });
    const classNameToId = new Map<string, string>();
    for (const c of existingClasses) {
      classNameToId.set(c.name, c.id);
    }

    for (const row of parsedRows) {
      if (row.className && !classNameToId.has(row.className)) {
        errors.push({
          row: row.rowNumber,
          field: 'className',
          message: `کلاسی با عنوان «${row.className}» در سیستم یافت نشد`,
          value: row.className,
        });
      }
    }

    // Check database existing users
    const validNationalIds = Array.from(
      new Set(parsedRows.map((r) => r.nationalId).filter((id) => /^[0-9]{10}$/.test(id))),
    );
    const validUsernames = Array.from(new Set(parsedRows.map((r) => r.username).filter(Boolean)));

    const existingUsers = await this.prisma.user.findMany({
      where: {
        OR: [{ nationalId: { in: validNationalIds } }, { username: { in: validUsernames } }],
      },
      select: { nationalId: true, username: true },
    });

    const existingNationalIdSet = new Set(existingUsers.map((u) => u.nationalId));
    const existingUsernameSet = new Set(existingUsers.map((u) => u.username));

    for (const row of parsedRows) {
      if (existingNationalIdSet.has(row.nationalId)) {
        errors.push({
          row: row.rowNumber,
          field: 'nationalId',
          message: 'کاربری با این کد ملی قبلاً در سیستم ثبت شده است',
          value: row.nationalId,
        });
      }
      if (existingUsernameSet.has(row.username)) {
        errors.push({
          row: row.rowNumber,
          field: 'username',
          message: 'کاربری با این نام کاربری قبلاً در سیستم ثبت شده است',
          value: row.username,
        });
      }
    }

    // If any error exists across any row, fail all-or-nothing
    if (errors.length > 0) {
      errors.sort((a, b) => a.row - b.row);
      throw new UnprocessableEntityException({
        statusCode: 422,
        errorCode: 'BULK_IMPORT_VALIDATION_FAILED',
        message: `اعتبارسنجی فایل اکسل با خطا مواجه شد (${errors.length} مورد خطا)`,
        errors,
      });
    }

    // Fetch baseline tier 1
    const lowestTier = await this.prisma.tierConfiguration.findFirst({
      where: { tierNumber: 1 },
    });

    // Hash all passwords
    const hashedPasswords = await Promise.all(
      parsedRows.map((r) => this.passwordService.hash(r.password)),
    );

    // Atomically create users
    return this.prisma.$transaction(async (tx) => {
      const createdUsers: any[] = [];
      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const passwordHash = hashedPasswords[i];
        const classId = classNameToId.get(row.className)!;

        const user = await tx.user.create({
          data: {
            nationalId: row.nationalId,
            firstName: row.firstName,
            lastName: row.lastName,
            username: row.username,
            passwordHash,
            role: Role.STUDENT,
            accountState: AccountState.ACTIVE,
          },
        });

        await tx.studentProfile.create({
          data: {
            id: user.id,
            classId,
            currentBalance: 0,
            reservedBalance: 0,
            highestBalance: 0,
            currentTierId: lowestTier?.id || null,
          },
        });

        createdUsers.push(user);
      }

      return {
        count: createdUsers.length,
        message: `${createdUsers.length} دانش‌آموز با موفقیت ایجاد شدند.`,
        importedUsers: createdUsers,
      };
    });
  }
}
