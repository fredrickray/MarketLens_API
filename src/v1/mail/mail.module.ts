import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.interface';
import { MailTemplateService } from './mail-template.service';
import { NodemailerProvider } from './nodemailer.provider';
import { NoopMailService } from './noop-mail.service';

@Module({
  imports: [ConfigModule],
  providers: [
    MailTemplateService,
    {
      provide: MailService,
      useFactory: (
        config: ConfigService,
        templates: MailTemplateService,
      ): MailService => {
        const host = config.get<string>('SMTP_HOST');
        if (!host || host.trim() === '') {
          return new NoopMailService();
        }
        return new NodemailerProvider(config, templates);
      },
      inject: [ConfigService, MailTemplateService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
