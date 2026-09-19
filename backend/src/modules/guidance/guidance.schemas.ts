import { Type, Static } from '@sinclair/typebox';

export const CreateGuidanceCardSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.String({ minLength: 1 }),
  logoId: Type.String({ minLength: 1, maxLength: 50 }),
  suggestedPointsText: Type.String({ minLength: 1, maxLength: 50 })
});
export type CreateGuidanceCardInput = Static<typeof CreateGuidanceCardSchema>;

export const UpdateGuidanceCardSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.String({ minLength: 1 })),
  logoId: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  suggestedPointsText: Type.Optional(Type.String({ minLength: 1, maxLength: 50 }))
});
export type UpdateGuidanceCardInput = Static<typeof UpdateGuidanceCardSchema>;

export const GuidanceCardResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  title: Type.String(),
  description: Type.String(),
  logoId: Type.String(),
  suggestedPointsText: Type.String(),
  status: Type.String()
});
export type GuidanceCardResponse = Static<typeof GuidanceCardResponseSchema>;

export const GuidanceCardListResponseSchema = Type.Array(GuidanceCardResponseSchema);
