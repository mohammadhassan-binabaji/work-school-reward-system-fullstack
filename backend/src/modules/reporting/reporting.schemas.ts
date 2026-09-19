import { Type, Static } from '@sinclair/typebox';

export const PointFlowQuerySchema = Type.Object({
  startDate: Type.Optional(Type.String()),
  endDate: Type.Optional(Type.String()),
  studentId: Type.Optional(Type.String({ format: 'uuid' })),
  teacherId: Type.Optional(Type.String({ format: 'uuid' })),
  classId: Type.Optional(Type.String({ format: 'uuid' })),
  subjectId: Type.Optional(Type.String({ format: 'uuid' })),
  actionType: Type.Optional(Type.String()),
  rewardId: Type.Optional(Type.String({ format: 'uuid' })),
  tierId: Type.Optional(Type.String({ format: 'uuid' }))
});
export type PointFlowQuery = Static<typeof PointFlowQuerySchema>;

export const ExportFormatEnum = Type.Union([
  Type.Literal('csv'),
  Type.Literal('excel'),
  Type.Literal('pdf')
]);
export type ExportFormat = Static<typeof ExportFormatEnum>;

export const ExportReportQuerySchema = Type.Object({
  format: ExportFormatEnum,
  startDate: Type.Optional(Type.String()),
  endDate: Type.Optional(Type.String()),
  studentId: Type.Optional(Type.String({ format: 'uuid' })),
  teacherId: Type.Optional(Type.String({ format: 'uuid' })),
  classId: Type.Optional(Type.String({ format: 'uuid' })),
  subjectId: Type.Optional(Type.String({ format: 'uuid' })),
  actionType: Type.Optional(Type.String()),
  rewardId: Type.Optional(Type.String({ format: 'uuid' })),
  tierId: Type.Optional(Type.String({ format: 'uuid' }))
});
export type ExportReportQuery = Static<typeof ExportReportQuerySchema>;

export const AuditRecordResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  correlationId: Type.String(),
  eventTimestamp: Type.String(),
  actionType: Type.String(),
  actorRole: Type.String(),
  actorId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sourceType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sourceId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  recipientType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  recipientId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  pointAmount: Type.Integer(),
  taskName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  pointOption: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
  reasonDescription: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  resultingBalanceState: Type.Optional(Type.Any())
});
export type AuditRecordResponse = Static<typeof AuditRecordResponseSchema>;

export const PointFlowReportResponseSchema = Type.Array(AuditRecordResponseSchema);
