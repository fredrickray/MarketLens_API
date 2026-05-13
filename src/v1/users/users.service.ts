import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conflict } from '../../core/exceptions/http.errors';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(
    firstName: string,
    lastName: string,
    email: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    const normalized = email.toLowerCase().trim();
    try {
      const created = await this.userModel.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalized,
        passwordHash,
      });
      return created;
    } catch (err: unknown) {
      const isDup =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: number }).code === 11000;
      if (isDup) {
        throw new Conflict('Email already registered');
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec();
  }

  async findByEmailWithVerification(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+verificationOtpHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdForAuth(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async setVerificationOtp(
    userId: string,
    hash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        verificationOtpHash: hash,
        verificationOtpExpiresAt: expiresAt,
        verificationOtpAttempts: 0,
      },
    });
  }

  async incrementVerificationOtpAttempts(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { verificationOtpAttempts: 1 },
    });
  }

  async verifyUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        isVerified: true,
        verificationOtpAttempts: 0,
        verificationOtpHash: null,
        verificationOtpExpiresAt: null,
      },
    });
  }

  async updateLoginAttempts(
    userId: string,
    data: { loginAttempts: number; loginCooldown?: Date | null },
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $set: data });
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { loginAttempts: 0, loginCooldown: null },
    });
  }

  async findOrCreateFromGoogle(params: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<UserDocument> {
    const email = params.email.toLowerCase().trim();

    const byGoogle = await this.userModel
      .findOne({ googleId: params.googleId })
      .exec();
    if (byGoogle) {
      return byGoogle;
    }

    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      if (existing.googleId && existing.googleId !== params.googleId) {
        throw new Conflict('This email is linked to another Google account.');
      }
      existing.googleId = params.googleId;
      existing.isVerified = true;
      if (!existing.firstName?.trim()) {
        existing.firstName = params.firstName.trim();
      }
      if (!existing.lastName?.trim()) {
        existing.lastName = params.lastName.trim();
      }
      await existing.save();
      return existing;
    }

    try {
      const created = await this.userModel.create({
        googleId: params.googleId,
        email,
        firstName: params.firstName.trim(),
        lastName: params.lastName.trim(),
        isVerified: true,
        passwordHash: null,
      });
      return created;
    } catch (err: unknown) {
      const isDup =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: number }).code === 11000;
      if (isDup) {
        throw new Conflict('Unable to create account from Google profile.');
      }
      throw err;
    }
  }
}
