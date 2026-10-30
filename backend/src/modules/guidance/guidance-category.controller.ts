import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { GuidanceService } from './guidance.service';
import {
  CreateGuidanceCategoryDto,
  UpdateGuidanceCategoryDto,
} from './dto/guidance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('guidance-categories')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/guidance-categories')
export class GuidanceCategoryController {
  constructor(private guidanceService: GuidanceService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create guidance category (Admin only)' })
  async createCategory(@Body() dto: CreateGuidanceCategoryDto) {
    return this.guidanceService.createCategory(dto);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List guidance categories with cards' })
  async findAllCategories(@CurrentUser('role') role?: Role) {
    return this.guidanceService.findAllCategories(role);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get guidance category by ID' })
  async findCategoryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidanceService.findCategoryById(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update guidance category (Admin only)' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuidanceCategoryDto,
  ) {
    return this.guidanceService.updateCategory(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove guidance category (Admin only)' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidanceService.deleteCategory(id);
  }
}
