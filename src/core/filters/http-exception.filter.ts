import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpError } from '../exceptions/http.errors';

interface ErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, details } = this.resolveException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode,
      message,
      error: HttpStatus[statusCode],
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details && Object.keys(details).length > 0) {
      body.details = details;
    }

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof HttpError) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
            exception.message);

      return {
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        details:
          Object.keys(exception.details).length > 0
            ? exception.details
            : undefined,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
            exception.message);

      return {
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : String(message),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
