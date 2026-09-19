import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AnalyticsService } from './analytics.service.js';
import {
  RankingsQuerySchema,
  UpdateTiersSchema,
  TriggerSnapshotSchema,
  RankingsQueryInput,
  UpdateTiersInput,
  TriggerSnapshotInput
} from './analytics.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/authorize.js';

export const analyticsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Rankings (Standard competition 1224 & student privacy)
  app.get<{ Querystring: RankingsQueryInput }>(
    '/rankings',
    {
      preHandler: [authenticate],
      schema: { querystring: RankingsQuerySchema }
    },
    async (req, reply) => {
      const result = await AnalyticsService.getRankings(
        req.user!.role,
        req.user!.userId,
        req.query
      );
      return reply.send(result);
    }
  );

  // 2. Tiers Configuration
  app.get(
    '/tiers',
    {
      preHandler: [authenticate]
    },
    async (_req, reply) => {
      const tiers = await AnalyticsService.getTiers();
      return reply.send(tiers);
    }
  );

  app.put<{ Body: UpdateTiersInput }>(
    '/tiers',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: UpdateTiersSchema }
    },
    async (req, reply) => {
      const updated = await AnalyticsService.updateTiers(req.body);
      return reply.send(updated);
    }
  );

  // 3. Daily Snapshots
  app.post<{ Body: TriggerSnapshotInput }>(
    '/snapshots/trigger',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: TriggerSnapshotSchema }
    },
    async (req, reply) => {
      const result = await AnalyticsService.triggerSnapshots(req.body?.snapshotDate);
      return reply.send(result);
    }
  );

  // 4. Student Balance History
  app.get<{ Params: { id: string } }>(
    '/students/:id/history',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const history = await AnalyticsService.getStudentHistory(
        req.params.id,
        req.user!.role,
        req.user!.userId
      );
      return reply.send(history);
    }
  );
};
