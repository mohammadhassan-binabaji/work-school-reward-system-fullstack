import { Module } from '@nestjs/common';
import { AcademicService } from './academic.service';
import { ClassesController } from './classes.controller';
import { SubjectsController } from './subjects.controller';
import { AssignmentsController } from './assignments.controller';

@Module({
  providers: [AcademicService],
  controllers: [ClassesController, SubjectsController, AssignmentsController],
  exports: [AcademicService],
})
export class AcademicModule {}
