import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Language, Translation } from '../entities';
import { TranslationService } from './translation.service';

type LangEntity = Partial<Language> & {
  id: number;
  code: string;
  isActive: boolean;
  isDefault: boolean;
};

const makeLang = (
  id: number,
  code: string,
  opts: Partial<LangEntity> = {},
): LangEntity => ({
  id,
  code,
  name: code.toUpperCase(),
  nativeName: code.toUpperCase(),
  isActive: true,
  isDefault: false,
  ...opts,
});

describe('TranslationService', () => {
  let service: TranslationService;
  let languageRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let translationRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const buildQueryBuilderMock = (rows: Array<Record<string, unknown>>) => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    return qb;
  };

  beforeEach(async () => {
    languageRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    translationRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        {
          provide: getRepositoryToken(Language),
          useValue: languageRepository,
        },
        {
          provide: getRepositoryToken(Translation),
          useValue: translationRepository,
        },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
    jest.clearAllMocks();
  });

  describe('getDefaultLanguageCode', () => {
    it('returns the configured default language code and caches the result', async () => {
      languageRepository.findOne.mockResolvedValue(
        makeLang(1, 'es', { isDefault: true }),
      );

      expect(await service.getDefaultLanguageCode()).toBe('es');
      expect(await service.getDefaultLanguageCode()).toBe('es');
      expect(languageRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('returns null when no default language is configured', async () => {
      languageRepository.findOne.mockResolvedValue(null);

      expect(await service.getDefaultLanguageCode()).toBeNull();
    });

    it('invalidates the cache after clearAllCache', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'en', { isDefault: true }))
        .mockResolvedValueOnce(makeLang(2, 'es', { isDefault: true }));

      expect(await service.getDefaultLanguageCode()).toBe('en');
      await service.clearAllCache();
      expect(await service.getDefaultLanguageCode()).toBe('es');
    });

    it('invalidates the cache when a language with isDefault=true is created', async () => {
      // Three findOne calls happen in order:
      //   1) first getDefaultLanguageCode() reads the current default ('en').
      //   2) createLanguage() does an existence check ('es' is not present yet).
      //   3) second getDefaultLanguageCode() must re-read after the cache
      //      invalidation triggered by createLanguage().
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'en', { isDefault: true }))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeLang(2, 'es', { isDefault: true }));

      expect(await service.getDefaultLanguageCode()).toBe('en');

      languageRepository.create.mockReturnValue(
        makeLang(2, 'es', { isDefault: true }),
      );
      languageRepository.save.mockResolvedValue(
        makeLang(2, 'es', { isDefault: true }),
      );
      await service.createLanguage({
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        isDefault: true,
        isActive: true,
      } as any);

      expect(await service.getDefaultLanguageCode()).toBe('es');
    });
  });

  describe('getTranslation fallback', () => {
    it('returns the requested translation when present in the target language', async () => {
      languageRepository.findOne.mockResolvedValueOnce(makeLang(1, 'es'));
      translationRepository.findOne.mockResolvedValueOnce({ value: 'Hola' });

      expect(await service.getTranslation('greeting', 'es')).toBe('Hola');
    });

    it('falls back to the configured default language when the key is missing in the requested locale', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'es'))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }));
      translationRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ value: 'Hello' });

      expect(await service.getTranslation('greeting', 'es')).toBe('Hello');
    });

    it('returns the original key when no translation exists anywhere', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'es'))
        .mockResolvedValueOnce(null);
      translationRepository.findOne.mockResolvedValueOnce(null);

      expect(await service.getTranslation('greeting', 'es')).toBe('greeting');
    });

    it('returns the provided options.defaultValue when nothing matches', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'es'))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }));
      translationRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      expect(
        await service.getTranslation('greeting', 'es', {
          defaultValue: 'Default greeting',
        }),
      ).toBe('Default greeting');
    });

    it('does not fall back to default when the requested locale IS the default', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }));
      translationRepository.findOne.mockResolvedValueOnce(null);

      expect(await service.getTranslation('greeting', 'en')).toBe('greeting');
      expect(languageRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('findMissingTranslations', () => {
    it('returns sorted keys present in the default but not in the target', async () => {
      const defaultQb = buildQueryBuilderMock([
        { key: 'auth.login' },
        { key: 'common.hello' },
        { key: 'errors.404' },
      ]);
      const targetQb = buildQueryBuilderMock([{ key: 'auth.login' }]);
      translationRepository.createQueryBuilder
        .mockReturnValueOnce(defaultQb)
        .mockReturnValueOnce(targetQb);

      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'es'))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }));

      const missing = await service.findMissingTranslations('es');
      expect(missing).toEqual(['common.hello', 'errors.404']);
    });

    it('returns an empty array when the requested language IS the default', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }))
        .mockResolvedValueOnce(makeLang(2, 'en', { isDefault: true }));

      expect(await service.findMissingTranslations('en')).toEqual([]);
      expect(translationRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns an empty array when no default language is configured', async () => {
      languageRepository.findOne
        .mockResolvedValueOnce(makeLang(1, 'es'))
        .mockResolvedValueOnce(null);

      expect(await service.findMissingTranslations('es')).toEqual([]);
      expect(translationRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
