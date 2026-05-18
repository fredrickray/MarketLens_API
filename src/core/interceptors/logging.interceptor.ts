import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, url } = request;
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<Response>();
          const durationMs = Date.now() - started;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${durationMs}ms`,
          );
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - started;
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          this.logger.warn(`${method} ${url} ${status} ${durationMs}ms`);
        },
      }),
    );
  }
}
