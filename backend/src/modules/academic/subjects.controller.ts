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
import { AcademicService } from './academic.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/academic.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('academic')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/subjects')
export class SubjectsController {
  constructor(private academicService: AcademicService) {}

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create subject (Admin only)' })
  async createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicService.createSubject(dto);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List all subjects' })
  async findAllSubjects() {
    return this.academicService.findAllSubjects();
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID' })
  async findSubjectById(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicService.findSubjectById(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update subject (Admin only)' })
  async updateSubject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubjectDto) {
    return this.academicService.updateSubject(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete subject (Admin only)' })
  async deleteSubject(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicService.deleteSubject(id);
  }
}
