import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const values: Record<string, unknown> = {
      'app.mailHost': 'smtp.example.com',
      'app.mailPort': 587,
      'app.mailUser': 'mailer-user',
      'app.mailPass': 'mailer-pass',
      'app.mailFrom': 'Proof Stell <no-reply@example.com>',
    };

    return values[key] ?? defaultValue;
  }),
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify mail transport configuration', async () => {
    await expect(service.checkHealth()).resolves.toBeUndefined();
  });
});
