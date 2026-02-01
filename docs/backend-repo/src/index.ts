// =============================================================================
// BUILDABLE BACKEND - Entry Point
// =============================================================================
// The AI Brain and Filesystem Authority for Buildable.
// This server handles all AI orchestration, file management, and preview control.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { bearerAuth } from 'hono/bearer-auth';
import { env } from './config/env';
import { logger } from './utils/logger';

// Routes
import { workspaceRoutes } from './api/workspace';
import { generateRoutes } from './api/generate';
import { previewRoutes } from './api/preview';

// Services
import { initializeQueue } from './queue/worker';
import { PreviewManager } from './services/preview/manager';

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

// JWT verification middleware
api.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.slice(7);
  
  // Verify JWT with Supabase
  const { data, error } = await c.get('supabase').auth.getUser(token);
  if (error || !data.user) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  // Attach user to context
  c.set('user', data.user);
  c.set('userId', data.user.id);
  
  await next();
});

// Mount routes
api.route('/workspace', workspaceRoutes);
api.route('/generate', generateRoutes);
api.route('/preview', previewRoutes);

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
  await initializeQueue();
  logger.info('Job queue initialized');
  
  // Initialize preview manager
  await PreviewManager.initialize();
  logger.info('Preview manager initialized');
  
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
