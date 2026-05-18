import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthActor } from '../types/auth-context.types';

export const AuthActorParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthActor => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { authActor?: AuthActor }>();
    return request.authActor ?? {};
  },
);
