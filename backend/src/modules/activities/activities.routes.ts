import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { prisma } from '../../core/prisma.js';
import { ActivitiesService } from './activities.service.js';
import {
  CreateActivitySchema,
  UpdateActivitySchema,
  ReviewVerificationSchema,
  CreateActivityInput,
  UpdateActivityInput,
  ReviewVerificationInput
} from './activities.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireStudent } from '../../middleware/authorize.js';
import { BadRequestError } from '../../core/errors.js';
import { config } from '../../core/config.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export const activitiesRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Activities CRUD
  app.get(
    '',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const activities = await ActivitiesService.getActivities(req.query as any);
      return reply.send(activities);
    }
  );

  app.post<{ Body: CreateActivityInput }>(
    '',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: CreateActivitySchema }
    },
    async (req, reply) => {
      const activity = await ActivitiesService.createActivity(req.body);
      return reply.status(201).send(activity);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const activity = await ActivitiesService.getActivityById(req.params.id);
      return reply.send(activity);
    }
  );

  app.put<{ Params: { id: string }; Body: UpdateActivityInput }>(
    '/:id',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: UpdateActivitySchema }
    },
    async (req, reply) => {
      const updated = await ActivitiesService.updateActivity(req.params.id, req.body);
      return reply.send(updated);
    }
  );

  // 2. Student Verification Submissions (JSON or Multipart)
  app.post<{ Params: { id: string } }>(
    '/:id/verifications',
    {
      preHandler: [authenticate, requireStudent]
    },
    async (req, reply) => {
      let evidenceDescription = '';
      const attachments: Array<{
        originalFilename: string;
        storedPath: string;
        mimeType: string;
        sizeBytes: number;
      }> = [];

      if (req.isMultipart()) {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === 'field') {
            if (part.fieldname === 'evidenceDescription') {
              evidenceDescription = part.value as string;
            }
          } else if (part.type === 'file') {
            if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
              throw new BadRequestError(
                `File type "${part.mimetype}" not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
              );
            }
            const fileId = randomUUID();
            const filename = `${fileId}-${part.filename}`;
            const filepath = join(config.UPLOAD_DIR, filename);

            const writeStream = createWriteStream(filepath);
            await pipeline(part.file, writeStream);

            attachments.push({
              originalFilename: part.filename,
              storedPath: filepath,
              mimeType: part.mimetype,
              sizeBytes: writeStream.bytesWritten
            });
          }
        }
      } else {
        const body = req.body as { evidenceDescription?: string };
        evidenceDescription = body?.evidenceDescription || '';
      }

      if (!evidenceDescription || evidenceDescription.trim().length === 0) {
        throw new BadRequestError('Evidence description is required');
      }

      const verification = await ActivitiesService.submitVerification(
        req.user!.userId,
        req.params.id,
        evidenceDescription,
        attachments
      );

      return reply.status(201).send(verification);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/:id/verifications',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const verifications = await prisma.activityVerificationRequest.findMany({
        where: { activityId: req.params.id },
        include: { attachments: true },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send(verifications);
    }
  );

  // 3. Admin Verification Review
  const reviewHandler = async (req: any, reply: any) => {
    const result = await ActivitiesService.reviewVerification(
      req.params.id,
      req.user!.userId,
      req.body,
      req.correlationId
    );
    return reply.send(result);
  };
  app.put<{ Params: { id: string }; Body: ReviewVerificationInput }>(
    '/verifications/:id/review',
    { preHandler: [authenticate, requireAdmin], schema: { body: ReviewVerificationSchema } },
    reviewHandler
  );
  app.post<{ Params: { id: string }; Body: ReviewVerificationInput }>(
    '/verifications/:id/review',
    { preHandler: [authenticate, requireAdmin], schema: { body: ReviewVerificationSchema } },
    reviewHandler
  );

  // 4. Admin Unban Override
  const unbanHandler = async (req: any, reply: any) => {
    const result = await ActivitiesService.unbanStudent(
      req.params.studentId,
      req.params.activityId,
      req.user!.userId
    );
    return reply.send(result);
  };
  app.put<{ Params: { studentId: string; activityId: string } }>(
    '/bans/:studentId/:activityId/unban',
    { preHandler: [authenticate, requireAdmin] },
    unbanHandler
  );
  app.post<{ Params: { studentId: string; activityId: string } }>(
    '/bans/:studentId/:activityId/unban',
    { preHandler: [authenticate, requireAdmin] },
    unbanHandler
  );
};
