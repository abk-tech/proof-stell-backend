import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const { statusCode } = res;
        const duration = Date.now() - now;

        const userId = user ? user.id : 'anonymous';
        const route = req.route?.path || url;

        this.loggingService.info('HTTP Request', {
          method,
          route,
          statusCode,
          duration,
          userId,
          ip: this.getClientIp(req),
          userAgent: req.headers?.['user-agent'],
          body: this.sanitizeRequestBody(req),
        });
      }),
    );
  }

  private sanitizeRequestBody(req): unknown {
    if (this.isSensitiveAuthRequest(req)) {
      return '[REDACTED]';
    }

    return this.sanitize(req.body);
  }

  private isSensitiveAuthRequest(req): boolean {
    const url = req.url || '';
    return (
      req.method === 'POST' &&
      ['/auth/login', '/auth/register', '/auth/resend-verification'].some(
        (path) => url.includes(path),
      )
    );
  }

  private sanitize(value: unknown): unknown {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    const sensitiveKeys = new Set([
      'authorization',
      'password',
      'newpassword',
      'oldpassword',
      'confirmpassword',
      'token',
      'accesstoken',
      'access_token',
      'refreshtoken',
      'refresh_token',
      'secret',
    ]);

    return Object.entries(value as Record<string, unknown>).reduce(
      (sanitized, [key, entry]) => {
        sanitized[key] = sensitiveKeys.has(key.toLowerCase())
          ? '[REDACTED]'
          : this.sanitize(entry);
        return sanitized;
      },
      {} as Record<string, unknown>,
    );
  }

  private getClientIp(req): string {
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor[0]) {
      return forwardedFor[0].split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
