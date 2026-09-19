import { Type, Static } from '@sinclair/typebox';

export const ActivityTypeEnum = Type.Union([
  Type.Literal('Challenge'),
  Type.Literal('Mission')
]);

export const CreateActivitySchema = Type.Object({
  type: ActivityTypeEnum,
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.String({ minLength: 1 }),
  pointValue: Type.Integer({ minimum: 1 }),
  completionLimit: Type.Integer({ minimum: 1, default: 1 })
});
export type CreateActivityInput = Static<typeof CreateActivitySchema>;

export const UpdateActivitySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  pointValue: Type.Optional(Type.Integer()),
  completionLimit: Type.Optional(Type.Integer({ minimum: 1 })),
  status: Type.Optional(Type.Union([
    Type.Literal('Active'),
    Type.Literal('Inactive'),
    Type.Literal('Removed')
  ]))
});
export type UpdateActivityInput = Static<typeof UpdateActivitySchema>;

export const ReviewVerificationSchema = Type.Object({
  decision: Type.Optional(Type.Union([Type.Literal('Accepted'), Type.Literal('Rejected')])),
  action: Type.Optional(Type.Union([Type.Literal('Accepted'), Type.Literal('Rejected')])),
  reviewNotes: Type.Optional(Type.String({ maxLength: 500 }))
});
export type ReviewVerificationInput = Static<typeof ReviewVerificationSchema>;

export const ActivityResponseSchema = Type.Object({
  id: Type.String(),
  type: ActivityTypeEnum,
  name: Type.String(),
  description: Type.String(),
  pointValue: Type.Integer(),
  completionLimit: Type.Integer(),
  status: Type.String(),
  createdAt: Type.String()
});
export type ActivityResponse = Static<typeof ActivityResponseSchema>;
