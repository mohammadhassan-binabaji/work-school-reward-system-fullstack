import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionData } from '../redis/redis.service';

export const CurrentUser = createParamDecorator(
  (data: keyof SessionData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
