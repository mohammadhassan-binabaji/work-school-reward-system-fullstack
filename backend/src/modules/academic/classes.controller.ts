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
import { AcademicService } from './academic.service';
import { CreateClassDto, UpdateClassDto, AssignStudentClassDto } from './dto/academic.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';

@ApiTags('academic')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/classes')
export class ClassesController {
  constructor(private academicService: AcademicService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create class (Admin only)' })
  async createClass(@Body() dto: CreateClassDto) {
    return this.academicService.createClass(dto);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List all classes' })
  async findAllClasses(@Query('isActive') isActive?: string) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.academicService.findAllClasses(activeBool);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get class details by ID' })
  async findClassById(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicService.findClassById(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update class (Admin only)' })
  async updateClass(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClassDto) {
    return this.academicService.updateClass(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete class (Admin only)' })
  async deleteClass(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicService.deleteClass(id);
  }

  @Roles('ADMIN')
  @Post('assign-student')
  @ApiOperation({ summary: 'Assign/Reassign student to class (Admin only)' })
  async assignStudent(@Body() dto: AssignStudentClassDto) {
    return this.academicService.assignStudentToClass(dto);
  }

  @Roles('ADMIN')
  @Post('students/:id/depart')
  @ApiOperation({ summary: 'Mark student as departed and cleanup balances (Admin only)' })
  async departStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.academicService.handleStudentDeparture(id, adminId, req.correlationId);
  }
}
