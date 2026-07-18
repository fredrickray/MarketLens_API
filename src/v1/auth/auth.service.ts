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
import type {
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResendOtpDto } from './dto/resend-otp.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { OtpService } from './otp.service';
import { OAuthExchangeService } from './oauth-exchange.service';

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
    private readonly oauthExchange: OAuthExchangeService,
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
    if (!user) {
      throw new Unauthorized('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new Forbidden(
        'This account uses Google sign-in. Please sign in with Google.',
      );
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

  async exchangeOAuthCode(code: string): Promise<AuthResponse> {
    const userId = await this.oauthExchange.consumeCode(code);
    const user = await this.users.findById(userId);
    await this.users.resetLoginAttempts(userId);
    return this.issueAuthResponse(user);
  }

  /**
   * Always returns a generic message to avoid email enumeration.
   * Only issues a reset code for verified accounts that have a password.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.users.findByEmailWithPasswordReset(dto.email);
    if (user?.passwordHash && user.isVerified) {
      const code = await this.otp.issuePasswordResetOtp(String(user._id));
      await this.mail.sendMail({
        to: user.email,
        subject: 'Reset your password — MarketLens',
        templateName: 'password-reset',
        placeholders: {
          otp: code,
          firstName: user.firstName,
          user_email: user.email,
        },
      });
    }
    return {
      message:
        'If an account with that email exists, a password reset code has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.users.findByEmailWithPasswordReset(dto.email);
    if (!user?.passwordHash) {
      throw new BadRequest('Invalid email or reset code.');
    }
    await this.otp.assertValidPasswordResetOtp(user, dto.otp);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.updatePasswordAndClearResetOtp(
      String(user._id),
      passwordHash,
    );
    const appUrl =
      this.config.get<string>('APP_PUBLIC_URL')?.trim() ||
      'http://localhost:3000';
    await this.mail.sendMail({
      to: user.email,
      subject: 'Your password was updated — MarketLens',
      templateName: 'password-reset-success',
      placeholders: {
        user_name: user.firstName,
        changed_at: new Date().toUTCString(),
        reset_url: `${appUrl}/forgot-password`,
        support_email:
          this.config.get<string>('MAIL_FROM') ?? 'noreply@marketlens.local',
      },
    });
    return {
      message: 'Password updated. You can sign in with your new password.',
    };
  }

  /** Public helper for Google OAuth callback (and tests). */
  issueAuthResponse(user: UserDocument): AuthResponse {
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
