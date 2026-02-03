// =============================================================================
// Generation API Routes - Extended with Credits & Refinement
// =============================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import * as db from '../db/queries';
import { aiLogger as logger } from '../utils/logger';
import { GenerationPipeline, RefinementPipeline } from '../services/ai/pipeline';
import { creditsMiddleware, deductCredits, estimateCredits } from '../middleware/credits';

const app = new Hono();

// =============================================================================
// SCHEMAS
// =============================================================================

const generateSchema = z.object({
  prompt: z.string().min(1).max(10000),
  options: z.object({
    template: z.string().optional(),
    model: z.string().optional(),
    framework: z.enum(['react', 'vue', 'svelte', 'node', 'django', 'react-native', 'flutter']).optional(),
    maxValidationRetries: z.number().min(0).max(5).optional(),
  }).optional(),
});

const refineSchema = z.object({
  prompt: z.string().min(1).max(10000),
  previousContext: z.string().optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

// Estimate credits for a generation
app.post('/:workspaceId/estimate', async (c) => {
  const body = await c.req.json();
  const parsed = generateSchema.safeParse(body);
  
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const estimate = estimateCredits(parsed.data.prompt);
  
  return c.json({
    estimatedTokens: estimate.estimatedTokens,
    estimatedCredits: estimate.estimatedCredits,
    complexity: estimate.complexity,
  });
});

// Start generation (with credits check)
app.post('/:workspaceId', creditsMiddleware, async (c) => {
  const userId = c.get('userId');
  const workspaceId = c.req.param('workspaceId');
  const body = await c.req.json();

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { prompt, options } = parsed.data;

  try {
    // Verify workspace ownership
    const workspace = await db.getWorkspace(workspaceId, userId);
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    // Check if already generating
    if (workspace.status === 'generating') {
      return c.json({ error: 'Generation already in progress' }, 409);
    }

    // Create session
    const session = await db.createSession(workspaceId, userId, prompt);
    logger.info({ sessionId: session.id, workspaceId, prompt: prompt.slice(0, 100) }, 'Generation started');

    // Update workspace status
    await db.updateWorkspaceStatus(workspaceId, 'generating');

    // Run generation pipeline (async - updates DB via Realtime)
    const pipeline = new GenerationPipeline({
      workspaceId,
      userId,
      sessionId: session.id,
      prompt,
      options,
    });

    // Start pipeline in background (don't await)
    pipeline.run()
      .then(async (result) => {
        // Deduct credits after completion
        if (result.totalTokens > 0) {
          try {
            await deductCredits(userId, result.totalTokens);
          } catch (error) {
            logger.error({ error, userId, sessionId: session.id }, 'Failed to deduct credits');
          }
        }
      })
      .catch((error) => {
        logger.error({ error, sessionId: session.id }, 'Pipeline failed');
      });

    return c.json({
      success: true,
      sessionId: session.id,
      message: 'Generation started. Subscribe to Realtime for updates.',
    });

  } catch (error) {
    logger.error({ error, workspaceId }, 'Failed to start generation');
    return c.json({ error: 'Failed to start generation' }, 500);
  }
});

// Refine existing generation
app.post('/:workspaceId/refine', creditsMiddleware, async (c) => {
  const userId = c.get('userId');
  const workspaceId = c.req.param('workspaceId');
  const body = await c.req.json();

  const parsed = refineSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { prompt, previousContext } = parsed.data;

  try {
    const workspace = await db.getWorkspace(workspaceId, userId);
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    if (workspace.status === 'generating') {
      return c.json({ error: 'Generation already in progress' }, 409);
    }

    const session = await db.createSession(workspaceId, userId, prompt);
    await db.updateWorkspaceStatus(workspaceId, 'generating');

    const pipeline = new RefinementPipeline();

    pipeline.refine(session.id, workspaceId, userId, prompt, previousContext || '')
      .then(async (result) => {
        if (result.totalTokens > 0) {
          try {
            await deductCredits(userId, result.totalTokens);
          } catch (error) {
            logger.error({ error, userId }, 'Failed to deduct credits');
          }
        }
      })
      .catch((error) => {
        logger.error({ error, sessionId: session.id }, 'Refinement failed');
      });

    return c.json({
      success: true,
      sessionId: session.id,
      message: 'Refinement started. Subscribe to Realtime for updates.',
    });

  } catch (error) {
    logger.error({ error, workspaceId }, 'Failed to start refinement');
    return c.json({ error: 'Failed to start refinement' }, 500);
  }
});

// Get session status
app.get('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  try {
    const { data, error } = await db.supabase
      .from('generation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    if (!data) {
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json({ session: data });
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get session');
    return c.json({ error: 'Failed to get session' }, 500);
  }
});

// Cancel generation
app.post('/session/:sessionId/cancel', async (c) => {
  const sessionId = c.req.param('sessionId');

  try {
    await db.updateSession(sessionId, {
      status: 'failed',
      error_message: 'Cancelled by user',
      completed_at: new Date().toISOString(),
    });

    return c.json({ success: true, message: 'Generation cancelled' });
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to cancel generation');
    return c.json({ error: 'Failed to cancel generation' }, 500);
  }
});

export { app as generateRoutes };
