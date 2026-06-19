import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

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