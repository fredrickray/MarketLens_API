import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.interface';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { OtpService } from './otp.service';
import { Forbidden, Unauthorized } from '../../core/exceptions/http.errors';

jest.mock('bcrypt', () => ({
  __esModule: true,
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailWithVerification: jest.fn(),
    findById: jest.fn(),
    verifyUser: jest.fn(),
    resetLoginAttempts: jest.fn(),
    updateLoginAttempts: jest.fn(),
  };
  const otp = {
    issueEmailVerificationOtp: jest.fn(),
    assertValidEmailOtp: jest.fn(),
  };
  const mail = { sendMail: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };
  const oauthExchange = {
    consumeCode: jest.fn(),
  };
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_EXPIRES_IN') return '7d';
      throw new Error(`unexpected key ${key}`);
    }),
    get: jest.fn((key: string, def?: number) => {
      if (key === 'MAX_LOGIN_ATTEMPTS') return def ?? 5;
      if (key === 'LOGIN_COOLDOWN_MINUTES') return def ?? 15;
      return def;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: MailService, useValue: mail },
        { provide: OtpService, useValue: otp },
        { provide: OAuthExchangeService, useValue: oauthExchange },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates user, sends OTP email, returns message', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      users.create.mockResolvedValue({
        _id: '67a1b2c3d4e5f6789012345',
        email: 'user@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        isVerified: false,
      });
      otp.issueEmailVerificationOtp.mockResolvedValue('123456');
      const out = await service.register({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'user@example.com',
        password: 'password123',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(users.create).toHaveBeenCalledWith(
        'Ada',
        'Lovelace',
        'user@example.com',
        'hash',
      );
      expect(otp.issueEmailVerificationOtp).toHaveBeenCalled();
      expect(mail.sendMail).toHaveBeenCalled();
      expect(out.email).toBe('user@example.com');
      expect(out.message).toContain('email');
    });
  });

  describe('login', () => {
    it('throws when user is missing', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(Unauthorized);
    });

    it('rejects password login for Google-only accounts', async () => {
      users.findByEmail.mockResolvedValue({
        _id: '67a1b2c3d4e5f6789012345',
        email: 'a@b.com',
        passwordHash: null,
        role: 'user',
        isVerified: true,
        firstName: 'A',
        lastName: 'B',
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'anything' }),
      ).rejects.toBeInstanceOf(Forbidden);
    });

    it('throws when password does not match', async () => {
      users.findByEmail.mockResolvedValue({
        _id: '67a1b2c3d4e5f6789012345',
        email: 'a@b.com',
        passwordHash: 'stored',
        role: 'user',
        isVerified: true,
        loginAttempts: 0,
        firstName: 'A',
        lastName: 'B',
      });
      users.updateLoginAttempts.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(Unauthorized);
    });

    it('returns auth payload when credentials are valid', async () => {
      users.findByEmail.mockResolvedValue({
        _id: '67a1b2c3d4e5f6789012345',
        email: 'a@b.com',
        passwordHash: 'stored',
        role: 'user',
        isVerified: true,
        loginAttempts: 0,
        firstName: 'A',
        lastName: 'B',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      users.resetLoginAttempts.mockResolvedValue(undefined);
      const out = await service.login({
        email: 'a@b.com',
        password: 'password123',
      });
      expect(out.accessToken).toBe('signed-jwt');
      expect(out.user.id).toBe('67a1b2c3d4e5f6789012345');
      expect(users.resetLoginAttempts).toHaveBeenCalled();
    });
  });

  describe('exchangeOAuthCode', () => {
    it('returns auth after consuming a valid code', async () => {
      oauthExchange.consumeCode.mockResolvedValue('67a1b2c3d4e5f6789012345');
      users.findById.mockResolvedValue({
        _id: '67a1b2c3d4e5f6789012345',
        email: 'a@b.com',
        role: 'user',
        isVerified: true,
        firstName: 'A',
        lastName: 'B',
      });
      users.resetLoginAttempts.mockResolvedValue(undefined);
      const out = await service.exchangeOAuthCode('some-code');
      expect(oauthExchange.consumeCode).toHaveBeenCalledWith('some-code');
      expect(out.accessToken).toBe('signed-jwt');
    });
  });
});
