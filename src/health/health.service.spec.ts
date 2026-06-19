import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { HealthService } from './health.service';

const mockHealthCheckService = {
  check: jest.fn(async (checks: Array<() => Promise<unknown>>) =>
    Promise.all(checks.map((check) => check())),
  ),
};

const mockDbIndicator = {
  pingCheck: jest.fn(async () => ({ postgresql: { status: 'up' } })),
};

const mockCacheService = {
  ping: jest.fn(),
};

const mockMailService = {
  checkHealth: jest.fn(),
};

const mockBlockchainService = {
  checkHealth: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: unknown) => {
    const values: Record<string, unknown> = {
      'app.redisHost': 'localhost',
      'app.redisPort': 6379,
      'app.mailHost': 'smtp.example.com',
      'app.mailPort': 587,
    };

    return values[key] ?? defaultValue;
  }),
};

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockDbIndicator,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report liveness', () => {
    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('should pass startup dependency checks when all dependencies are healthy', async () => {
    mockCacheService.ping.mockResolvedValue(undefined);
    mockMailService.checkHealth.mockResolvedValue(undefined);
    mockBlockchainService.checkHealth.mockResolvedValue(undefined);

    await expect(service.assertStartupDependencies()).resolves.toBeUndefined();
  });

  it('should fail startup dependency checks when a dependency is unavailable', async () => {
    mockCacheService.ping.mockRejectedValue(new Error('redis down'));
    mockMailService.checkHealth.mockResolvedValue(undefined);
    mockBlockchainService.checkHealth.mockResolvedValue(undefined);

    await expect(service.assertStartupDependencies()).rejects.toThrow(
      'Startup dependency check failed for: redis',
    );
  });
});
