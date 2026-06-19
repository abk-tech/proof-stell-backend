import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async checkHealth(): Promise<void> {
    const host = this.configService.get<string>('app.mailHost');
    const port = this.configService.get<number>('app.mailPort');
    const user = this.configService.get<string>('app.mailUser');
    const pass = this.configService.get<string>('app.mailPass');
    const from = this.configService.get<string>('app.mailFrom');

    if (!host || !port || !user || !pass || !from) {
      throw new Error('Mail configuration is incomplete');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    try {
      await transporter.verify();
    } catch {
      throw new Error('Mail transport verification failed');
    }
  }

  async sendTestEmail(to: string): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Test Email from Stark Insured',
      text: 'This is a test email using Mailtrap.',
    });
  }

  async sendVerificationEmail(
    to: string,
    username: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Verify your email address',
      template: 'verify-email', // References your configured template (e.g., verify-email.hbs)
      context: {
        username,
        verificationUrl,
      },
    });
  }
}
