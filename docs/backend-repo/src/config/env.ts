// =============================================================================
// Environment Configuration - Buildable AI
// =============================================================================
// Loads and validates all environment variables including AI provider keys.

import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  VERSION: z.string().default('1.0.0'),
  CORS_ORIGINS: z.string().transform((s) => s.split(',')).default('*'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // ==========================================================================
  // AI Providers - Buildable AI Multi-Model System
  // ==========================================================================
  
  // Grok (xAI) - Primary for coding with 2M context
  GROK_API_KEY: z.string().optional(),
  
  // OpenAI - Advanced reasoning & fallbacks
  OPENAI_API_KEY: z.string().optional(),
  
  // Gemini (Google) - Planning & multimodal
  GEMINI_API_KEY: z.string().optional(),

  // Default AI settings (overridden by task-based routing)
  DEFAULT_AI_PROVIDER: z.enum(['grok', 'openai', 'gemini']).default('grok'),
  DEFAULT_ARCHITECT_MODEL: z.string().default('gemini-2.5-pro'),
  DEFAULT_CODER_MODEL: z.string().default('grok-code-fast-1'),
  DEFAULT_VALIDATOR_MODEL: z.string().default('grok-4.1-fast'),

  // ==========================================================================
  // Preview Server
  // ==========================================================================
  PREVIEW_BASE_PORT: z.coerce.number().default(3100),
  PREVIEW_HOST: z.string().default('localhost'),
  PREVIEW_MAX_SERVERS: z.coerce.number().default(10),

  // ==========================================================================
  // Redis (for BullMQ queue)
  // ==========================================================================
  REDIS_URL: z.string().optional(),

  // ==========================================================================
  // Logging
  // ==========================================================================
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // ==========================================================================
  // Credits System
  // ==========================================================================
  CREDITS_COST_MULTIPLIER: z.coerce.number().default(0.001), // Cost per token
  DAILY_FREE_CREDITS: z.coerce.number().default(5),
  DEFAULT_USER_CREDITS: z.coerce.number().default(10),
});

// Parse and validate environment
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  const data = parsed.data;

  // Ensure at least one AI provider is configured
  if (!data.GROK_API_KEY && !data.OPENAI_API_KEY && !data.GEMINI_API_KEY) {
    console.error('❌ At least one AI provider API key is required');
    console.error('Set GROK_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY');
    process.exit(1);
  }

  // Log available providers
  const providers: string[] = [];
  if (data.GROK_API_KEY) providers.push('Grok (xAI)');
  if (data.OPENAI_API_KEY) providers.push('OpenAI');
  if (data.GEMINI_API_KEY) providers.push('Gemini');
  
  console.log(`✓ Buildable AI initialized with providers: ${providers.join(', ')}`);

  return data;
}

export const env = loadEnv();

export type Env = typeof env;

// =============================================================================
// ENVIRONMENT VARIABLE TEMPLATE
// =============================================================================
// Copy this to your .env file:
/*
# Server
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# AI Providers (at least one required)
GROK_API_KEY=your_grok_api_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Preview Server
PREVIEW_BASE_PORT=3100
PREVIEW_HOST=localhost
PREVIEW_MAX_SERVERS=10

# Credits
CREDITS_COST_MULTIPLIER=0.001
DAILY_FREE_CREDITS=5
DEFAULT_USER_CREDITS=10
*/
