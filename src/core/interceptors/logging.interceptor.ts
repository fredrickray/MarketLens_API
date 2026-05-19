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
import type { UserDocument } from '../../v1/users/schemas/user.schema';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: UserDocument }>();
    const { method, url } = request;
    const started = Date.now();
    const requestId = request.requestId ?? '-';
    const actorId = request.user ? String(request.user._id) : 'anon';

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<Response>();
          const durationMs = Date.now() - started;
          this.logger.log(
            `[${requestId}] ${method} ${url} ${response.statusCode} ${durationMs}ms actor=${actorId}`,
          );
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - started;
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          this.logger.warn(
            `[${requestId}] ${method} ${url} ${status} ${durationMs}ms actor=${actorId}`,
          );
        },
      }),
    );
  }
}
