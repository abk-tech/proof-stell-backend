import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request } from 'express';
import type { TranslationService } from '../services/translation.service';

declare global {
  namespace Express {
    interface Request {
      language?: string;
      translations?: Record<string, string>;
    }
  }
}

@Injectable()
export class TranslationInterceptor implements NestInterceptor {
  constructor(private readonly translationService: TranslationService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract language from request
    const language = this.extractLanguage(request);
    request.language = language;

    try {
      // Load translations for the detected language
      const languageTranslations =
        await this.translationService.findTranslationsByLanguage(language);
      request.translations = languageTranslations.translations;
    } catch (error) {
      // If language not found, fall back to the configured default language.
      const defaultCode =
        await this.translationService.getDefaultLanguageCode();
      if (defaultCode) {
        try {
          const defaultTranslations =
            await this.translationService.findTranslationsByLanguage(
              defaultCode,
            );
          request.translations = defaultTranslations.translations;
        } catch {
          request.translations = {};
        }
      } else {
        request.translations = {};
      }
    }

    return next.handle();
  }

  private extractLanguage(request: Request): string {
    // Try to get language from various sources in order of priority
    // 1. Query parameter
    if (request.query.lang && typeof request.query.lang === 'string') {
      return request.query.lang;
    }

    // 2. Custom header
    if (request.headers['x-language']) {
      return request.headers['x-language'] as string;
    }

    // 3. Accept-Language header
    if (request.headers['accept-language']) {
      const acceptLanguage = request.headers['accept-language'];
      const primaryLanguage = acceptLanguage.split(',')[0].split('-')[0];
      return primaryLanguage;
    }

    // 4. Default to English
    return 'en';
  }
}
