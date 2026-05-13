import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { MailTemplatePlaceholders } from './mail.interface';

@Injectable()
export class MailTemplateService {
  async compileTemplate(
    templateName: string,
    placeholders: MailTemplatePlaceholders = {},
  ): Promise<string> {
    const templatePath = join(
      __dirname,
      'templates',
      `${templateName}.template.html`,
    );

    const source = await readFile(templatePath, 'utf8');
    const template = Handlebars.compile(source);

    return template(placeholders);
  }
}
