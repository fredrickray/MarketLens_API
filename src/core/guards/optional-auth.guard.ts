import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { GuestSessionService } from '../../v1/guest/guest-session.service';
import type { AuthActor } from '../types/auth-context.types';
import type { UserDocument } from '../../v1/users/schemas/user.schema';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly guestSessions: GuestSessionService) {
    super();
  }

  override handleRequest<TUser = UserDocument>(
    _err: Error | null,
    user: TUser,
  ): TUser | undefined {
    return user ?? undefined;
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // unauthenticated — continue as guest
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserDocument; authActor?: AuthActor }>();
    const actor: AuthActor = {};

    if (request.user) {
      actor.user = request.user;
    } else if (request.session?.guestId) {
      const guest = await this.guestSessions.findValidByToken(
        request.session.guestId,
      );
      if (guest) {
        actor.guest = guest;
      }
    }

    request.authActor = actor;
    return true;
  }
}
