// =============================================================================
// BUILDABLE BACKEND - Entry Point
// =============================================================================
// The AI Brain and Filesystem Authority for Buildable.
// This server handles all AI orchestration, file management, and preview control.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { env } from './config/env';
import { logger } from './utils/logger';
import { supabase } from './db/client';

// Routes
import { workspaceRoutes } from './api/workspace';
import { generateRoutes } from './api/generate';
import { previewRoutes } from './api/preview';
import { creditsRoutes } from './api/credits';

// Services
import { initializeQueue } from './queue/worker';
import { PreviewManager } from './services/preview/manager';

// =============================================================================
// TYPES
// =============================================================================

// Extend Hono context with user data
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}

// =============================================================================
// APP SETUP
// =============================================================================

const app = new Hono();

// Global middleware
app.use('*', honoLogger());
app.use('*', cors({
  origin: env.CORS_ORIGINS,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check (unauthenticated)
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: env.VERSION,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

const api = new Hono();

// JWT verification middleware using Supabase
api.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing token' }, 401);
  }
  
  const token = authHeader.slice(7);
  
  try {
    // Verify JWT with Supabase using getClaims
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logger.warn({ error: claimsError }, 'JWT verification failed');
      return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || '';

    if (!userId) {
      return c.json({ error: 'Unauthorized: No user ID in token' }, 401);
    }
    
    // Attach user to context
    c.set('userId', userId);
    c.set('userEmail', userEmail);
    
    logger.debug({ userId }, 'User authenticated');
    
    await next();
  } catch (err) {
    logger.error({ err }, 'Auth middleware error');
    return c.json({ error: 'Unauthorized: Token verification failed' }, 401);
  }
});

// Mount routes
api.route('/workspace', workspaceRoutes);
api.route('/generate', generateRoutes);
api.route('/preview', previewRoutes);
api.route('/credits', creditsRoutes);

app.route('/api', api);

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.onError((err, c) => {
  logger.error({ err, path: c.req.path }, 'Unhandled error');
  return c.json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500);
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// =============================================================================
// STARTUP
// =============================================================================

async function start() {
  logger.info('Starting Buildable Backend...');
  
  // Initialize job queue
  try {
    await initializeQueue();
    logger.info('Job queue initialized');
  } catch (err) {
    logger.warn({ err }, 'Job queue initialization skipped (Redis may not be configured)');
  }
  
  // Initialize preview manager
  try {
    await PreviewManager.initialize();
    logger.info('Preview manager initialized');
  } catch (err) {
    logger.warn({ err }, 'Preview manager initialization skipped');
  }
  
  // Start server
  const port = env.PORT;
  logger.info({ port }, `Server listening on port ${port}`);
  
  return app;
}

// Export for Bun
export default {
  port: env.PORT,
  fetch: app.fetch,
};

// Start if running directly
if (import.meta.main) {
  start().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  });
}
