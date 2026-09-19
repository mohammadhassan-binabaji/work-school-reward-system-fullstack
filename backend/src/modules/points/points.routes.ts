import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PointsService } from './points.service.js';
import {
  PoolTransferSchema,
  CreateTaskSchema,
  AwardPointsSchema,
  DirectAdjustmentSchema,
  PoolTransferInput,
  CreateTaskInput,
  AwardPointsInput,
  DirectAdjustmentInput
} from './points.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireTeacher } from '../../middleware/authorize.js';

export const pointsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. System Point Pool
  app.get(
    '/pool',
    {
      preHandler: [authenticate, requireAdmin]
    },
    async (_req, reply) => {
      const pool = await PointsService.getPool();
      return reply.send(pool);
    }
  );

  app.post<{ Body: PoolTransferInput }>(
    '/pool/transfer',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: PoolTransferSchema }
    },
    async (req, reply) => {
      const result = await PointsService.transferFromPool(
        req.body,
        req.user!.userId,
        req.correlationId
      );
      return reply.send(result);
    }
  );

  // 2. Point Transfer Tasks
  app.get(
    '/tasks',
    {
      preHandler: [authenticate]
    },
    async (_req, reply) => {
      const tasks = await PointsService.getTasks();
      return reply.send(tasks);
    }
  );

  app.post<{ Body: CreateTaskInput }>(
    '/tasks',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: CreateTaskSchema }
    },
    async (req, reply) => {
      const task = await PointsService.createTask(req.body);
      return reply.status(201).send(task);
    }
  );

  // 3. Teacher Point Awarding
  app.post<{ Body: AwardPointsInput }>(
    '/award',
    {
      preHandler: [authenticate, requireTeacher],
      schema: { body: AwardPointsSchema }
    },
    async (req, reply) => {
      const result = await PointsService.awardPoints(
        req.body,
        req.user!.userId,
        req.correlationId
      );
      return reply.send(result);
    }
  );

  // 4. Admin Direct Adjustment
  app.post<{ Body: DirectAdjustmentInput }>(
    '/adjust',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: DirectAdjustmentSchema }
    },
    async (req, reply) => {
      const result = await PointsService.directAdjustment(
        req.body,
        req.user!.userId,
        req.correlationId
      );
      return reply.send(result);
    }
  );
};
