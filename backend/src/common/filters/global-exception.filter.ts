import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithCorrelation } from '../middleware/correlation.middleware';

export interface ErrorResponseBody {
  statusCode: number;
  errorCode: string;
  message: string;
  correlationId: string;
  timestamp: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelation>();
    const correlationId =
      request.correlationId || (response.getHeader('X-Correlation-Id') as string) || '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = Array.isArray(resObj.message)
          ? resObj.message.join(', ')
          : resObj.message || exception.message;
        errorCode = resObj.errorCode || this.mapStatusToErrorCode(status);
        details = resObj.details || resObj.errors || (Array.isArray(resObj.message) ? resObj.message : undefined);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = exception.message || 'Internal Server Error';
      // Prisma error mapping
      if ((exception as any).code === 'P2002') {
        status = HttpStatus.CONFLICT;
        errorCode = 'UNIQUE_CONSTRAINT_VIOLATION';
        message = 'A record with this identifier or unique field already exists';
      } else if ((exception as any).code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        errorCode = 'RESOURCE_NOT_FOUND';
        message = 'The requested record was not found';
      }
    }

    const customErrors =
      exception instanceof HttpException &&
      typeof exception.getResponse() === 'object' &&
      (exception.getResponse() as any)?.errors;

    const errorResponse: ErrorResponseBody & { errors?: any } = {
      statusCode: status,
      errorCode,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(details !== undefined ? { details } : {}),
      ...(customErrors ? { errors: customErrors } : {}),
    };

    response.status(status).json(errorResponse);
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
