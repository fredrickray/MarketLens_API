import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getHello(): { message: string; version: string } {
    return {
      message: 'MarketLens API',
      version: this.config.get<string>('app.version') ?? '0.0.1',
    };
  }
}
