/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService, LogContext } from './logging.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ClsService } from 'nestjs-cls';

describe('LoggingService', () => {
  let loggingService: LoggingService;
  let mockLogger: any;
  let mockClsService: any;

  beforeEach(async () => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockClsStore: Record<string, unknown> = {};
    mockClsService = {
      get: jest.fn((key: string) => mockClsStore[key]),
      set: jest.fn((key: string, value: unknown) => {
        mockClsStore[key] = value;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    loggingService = module.get<LoggingService>(LoggingService);
  });

  it('should be defined', () => {
    expect(loggingService).toBeDefined();
  });

  describe('correlation ID propagation', () => {
    it('should include requestId from CLS context', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-correlation-123';
        if (key === 'user') return { id: 'user-abc' };
        if (key === 'sessionId') return 'session-xyz';
        if (key === 'route') return '/api/v1/test';
        return undefined;
      });

      loggingService.info('Test message');

      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {
        requestId: 'req-correlation-123',
        userId: 'user-abc',
        sessionId: 'session-xyz',
        route: '/api/v1/test',
      });
    });

    it('should include userId from CLS user object', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-456';
        if (key === 'user') return { id: 'user-789' };
        return undefined;
      });

      loggingService.info('User action');

      expect(mockLogger.info).toHaveBeenCalledWith('User action', {
        requestId: 'req-456',
        userId: 'user-789',
        sessionId: undefined,
        route: undefined,
      });
    });

    it('should fall back to explicit context when CLS values are missing', () => {
      mockClsService.get.mockReturnValue(undefined);

      const context: LogContext = {
        requestId: 'explicit-req-id',
        userId: 'explicit-user',
        sessionId: 'explicit-session',
        route: '/explicit/route',
        module: 'custom-module',
        action: 'custom-action',
      };

      loggingService.info('Explicit context', context);

      expect(mockLogger.info).toHaveBeenCalledWith('Explicit context', {
        requestId: 'explicit-req-id',
        userId: 'explicit-user',
        sessionId: 'explicit-session',
        route: '/explicit/route',
        module: 'custom-module',
        action: 'custom-action',
      });
    });

    it('should prefer explicit context over CLS values', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'cls-req-id';
        if (key === 'user') return { id: 'cls-user' };
        if (key === 'sessionId') return 'cls-session';
        if (key === 'route') return '/cls/route';
        return undefined;
      });

      const context: LogContext = {
        requestId: 'explicit-req-id',
        userId: 'explicit-user',
        sessionId: 'explicit-session',
        route: '/explicit/route',
      };

      loggingService.info('Override test', context);

      expect(mockLogger.info).toHaveBeenCalledWith('Override test', {
        requestId: 'explicit-req-id',
        userId: 'explicit-user',
        sessionId: 'explicit-session',
        route: '/explicit/route',
      });
    });

    it('should propagate correlation IDs through error logs', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-error-123';
        if (key === 'user') return { id: 'user-error-456' };
        return undefined;
      });

      const error = new Error('Test error');
      loggingService.error('Error occurred', error);

      expect(mockLogger.error).toHaveBeenCalledWith('Error occurred', {
        requestId: 'req-error-123',
        userId: 'user-error-456',
        sessionId: undefined,
        route: undefined,
        error: 'Test error',
        stack: expect.any(String),
      });
    });

    it('should handle null/undefined user gracefully', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-null-user';
        if (key === 'user') return null;
        return undefined;
      });

      loggingService.info('Null user test');

      expect(mockLogger.info).toHaveBeenCalledWith('Null user test', {
        requestId: 'req-null-user',
        userId: undefined,
        sessionId: undefined,
        route: undefined,
      });
    });
  });

  describe('specialized logging methods', () => {
    it('logUserAction should include correlation context', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-action-001';
        return undefined;
      });

      loggingService.logUserAction('user-1', 'login', { browser: 'Chrome' });

      expect(mockLogger.info).toHaveBeenCalledWith('User action: login', {
        requestId: 'req-action-001',
        userId: 'user-1',
        sessionId: undefined,
        route: undefined,
        action: 'login',
        module: 'user-actions',
        metadata: { browser: 'Chrome' },
      });
    });

    it('logSecurityEvent should include correlation context', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-sec-002';
        return undefined;
      });

      loggingService.logSecurityEvent('failed_login', 'high', { ip: '1.2.3.4' });

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event: failed_login', {
        requestId: 'req-sec-002',
        userId: undefined,
        sessionId: undefined,
        route: undefined,
        module: 'security',
        action: 'failed_login',
        metadata: { severity: 'high', ip: '1.2.3.4' },
      });
    });

    it('logDatabaseOperation should include correlation context', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-db-003';
        return undefined;
      });

      loggingService.logDatabaseOperation('INSERT', 'users', 42);

      expect(mockLogger.debug).toHaveBeenCalledWith('Database operation: INSERT on users', {
        requestId: 'req-db-003',
        userId: undefined,
        sessionId: undefined,
        route: undefined,
        module: 'database',
        action: 'INSERT',
        metadata: { table: 'users', duration: 42 },
      });
    });

    it('logDatabaseOperation should log errors with correlation context', () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'requestId') return 'req-db-err-004';
        return undefined;
      });

      const error = new Error('Connection refused');
      loggingService.logDatabaseOperation('SELECT', 'users', undefined, error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database operation failed: SELECT on users',
        {
          requestId: 'req-db-err-004',
          userId: undefined,
          sessionId: undefined,
          route: undefined,
          error: 'Connection refused',
          stack: expect.any(String),
          module: 'database',
          action: 'SELECT',
          metadata: { table: 'users', duration: undefined },
        },
      );
    });
  });
});
