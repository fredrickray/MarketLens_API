import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MailService, SendMailOptions } from './mail.interface';
import { MailTemplateService } from './mail-template.service';

@Injectable()
export class NodemailerProvider extends MailService {
  private readonly logger = new Logger(NodemailerProvider.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailTemplateService: MailTemplateService,
  ) {
    super();
    this.from = this.configService.get<string>(
      'MAIL_FROM',
      'noreply@marketlens.local',
    );
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      const html = await this.resolveHtml(options);

      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html,
      });
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  private resolveHtml(options: SendMailOptions): Promise<string | undefined> {
    if (options.html) {
      return Promise.resolve(options.html);
    }

    if (!options.templateName) {
      return Promise.resolve(undefined);
    }

    return this.mailTemplateService.compileTemplate(
      options.templateName,
      options.placeholders,
    );
  }
}
