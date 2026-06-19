import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('app.mailHost'),
          port: config.get('app.mailPort'),
          auth: {
            user: config.get('app.mailUser'),
            pass: config.get('app.mailPass'),
          },
        },
        defaults: {
          from: config.get('app.mailFrom'),
        },
      }),
    }),
  ],
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
