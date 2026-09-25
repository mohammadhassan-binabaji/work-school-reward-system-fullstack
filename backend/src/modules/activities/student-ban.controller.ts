import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { UnbanStudentDto } from './dto/activities.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('students')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/students')
export class StudentBanController {
  constructor(private activitiesService: ActivitiesService) {}

  @Roles('ADMIN')
  @Post(':id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin manual unban override for student activity (Admin only)' })
  async unbanStudent(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Body() dto: UnbanStudentDto,
  ) {
    return this.activitiesService.unbanStudent(studentId, dto);
  }
}
