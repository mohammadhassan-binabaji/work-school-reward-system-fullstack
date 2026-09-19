import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionStore, SessionData } from '../core/session.js';
import { UnauthorizedError } from '../core/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionData;
    sessionId?: string;
  }
}

export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  let sessionId: string | undefined;

  // 1. Check cookies (signed or plain)
  if (req.cookies && req.cookies.sessionId) {
    const rawCookie = req.cookies.sessionId;
    const unsigned = req.unsignCookie ? req.unsignCookie(rawCookie) : { valid: true, value: rawCookie };
    if (unsigned.valid && unsigned.value) {
      sessionId = unsigned.value;
    } else {
      sessionId = rawCookie;
    }
  }

  // 2. Check Authorization Bearer header fallback
  if (!sessionId && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      sessionId = parts[1];
    }
  }

  if (!sessionId) {
    throw new UnauthorizedError('Authentication required. Missing session cookie or Bearer token.', 'AUTHENTICATION_REQUIRED');
  }

  // 3. Verify session in Redis
  const session = await SessionStore.getSession(sessionId);
  if (!session) {
    throw new UnauthorizedError('Invalid or expired session. Please log in again.', 'SESSION_REVOKED');
  }

  // 4. Invariant: accountState must be Active
  if (session.accountState !== 'Active') {
    await SessionStore.revokeUserSessions(session.userId);
    throw new UnauthorizedError('Account is not active. Access denied.', 'ACCOUNT_INACTIVE');
  }

  req.user = session;
  req.sessionId = sessionId;
}
