import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { BadRequest, TooManyRequests } from '../../core/exceptions/http.errors';
import type { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class OtpService {
  private readonly maxOtpAttempts: number;
  private readonly otpTtlMinutes: number;

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {
    this.maxOtpAttempts = this.config.get<number>('MAX_OTP_ATTEMPTS', 5);
    this.otpTtlMinutes = this.config.get<number>('OTP_TTL_MINUTES', 15);
  }

  /** Generates a numeric OTP, persists a hash on the user, returns the plain OTP for email. */
  async issueEmailVerificationOtp(userId: string): Promise<string> {
    const code = randomInt(100000, 999999).toString();
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.otpTtlMinutes * 60 * 1000);
    await this.users.setVerificationOtp(userId, hash, expiresAt);
    return code;
  }

  async assertValidEmailOtp(
    user: UserDocument,
    plainOtp: string,
  ): Promise<void> {
    if (!user.verificationOtpHash || !user.verificationOtpExpiresAt) {
      throw new BadRequest('No verification code is active for this account.');
    }

    if (new Date() > user.verificationOtpExpiresAt) {
      throw new BadRequest('Verification code has expired. Request a new one.');
    }

    if ((user.verificationOtpAttempts ?? 0) >= this.maxOtpAttempts) {
      throw new TooManyRequests(
        'Too many invalid attempts. Request a new verification code.',
      );
    }

    const ok = await bcrypt.compare(plainOtp, user.verificationOtpHash);
    if (!ok) {
      await this.users.incrementVerificationOtpAttempts(String(user._id));
      throw new BadRequest('Invalid verification code.');
    }
  }

  async issuePasswordResetOtp(userId: string): Promise<string> {
    const code = randomInt(100000, 999999).toString();
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.otpTtlMinutes * 60 * 1000);
    await this.users.setPasswordResetOtp(userId, hash, expiresAt);
    return code;
  }

  async assertValidPasswordResetOtp(
    user: UserDocument,
    plainOtp: string,
  ): Promise<void> {
    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      throw new BadRequest(
        'No password reset code is active for this account.',
      );
    }

    if (new Date() > user.passwordResetOtpExpiresAt) {
      throw new BadRequest('Reset code has expired. Request a new one.');
    }

    if ((user.passwordResetOtpAttempts ?? 0) >= this.maxOtpAttempts) {
      throw new TooManyRequests(
        'Too many invalid attempts. Request a new reset code.',
      );
    }

    const ok = await bcrypt.compare(plainOtp, user.passwordResetOtpHash);
    if (!ok) {
      await this.users.incrementPasswordResetOtpAttempts(String(user._id));
      throw new BadRequest('Invalid reset code.');
    }
  }
}
