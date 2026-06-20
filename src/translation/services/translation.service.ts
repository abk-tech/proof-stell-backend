import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Language, Translation } from '../entities';
import type {
  CreateLanguageDto,
  UpdateLanguageDto,
  CreateTranslationDto,
  UpdateTranslationDto,
  BulkTranslationDto,
} from '../dto';
import type {
  TranslationMap,
  LanguageTranslations,
  TranslationOptions,
  BulkTranslationResult,
} from '../interfaces/translation.interface';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private translationCache = new Map<string, TranslationMap>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  /**
   * Cached default-language code (resolved lazily on first access).
   * `undefined` means "not yet resolved"; `null` means "DB lookup confirmed there is no default".
   * Invalidated by createLanguage/updateLanguage/deleteLanguage and clearAllCache.
   */
  private defaultLanguageCode: string | null | undefined = undefined;

  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
  ) {}

  // Language Management
  async createLanguage(
    createLanguageDto: CreateLanguageDto,
  ): Promise<Language> {
    const existingLanguage = await this.languageRepository.findOne({
      where: { code: createLanguageDto.code },
    });

    if (existingLanguage) {
      throw new ConflictException(
        `Language with code '${createLanguageDto.code}' already exists`,
      );
    }

    // If this is set as default, unset other defaults
    if (createLanguageDto.isDefault) {
      await this.languageRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    const language = this.languageRepository.create(createLanguageDto);
    const savedLanguage = await this.languageRepository.save(language);

    // The default-language cache may now be stale.
    this.defaultLanguageCode = undefined;

    this.logger.log(`Created language: ${savedLanguage.code}`);
    return savedLanguage;
  }

  async findAllLanguages(activeOnly = false): Promise<Language[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.languageRepository.find({
      where,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findLanguageByCode(code: string): Promise<Language> {
    const language = await this.languageRepository.findOne({
      where: { code, isActive: true },
    });

    if (!language) {
      throw new NotFoundException(`Language with code '${code}' not found`);
    }

    return language;
  }

  async updateLanguage(
    id: number,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<Language> {
    const language = await this.languageRepository.findOne({ where: { id } });

    if (!language) {
      throw new NotFoundException(`Language with id ${id} not found`);
    }

    // If this is set as default, unset other defaults
    if (updateLanguageDto.isDefault) {
      await this.languageRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    await this.languageRepository.update(id, updateLanguageDto);
    const updatedLanguage = await this.languageRepository.findOne({
      where: { id },
    });

    // Clear cache for this language
    this.clearLanguageCache(language.code);
    // Default-language cache may be stale if isDefault changed.
    this.defaultLanguageCode = undefined;

    this.logger.log(`Updated language: ${updatedLanguage.code}`);
    return updatedLanguage;
  }

  async deleteLanguage(id: number): Promise<void> {
    const language = await this.languageRepository.findOne({ where: { id } });

    if (!language) {
      throw new NotFoundException(`Language with id ${id} not found`);
    }

    if (language.isDefault) {
      throw new BadRequestException('Cannot delete the default language');
    }

    await this.languageRepository.delete(id);
    this.clearLanguageCache(language.code);

    // Default-language cache may be stale.
    this.defaultLanguageCode = undefined;

    this.logger.log(`Deleted language: ${language.code}`);
  }

  // Translation Management
  async createTranslation(
    createTranslationDto: CreateTranslationDto,
  ): Promise<Translation> {
    const language = await this.languageRepository.findOne({
      where: { id: createTranslationDto.languageId },
    });

    if (!language) {
      throw new NotFoundException(
        `Language with id ${createTranslationDto.languageId} not found`,
      );
    }

    const existingTranslation = await this.translationRepository.findOne({
      where: {
        key: createTranslationDto.key,
        languageId: createTranslationDto.languageId,
      },
    });

    if (existingTranslation) {
      throw new ConflictException(
        `Translation for key '${createTranslationDto.key}' already exists for language '${language.code}'`,
      );
    }

    const translation = this.translationRepository.create(createTranslationDto);
    const savedTranslation = await this.translationRepository.save(translation);

    // Clear cache for this language
    this.clearLanguageCache(language.code);

    this.logger.log(
      `Created translation: ${savedTranslation.key} for ${language.code}`,
    );
    return savedTranslation;
  }

  async findTranslationsByLanguage(
    languageCode: string,
  ): Promise<LanguageTranslations> {
    // Check cache first
    const cached = this.getFromCache(languageCode);
    if (cached) {
      const language = await this.findLanguageByCode(languageCode);
      return {
        language: {
          code: language.code,
          name: language.name,
          nativeName: language.nativeName,
        },
        translations: cached,
      };
    }

    const language = await this.findLanguageByCode(languageCode);
    // Only select the fields needed for the translation map to reduce payload
    const translations = await this.translationRepository
      .createQueryBuilder('t')
      .select(['t.key', 't.value'])
      .where('t.languageId = :languageId', { languageId: language.id })
      .orderBy('t.key', 'ASC')
      .getRawMany();

    const translationMap: TranslationMap = {};
    translations.forEach((translation) => {
      translationMap[translation.key] = translation.value;
    });

    // Cache the result
    this.setCache(languageCode, translationMap);

    return {
      language: {
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
      },
      translations: translationMap,
    };
  }

  async getTranslation(
    key: string,
    languageCode: string,
    options?: TranslationOptions,
  ): Promise<string> {
    const cached = this.getFromCache(languageCode);
    let translation: string;

    if (cached && cached[key]) {
      translation = cached[key];
    } else {
      const language = await this.findLanguageByCode(languageCode);
      const translationEntity = await this.translationRepository.findOne({
        where: { key, languageId: language.id },
      });

      if (!translationEntity) {
        // Try to get from the configured default language (data-driven, cached).
        const defaultCode = await this.getDefaultLanguageCode();

        if (defaultCode && defaultCode !== languageCode) {
          try {
            const defaultLanguage = await this.findLanguageByCode(defaultCode);
            const defaultTranslation = await this.translationRepository.findOne(
              {
                where: { key, languageId: defaultLanguage.id },
              },
            );

            if (defaultTranslation) {
              translation = defaultTranslation.value;
            }
          } catch {
            // The cached default points to a missing or inactive language.
            // Don't propagate — degrade gracefully to the explicit defaultValue
            // (or the raw key) so missing/inactive admin data can't take down a
            // request that already had a valid locale.
          }
        }

        if (!translation) {
          translation = options?.defaultValue || key;
        }
      } else {
        translation = translationEntity.value;
      }
    }

    // Handle interpolation
    if (options?.interpolation) {
      Object.entries(options.interpolation).forEach(([placeholder, value]) => {
        translation = translation.replace(
          new RegExp(`{{${placeholder}}}`, 'g'),
          String(value),
        );
      });
    }

    return translation;
  }

  async updateTranslation(
    id: number,
    updateTranslationDto: UpdateTranslationDto,
  ): Promise<Translation> {
    const translation = await this.translationRepository.findOne({
      where: { id },
      relations: ['language'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with id ${id} not found`);
    }

    await this.translationRepository.update(id, updateTranslationDto);
    const updatedTranslation = await this.translationRepository.findOne({
      where: { id },
      relations: ['language'],
    });

    // Clear cache for this language
    this.clearLanguageCache(translation.language.code);

    this.logger.log(
      `Updated translation: ${updatedTranslation.key} for ${translation.language.code}`,
    );
    return updatedTranslation;
  }

  async deleteTranslation(id: number): Promise<void> {
    const translation = await this.translationRepository.findOne({
      where: { id },
      relations: ['language'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with id ${id} not found`);
    }

    await this.translationRepository.delete(id);
    this.clearLanguageCache(translation.language.code);

    this.logger.log(
      `Deleted translation: ${translation.key} for ${translation.language.code}`,
    );
  }

  // Bulk Operations
  async bulkCreateTranslations(
    bulkTranslationDto: BulkTranslationDto,
  ): Promise<BulkTranslationResult> {
    const language = await this.findLanguageByCode(
      bulkTranslationDto.languageCode,
    );
    const result: BulkTranslationResult = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const item of bulkTranslationDto.translations) {
      try {
        const existingTranslation = await this.translationRepository.findOne({
          where: { key: item.key, languageId: language.id },
        });

        if (existingTranslation) {
          await this.translationRepository.update(existingTranslation.id, {
            value: item.value,
            namespace: item.namespace,
            description: item.description,
          });
          result.updated++;
        } else {
          const translation = this.translationRepository.create({
            key: item.key,
            value: item.value,
            namespace: item.namespace,
            description: item.description,
            languageId: language.id,
          });
          await this.translationRepository.save(translation);
          result.created++;
        }
      } catch (error) {
        result.errors.push({
          key: item.key,
          error: error.message,
        });
      }
    }

    // Clear cache for this language
    this.clearLanguageCache(language.code);

    this.logger.log(
      `Bulk operation completed for ${language.code}: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`,
    );

    return result;
  }

  async findTranslationsByNamespace(
    languageCode: string,
    namespace: string,
  ): Promise<TranslationMap> {
    const language = await this.findLanguageByCode(languageCode);
    const translations = await this.translationRepository
      .createQueryBuilder('t')
      .select(['t.key', 't.value'])
      .where('t.languageId = :languageId', { languageId: language.id })
      .andWhere('t.namespace = :namespace', { namespace })
      .orderBy('t.key', 'ASC')
      .getRawMany();

    const translationMap: TranslationMap = {};
    translations.forEach((translation) => {
      translationMap[translation.key] = translation.value;
    });

    return translationMap;
  }

  // Cache Management
  private getFromCache(languageCode: string): TranslationMap | null {
    const expiry = this.cacheExpiry.get(languageCode);
    if (expiry && Date.now() > expiry) {
      this.translationCache.delete(languageCode);
      this.cacheExpiry.delete(languageCode);
      return null;
    }

    return this.translationCache.get(languageCode) || null;
  }

  private setCache(languageCode: string, translations: TranslationMap): void {
    this.translationCache.set(languageCode, translations);
    this.cacheExpiry.set(languageCode, Date.now() + this.CACHE_TTL);
  }

  private clearLanguageCache(languageCode: string): void {
    this.translationCache.delete(languageCode);
    this.cacheExpiry.delete(languageCode);
  }

  async clearAllCache(): Promise<void> {
    this.translationCache.clear();
    this.cacheExpiry.clear();
    this.defaultLanguageCode = undefined;
    this.logger.log('Translation cache cleared');
  }

  /**
   * Returns the configured default language code, caching the lookup after
   * the first call. The cache is invalidated by language mutations and
   * {@link clearAllCache}. Returns `null` if no language is marked as default.
   *
   * This replaces previously hardcoded `'en'` fallbacks and makes the
   * fallback behavior consistent across the module.
   */
  async getDefaultLanguageCode(): Promise<string | null> {
    if (this.defaultLanguageCode !== undefined) {
      return this.defaultLanguageCode;
    }

    const defaultLanguage = await this.languageRepository.findOne({
      where: { isDefault: true },
    });

    this.defaultLanguageCode = defaultLanguage ? defaultLanguage.code : null;
    return this.defaultLanguageCode;
  }

  /**
   * Returns translation keys that exist in the configured default language
   * but not in the requested language. Useful for auditing translation
   * coverage for templates, notifications, or any locale gap before launch.
   *
   * Returns an empty array if the requested language IS the default, or if
   * no default language is configured.
   */
  async findMissingTranslations(languageCode: string): Promise<string[]> {
    const targetLanguage = await this.findLanguageByCode(languageCode);
    const defaultCode = await this.getDefaultLanguageCode();

    if (!defaultCode || defaultCode === targetLanguage.code) {
      return [];
    }

    const defaultLanguage = await this.findLanguageByCode(defaultCode);

    const [defaultRows, targetRows] = await Promise.all([
      this.translationRepository
        .createQueryBuilder('t')
        .select(['t.key'])
        .where('t.languageId = :languageId', {
          languageId: defaultLanguage.id,
        })
        .getRawMany(),
      this.translationRepository
        .createQueryBuilder('t')
        .select(['t.key'])
        .where('t.languageId = :languageId', {
          languageId: targetLanguage.id,
        })
        .getRawMany(),
    ]);

    const targetKeys = new Set<string>(targetRows.map((row) => row.key));
    return defaultRows
      .map((row) => row.key)
      .filter((key) => !targetKeys.has(key))
      .sort();
  }
}
