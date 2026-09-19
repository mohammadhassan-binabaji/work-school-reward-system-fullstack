import { Type, Static } from '@sinclair/typebox';

export const CreateProposalSchema = Type.Object({
  description: Type.String({ minLength: 1 })
});
export type CreateProposalInput = Static<typeof CreateProposalSchema>;

export const ApproveProposalSchema = Type.Object({
  assignedPointValue: Type.Integer({ minimum: 1 })
});
export type ApproveProposalInput = Static<typeof ApproveProposalSchema>;

export const UpdateProposalPointsSchema = Type.Object({
  assignedPointValue: Type.Integer({ minimum: 1 })
});
export type UpdateProposalPointsInput = Static<typeof UpdateProposalPointsSchema>;

export const PostProposalMessageSchema = Type.Object({
  messageBody: Type.String({ minLength: 1 })
});
export type PostProposalMessageInput = Static<typeof PostProposalMessageSchema>;

export const ProposalResponseSchema = Type.Object({
  id: Type.String(),
  studentId: Type.String(),
  description: Type.String(),
  status: Type.String(),
  assignedPointValue: Type.Union([Type.Integer(), Type.Null()]),
  reviewerId: Type.Union([Type.String(), Type.Null()]),
  approvedAt: Type.Union([Type.String(), Type.Null()]),
  completedAt: Type.Union([Type.String(), Type.Null()]),
  canceledAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String()
});
export type ProposalResponse = Static<typeof ProposalResponseSchema>;

export const ProposalMessageResponseSchema = Type.Object({
  id: Type.String(),
  proposalId: Type.String(),
  senderRole: Type.String(),
  senderId: Type.String(),
  messageBody: Type.String(),
  createdAt: Type.String()
});
export type ProposalMessageResponse = Static<typeof ProposalMessageResponseSchema>;
