export interface ErrorResponsePayload {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
  timestamp: string;
}

export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: unknown;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_SERVER_ERROR';
    this.details = options.details;
    this.cause = options.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toResponse(correlationId?: string): ErrorResponsePayload {
    return {
      statusCode: this.statusCode,
      error: this.getHttpErrorName(this.statusCode),
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
      ...(correlationId ? { correlationId } : {}),
      timestamp: new Date().toISOString()
    };
  }

  private getHttpErrorName(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 422: return 'Unprocessable Entity';
      case 500: return 'Internal Server Error';
      default: return 'Error';
    }
  }
}

export class BadRequestError extends ApplicationError {
  constructor(message: string, code = 'BAD_REQUEST', details?: unknown, cause?: Error) {
    super(message, { statusCode: 400, code, details, cause });
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string, code = 'UNAUTHORIZED', details?: unknown, cause?: Error) {
    super(message, { statusCode: 401, code, details, cause });
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string, code = 'FORBIDDEN', details?: unknown, cause?: Error) {
    super(message, { statusCode: 403, code, details, cause });
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, code = 'NOT_FOUND', details?: unknown, cause?: Error) {
    super(message, { statusCode: 404, code, details, cause });
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, code = 'CONFLICT', details?: unknown, cause?: Error) {
    super(message, { statusCode: 409, code, details, cause });
  }
}

export class InternalServerError extends ApplicationError {
  constructor(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', details?: unknown, cause?: Error) {
    super(message, { statusCode: 500, code, details, cause });
  }
}
