import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequest,
  Forbidden,
  TooManyRequests,
  Unauthorized,
} from '../../core/exceptions/http.errors';
import type { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.interface';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResendOtpDto } from './dto/resend-otp.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { OtpService } from './otp.service';

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
  };
}

export interface RegisterQueuedResponse {
  message: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts: number;
  private readonly loginCooldownMinutes: number;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly otp: OtpService,
  ) {
    this.maxLoginAttempts = this.config.get<number>('MAX_LOGIN_ATTEMPTS', 5);
    this.loginCooldownMinutes = this.config.get<number>(
      'LOGIN_COOLDOWN_MINUTES',
      15,
    );
  }

  async register(dto: RegisterDto): Promise<RegisterQueuedResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create(
      dto.firstName,
      dto.lastName,
      dto.email,
      passwordHash,
    );
    const code = await this.otp.issueEmailVerificationOtp(String(user._id));
    await this.mail.sendMail({
      to: user.email,
      subject: 'Verify your email — MarketLens',
      templateName: 'otp',
      placeholders: { otp: code, firstName: user.firstName },
    });
    return {
      message: 'Check your email for a verification code.',
      email: user.email,
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthResponse> {
    const user = await this.users.findByEmailWithVerification(dto.email);
    if (!user) {
      throw new BadRequest('Invalid email or verification code.');
    }
    if (user.isVerified) {
      throw new BadRequest('Email is already verified.');
    }
    await this.otp.assertValidEmailOtp(user, dto.otp);
    await this.users.verifyUser(String(user._id));
    const fresh = await this.users.findById(String(user._id));
    await this.mail.sendMail({
      to: fresh.email,
      subject: 'Welcome to MarketLens',
      templateName: 'welcome',
      placeholders: { firstName: fresh.firstName },
    });
    return this.buildAuthResponse(fresh);
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const user = await this.users.findByEmailWithVerification(dto.email);
    if (user && !user.isVerified) {
      const code = await this.otp.issueEmailVerificationOtp(String(user._id));
      await this.mail.sendMail({
        to: user.email,
        subject: 'Verify your email — MarketLens',
        templateName: 'otp',
        placeholders: { otp: code, firstName: user.firstName },
      });
    }
    return {
      message:
        'If an account exists and is not verified, a new code has been sent.',
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new Unauthorized('Invalid credentials');
    }
    this.checkLoginCooldown(user);
    if (!user.isVerified) {
      throw new Forbidden('Please verify your email before signing in.');
    }
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      await this.handleInvalidPassword(user);
    }
    await this.users.resetLoginAttempts(String(user._id));
    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: UserDocument): AuthResponse {
    const payload: JwtPayload = {
      sub: String(user._id),
      email: user.email,
    };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<string>('JWT_EXPIRES_IN'),
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
    };
  }

  private checkLoginCooldown(user: UserDocument): void {
    if (user.loginCooldown && new Date() < new Date(user.loginCooldown)) {
      throw new TooManyRequests(
        `Account locked due to multiple failed login attempts. Try again after ${new Date(user.loginCooldown).toISOString()}`,
      );
    }
  }

  private async handleInvalidPassword(user: UserDocument): Promise<never> {
    const userId = String(user._id);
    const newAttempts = (user.loginAttempts ?? 0) + 1;

    if (newAttempts >= this.maxLoginAttempts) {
      const cooldownUntil = new Date(
        Date.now() + this.loginCooldownMinutes * 60 * 1000,
      );
      await this.users.updateLoginAttempts(userId, {
        loginAttempts: 0,
        loginCooldown: cooldownUntil,
      });
      throw new TooManyRequests(
        `Account locked due to multiple failed login attempts. Try again after ${cooldownUntil.toISOString()}`,
      );
    }

    await this.users.updateLoginAttempts(userId, {
      loginAttempts: newAttempts,
    });
    throw new Unauthorized(
      `Invalid credentials. ${this.maxLoginAttempts - newAttempts} attempt(s) remaining`,
    );
  }
}
