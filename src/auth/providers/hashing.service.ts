import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HashingService {
  private readonly logger = new Logger(HashingService.name);
  private readonly saltRounds: number;
  private readonly minSaltRounds = 10;
  private readonly maxSaltRounds = 15;

  constructor(private readonly configService: ConfigService) {
    const configuredRounds =
      this.configService.get<number>('app.bcryptSaltRounds', 12) || 12;

    // Ensure salt rounds is within secure range
    if (configuredRounds < this.minSaltRounds) {
      this.logger.warn(
        `Configured salt rounds (${configuredRounds}) is below minimum (${this.minSaltRounds}). Using minimum.`,
      );
      this.saltRounds = this.minSaltRounds;
    } else if (configuredRounds > this.maxSaltRounds) {
      this.logger.warn(
        `Configured salt rounds (${configuredRounds}) is above maximum (${this.maxSaltRounds}). Using maximum.`,
      );
      this.saltRounds = this.maxSaltRounds;
    } else {
      this.saltRounds = configuredRounds;
    }

    this.logger.log(`Initialized with ${this.saltRounds} salt rounds`);
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new InternalServerErrorException('Error hashing password');
    }
  }

  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new InternalServerErrorException('Error comparing passwords');
    }
  }
}
