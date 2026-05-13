import { Injectable, Logger } from '@nestjs/common';
import { SendMailOptions, MailService } from './mail.interface';

@Injectable()
export class NoopMailService extends MailService {
  private readonly logger = new Logger(NoopMailService.name);

  constructor() {
    super();
  }

  sendMail(options: SendMailOptions): Promise<void> {
    this.logger.debug(
      `Email skipped (no SMTP): to=${options.to} subject=${options.subject}`,
    );
    return Promise.resolve();
  }
}
