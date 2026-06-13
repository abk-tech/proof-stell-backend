import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { MetricsService } from './services/metrics.service';

describe('AdminService', () => {
  let service: AdminService;
  let metricsService: MetricsService;

  const mockMetricsService = {
    getUsersForExport: jest.fn(),
    getGamesForExport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToCsv', () => {
    it('should export users as CSV', async () => {
      const users = [
        {
          id: 'user-1',
          email: 'user@example.com',
          role: 'player',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          lastActiveAt: new Date('2026-06-02T00:00:00.000Z'),
        },
      ];
      mockMetricsService.getUsersForExport.mockResolvedValue(users);

      const result = await service.exportToCsv(' users ', 7);

      expect(metricsService.getUsersForExport).toHaveBeenCalledWith(7);
      expect(result).toEqual({
        filename: 'users_export_2026-06-13.csv',
        data: [
          'id,email,role,createdAt,lastActiveAt',
          'user-1,user@example.com,player,2026-06-01T00:00:00.000Z,2026-06-02T00:00:00.000Z',
        ].join('\n'),
        mimeType: 'text/csv',
        rowCount: 1,
      });
    });

    it('should export games as CSV', async () => {
      const games = [
        {
          id: 'game-1',
          userId: 'user-1',
          score: 100,
          status: 'completed',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
        },
      ];
      mockMetricsService.getGamesForExport.mockResolvedValue(games);

      const result = await service.exportToCsv('games', 7);

      expect(metricsService.getGamesForExport).toHaveBeenCalledWith(7);
      expect(result).toEqual({
        filename: 'games_export_2026-06-13.csv',
        data: [
          'id,userId,score,status,createdAt',
          'game-1,user-1,100,completed,2026-06-01T00:00:00.000Z',
        ].join('\n'),
        mimeType: 'text/csv',
        rowCount: 1,
      });
    });

    it('should reject unsupported export types', async () => {
      await expect(service.exportToCsv('payments', 7)).rejects.toThrow(
        'Export type payments not supported',
      );
    });

    it('should reject invalid export day ranges', async () => {
      await expect(service.exportToCsv('users', 0)).rejects.toThrow(
        'Export days must be between 1 and 365',
      );
    });
  });
});
