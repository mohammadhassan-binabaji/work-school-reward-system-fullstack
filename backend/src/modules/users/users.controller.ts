import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserStateDto,
  UpdateUserDto,
  UserResponseDto,
  BulkImportResultDto,
} from './dto/user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';
import { Role, AccountState } from '@prisma/client';

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export type UploadedExcelFile = UploadedFilePayload;

@ApiTags('users')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private async ensureVicePrincipalStudent(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('معاون سامانه فقط به حساب‌های دانش‌آموزی دسترسی دارد.');
    }
    return user;
  }

  @Post()
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user account (vice principals may create students only)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('role') requesterRole: Role,
    @UploadedFile() image?: UploadedFilePayload,
  ) {
    if (
      requesterRole === Role.VICE_PRINCIPAL &&
      (dto.role !== Role.STUDENT || dto.accountState === AccountState.DEPARTED)
    ) {
      throw new ForbiddenException(
        'معاون سامانه فقط می‌تواند حساب دانش‌آموز ایجاد کند و ثبت خروج مجاز نیست.',
      );
    }

    let imageUrl: string | undefined;

    if (image && image.buffer && image.buffer.length > 0) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(image.mimetype)) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INVALID_IMAGE_TYPE',
          message: 'تصویر ارسالی باید با فرمت JPEG، PNG یا WebP باشد.',
        });
      }

      if (image.size > 5 * 1024 * 1024) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'IMAGE_TOO_LARGE',
          message: 'حجم تصویر نباید بیش از ۵ مگابایت باشد.',
        });
      }

      imageUrl = await this.usersService.uploadUserImage(
        image.buffer,
        image.originalname,
        image.mimetype,
      );
    }

    return this.usersService.createUser(dto, imageUrl);
  }

  @Get('import/template')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({ summary: 'Download student bulk import Excel template' })
  @ApiResponse({
    status: 200,
    description: 'Excel template file (.xlsx)',
    headers: {
      'Content-Type': {
        schema: {
          type: 'string',
          example: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      },
    },
  })
  async downloadImportTemplate(@Res() res: Response) {
    const buffer = await this.usersService.generateStudentImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="students-import-template.xlsx"');
    res.send(buffer);
  }

  @Post('import/excel')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk import student accounts via Excel spreadsheet + optional images ZIP',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'فایل اکسل دانش‌آموزان (.xlsx)',
        },
        imagesZip: {
          type: 'string',
          format: 'binary',
          description: 'فایل فشرده حاوی تصاویر دانش‌آموزان (.zip) - اختیاری',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Students imported successfully',
    type: BulkImportResultDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or empty Excel file' })
  @ApiResponse({ status: 422, description: 'Row-level validation errors in Excel file' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'imagesZip', maxCount: 1 },
    ]),
  )
  async importStudentsFromExcel(
    @UploadedFiles()
    files?: {
      file?: UploadedExcelFile[];
      imagesZip?: UploadedExcelFile[];
    },
  ) {
    const excelFile = files?.file?.[0];
    const zipFile = files?.imagesZip?.[0];

    if (!excelFile || !excelFile.buffer) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'FILE_REQUIRED',
        message: 'فایل اکسل الزامی است.',
      });
    }

    if (excelFile.size > 5 * 1024 * 1024) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'FILE_TOO_LARGE',
        message: 'حجم فایل اکسل نباید بیش از ۵ مگابایت باشد.',
      });
    }

    if (zipFile && zipFile.size > 50 * 1024 * 1024) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'ZIP_TOO_LARGE',
        message: 'حجم فایل فشرده تصاویر نباید بیش از ۵۰ مگابایت باشد.',
      });
    }

    return this.usersService.importStudentsFromExcel(excelFile.buffer, zipFile?.buffer);
  }

  @Get()
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({ summary: 'List users; vice principals are restricted to students' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  async findAll(
    @Query('role') role: Role | undefined,
    @Query('accountState') accountState: AccountState | undefined,
    @CurrentUser('role') requesterRole: Role,
  ) {
    if (requesterRole === Role.VICE_PRINCIPAL && role && role !== Role.STUDENT) {
      throw new ForbiddenException('معاون سامانه فقط به فهرست دانش‌آموزان دسترسی دارد.');
    }
    return this.usersService.findAll(
      requesterRole === Role.VICE_PRINCIPAL ? Role.STUDENT : role,
      accountState,
    );
  }

  @Get('academic/teachers')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({ summary: 'List teacher references for academic assignments' })
  async findAcademicTeacherReferences() {
    return this.usersService.findTeacherReferences();
  }

  @Get('academic/students')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({ summary: 'List student references for academic class assignment' })
  async findAcademicStudentReferences() {
    return this.usersService.findStudentReferences();
  }

  @Get('students')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({
    summary: 'List active students for direct point adjustment (Admin or Vice Principal)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active student identifiers and names for adjustment forms',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nationalId: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
    },
  })
  async findActiveStudentsForAdjustment() {
    return this.usersService.findActiveStudentsForAdjustment();
  }

  @Get(':id')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({ summary: 'Get a user; vice principals may access students only' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('role') requesterRole: Role) {
    if (requesterRole === Role.VICE_PRINCIPAL) {
      return this.ensureVicePrincipalStudent(id);
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id/state')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({
    summary: 'Update user account state; vice principals cannot initiate student departure',
  })
  @ApiResponse({ status: 200, description: 'Account state updated' })
  async updateState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStateDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') requesterRole: Role,
    @Req() req: RequestWithCorrelation,
  ) {
    if (requesterRole === Role.VICE_PRINCIPAL) {
      const user = await this.ensureVicePrincipalStudent(id);
      if (
        dto.accountState === AccountState.DEPARTED &&
        user.accountState !== AccountState.DEPARTED
      ) {
        throw new ForbiddenException('ثبت خروج دانش‌آموز فقط برای مدیر سامانه مجاز است.');
      }
    }
    return this.usersService.updateUserState(id, dto, adminId, req.correlationId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @ApiOperation({ summary: 'Update user profile; vice principals may update students only' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') requesterRole: Role,
    @Req() req: RequestWithCorrelation,
    @UploadedFile() image?: UploadedFilePayload,
  ) {
    if (requesterRole === Role.VICE_PRINCIPAL) {
      const user = await this.ensureVicePrincipalStudent(id);
      if (
        dto.accountState === AccountState.DEPARTED &&
        user.accountState !== AccountState.DEPARTED
      ) {
        throw new ForbiddenException('ثبت خروج دانش‌آموز فقط برای مدیر سامانه مجاز است.');
      }
    }

    if (image && image.buffer && image.buffer.length > 0) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(image.mimetype)) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INVALID_IMAGE_TYPE',
          message: 'تصویر ارسالی باید با فرمت JPEG، PNG یا WebP باشد.',
        });
      }

      if (image.size > 5 * 1024 * 1024) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'IMAGE_TOO_LARGE',
          message: 'حجم تصویر نباید بیش از ۵ مگابایت باشد.',
        });
      }
    }

    return this.usersService.updateUser(id, dto, adminId, req.correlationId, image);
  }

  @Delete(':id')
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard delete a user; vice principals may delete students only' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') requesterRole: Role,
    @Req() req: RequestWithCorrelation,
  ) {
    if (requesterRole === Role.VICE_PRINCIPAL) {
      await this.ensureVicePrincipalStudent(id);
    }
    return this.usersService.deleteUser(id, adminId, req.correlationId);
  }
}
