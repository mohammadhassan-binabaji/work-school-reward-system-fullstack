import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { GuidanceService } from './guidance.service.js';
import {
  CreateGuidanceCardSchema,
  GuidanceCardResponseSchema,
  GuidanceCardListResponseSchema
} from './guidance.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/authorize.js';

export const guidanceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const guidanceService = new GuidanceService();

  const IdParamSchema = Type.Object({
    id: Type.String({ format: 'uuid' })
  });

  // GET /guidance/cards - Available to all authenticated roles (Admin, Teacher, Student)
  app.get(
    '/cards',
    {
      preHandler: [authenticate],
      schema: {
        response: {
          200: GuidanceCardListResponseSchema
        }
      }
    },
    async (_request, reply) => {
      const cards = await guidanceService.listCards();
      return reply.send(cards);
    }
  );

  // POST /guidance/cards - Admin only
  app.post(
    '/cards',
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        body: CreateGuidanceCardSchema,
        response: {
          201: GuidanceCardResponseSchema
        }
      }
    },
    async (request, reply) => {
      const card = await guidanceService.createCard(request.body as any);
      return reply.status(201).send(card);
    }
  );

  // PUT /guidance/cards/:id - Admin only
  app.put(
    '/cards/:id',
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        params: IdParamSchema,
        body: CreateGuidanceCardSchema,
        response: {
          200: GuidanceCardResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await guidanceService.updateCard(id, request.body as any);
      return reply.send(updated);
    }
  );

  // DELETE /guidance/cards/:id - Admin only
  app.delete(
    '/cards/:id',
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        params: IdParamSchema
      }
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await guidanceService.removeCard(id);
      return reply.status(204).send();
    }
  );
};
