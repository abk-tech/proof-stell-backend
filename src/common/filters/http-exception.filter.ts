/* eslint-disable prettier/prettier */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../../logging/logging.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const error = exception instanceof Error ? exception : undefined;

    this.loggingService.error(
      `HTTP Exception: ${request.method} ${request.url}`,
      error,
      {
        method: request.method,
        route: request.route?.path || request.url,
        statusCode: status,
        metadata: {
          exceptionMessage: typeof message === 'string' ? message : (message as Record<string, unknown>)?.message,
          body: request.body,
          headers: request.headers,
        },
      },
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
  