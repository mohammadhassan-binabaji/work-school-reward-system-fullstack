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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserStateDto, UserResponseDto } from './dto/user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, AccountState } from '@prisma/client';

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

  @Get()
  @ApiOperation({ summary: 'List all users with optional filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  async findAll(
    @Query('role') role?: Role,
    @Query('accountState') accountState?: AccountState,
  ) {
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
  ) {
    return this.usersService.updateUserState(id, dto);
  }
}
