import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type HealthCheckResult,
  HealthCheckService,
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly dbIndicator: TypeOrmHealthIndicator,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.dbIndicator.pingCheck('postgresql'),
      () => this.checkRedis(),
      () => this.checkMail(),
      () => this.checkBlockchain(),
    ]);
  }

  async assertStartupDependencies(): Promise<void> {
    const failedChecks: string[] = [];
    const checks = [
      ['postgresql', () => this.dbIndicator.pingCheck('postgresql')],
      ['redis', () => this.checkRedis()],
      ['mail', () => this.checkMail()],
      ['blockchain', () => this.checkBlockchain()],
    ] as const;

    for (const [name, check] of checks) {
      try {
        await check();
      } catch {
        failedChecks.push(name);
      }
    }

    if (failedChecks.length > 0) {
      throw new Error(
        `Startup dependency check failed for: ${failedChecks.join(', ')}`,
      );
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      await this.cacheService.ping();
      return this.getStatus('redis', true, {
        host: this.configService.get<string>('app.redisHost', 'localhost'),
        port: this.configService.get<number>('app.redisPort', 6379),
      });
    } catch {
      throw new HealthCheckError(
        'Redis dependency unavailable',
        this.getStatus('redis', false, {
          host: this.configService.get<string>('app.redisHost', 'localhost'),
          port: this.configService.get<number>('app.redisPort', 6379),
        }),
      );
    }
  }

  private async checkMail(): Promise<HealthIndicatorResult> {
    try {
      await this.mailService.checkHealth();
      return this.getStatus('mail', true, {
        host: this.configService.get<string>('app.mailHost'),
        port: this.configService.get<number>('app.mailPort', 587),
      });
    } catch {
      throw new HealthCheckError(
        'Mail dependency unavailable',
        this.getStatus('mail', false, {
          host: this.configService.get<string>('app.mailHost'),
          port: this.configService.get<number>('app.mailPort', 587),
        }),
      );
    }
  }

  private async checkBlockchain(): Promise<HealthIndicatorResult> {
    try {
      await this.blockchainService.checkHealth();
      return this.getStatus('blockchain', true, {
        provider: 'starknet',
      });
    } catch {
      throw new HealthCheckError(
        'Blockchain dependency unavailable',
        this.getStatus('blockchain', false, {
          provider: 'starknet',
        }),
      );
    }
  }
}
