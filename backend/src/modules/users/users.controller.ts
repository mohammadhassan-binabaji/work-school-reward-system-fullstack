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
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
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

export interface UploadedExcelFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

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
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
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
  @ApiOperation({ summary: 'Bulk import student accounts via Excel spreadsheet (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
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
  @UseInterceptors(FileInterceptor('file'))
  async importStudentsFromExcel(@UploadedFile() file?: UploadedExcelFile) {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'FILE_REQUIRED',
        message: 'فایل اکسل الزامی است.',
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'FILE_TOO_LARGE',
        message: 'حجم فایل نباید بیش از ۵ مگابایت باشد.',
      });
    }

    return this.usersService.importStudentsFromExcel(file.buffer);
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
