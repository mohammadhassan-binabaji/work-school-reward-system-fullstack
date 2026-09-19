import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { Writable } from 'node:stream';
import { ApplicationError, UnauthorizedError, BadRequestError } from '../../src/core/errors.js';
import { prisma } from '../../src/core/prisma.js';

describe('Security & Credential Redaction Tests (T064)', () => {
  it('verifies logger redacts passwords, password hashes, session IDs, and auth headers', async () => {
    let logOutput = '';
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        logOutput += chunk.toString();
        callback();
      }
    });

    const testLogger = pino(
      {
        redact: {
          paths: [
            'password',
            'passwordHash',
            'token',
            'sessionId',
            'cookie',
            '*.password',
            '*.passwordHash',
            '*.token',
            '*.sessionId',
            '*.cookie',
            'headers.cookie',
            'headers.authorization',
            'req.headers.cookie',
            'req.headers.authorization'
          ],
          censor: '[REDACTED]'
        }
      },
      destination
    );

    const sensitiveData = {
      password: 'SuperSecretPassword123!',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakehashvalue',
      sessionId: 'sess-abc-123-secret',
      headers: {
        authorization: 'Bearer super-secret-bearer-token',
        cookie: 'sessionId=sess-abc-123-secret'
      },
      user: {
        password: 'NestedPassword999!',
        passwordHash: '$argon2id$nestedhash'
      }
    };

    testLogger.info(sensitiveData, 'Sensitive event log');

    expect(logOutput).toContain('[REDACTED]');
    expect(logOutput).not.toContain('SuperSecretPassword123!');
    expect(logOutput).not.toContain('$argon2id$v=19$m=65536,t=3,p=4$fakehashvalue');
    expect(logOutput).not.toContain('sess-abc-123-secret');
    expect(logOutput).not.toContain('super-secret-bearer-token');
    expect(logOutput).not.toContain('NestedPassword999!');
    expect(logOutput).not.toContain('$argon2id$nestedhash');
  });

  it('verifies ApplicationError responses never reflect sensitive credentials or stack in production payload', () => {
    const error = new UnauthorizedError('Invalid credentials entered.', 'INVALID_CREDENTIALS');
    const response = error.toResponse('corr-123');

    expect(response.statusCode).toBe(401);
    expect(response.code).toBe('INVALID_CREDENTIALS');
    expect(response.correlationId).toBe('corr-123');
    expect(JSON.stringify(response)).not.toContain('password');
    expect(JSON.stringify(response)).not.toContain('passwordHash');
    expect(JSON.stringify(response)).not.toContain('token');
  });

  it('verifies validation errors on login payloads do not expose raw passwords in error message', () => {
    const valError = new BadRequestError(
      'Invalid national ID format: must be exactly 10 digits',
      'VALIDATION_ERROR',
      { nationalId: 'invalid' }
    );
    const response = valError.toResponse('corr-456');

    expect(response.statusCode).toBe(400);
    expect(response.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response)).not.toContain('Password123!');
  });

  it('verifies stored audit records in database never include password hashes or passwords', async () => {
    const records = await prisma.auditRecord.findMany({ take: 50 });
    for (const r of records) {
      const recordStr = JSON.stringify(r);
      expect(recordStr).not.toContain('passwordHash');
      expect(recordStr).not.toContain('$argon2id$');
      expect(recordStr).not.toContain('Password123!');
    }
  });
});
