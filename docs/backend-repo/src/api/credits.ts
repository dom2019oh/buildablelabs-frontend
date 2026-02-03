// =============================================================================
// Credits API Routes
// =============================================================================

import { Hono } from 'hono';
import { supabase } from '../db/queries';
import { logger } from '../utils/logger';

const app = new Hono();

// =============================================================================
// GET USER CREDITS
// =============================================================================

app.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Create default credits for new user
      const { data: newCredits, error: createError } = await supabase
        .from('user_credits')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) throw createError;

      return c.json({
        totalCredits: 0,
        monthlyCredits: newCredits.monthly_credits || 0,
        bonusCredits: newCredits.bonus_credits || 0,
        rolloverCredits: newCredits.rollover_credits || 0,
        topupCredits: newCredits.topup_credits || 0,
        lastDailyBonusAt: newCredits.last_daily_bonus_at,
      });
    }

    const totalCredits = 
      (data.monthly_credits || 0) +
      (data.bonus_credits || 0) +
      (data.rollover_credits || 0) +
      (data.topup_credits || 0);

    return c.json({
      totalCredits,
      monthlyCredits: data.monthly_credits || 0,
      bonusCredits: data.bonus_credits || 0,
      rolloverCredits: data.rollover_credits || 0,
      topupCredits: data.topup_credits || 0,
      lastDailyBonusAt: data.last_daily_bonus_at,
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get credits');
    return c.json({ error: 'Failed to get credits' }, 500);
  }
});

// =============================================================================
// CLAIM DAILY BONUS
// =============================================================================

app.post('/claim-daily', async (c) => {
  const userId = c.get('userId');

  try {
    const { data, error } = await supabase.rpc('claim_daily_bonus', {
      p_user_id: userId,
    });

    if (error) throw error;

    const result = data?.[0];
    if (result?.success) {
      logger.info({ userId, credits: result.credits_added }, 'Daily bonus claimed');
      return c.json({
        success: true,
        message: result.message,
        creditsAdded: result.credits_added,
      });
    } else {
      return c.json({
        success: false,
        message: result?.message || 'Daily bonus not available',
        creditsAdded: 0,
      });
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to claim daily bonus');
    return c.json({ error: 'Failed to claim daily bonus' }, 500);
  }
});

// =============================================================================
// GET CREDIT HISTORY
// =============================================================================

app.get('/history', async (c) => {
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return c.json({ transactions: data || [] });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get credit history');
    return c.json({ error: 'Failed to get credit history' }, 500);
  }
});

// =============================================================================
// CHECK USER HAS CREDITS
// =============================================================================

app.post('/check', async (c) => {
  const userId = c.get('userId');
  const { amount = 1 } = await c.req.json();

  try {
    const { data, error } = await supabase.rpc('user_has_credits', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) throw error;

    return c.json({ hasCredits: data === true });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to check credits');
    return c.json({ error: 'Failed to check credits' }, 500);
  }
});

// =============================================================================
// DEDUCT CREDITS (internal use)
// =============================================================================

app.post('/deduct', async (c) => {
  const userId = c.get('userId');
  const { actionType, description, metadata } = await c.req.json();

  if (!actionType) {
    return c.json({ error: 'actionType is required' }, 400);
  }

  try {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_action_type: actionType,
      p_description: description || null,
      p_metadata: metadata || {},
    });

    if (error) throw error;

    const result = data?.[0];
    return c.json({
      success: result?.success || false,
      message: result?.message || 'Unknown error',
      remainingCredits: result?.remaining_credits || 0,
    });
  } catch (error) {
    logger.error({ error, userId, actionType }, 'Failed to deduct credits');
    return c.json({ error: 'Failed to deduct credits' }, 500);
  }
});

export { app as creditsRoutes };
