import { registerAs } from '@nestjs/config';

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  return value === 'true' || value === '1';
}

export default registerAs('ml', () => {
  const baseUrl = process.env.ML_SERVICE_URL?.trim() ?? '';
  const mockOverride = parseBoolean(process.env.ML_SERVICE_MOCK);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const mock =
    mockOverride ?? (baseUrl.length === 0 && nodeEnv !== 'production');

  return {
    baseUrl,
    apiKey: process.env.ML_SERVICE_API_KEY?.trim() ?? '',
    timeoutMs: Number.parseInt(
      process.env.ML_SERVICE_TIMEOUT_MS ?? '30000',
      10,
    ),
    predictPath: process.env.ML_PREDICT_PATH?.trim() || '/predict',
    maxRetries: Number.parseInt(process.env.ML_SERVICE_MAX_RETRIES ?? '2', 10),
    mock,
    predictionCacheTtlSeconds: Number.parseInt(
      process.env.ML_PREDICTION_CACHE_TTL_SECONDS ?? '300',
      10,
    ),
    minBuyConfidence: Number.parseFloat(
      process.env.ML_MIN_BUY_CONFIDENCE ?? '0.6',
    ),
    minAvoidConfidence: Number.parseFloat(
      process.env.ML_MIN_AVOID_CONFIDENCE ?? '0.55',
    ),
  };
});
