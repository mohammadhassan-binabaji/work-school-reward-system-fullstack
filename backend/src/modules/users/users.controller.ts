import {
  Controller,
  Post,
  Get,
  Patch,
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
@Roles('ADMIN')
@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user account (Admin only)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateUserDto,
    @UploadedFile() image?: UploadedFilePayload,
  ) {
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

      imageUrl = await this.usersService.uploadUserImage(image.buffer, image.originalname, image.mimetype);
    }

    return this.usersService.createUser(dto, imageUrl);
  }

  @Get('import/template')
  @ApiOperation({ summary: 'Download student bulk import Excel template (Admin only)' })
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk import student accounts via Excel spreadsheet + optional images ZIP (Admin only)' })
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
  @ApiOperation({ summary: 'List all users with optional filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  async findAll(@Query('role') role?: Role, @Query('accountState') accountState?: AccountState) {
    return this.usersService.findAll(role, accountState);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/state')
  @ApiOperation({ summary: 'Update user account state (Admin only)' })
  @ApiResponse({ status: 200, description: 'Account state updated' })
  async updateState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStateDto,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.usersService.updateUserState(id, dto, adminId, req.correlationId);
  }
}
