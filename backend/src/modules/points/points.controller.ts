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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { PointsService } from './points.service';
import {
  FundTeacherBudgetDto,
  CreatePointTaskDto,
  UpdatePointTaskDto,
  TeacherAwardPointsDto,
  AdminAdjustStudentBalanceDto,
  SetPoolBalanceDto,
} from './dto/points.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';

@ApiTags('points')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/points')
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Roles('ADMIN')
  @Get('pool')
  @ApiOperation({ summary: 'Get current system point pool status (Admin only)' })
  async getPool() {
    return this.pointsService.getPool();
  }

  @Roles('ADMIN')
  @Post('pool/balance')
  @ApiOperation({ summary: 'Set system point pool balance (Admin only)' })
  async setPoolBalance(
    @Body() dto: SetPoolBalanceDto,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.pointsService.setPoolBalance(dto, adminId, req.correlationId || '');
  }

  @Roles('ADMIN')
  @Post('pool/fund-teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fund teacher point award budget from pool (Admin only)' })
  async fundTeacher(
    @Body() dto: FundTeacherBudgetDto,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.pointsService.fundTeacherBudget(dto, adminId, req.correlationId || '');
  }

  @Roles('ADMIN')
  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Define new point transfer task with discrete options (Admin only)' })
  async createTask(@Body() dto: CreatePointTaskDto) {
    return this.pointsService.createTask(dto);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('tasks')
  @ApiOperation({ summary: 'List all point transfer tasks' })
  async findAllTasks(@Query('isActive') isActive?: string) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.pointsService.findAllTasks(activeBool);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get point task by ID' })
  async findTaskById(@Param('id', ParseUUIDPipe) id: string) {
    return this.pointsService.findTaskById(id);
  }

  @Roles('ADMIN')
  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update point task definition (Admin only)' })
  async updateTask(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePointTaskDto) {
    return this.pointsService.updateTask(id, dto);
  }

  @Roles('ADMIN')
  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete point task (Admin only)' })
  async deleteTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.pointsService.deleteTask(id);
  }

  @Roles('TEACHER')
  @Post('teacher-award')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher awards points to eligible student (Teacher only)' })
  async teacherAward(
    @Body() dto: TeacherAwardPointsDto,
    @CurrentUser('id') teacherId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.pointsService.teacherAwardPoints(dto, teacherId, req.correlationId || '');
  }

  @Roles('ADMIN')
  @Post('admin-adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct administrator student balance adjustment (Admin only)' })
  async adminAdjust(
    @Body() dto: AdminAdjustStudentBalanceDto,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.pointsService.adminAdjustStudentBalance(dto, adminId, req.correlationId || '');
  }
}
