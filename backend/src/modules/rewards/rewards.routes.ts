import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { RewardsService } from './rewards.service.js';
import {
  CreateRewardSchema,
  UpdateRewardSchema,
  CreateRewardRequestSchema,
  CreateRewardInput,
  UpdateRewardInput,
  CreateRewardRequestInput
} from './rewards.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireStudent } from '../../middleware/authorize.js';

export const rewardsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Catalog Management
  app.get(
    '',
    {
      preHandler: [authenticate]
    },
    async (_req, reply) => {
      const rewards = await RewardsService.getRewards();
      return reply.send(rewards);
    }
  );

  app.post<{ Body: CreateRewardInput }>(
    '',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: CreateRewardSchema }
    },
    async (req, reply) => {
      const reward = await RewardsService.createReward(req.body);
      return reply.status(201).send(reward);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const reward = await RewardsService.getRewardById(req.params.id);
      return reply.send(reward);
    }
  );

  app.put<{ Params: { id: string }; Body: UpdateRewardInput }>(
    '/:id',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: UpdateRewardSchema }
    },
    async (req, reply) => {
      const updated = await RewardsService.updateReward(req.params.id, req.body);
      return reply.send(updated);
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate, requireAdmin]
    },
    async (req, reply) => {
      const result = await RewardsService.deleteReward(
        req.params.id,
        req.user!.userId,
        req.correlationId
      );
      return reply.send(result);
    }
  );

  // 2. Redemption Requests
  app.get<{ Querystring: { status?: string } }>(
    '/requests',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const requests = await RewardsService.getRequests(
        req.user!.role,
        req.user!.userId,
        req.query.status
      );
      return reply.send(requests);
    }
  );

  app.post<{ Body: CreateRewardRequestInput }>(
    '/requests',
    {
      preHandler: [authenticate, requireStudent],
      schema: { body: CreateRewardRequestSchema }
    },
    async (req, reply) => {
      const request = await RewardsService.createRequest(
        req.user!.userId,
        req.body,
        req.correlationId
      );
      return reply.status(201).send(request);
    }
  );

  const approveHandler = async (req: any, reply: any) => {
    const updated = await RewardsService.approveRequest(req.params.id, req.user!.userId);
    return reply.send(updated);
  };
  app.put<{ Params: { id: string } }>('/requests/:id/approve', { preHandler: [authenticate, requireAdmin] }, approveHandler);
  app.post<{ Params: { id: string } }>('/requests/:id/approve', { preHandler: [authenticate, requireAdmin] }, approveHandler);

  const declineHandler = async (req: any, reply: any) => {
    const updated = await RewardsService.declineRequest(
      req.params.id,
      req.user!.userId,
      req.correlationId
    );
    return reply.send(updated);
  };
  app.put<{ Params: { id: string } }>('/requests/:id/decline', { preHandler: [authenticate, requireAdmin] }, declineHandler);
  app.post<{ Params: { id: string } }>('/requests/:id/decline', { preHandler: [authenticate, requireAdmin] }, declineHandler);

  const receiveHandler = async (req: any, reply: any) => {
    const updated = await RewardsService.receiveRequest(
      req.params.id,
      req.user!.userId,
      req.correlationId
    );
    return reply.send(updated);
  };
  app.put<{ Params: { id: string } }>('/requests/:id/receive', { preHandler: [authenticate, requireAdmin] }, receiveHandler);
  app.post<{ Params: { id: string } }>('/requests/:id/receive', { preHandler: [authenticate, requireAdmin] }, receiveHandler);
};
