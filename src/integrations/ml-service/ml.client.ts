import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ServerError, Timeout } from '../../core/exceptions/http.errors';
import type {
  MlPredictRequest,
  MlPredictResponse,
} from '../../core/types/ml.types';
import { sleep } from '../../core/utils/sleep.util';
import { PredictResponseDto } from './dto/predict-response.dto';

@Injectable()
export class MlClient {
  private readonly logger = new Logger(MlClient.name);

  constructor(private readonly config: ConfigService) {}

  isMockMode(): boolean {
    return this.config.get<boolean>('ml.mock') ?? true;
  }

  async ping(): Promise<boolean> {
    const baseUrl = this.config.get<string>('ml.baseUrl') ?? '';
    if (!baseUrl) {
      return false;
    }

    const controller = new AbortController();
    const timeoutMs = Math.min(
      this.config.get<number>('ml.timeoutMs') ?? 30000,
      5000,
    );
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const healthUrl = new URL('/health', baseUrl).toString();
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: this.buildHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async predict(request: MlPredictRequest): Promise<MlPredictResponse> {
    const baseUrl = this.config.get<string>('ml.baseUrl') ?? '';
    const predictPath = this.config.get<string>('ml.predictPath') ?? '/predict';
    const timeoutMs = this.config.get<number>('ml.timeoutMs') ?? 30000;
    const maxRetries = this.config.get<number>('ml.maxRetries') ?? 2;
    const url = new URL(predictPath, baseUrl).toString();

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            ...this.buildHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new ServerError(
            `ML service responded with ${response.status}`,
            { body: body.slice(0, 500) },
          );
        }

        const payload: unknown = await response.json();
        return this.parseResponse(payload);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await sleep(200 * (attempt + 1));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    if (lastError instanceof Error && lastError.name === 'AbortError') {
      throw new Timeout('ML service request timed out');
    }

    this.logger.error('ML predict failed', lastError);
    throw new ServerError('ML service request failed');
  }

  private buildHeaders(): Record<string, string> {
    const apiKey = this.config.get<string>('ml.apiKey') ?? '';
    if (!apiKey) {
      return {};
    }
    return { 'X-API-Key': apiKey };
  }

  private parseResponse(payload: unknown): MlPredictResponse {
    const dto = plainToInstance(PredictResponseDto, payload);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new ServerError('Invalid ML service response', {
        validationErrors: errors.map((e) => e.toString()),
      });
    }

    return dto;
  }
}
