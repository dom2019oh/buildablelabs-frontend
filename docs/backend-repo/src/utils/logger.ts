// =============================================================================
// Structured Logger
// =============================================================================

import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: env.NODE_ENV,
    version: env.VERSION,
  },
});

// Child loggers for different modules
export const aiLogger = logger.child({ module: 'ai' });
export const workspaceLogger = logger.child({ module: 'workspace' });
export const previewLogger = logger.child({ module: 'preview' });
export const queueLogger = logger.child({ module: 'queue' });
