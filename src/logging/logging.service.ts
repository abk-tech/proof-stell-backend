/* eslint-disable prettier/prettier */
import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ClsService } from 'nestjs-cls';

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  module?: string;
  action?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  body?: unknown;
  metadata?: Record<string, any>;
}

@Injectable()
export class LoggingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly cls: ClsService,
  ) {}

  private getContext(context?: LogContext): LogContext {
    const requestId = this.cls.get('requestId') || context?.requestId;
    const user = this.cls.get('user');
    const sessionId = this.cls.get('sessionId') || context?.sessionId;
    const route = this.cls.get('route') || context?.route;

    return {
      requestId,
      userId: user?.id || context?.userId,
      sessionId,
      route,
      ...context,
    };
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.getContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      ...this.getContext(context),
      error: error?.message,
      stack: error?.stack,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.getContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.getContext(context));
  }

  // Specialized logging methods for common use cases
  logUserAction(userId: string, action: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, {
      userId,
      action,
      module: 'user-actions',
      metadata,
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, {
      module: 'security',
      action: event,
      metadata: { severity, ...metadata },
    });
  }

  logDatabaseOperation(operation: string, table: string, duration?: number, error?: Error): void {
    if (error) {
      this.error(`Database operation failed: ${operation} on ${table}`, error, {
        module: 'database',
        action: operation,
        metadata: { table, duration },
      });
    } else {
      this.debug(`Database operation: ${operation} on ${table}`, {
        module: 'database',
        action: operation,
        metadata: { table, duration },
      });
    }
  }

  logBusinessEvent(event: string, metadata?: Record<string, any>): void {
    this.info(`Business event: ${event}`, {
      module: 'business',
      action: event,
      metadata,
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string, metadata?: Record<string, any>): void {
    this.info(`Performance metric: ${metric}`, {
      module: 'performance',
      action: 'metric',
      metadata: { metric, value, unit, ...metadata },
    });
  }
}
