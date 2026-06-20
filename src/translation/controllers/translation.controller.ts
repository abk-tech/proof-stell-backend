import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { TranslationService } from '../services/translation.service';
import type { Language, Translation } from '../entities';
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

@ApiTags('translations')
@Controller('translations')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  // Language Management Endpoints
  @Post('languages')
  @ApiOperation({ summary: 'Create a new language' })
  @ApiResponse({ status: 201, description: 'Language created successfully' })
  @ApiResponse({ status: 409, description: 'Language already exists' })
  async createLanguage(
    createLanguageDto: CreateLanguageDto,
  ): Promise<Language> {
    return this.translationService.createLanguage(createLanguageDto);
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all languages' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter active languages only',
  })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  async findAllLanguages(
    @Query('activeOnly') activeOnly?: boolean,
  ): Promise<Language[]> {
    return this.translationService.findAllLanguages(activeOnly);
  }

  @Get('languages/:code')
  @ApiOperation({ summary: 'Get language by code' })
  @ApiParam({ name: 'code', description: 'Language code (e.g., en, es, fr)' })
  @ApiResponse({ status: 200, description: 'Language retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async findLanguageByCode(@Param('code') code: string): Promise<Language> {
    return this.translationService.findLanguageByCode(code);
  }

  @Put('languages/:id')
  @ApiOperation({ summary: 'Update a language' })
  @ApiParam({ name: 'id', description: 'Language ID' })
  @ApiResponse({ status: 200, description: 'Language updated successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async updateLanguage(
    @Param('id', ParseIntPipe) id: number,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<Language> {
    return this.translationService.updateLanguage(id, updateLanguageDto);
  }

  @Delete('languages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a language' })
  @ApiParam({ name: 'id', description: 'Language ID' })
  @ApiResponse({ status: 204, description: 'Language deleted successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete default language' })
  async deleteLanguage(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.translationService.deleteLanguage(id);
  }

  // Translation Management Endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new translation' })
  @ApiResponse({ status: 201, description: 'Translation created successfully' })
  @ApiResponse({ status: 409, description: 'Translation already exists' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async createTranslation(
    createTranslationDto: CreateTranslationDto,
  ): Promise<Translation> {
    return this.translationService.createTranslation(createTranslationDto);
  }

  @Get(':languageCode')
  @ApiOperation({ summary: 'Get all translations for a language' })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code (e.g., en, es, fr)',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async findTranslationsByLanguage(
    @Param('languageCode') languageCode: string,
  ): Promise<LanguageTranslations> {
    return this.translationService.findTranslationsByLanguage(languageCode);
  }

  @Get(':languageCode/key/:key')
  @ApiOperation({ summary: 'Get a specific translation by key and language' })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code (e.g., en, es, fr)',
  })
  @ApiParam({
    name: 'key',
    description: 'Translation key (e.g., common.welcome)',
  })
  @ApiQuery({
    name: 'defaultValue',
    required: false,
    description: 'Default value if translation not found',
  })
  @ApiResponse({
    status: 200,
    description: 'Translation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getTranslation(
    @Param('key') key: string,
    @Param('languageCode') languageCode: string,
    @Query('defaultValue') defaultValue?: string,
  ): Promise<{ key: string; value: string; language: string }> {
    const options: TranslationOptions = defaultValue
      ? { defaultValue }
      : undefined;
    const value = await this.translationService.getTranslation(
      key,
      languageCode,
      options,
    );

    return {
      key,
      value,
      language: languageCode,
    };
  }

  @Get(':languageCode/namespace/:namespace')
  @ApiOperation({ summary: 'Get translations by namespace for a language' })
  @ApiParam({
    name: 'languageCode',
    description: 'Language code (e.g., en, es, fr)',
  })
  @ApiParam({
    name: 'namespace',
    description: 'Translation namespace (e.g., common, auth, errors)',
  })
  @ApiResponse({
    status: 200,
    description: 'Translations retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async findTranslationsByNamespace(
    @Param('languageCode') languageCode: string,
    @Param('namespace') namespace: string,
  ): Promise<TranslationMap> {
    return this.translationService.findTranslationsByNamespace(
      languageCode,
      namespace,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a translation' })
  @ApiParam({ name: 'id', description: 'Translation ID' })
  @ApiResponse({ status: 200, description: 'Translation updated successfully' })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  async updateTranslation(
    @Param('id', ParseIntPipe) id: number,
    updateTranslationDto: UpdateTranslationDto,
  ): Promise<Translation> {
    return this.translationService.updateTranslation(id, updateTranslationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a translation' })
  @ApiParam({ name: 'id', description: 'Translation ID' })
  @ApiResponse({ status: 204, description: 'Translation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  async deleteTranslation(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.translationService.deleteTranslation(id);
  }

  // Bulk Operations
  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create or update translations' })
  @ApiResponse({ status: 201, description: 'Bulk operation completed' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async bulkCreateTranslations(
    bulkTranslationDto: BulkTranslationDto,
  ): Promise<BulkTranslationResult> {
    return this.translationService.bulkCreateTranslations(bulkTranslationDto);
  }

  // Cache Management
  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear translation cache' })
  @ApiResponse({ status: 204, description: 'Cache cleared successfully' })
  async clearCache(): Promise<void> {
    return this.translationService.clearAllCache();
  }

  /**
   * Returns translation keys present in the configured default language but
   * missing in the requested language. Used to audit translation coverage for
   * templates, notifications, and other user-facing surfaces.
   */
  @Get(':languageCode/missing-translations')
  @ApiOperation({
    summary:
      'List translation keys present in the default language but missing in the given language',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Target language code (e.g., es, fr, de)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Missing keys returned (empty array if none or no default configured)',
  })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async findMissingTranslations(
    @Param('languageCode') languageCode: string,
  ): Promise<{ language: string; missingKeys: string[] }> {
    const missingKeys =
      await this.translationService.findMissingTranslations(languageCode);
    return {
      language: languageCode,
      missingKeys,
    };
  }
}
