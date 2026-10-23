import { Controller, Get, Query, Res, BadRequestException, ParseEnumPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActionType, Role } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('point-flow')
  @ApiOperation({ summary: 'Query role-scoped point flow audit log records' })
  async getPointFlow(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('studentId') studentId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('actionType', new ParseEnumPipe(ActionType, { optional: true })) actionType?: ActionType,
    @Query('excludeActionType', new ParseEnumPipe(ActionType, { optional: true }))
    excludeActionType?: ActionType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.reportsService.getPointFlowReport(
      {
        startDate,
        endDate,
        studentId,
        teacherId,
        classId,
        subjectId,
        actionType,
        excludeActionType,
        limit,
        offset,
      },
      user!,
    );
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('point-flow/export')
  @ApiOperation({ summary: 'Export role-scoped point flow report to CSV, Excel (XLSX), or PDF' })
  async exportPointFlow(
    @Query('format') format: 'csv' | 'xlsx' | 'pdf',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('studentId') studentId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('actionType', new ParseEnumPipe(ActionType, { optional: true })) actionType?: ActionType,
    @Query('excludeActionType', new ParseEnumPipe(ActionType, { optional: true }))
    excludeActionType?: ActionType,
    @CurrentUser() user?: { id: string; role: Role },
    @Res() res?: Response,
  ) {
    if (!['csv', 'xlsx', 'pdf'].includes(format)) {
      throw new BadRequestException('Format must be one of: csv, xlsx, pdf');
    }

    const result = await this.reportsService.exportPointFlowReport(
      {
        startDate,
        endDate,
        studentId,
        teacherId,
        classId,
        subjectId,
        actionType,
        excludeActionType,
      },
      user!,
      format,
    );

    res!.setHeader('Content-Type', result.contentType);
    res!.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res!.send(result.buffer);
  }
}
