import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { sessionId, source } = this.extractSessionId(request);

    if (!sessionId) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'Authentication session required',
      });
    }

    const session = await this.redisService.getSession(sessionId);
    if (!session) {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'SESSION_EXPIRED',
        message: 'Session has expired or is invalid',
      });
    }

    if (session.accountState === 'DEACTIVATED' || session.accountState === 'DEPARTED') {
      throw new UnauthorizedException({
        statusCode: 401,
        errorCode: 'ACCOUNT_INACTIVE',
        message: 'Account is deactivated or departed',
      });
    }

    if (
      source === 'cookie' &&
      !SAFE_METHODS.has(request.method) &&
      (!session.csrfToken || request.headers['x-csrf-token'] !== session.csrfToken)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'CSRF_INVALID',
        message: 'A valid CSRF token is required for cookie-authenticated requests',
      });
    }

    request.user = {
      id: session.userId,
      userId: session.userId,
      nationalId: session.nationalId,
      username: session.username,
      role: session.role,
      accountState: session.accountState,
      sessionId,
      csrfToken: session.csrfToken,
      authSource: source,
    };

    return true;
  }

  private extractSessionId(request: any): {
    sessionId: string | null;
    source: 'cookie' | 'header' | null;
  } {
    if (request.cookies && request.cookies.sessionId) {
      return { sessionId: request.cookies.sessionId, source: 'cookie' };
    }
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return { sessionId: authHeader.substring(7), source: 'header' };
    }
    if (request.headers['x-session-id']) {
      return { sessionId: request.headers['x-session-id'], source: 'header' };
    }
    return { sessionId: null, source: null };
  }
}
