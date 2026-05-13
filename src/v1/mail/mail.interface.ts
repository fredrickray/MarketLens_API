export type MailTemplatePlaceholders = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateName?: string;
  placeholders?: MailTemplatePlaceholders;
}

export abstract class MailService {
  abstract sendMail(options: SendMailOptions): Promise<void>;
}
