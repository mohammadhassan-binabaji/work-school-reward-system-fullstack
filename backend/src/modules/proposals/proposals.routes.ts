import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ProposalsService } from './proposals.service.js';
import {
  CreateProposalSchema,
  ApproveProposalSchema,
  UpdateProposalPointsSchema,
  PostProposalMessageSchema,
  CreateProposalInput,
  ApproveProposalInput,
  UpdateProposalPointsInput,
  PostProposalMessageInput
} from './proposals.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireStudent } from '../../middleware/authorize.js';

export const proposalsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Proposals List & Details (Teacher 403)
  app.get(
    '',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const proposals = await ProposalsService.getProposals(req.user!.role, req.user!.userId);
      return reply.send(proposals);
    }
  );

  app.post<{ Body: CreateProposalInput }>(
    '',
    {
      preHandler: [authenticate, requireStudent],
      schema: { body: CreateProposalSchema }
    },
    async (req, reply) => {
      const proposal = await ProposalsService.createProposal(req.user!.userId, req.body);
      return reply.status(201).send(proposal);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const proposal = await ProposalsService.getProposalById(
        req.params.id,
        req.user!.role,
        req.user!.userId
      );
      return reply.send(proposal);
    }
  );

  // 2. Admin Review & Point Pricing
  const approveHandler = async (req: any, reply: any) => {
    const approved = await ProposalsService.approveProposal(
      req.params.id,
      req.user!.userId,
      req.body
    );
    return reply.send(approved);
  };
  app.put<{ Params: { id: string }; Body: ApproveProposalInput }>('/:id/approve', { preHandler: [authenticate, requireAdmin], schema: { body: ApproveProposalSchema } }, approveHandler);
  app.post<{ Params: { id: string }; Body: ApproveProposalInput }>('/:id/approve', { preHandler: [authenticate, requireAdmin], schema: { body: ApproveProposalSchema } }, approveHandler);

  app.put<{ Params: { id: string }; Body: UpdateProposalPointsInput }>(
    '/:id/points',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: UpdateProposalPointsSchema }
    },
    async (req, reply) => {
      const updated = await ProposalsService.updatePoints(req.params.id, req.body);
      return reply.send(updated);
    }
  );

  // 3. Student Cancellation (only in Ready to Do)
  const cancelHandler = async (req: any, reply: any) => {
    const canceled = await ProposalsService.cancelProposal(req.params.id, req.user!.userId);
    return reply.send(canceled);
  };
  app.put<{ Params: { id: string } }>('/:id/cancel', { preHandler: [authenticate, requireStudent] }, cancelHandler);
  app.post<{ Params: { id: string } }>('/:id/cancel', { preHandler: [authenticate, requireStudent] }, cancelHandler);

  // 4. Admin Complete & Award Points
  const completeHandler = async (req: any, reply: any) => {
    const completed = await ProposalsService.completeProposal(
      req.params.id,
      req.user!.userId,
      req.correlationId
    );
    return reply.send(completed);
  };
  app.put<{ Params: { id: string } }>('/:id/complete', { preHandler: [authenticate, requireAdmin] }, completeHandler);
  app.post<{ Params: { id: string } }>('/:id/complete', { preHandler: [authenticate, requireAdmin] }, completeHandler);

  // 5. In-Request Messaging
  app.get<{ Params: { id: string } }>(
    '/:id/messages',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const messages = await ProposalsService.getMessages(
        req.params.id,
        req.user!.role,
        req.user!.userId
      );
      return reply.send(messages);
    }
  );

  app.post<{ Params: { id: string }; Body: PostProposalMessageInput }>(
    '/:id/messages',
    {
      preHandler: [authenticate],
      schema: { body: PostProposalMessageSchema }
    },
    async (req, reply) => {
      const message = await ProposalsService.postMessage(
        req.params.id,
        req.user!.role,
        req.user!.userId,
        req.body
      );
      return reply.status(201).send(message);
    }
  );
};
