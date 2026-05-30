import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { StringValue } from 'ms';
import ms from 'ms';
import { SecurityAuditEvent } from '../../core/enums/security-audit-event.enum';
import {
  TooManyRequests,
  Unauthorized,
} from '../../core/exceptions/http.errors';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ExchangeOAuthCodeDto } from './dto/exchange-oauth-code.dto';
import { GoogleOAuthConfiguredGuard } from './guards/google-oauth-configured.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { OAuthExchangeService } from './oauth-exchange.service';
import { GuestMergeService } from '../guest/guest-merge.service';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('auth')
@Throttle({ auth: { ttl: 60_000, limit: 30 } })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly oauthExchange: OAuthExchangeService,
    private readonly guestMerge: GuestMergeService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const result = await this.auth.register(dto);
    await this.securityAudit.log({
      event: SecurityAuditEvent.REGISTER,
      email: dto.email,
      req,
    });
    return result;
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auth = await this.auth.verifyEmail(dto);
    await this.securityAudit.log({
      event: SecurityAuditEvent.VERIFY_EMAIL,
      userId: auth.user.id,
      email: auth.user.email,
      req,
    });
    this.setAccessTokenCookie(res, auth.accessToken);
    return auth;
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const result = await this.auth.forgotPassword(dto);
    await this.securityAudit.log({
      event: SecurityAuditEvent.PASSWORD_RESET_REQUESTED,
      email: dto.email,
      req,
    });
    return result;
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const result = await this.auth.resetPassword(dto);
    await this.securityAudit.log({
      event: SecurityAuditEvent.PASSWORD_RESET_COMPLETED,
      email: dto.email,
      req,
    });
    return result;
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const auth = await this.auth.login(dto);
      await this.securityAudit.log({
        event: SecurityAuditEvent.LOGIN_SUCCESS,
        userId: auth.user.id,
        email: auth.user.email,
        req,
      });
      this.setAccessTokenCookie(res, auth.accessToken);
      return auth;
    } catch (error) {
      await this.logLoginFailure(dto.email, req, error);
      throw error;
    }
  }

  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeOAuthCode(
    @Body() dto: ExchangeOAuthCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const auth = await this.auth.exchangeOAuthCode(dto.code);
    await this.securityAudit.log({
      event: SecurityAuditEvent.OAUTH_EXCHANGE,
      userId: auth.user.id,
      email: auth.user.email,
      req,
    });
    this.setAccessTokenCookie(res, auth.accessToken);
    return auth;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.clearAccessTokenCookie(res);
  }

  @Get('google')
  @UseGuards(GoogleOAuthConfiguredGuard, AuthGuard('google'))
  googleAuth(): void {
    /* Passport redirects to Google */
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthConfiguredGuard, AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: UserDocument },
    @Res() res: Response,
  ): Promise<void> {
    const { code, expiresInSeconds } =
      await this.oauthExchange.issueCodeForUserId(String(req.user._id));
    const redirect = this.config
      .get<string>('GOOGLE_OAUTH_SUCCESS_REDIRECT')
      ?.trim();
    if (redirect) {
      try {
        const url = new URL(redirect);
        url.searchParams.set('code', code);
        url.searchParams.set('expires_in', String(expiresInSeconds));
        res.redirect(url.toString());
        return;
      } catch {
        /* fall through to JSON */
      }
    }
    res.status(HttpStatus.OK).json({ code, expiresInSeconds });
  }

  @Post('merge-guest')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async mergeGuest(@CurrentUser() user: UserDocument, @Req() req: Request) {
    const result = await this.guestMerge.mergeGuestSessionIntoUser(
      user,
      req.session?.guestId,
    );
    if (result.merged && req.session) {
      delete req.session.guestId;
      await this.securityAudit.log({
        event: SecurityAuditEvent.GUEST_MERGE,
        userId: String(user._id),
        email: user.email,
        req,
      });
    }
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: UserDocument) {
    return {
      id: String(user._id),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
    };
  }

  private async logLoginFailure(
    email: string,
    req: Request,
    error: unknown,
  ): Promise<void> {
    if (error instanceof TooManyRequests) {
      await this.securityAudit.log({
        event: SecurityAuditEvent.LOGIN_LOCKOUT,
        email,
        req,
      });
      return;
    }

    if (error instanceof Unauthorized) {
      await this.securityAudit.log({
        event: SecurityAuditEvent.LOGIN_FAILURE,
        email,
        req,
      });
    }
  }

  private setAccessTokenCookie(res: Response, token: string): void {
    const name =
      this.config.get<string>('ACCESS_TOKEN_COOKIE_NAME') ?? 'ml_access_token';
    const ttlRaw = ms(
      (this.config.get<string>('JWT_EXPIRES_IN') ?? '7d') as StringValue,
    );
    const maxAge =
      typeof ttlRaw === 'number' && Number.isFinite(ttlRaw)
        ? ttlRaw
        : 7 * 24 * 60 * 60 * 1000;
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(name, token, {
      httpOnly: true,
      maxAge,
      path: '/',
      sameSite: 'lax',
      secure,
    });
  }

  private clearAccessTokenCookie(res: Response): void {
    const name =
      this.config.get<string>('ACCESS_TOKEN_COOKIE_NAME') ?? 'ml_access_token';
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res.clearCookie(name, { path: '/', sameSite: 'lax', secure });
  }
}
