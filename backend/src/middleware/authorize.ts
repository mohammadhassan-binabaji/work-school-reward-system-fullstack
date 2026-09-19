import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../core/errors.js';

export function requireRole(...allowedRoles: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.', 'AUTHENTICATION_REQUIRED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role ${req.user.role} does not have permission for this resource.`,
        'FORBIDDEN'
      );
    }
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireTeacher = requireRole('TEACHER');
export const requireStudent = requireRole('STUDENT');
export const requireStaff = requireRole('ADMIN', 'TEACHER');
