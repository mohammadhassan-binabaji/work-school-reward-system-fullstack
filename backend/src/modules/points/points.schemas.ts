import { Type, Static } from '@sinclair/typebox';

export const PoolTransferSchema = Type.Object({
  teacherId: Type.String({ format: 'uuid' }),
  pointAmount: Type.Integer({ minimum: 1 })
});
export type PoolTransferInput = Static<typeof PoolTransferSchema>;

export const CreateTaskSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String()),
  options: Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1 })
});
export type CreateTaskInput = Static<typeof CreateTaskSchema>;

export const AwardPointsSchema = Type.Object({
  studentId: Type.String({ format: 'uuid' }),
  taskId: Type.String({ format: 'uuid' }),
  pointOption: Type.Integer({ minimum: 1 })
});
export type AwardPointsInput = Static<typeof AwardPointsSchema>;

export const DirectAdjustmentSchema = Type.Object({
  targetType: Type.Union([Type.Literal('STUDENT'), Type.Literal('TEACHER')]),
  targetId: Type.String({ format: 'uuid' }),
  pointAdjustment: Type.Integer(),
  reason: Type.String({ minLength: 1, maxLength: 255 })
});
export type DirectAdjustmentInput = Static<typeof DirectAdjustmentSchema>;
