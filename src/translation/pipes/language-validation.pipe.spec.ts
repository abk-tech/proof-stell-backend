import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LanguageValidationPipe } from './language-validation.pipe';
import { TranslationService } from '../services/translation.service';

describe('LanguageValidationPipe', () => {
  let pipe: LanguageValidationPipe;
  let translationService: { findLanguageByCode: jest.Mock };

  beforeEach(async () => {
    translationService = {
      findLanguageByCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageValidationPipe,
        {
          provide: TranslationService,
          useValue: translationService,
        },
      ],
    }).compile();

    pipe = module.get<LanguageValidationPipe>(LanguageValidationPipe);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(pipe).toBeDefined();
  });

  it('rejects empty input', async () => {
    await expect(pipe.transform('', {} as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an unsupported language code', async () => {
    translationService.findLanguageByCode.mockRejectedValue(
      new Error('not found'),
    );

    await expect(pipe.transform('zz', {} as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(translationService.findLanguageByCode).toHaveBeenCalledWith('zz');
  });

  it('returns the value when the language is supported and active', async () => {
    translationService.findLanguageByCode.mockResolvedValue({ code: 'es' });

    const result = await pipe.transform('es', {} as any);
    expect(result).toBe('es');
  });
});
