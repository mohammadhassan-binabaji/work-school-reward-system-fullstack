import {
  Controller,
  Post,
  Get,
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
import { AcademicService } from './academic.service';
import { CreateAssignmentDto } from './dto/academic.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';

@ApiTags('academic')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private academicService: AcademicService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign teacher to class and subject (Admin only)' })
  async createAssignment(@Body() dto: CreateAssignmentDto) {
    return this.academicService.createAssignment(dto);
  }

  @Roles('ADMIN', 'TEACHER')
  @Get()
  @ApiOperation({ summary: 'List active teacher-class-subject assignments' })
  async findAllAssignments(
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.academicService.findAllAssignments(teacherId, classId);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Remove assignment (Admin only)' })
  async removeAssignment(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicService.removeAssignment(id);
  }

  @Roles('ADMIN')
  @Post('teachers/:id/depart')
  @ApiOperation({ summary: 'Mark teacher as departed and return unspent budget to pool (Admin only)' })
  async departTeacher(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.academicService.handleTeacherDeparture(id, req.correlationId);
  }
}
