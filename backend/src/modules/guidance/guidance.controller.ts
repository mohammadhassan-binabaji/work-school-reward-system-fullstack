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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth, ApiQuery } from '@nestjs/swagger';
import { GuidanceService } from './guidance.service';
import { CreateGuidanceCardDto, UpdateGuidanceCardDto } from './dto/guidance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('guidance-cards')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/guidance-cards')
export class GuidanceController {
  constructor(private guidanceService: GuidanceService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create guidance card (Admin only)' })
  async createGuidanceCard(@Body() dto: CreateGuidanceCardDto) {
    return this.guidanceService.createGuidanceCard(dto);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List guidance cards (Display-only for students)' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async findAllGuidanceCards(
    @CurrentUser('role') role?: Role,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.guidanceService.findAllGuidanceCards(role, categoryId);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get guidance card by ID' })
  async findGuidanceCardById(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidanceService.findGuidanceCardById(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update guidance card (Admin only)' })
  async updateGuidanceCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuidanceCardDto,
  ) {
    return this.guidanceService.updateGuidanceCard(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove guidance card (Admin only)' })
  async deleteGuidanceCard(@Param('id', ParseUUIDPipe) id: string) {
    return this.guidanceService.deleteGuidanceCard(id);
  }
}
