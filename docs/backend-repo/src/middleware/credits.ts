// =============================================================================
// Credits Middleware - Usage Tracking & Deduction
// =============================================================================
// Handles credit estimation, deduction, and rate limiting.

import { Context, Next } from 'hono';
import * as db from '../db/queries';
import { aiLogger as logger } from '../utils/logger';
import { env } from '../config/env';

// =============================================================================
// TYPES
// =============================================================================

export interface CreditEstimate {
  estimatedTokens: number;
  estimatedCredits: number;
  complexity: 'low' | 'medium' | 'high';
}

export interface CreditDeduction {
  tokensUsed: number;
  creditsDeducted: number;
  remainingCredits: number;
}

// =============================================================================
// CREDIT ESTIMATION
// =============================================================================

/**
 * Estimate credits for a generation request
 */
export function estimateCredits(prompt: string, filesCount: number = 0): CreditEstimate {
  // Base tokens estimation
  const promptTokens = Math.ceil(prompt.length / 4);
  const outputTokensPerFile = 1500; // Average file generation
  const contextTokens = filesCount * 500; // Existing file context

  // Estimate total tokens
  const estimatedTokens = promptTokens + contextTokens + (filesCount || 5) * outputTokensPerFile;

  // Determine complexity
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  if (estimatedTokens < 5000) complexity = 'low';
  else if (estimatedTokens > 20000) complexity = 'high';

  // Complexity multipliers
  const multipliers = { low: 1, medium: 1.5, high: 2 };

  // Calculate credits (tokens * cost multiplier * complexity)
  const estimatedCredits = Math.ceil(
    estimatedTokens * env.CREDITS_COST_MULTIPLIER * multipliers[complexity]
  );

  return {
    estimatedTokens,
    estimatedCredits,
    complexity,
  };
}

/**
 * Calculate actual credits from token usage
 */
export function calculateCredits(
  inputTokens: number,
  outputTokens: number,
  complexity: 'low' | 'medium' | 'high' = 'medium'
): number {
  const totalTokens = inputTokens + outputTokens;
  const multipliers = { low: 1, medium: 1.5, high: 2 };
  
  return Math.ceil(totalTokens * env.CREDITS_COST_MULTIPLIER * multipliers[complexity]);
}

// =============================================================================
// CREDIT MIDDLEWARE
// =============================================================================

/**
 * Middleware to check and deduct credits before generation
 */
export async function creditsMiddleware(c: Context, next: Next) {
  const userId = c.get('userId');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get user credits
    const credits = await db.getUserCredits(userId);
    
    if (!credits) {
      // Initialize credits for new user
      await db.initializeUserCredits(userId);
      await next();
      return;
    }

    // Get request body for estimation
    const body = await c.req.json().catch(() => ({}));
    const prompt = body.prompt || '';
    
    // Estimate credits needed
    const estimate = estimateCredits(prompt);
    
    // Check if user has enough credits
    const totalCredits = 
      credits.balance + 
      (credits.daily_free_remaining || 0) +
      (credits.bonus_credits || 0);

    if (totalCredits < estimate.estimatedCredits) {
      logger.warn(
        { userId, required: estimate.estimatedCredits, available: totalCredits },
        'Insufficient credits'
      );
      
      return c.json({
        error: 'Insufficient credits',
        required: estimate.estimatedCredits,
        available: totalCredits,
        message: 'Please add more credits to continue',
      }, 402);
    }

    // Store estimate for later deduction
    c.set('creditEstimate', estimate);
    
    await next();
    
  } catch (error) {
    logger.error({ error, userId }, 'Credits middleware error');
    return c.json({ error: 'Failed to check credits' }, 500);
  }
}

/**
 * Deduct credits after successful generation
 */
export async function deductCredits(
  userId: string,
  tokensUsed: number,
  complexity: 'low' | 'medium' | 'high' = 'medium'
): Promise<CreditDeduction> {
  const creditsToDeduct = calculateCredits(tokensUsed, 0, complexity);
  
  const result = await db.deductUserCredits(userId, creditsToDeduct, {
    tokensUsed,
    complexity,
    timestamp: new Date().toISOString(),
  });

  logger.info(
    { userId, tokensUsed, creditsDeducted: creditsToDeduct, remaining: result.remainingCredits },
    'Credits deducted'
  );

  return {
    tokensUsed,
    creditsDeducted: creditsToDeduct,
    remainingCredits: result.remainingCredits,
  };
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const rateLimitWindow = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 30;

const requestCounts = new Map<string, { count: number; windowStart: number }>();

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  const userId = c.get('userId') || c.req.header('x-forwarded-for') || 'anonymous';
  const now = Date.now();

  const userLimit = requestCounts.get(userId);

  if (!userLimit || now - userLimit.windowStart > rateLimitWindow) {
    // New window
    requestCounts.set(userId, { count: 1, windowStart: now });
  } else if (userLimit.count >= maxRequestsPerWindow) {
    // Rate limited
    const resetIn = Math.ceil((userLimit.windowStart + rateLimitWindow - now) / 1000);
    
    logger.warn({ userId, count: userLimit.count }, 'Rate limit exceeded');
    
    return c.json({
      error: 'Rate limit exceeded',
      retryAfter: resetIn,
      message: `Too many requests. Please wait ${resetIn} seconds.`,
    }, 429);
  } else {
    // Increment count
    userLimit.count++;
  }

  await next();
}

// =============================================================================
// DAILY RESET JOB
// =============================================================================

/**
 * Reset daily free credits for all users (run via cron/scheduler)
 */
export async function resetDailyCredits(): Promise<{ usersReset: number }> {
  logger.info('Starting daily credits reset');
  
  const result = await db.resetAllDailyCredits(env.DAILY_FREE_CREDITS);
  
  logger.info({ usersReset: result.count }, 'Daily credits reset complete');
  
  return { usersReset: result.count };
}
