import { Type, Static } from '@sinclair/typebox';

export const CreateClassSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  gradeLevel: Type.Optional(Type.String({ maxLength: 20 })),
  description: Type.Optional(Type.String({ maxLength: 255 }))
});
export type CreateClassInput = Static<typeof CreateClassSchema>;

export const ClassResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  gradeLevel: Type.Union([Type.String(), Type.Null()]),
  description: Type.Union([Type.String(), Type.Null()]),
  status: Type.String(),
  createdAt: Type.String()
});
export type ClassResponse = Static<typeof ClassResponseSchema>;

export const CreateSubjectSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  description: Type.Optional(Type.String({ maxLength: 255 }))
});
export type CreateSubjectInput = Static<typeof CreateSubjectSchema>;

export const SubjectResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String()
});
export type SubjectResponse = Static<typeof SubjectResponseSchema>;

export const AssignStudentClassSchema = Type.Object({
  classId: Type.String({ format: 'uuid' })
});
export type AssignStudentClassInput = Static<typeof AssignStudentClassSchema>;

export const CreateAssignmentSchema = Type.Object({
  teacherId: Type.String({ format: 'uuid' }),
  classId: Type.String({ format: 'uuid' }),
  subjectId: Type.String({ format: 'uuid' })
});
export type CreateAssignmentInput = Static<typeof CreateAssignmentSchema>;

export const AssignmentResponseSchema = Type.Object({
  id: Type.String(),
  teacherId: Type.String(),
  classId: Type.String(),
  subjectId: Type.String(),
  assignmentState: Type.String(),
  createdAt: Type.String()
});
export type AssignmentResponse = Static<typeof AssignmentResponseSchema>;

export const UpdateTeacherStatusSchema = Type.Object({
  status: Type.Union([
    Type.Literal('Active'),
    Type.Literal('Deactivated'),
    Type.Literal('Departed')
  ])
});
export type UpdateTeacherStatusInput = Static<typeof UpdateTeacherStatusSchema>;
