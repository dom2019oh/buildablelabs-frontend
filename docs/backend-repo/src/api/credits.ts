// =============================================================================
// User Credits API Routes
// =============================================================================

import { Hono } from 'hono';
import * as db from '../db/queries';
import { aiLogger as logger } from '../utils/logger';

const app = new Hono();

// =============================================================================
// GET /user/credits - Get current user's credit balance
// =============================================================================

app.get('/', async (c) => {
  const userId = c.get('userId');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const credits = await db.getUserCreditsForAPI(userId);
    
    return c.json({
      success: true,
      credits,
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user credits');
    return c.json({ error: 'Failed to get credits' }, 500);
  }
});

// =============================================================================
// POST /user/credits/claim-daily - Claim daily free credits
// =============================================================================

app.post('/claim-daily', async (c) => {
  const userId = c.get('userId');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const credits = await db.getUserCredits(userId);
    
    if (!credits) {
      await db.initializeUserCredits(userId);
      return c.json({
        success: true,
        message: 'Credits initialized with daily bonus',
        creditsAdded: 5,
      });
    }

    // Check if already claimed today
    const lastReset = new Date(credits.last_daily_reset);
    const today = new Date();
    
    if (lastReset.toDateString() === today.toDateString()) {
      return c.json({
        success: false,
        message: 'Daily bonus already claimed today',
        nextClaimAt: new Date(today.setDate(today.getDate() + 1)).toISOString(),
      });
    }

    // Add daily credits
    const result = await db.addUserCredits(userId, 5, 'bonus', {
      type: 'daily_claim',
      timestamp: today.toISOString(),
    });

    return c.json({
      success: true,
      message: 'Daily bonus claimed!',
      creditsAdded: 5,
      newBalance: result.newBalance,
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to claim daily credits');
    return c.json({ error: 'Failed to claim daily credits' }, 500);
  }
});

// =============================================================================
// GET /user/credits/history - Get credit transaction history
// =============================================================================

app.get('/history', async (c) => {
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '50');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { data, error } = await db.supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return c.json({
      success: true,
      transactions: data,
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get credit history');
    return c.json({ error: 'Failed to get credit history' }, 500);
  }
});

export { app as creditsRoutes };
