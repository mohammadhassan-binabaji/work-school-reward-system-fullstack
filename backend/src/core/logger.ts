import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.LOG_LEVEL,
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
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
});
