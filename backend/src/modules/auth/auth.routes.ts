import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  ProvisionAdminSchema,
  CreateUserSchema,
  LoginSchema,
  ProvisionAdminInput,
  CreateUserInput,
  LoginInput
} from './auth.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/authorize.js';
import { config } from '../../core/config.js';

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Provision initial administrator (public, only if no admin exists)
  app.post<{ Body: ProvisionAdminInput }>(
    '/provision-admin',
    {
      schema: {
        body: ProvisionAdminSchema
      }
    },
    async (req, reply) => {
      const user = await AuthService.provisionAdmin(req.body);
      return reply.status(201).send(user);
    }
  );

  // 2. Provision additional users (Admin only)
  app.post<{ Body: CreateUserInput }>(
    '/users',
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        body: CreateUserSchema
      }
    },
    async (req, reply) => {
      const user = await AuthService.createUser(req.body);
      return reply.status(201).send(user);
    }
  );

  // 3. User login
  app.post<{ Body: LoginInput }>(
    '/login',
    {
      schema: {
        body: LoginSchema
      }
    },
    async (req, reply) => {
      const result = await AuthService.login(req.body);

      // Issue signed HTTP-only cookie
      reply.setCookie('sessionId', result.sessionId, {
        path: '/',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: config.SESSION_TTL_SECONDS
      });

      return reply.status(200).send({
        message: 'Authentication successful',
        sessionId: result.sessionId,
        user: result.user
      });
    }
  );

  // 4. User logout
  app.post(
    '/logout',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      if (req.sessionId) {
        await AuthService.logout(req.sessionId);
      }
      reply.clearCookie('sessionId', { path: '/' });
      return reply.status(200).send({ message: 'Logged out successfully' });
    }
  );

  // 5. Current authenticated user context
  app.get(
    '/me',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const user = await AuthService.getMe(req.user!.userId, req.user!.role);
      return reply.status(200).send(user);
    }
  );
};
