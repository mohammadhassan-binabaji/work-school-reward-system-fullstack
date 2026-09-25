import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithCorrelation } from '../middleware/correlation.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sanitize(item));

    const sensitiveKeys = [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'sessionId',
      'session_id',
      'secret',
      'sessionSecret',
      'minioSecretKey',
      'authorization',
      'cookie',
    ];

    const sanitized = { ...obj };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }
    return sanitized;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithCorrelation>();
    const res = http.getResponse();
    const { method, url, query, params, correlationId } = req;
    const body = this.sanitize(req.body);
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;
          const logPayload = {
            level: 'INFO',
            correlationId,
            method,
            url,
            statusCode,
            durationMs: duration,
            query,
            params,
            body,
            responsePreview: this.sanitize(data),
          };
          this.logger.log(JSON.stringify(logPayload));
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || error.statusCode || 500;
          const logPayload = {
            level: 'ERROR',
            correlationId,
            method,
            url,
            statusCode,
            durationMs: duration,
            query,
            params,
            body,
            error: {
              name: error.name,
              message: error.message,
              errorCode: error.response?.errorCode || error.code || 'INTERNAL_ERROR',
              stack: error.stack,
            },
          };
          this.logger.error(JSON.stringify(logPayload));
        },
      }),
    );
  }
}
