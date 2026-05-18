import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import session from 'express-session';
import { RecommendationAction } from '../src/core/enums/recommendation-action.enum';
import { AnalysisService } from '../src/v1/analysis/analysis.service';
import { MarketDataService } from '../src/integrations/market-data/market-data.service';
import { OtpService } from '../src/v1/auth/otp.service';
import { OAuthExchangeService } from '../src/v1/auth/oauth-exchange.service';

jest.setTimeout(180000);

type AuthSuccessBody = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
  };
};

type MeBody = AuthSuccessBody['user'];

type RegisterBody = { message: string; email: string };

describe('App (e2e)', () => {
  let app: INestApplication | undefined;
  let moduleRef: TestingModule | undefined;
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({
      instance: { launchTimeout: 120000 },
    });
    process.env.MONGODB_URI = mongo.getUri();
    process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-16';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.SESSION_SECRET = 'e2e-session-secret-min-16-chars';
  });

  afterAll(async () => {
    await mongo?.stop();
  });

  beforeEach(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AnalysisService)
      .useValue({
        analyze: jest.fn().mockResolvedValue({
          data: {
            symbol: 'AAPL',
            recommendation: {
              action: RecommendationAction.HOLD,
              confidence: 0.72,
              explanation: 'E2E mock analysis',
              warnings: [],
            },
            overview: {
              symbol: 'AAPL',
              name: 'Apple Inc.',
              provider: 'mock',
              quote: {
                symbol: 'AAPL',
                price: 198.5,
                change: 1.2,
                changePercent: 0.6,
                timestamp: new Date().toISOString(),
              },
            },
            model: {
              mode: 'mock',
              raw_action: RecommendationAction.HOLD,
              raw_confidence: 0.72,
            },
            series: { dataPoints: 60 },
          },
          meta: { cached: false, mlMode: 'mock' },
          disclaimer: 'Not financial advice.',
        }),
      })
      .overrideProvider(MarketDataService)
      .useValue({
        searchSymbols: jest.fn().mockResolvedValue({
          results: [{ symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' }],
          cached: false,
          provider: 'mock',
        }),
        getOverview: jest.fn().mockResolvedValue({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          provider: 'mock',
          quote: {
            symbol: 'AAPL',
            price: 198.5,
            change: 1.2,
            changePercent: 0.6,
            timestamp: new Date().toISOString(),
          },
          cached: false,
        }),
        warmSymbol: jest.fn().mockResolvedValue(undefined),
        getActiveProviderNames: jest.fn().mockReturnValue(['mock']),
        getHistoricalSeries: jest.fn().mockResolvedValue({
          symbol: 'AAPL',
          prices: [190, 195, 198.5],
          volume: [1e6, 1.1e6, 1.2e6],
          timestamps: ['2026-01-01', '2026-01-02', '2026-01-03'],
          provider: 'mock',
          cached: false,
        }),
      })
      .overrideProvider(OtpService)
      .useValue({
        issueEmailVerificationOtp: jest.fn().mockResolvedValue('123456'),
        assertValidEmailOtp: jest
          .fn()
          .mockImplementation(
            (_user: unknown, plain: string): Promise<void> => {
              if (plain !== '123456') {
                return Promise.reject(new Error('invalid otp'));
              }
              return Promise.resolve();
            },
          ),
      })
      .compile();

    moduleRef = moduleFixture;
    app = moduleFixture.createNestApplication();
    const cfg = app.get(ConfigService);
    app.use(cookieParser());
    app.use(
      session({
        secret: cfg.getOrThrow<string>('SESSION_SECRET'),
        resave: false,
        saveUninitialized: false,
        name: 'marketlens.sid',
        cookie: {
          maxAge: 10 * 60 * 1000,
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
        },
      }),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: '/', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
      ],
    });
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    moduleRef = undefined;
  });

  it('/health (GET)', () => {
    return request(app!.getHttpServer() as Server)
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          status: string;
          timestamp: string;
          checks: { database: unknown; ml: unknown };
        };
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeDefined();
        expect(body.checks).toHaveProperty('database');
        expect(body.checks).toHaveProperty('ml');
      });
  });

  it('GET /api/v1/auth/google returns 503 when Google OAuth is not configured', async () => {
    await request(app!.getHttpServer() as Server)
      .get('/api/v1/auth/google')
      .expect(503);
  });

  it('POST /api/v1/auth/oauth/exchange rejects invalid code', async () => {
    await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/oauth/exchange')
      .send({ code: 'not-a-real-exchange-code-value' })
      .expect(400);
  });

  it('register → verify-email → login → me', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'password123';

    const reg = await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'E2E',
        lastName: 'User',
        email,
        password,
      })
      .expect(201);

    const regBody = reg.body as RegisterBody;
    expect(regBody.message).toBeDefined();
    expect(regBody.email).toBe(email.toLowerCase());

    const verify = await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: '123456' })
      .expect(200);

    const verifyBody = verify.body as AuthSuccessBody;
    expect(verifyBody.accessToken).toBeDefined();
    expect(verifyBody.user.isVerified).toBe(true);

    const login = await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/signin')
      .send({ email, password })
      .expect(200);

    const loginBody = login.body as AuthSuccessBody;
    const token = loginBody.accessToken;

    await request(app!.getHttpServer() as Server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        const me = res.body as MeBody;
        expect(me.email).toBe(email.toLowerCase());
        expect(me.firstName).toBe('E2E');
      });

    await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'E2E',
        lastName: 'User',
        email,
        password,
      })
      .expect(409);
  });

  it('verify-email sets cookie; /me works via HTTP-only cookie', async () => {
    const agent = request.agent(app!.getHttpServer() as Server);
    const email = `cookie-${Date.now()}@example.com`;
    const password = 'password123';

    await agent
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'Cookie',
        lastName: 'User',
        email,
        password,
      })
      .expect(201);

    await agent
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: '123456' })
      .expect(200);

    await agent
      .get('/api/v1/auth/me')
      .expect(200)
      .expect((res) => {
        const me = res.body as MeBody;
        expect(me.email).toBe(email.toLowerCase());
      });
  });

  it('oauth exchange code returns tokens and cookie', async () => {
    const email = `ox-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'Ox',
        lastName: 'User',
        email,
        password,
      })
      .expect(201);

    const verify = await request(app!.getHttpServer() as Server)
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: '123456' })
      .expect(200);

    const userId = (verify.body as AuthSuccessBody).user.id;
    const ox = moduleRef!.get(OAuthExchangeService);
    const { code } = await ox.issueCodeForUserId(userId);

    const agent = request.agent(app!.getHttpServer() as Server);
    await agent.post('/api/v1/auth/oauth/exchange').send({ code }).expect(200);

    await agent
      .get('/api/v1/auth/me')
      .expect(200)
      .expect((res) => {
        expect((res.body as MeBody).email).toBe(email.toLowerCase());
      });
  });

  it('GET /api/v1/stocks/search returns results', async () => {
    await request(app!.getHttpServer() as Server)
      .get('/api/v1/stocks/search')
      .query({ q: 'AAPL' })
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          data: Array<{ symbol: string }>;
          meta: { query: string; provider: string };
          disclaimer: string;
        };
        expect(body.data[0]?.symbol).toBe('AAPL');
        expect(body.meta.query).toBe('AAPL');
        expect(body.disclaimer).toBeDefined();
      });
  });

  it('GET /api/v1/stocks/:symbol/overview returns overview', async () => {
    await request(app!.getHttpServer() as Server)
      .get('/api/v1/stocks/AAPL/overview')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          data: { symbol: string; quote: { price: number } };
          meta: { provider: string };
        };
        expect(body.data.symbol).toBe('AAPL');
        expect(body.data.quote.price).toBe(198.5);
        expect(body.meta.provider).toBe('mock');
      });
  });

  it('GET /api/v1/stocks/search rejects empty query', async () => {
    await request(app!.getHttpServer() as Server)
      .get('/api/v1/stocks/search')
      .expect(400);
  });

  it('GET /api/v1/stocks/:symbol/analysis returns recommendation', async () => {
    await request(app!.getHttpServer() as Server)
      .get('/api/v1/stocks/AAPL/analysis')
      .query({ time_horizon: 'medium', risk_tolerance: 'medium' })
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          data: {
            symbol: string;
            recommendation: { action: string; confidence: number };
          };
          disclaimer: string;
        };
        expect(body.data.symbol).toBe('AAPL');
        expect(body.data.recommendation.action).toBe('hold');
        expect(body.disclaimer).toBeDefined();
      });
  });
});
