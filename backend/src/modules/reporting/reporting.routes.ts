import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ReportingService } from './reporting.service.js';
import {
  PointFlowQuerySchema,
  ExportReportQuerySchema,
  PointFlowReportResponseSchema
} from './reporting.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';

export const reportingRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const reportingService = new ReportingService();

  // GET /reports/point-flow - Role-scoped audit logs with runtime filtering
  app.get(
    '/point-flow',
    {
      preHandler: [authenticate],
      schema: {
        querystring: PointFlowQuerySchema,
        response: {
          200: PointFlowReportResponseSchema
        }
      }
    },
    async (request, reply) => {
      const records = await reportingService.getPointFlowRecords(
        request.user!,
        request.query as any
      );
      return reply.send(records);
    }
  );

  // GET /reports/point-flow/export - Multi-format streaming export (csv, excel, pdf)
  app.get(
    '/point-flow/export',
    {
      preHandler: [authenticate],
      schema: {
        querystring: ExportReportQuerySchema
      }
    },
    async (request, reply) => {
      const result = await reportingService.exportReport(
        request.user!,
        request.query as any
      );

      reply.header('Content-Type', result.contentType);
      reply.header('Content-Disposition', `attachment; filename="${result.filename}"`);

      if ('stream' in result) {
        return reply.send(result.stream);
      } else {
        return reply.send(result.buffer);
      }
    }
  );
};
