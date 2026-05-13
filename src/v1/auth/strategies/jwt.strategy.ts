import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { UserDocument } from '../../users/schemas/user.schema';

function jwtExtractor(config: ConfigService): (req: Request) => string | null {
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken();
  return (req: Request) => {
    const rawHeader: unknown = bearer(req);
    if (typeof rawHeader === 'string' && rawHeader.length > 0) {
      return rawHeader;
    }
    const name =
      config.get<string>('ACCESS_TOKEN_COOKIE_NAME') ?? 'ml_access_token';
    const cookieJar = (req as Request & { cookies?: Record<string, string> })
      .cookies;
    const rawCookie: unknown = cookieJar ? cookieJar[name] : undefined;
    return typeof rawCookie === 'string' && rawCookie.length > 0
      ? rawCookie
      : null;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: jwtExtractor(config),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.users.findByIdForAuth(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
