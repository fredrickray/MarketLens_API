import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleOAuthConfiguredGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    void context;
    const id = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim();
    const callback = this.config.get<string>('GOOGLE_CALLBACK_URL')?.trim();
    if (!id || !secret || !callback) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.',
      );
    }
    return true;
  }
}
