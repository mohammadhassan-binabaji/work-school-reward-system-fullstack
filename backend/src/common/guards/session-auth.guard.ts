import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

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
    const sessionId = this.extractSessionId(request);

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

    request.user = {
      id: session.userId,
      userId: session.userId,
      nationalId: session.nationalId,
      username: session.username,
      role: session.role,
      accountState: session.accountState,
      sessionId,
    };

    return true;
  }

  private extractSessionId(request: any): string | null {
    if (request.cookies && request.cookies.sessionId) {
      return request.cookies.sessionId;
    }
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    if (request.headers['x-session-id']) {
      return request.headers['x-session-id'];
    }
    return null;
  }
}
