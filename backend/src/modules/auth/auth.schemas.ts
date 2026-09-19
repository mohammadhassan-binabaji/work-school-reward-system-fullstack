import { Type, Static } from '@sinclair/typebox';

export const RoleEnum = Type.Union([
  Type.Literal('ADMIN'),
  Type.Literal('TEACHER'),
  Type.Literal('STUDENT')
]);

export const ProvisionAdminSchema = Type.Object({
  nationalId: Type.String({ pattern: '^\\d{10}$', minLength: 10, maxLength: 10 }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
  password: Type.String({ minLength: 6, maxLength: 100 }),
  firstName: Type.String({ minLength: 1, maxLength: 50 }),
  lastName: Type.String({ minLength: 1, maxLength: 50 })
});
export type ProvisionAdminInput = Static<typeof ProvisionAdminSchema>;

export const CreateUserSchema = Type.Object({
  nationalId: Type.String({ pattern: '^\\d{10}$', minLength: 10, maxLength: 10 }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
  password: Type.String({ minLength: 6, maxLength: 100 }),
  firstName: Type.String({ minLength: 1, maxLength: 50 }),
  lastName: Type.String({ minLength: 1, maxLength: 50 }),
  role: RoleEnum,
  classId: Type.Optional(Type.String({ format: 'uuid' }))
});
export type CreateUserInput = Static<typeof CreateUserSchema>;

export const LoginSchema = Type.Object({
  nationalId: Type.String({ pattern: '^\\d{10}$', minLength: 10, maxLength: 10 }),
  password: Type.String({ minLength: 1 })
});
export type LoginInput = Static<typeof LoginSchema>;

export const UserResponseSchema = Type.Object({
  id: Type.String(),
  nationalId: Type.String(),
  username: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
  role: RoleEnum,
  accountState: Type.String(),
  classId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  pointBalance: Type.Optional(Type.Integer()),
  currentPoints: Type.Optional(Type.Integer()),
  reservedPoints: Type.Optional(Type.Integer()),
  highestBalance: Type.Optional(Type.Integer()),
  createdAt: Type.String()
});
export type UserResponse = Static<typeof UserResponseSchema>;

export const LoginResponseSchema = Type.Object({
  message: Type.String(),
  sessionId: Type.String(),
  user: UserResponseSchema
});
export type LoginResponse = Static<typeof LoginResponseSchema>;
