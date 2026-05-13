import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { BadRequest } from '../../../core/exceptions/http.errors';
import { UsersService } from '../../users/users.service';
import type { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    const clientID =
      config.get<string>('GOOGLE_CLIENT_ID')?.trim() ||
      '__google_oauth_not_configured__';
    const clientSecret =
      config.get<string>('GOOGLE_CLIENT_SECRET')?.trim() ||
      '__not_configured__';
    const callbackURL =
      config.get<string>('GOOGLE_CALLBACK_URL')?.trim() ||
      'http://127.0.0.1:1/v1/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<UserDocument> {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequest('Google account has no email address.');
    }
    const firstName =
      profile.name?.givenName?.trim() ||
      profile.displayName?.split(' ')[0]?.trim() ||
      'User';
    const lastName =
      profile.name?.familyName?.trim() ||
      profile.displayName?.split(' ').slice(1).join(' ').trim() ||
      'Google';

    return this.users.findOrCreateFromGoogle({
      googleId,
      email,
      firstName,
      lastName,
    });
  }
}
