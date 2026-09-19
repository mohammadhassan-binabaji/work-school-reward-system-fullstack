import { Type, Static } from '@sinclair/typebox';

export const RankingsQuerySchema = Type.Object({
  scope: Type.Optional(Type.Union([Type.Literal('school'), Type.Literal('class')])),
  classId: Type.Optional(Type.String({ format: 'uuid' })),
  topN: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 10 }))
});
export type RankingsQueryInput = Static<typeof RankingsQuerySchema>;

export const TierItemSchema = Type.Object({
  tierIndex: Type.Integer({ minimum: 1, maximum: 5 }),
  tierName: Type.String({ minLength: 1, maxLength: 50 }),
  minPoints: Type.Integer({ minimum: 0 }),
  displayColor: Type.Optional(Type.String({ maxLength: 20 }))
});

export const UpdateTiersSchema = Type.Object({
  tiers: Type.Array(TierItemSchema, { minItems: 5, maxItems: 5 })
});
export type UpdateTiersInput = Static<typeof UpdateTiersSchema>;

export const TriggerSnapshotSchema = Type.Object({
  snapshotDate: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }))
});
export type TriggerSnapshotInput = Static<typeof TriggerSnapshotSchema>;
