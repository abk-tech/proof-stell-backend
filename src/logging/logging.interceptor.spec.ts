import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggingService } from './logging.service';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLoggingService: any;

  beforeEach(async () => {
    mockLoggingService = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log HTTP requests with correlation context', (done) => {
    const mockRequest = {
      method: 'GET',
      url: '/test',
      route: { path: '/test' },
      body: { test: 'data' },
      user: { id: 'user123' },
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };

    const mockResponse = {
      statusCode: 200,
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(mockLoggingService.info).toHaveBeenCalledWith('HTTP Request', {
          method: 'GET',
          route: '/test',
          statusCode: 200,
          duration: expect.any(Number),
          userId: 'user123',
          ip: '127.0.0.1',
          userAgent: 'jest',
          body: { test: 'data' },
        });
        done();
      });
  });

  it('should handle anonymous users', (done) => {
    const mockRequest = {
      method: 'POST',
      url: '/api/test',
      body: {},
      user: null,
      headers: {},
      ip: '127.0.0.1',
    };

    const mockResponse = {
      statusCode: 201,
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(mockLoggingService.info).toHaveBeenCalledWith('HTTP Request', {
          method: 'POST',
          route: '/api/test',
          statusCode: 201,
          duration: expect.any(Number),
          userId: 'anonymous',
          ip: '127.0.0.1',
          userAgent: undefined,
          body: {},
        });
        done();
      });
  });

  it('should redact sensitive auth request bodies', (done) => {
    const mockRequest = {
      method: 'POST',
      url: '/auth/login',
      body: { email: 'test@example.com', password: 'secret' },
      user: null,
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
    };

    const mockResponse = {
      statusCode: 401,
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(mockLoggingService.info).toHaveBeenCalledWith(
          'HTTP Request',
          expect.objectContaining({
            ip: '203.0.113.10',
            body: '[REDACTED]',
          }),
        );
        done();
      });
  });

  it('should log with correlation ID context from LoggingService', (done) => {
    const mockRequest = {
      method: 'GET',
      url: '/api/v1/users',
      route: { path: '/api/v1/users' },
      body: {},
      user: { id: 'corr-user-456' },
      headers: {},
      ip: '10.0.0.1',
    };

    const mockResponse = {
      statusCode: 200,
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('test response'),
    } as CallHandler;

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .subscribe(() => {
        const callArgs = mockLoggingService.info.mock.calls[0];
        expect(callArgs[0]).toBe('HTTP Request');
        expect(callArgs[1]).toEqual(
          expect.objectContaining({
            method: 'GET',
            route: '/api/v1/users',
            userId: 'corr-user-456',
          }),
        );
        expect(callArgs[1].duration).toBeGreaterThanOrEqual(0);
        done();
      });
  });
});
