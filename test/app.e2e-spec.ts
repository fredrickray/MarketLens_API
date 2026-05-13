import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Server } from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { OtpService } from '../src/v1/auth/otp.service';

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
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({
      instance: { launchTimeout: 120000 },
    });
    process.env.MONGODB_URI = mongo.getUri();
    process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-16';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  afterAll(async () => {
    await mongo?.stop();
  });

  beforeEach(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('v1', {
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
  });

  it('/health (GET)', () => {
    return request(app!.getHttpServer() as Server)
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('register → verify-email → login → me', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'password123';

    const reg = await request(app!.getHttpServer() as Server)
      .post('/v1/auth/register')
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
      .post('/v1/auth/verify-email')
      .send({ email, otp: '123456' })
      .expect(200);

    const verifyBody = verify.body as AuthSuccessBody;
    expect(verifyBody.accessToken).toBeDefined();
    expect(verifyBody.user.isVerified).toBe(true);

    const login = await request(app!.getHttpServer() as Server)
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const loginBody = login.body as AuthSuccessBody;
    const token = loginBody.accessToken;

    await request(app!.getHttpServer() as Server)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        const me = res.body as MeBody;
        expect(me.email).toBe(email.toLowerCase());
        expect(me.firstName).toBe('E2E');
      });

    await request(app!.getHttpServer() as Server)
      .post('/v1/auth/register')
      .send({
        firstName: 'E2E',
        lastName: 'User',
        email,
        password,
      })
      .expect(409);
  });
});
