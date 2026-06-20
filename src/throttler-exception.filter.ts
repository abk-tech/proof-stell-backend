import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { LoggingService } from './logging/logging.service';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    this.loggingService.warn('Rate limit exceeded', {
      method: request.method,
      route: request.route?.path || request.url,
      ip: request.ip,
      metadata: {
        userAgent: request.headers?.['user-agent'],
      },
    });

    response.status(429).json({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    });
  }
}
