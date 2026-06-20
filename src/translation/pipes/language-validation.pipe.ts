import {
  type PipeTransform,
  Injectable,
  type ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { TranslationService } from '../services/translation.service';

@Injectable()
export class LanguageValidationPipe implements PipeTransform {
  constructor(private readonly translationService: TranslationService) {}

  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    if (!value) {
      throw new BadRequestException('Language code is required');
    }

    try {
      await this.translationService.findLanguageByCode(value);
      return value;
    } catch (error) {
      throw new BadRequestException(
        `Invalid or inactive language code: ${value}`,
      );
    }
  }
}
