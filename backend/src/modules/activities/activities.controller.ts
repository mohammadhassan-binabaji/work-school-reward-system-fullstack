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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import {
  CreateActivityDto,
  UpdateActivityMetadataDto,
  SubmitVerificationDto,
  ActivityResponseDto,
} from './dto/activities.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('activities')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create challenge or mission (Admin only)' })
  async createActivity(@Body() dto: CreateActivityDto) {
    return this.activitiesService.createActivity(dto);
  }

  @Roles('ADMIN', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List challenges and missions' })
  @ApiResponse({ status: 200, type: [ActivityResponseDto] })
  async findAllActivities(@CurrentUser() user?: { id: string; role: Role }) {
    return this.activitiesService.findAllActivities(user);
  }

  @Roles('ADMIN', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get challenge or mission by ID' })
  @ApiResponse({ status: 200, type: ActivityResponseDto })
  async findActivityById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.activitiesService.findActivityById(id, user);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update activity metadata (point value is immutable) (Admin only)' })
  async updateActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityMetadataDto,
  ) {
    return this.activitiesService.updateActivityMetadata(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove activity (Admin only)' })
  async deleteActivity(@Param('id', ParseUUIDPipe) id: string) {
    return this.activitiesService.deleteActivity(id);
  }

  @Roles('STUDENT')
  @Post(':id/submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit verification evidence for challenge/mission (Student only)' })
  async submitVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitVerificationDto,
    @CurrentUser('id') studentId: string,
  ) {
    return this.activitiesService.submitVerification(id, dto, studentId);
  }
}
