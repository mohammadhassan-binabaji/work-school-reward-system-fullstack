import { Type, Static } from '@sinclair/typebox';

export const CreateRewardSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.String({ minLength: 1 }),
  imageRef: Type.Optional(Type.String({ maxLength: 255 })),
  pointPrice: Type.Integer({ minimum: 1 }),
  requiresApproval: Type.Boolean({ default: false }),
  inventory: Type.Optional(Type.Integer({ minimum: 0 }))
});
export type CreateRewardInput = Static<typeof CreateRewardSchema>;

export const UpdateRewardSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  imageRef: Type.Optional(Type.String({ maxLength: 255 })),
  pointPrice: Type.Optional(Type.Integer()),
  inventory: Type.Optional(Type.Integer({ minimum: 0 }))
});
export type UpdateRewardInput = Static<typeof UpdateRewardSchema>;

export const CreateRewardRequestSchema = Type.Object({
  rewardId: Type.String({ format: 'uuid' })
});
export type CreateRewardRequestInput = Static<typeof CreateRewardRequestSchema>;

export const RewardResponseSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  imageRef: Type.Union([Type.String(), Type.Null()]),
  pointPrice: Type.Integer(),
  requiresApproval: Type.Boolean(),
  inventory: Type.Union([Type.Integer(), Type.Null()]),
  status: Type.String(),
  createdAt: Type.String()
});
export type RewardResponse = Static<typeof RewardResponseSchema>;

export const RewardRequestResponseSchema = Type.Object({
  id: Type.String(),
  studentId: Type.String(),
  rewardId: Type.String(),
  requiresApprovalSnapshot: Type.Boolean(),
  pointPriceSnapshot: Type.Integer(),
  reservedPoints: Type.Integer(),
  status: Type.String(),
  reviewerId: Type.Union([Type.String(), Type.Null()]),
  reviewedAt: Type.Union([Type.String(), Type.Null()]),
  receivedAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String()
});
export type RewardRequestResponse = Static<typeof RewardRequestResponseSchema>;
