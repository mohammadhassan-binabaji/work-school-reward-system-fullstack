import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionData } from '../redis/redis.service';

export interface AuthUser extends SessionData {
  id: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
