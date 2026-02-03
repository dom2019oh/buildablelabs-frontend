// =============================================================================
// Buildable AI - Model Definitions & Client Initialization
// =============================================================================
// Unified model registry for Grok, OpenAI, and Gemini providers.
// All API keys loaded from environment - never hardcoded.

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { aiLogger as logger } from '../../utils/logger';
import { env } from '../../config/env';

// =============================================================================
// MODEL DEFINITIONS
// =============================================================================

export enum AIProvider {
  GROK = 'grok',
  OPENAI = 'openai',
  GEMINI = 'gemini',
}

export enum TaskType {
  PLANNING = 'planning',
  CODING = 'coding',
  DEBUGGING = 'debugging',
  REASONING = 'reasoning',
  MULTIMODAL = 'multimodal',
  VALIDATION = 'validation',
  REFINEMENT = 'refinement',
}

// Grok models (xAI) - Primary for coding with 2M context
export const GrokModels = {
  GROK_4_1_FAST: 'grok-4.1-fast',        // Fast general purpose
  GROK_CODE_FAST_1: 'grok-code-fast-1',   // Optimized for code generation
  GROK_VISION: 'grok-vision-beta',        // Multimodal capability
} as const;

// OpenAI models - Advanced reasoning & fallbacks
export const OpenAIModels = {
  GPT_5: 'gpt-5',              // Most capable
  GPT_5_MINI: 'gpt-5-mini',    // Balanced performance/cost
  GPT_5_NANO: 'gpt-5-nano',    // Fast, cost-effective
  GPT_5_2: 'gpt-5.2',          // Latest with enhanced reasoning
} as const;

// Gemini models - Planning & multimodal
export const GeminiModels = {
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',           // Fast, balanced
  GEMINI_2_5_PRO: 'gemini-2.5-pro',               // High capability
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview', // Next-gen fast
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',     // Next-gen pro
} as const;

// Model routing configuration
export const ModelRouting: Record<TaskType, { provider: AIProvider; model: string; fallback?: { provider: AIProvider; model: string } }> = {
  [TaskType.PLANNING]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_2_5_PRO,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_5_MINI },
  },
  [TaskType.CODING]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_CODE_FAST_1,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_5 },
  },
  [TaskType.DEBUGGING]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_CODE_FAST_1,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_5_MINI },
  },
  [TaskType.REASONING]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_5_2,
    fallback: { provider: AIProvider.GEMINI, model: GeminiModels.GEMINI_2_5_PRO },
  },
  [TaskType.MULTIMODAL]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_3_PRO_PREVIEW,
    fallback: { provider: AIProvider.GROK, model: GrokModels.GROK_VISION },
  },
  [TaskType.VALIDATION]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_4_1_FAST,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_5_NANO },
  },
  [TaskType.REFINEMENT]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_5,
    fallback: { provider: AIProvider.GROK, model: GrokModels.GROK_CODE_FAST_1 },
  },
};

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

let grokClient: OpenAI | null = null;
let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

export function getGrokClient(): OpenAI {
  if (!grokClient) {
    if (!env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not configured');
    }
    grokClient = new OpenAI({
      apiKey: env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
    logger.info('Grok client initialized');
  }
  return grokClient;
}

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized');
  }
  return openaiClient;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    logger.info('Gemini client initialized');
  }
  return geminiClient;
}

// Check if a provider is available (has API key)
export function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case AIProvider.GROK:
      return !!env.GROK_API_KEY;
    case AIProvider.OPENAI:
      return !!env.OPENAI_API_KEY;
    case AIProvider.GEMINI:
      return !!env.GEMINI_API_KEY;
    default:
      return false;
  }
}

// Get available providers
export function getAvailableProviders(): AIProvider[] {
  return Object.values(AIProvider).filter(isProviderAvailable);
}

// =============================================================================
// COST ESTIMATION
// =============================================================================

// Cost per 1K tokens (approximate, varies by model)
export const TokenCosts: Record<AIProvider, { input: number; output: number }> = {
  [AIProvider.GROK]: { input: 0.001, output: 0.002 },      // Very competitive
  [AIProvider.OPENAI]: { input: 0.003, output: 0.006 },    // Standard
  [AIProvider.GEMINI]: { input: 0.0005, output: 0.001 },   // Cheapest
};

export function estimateCost(
  provider: AIProvider,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = TokenCosts[provider];
  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);
}

// =============================================================================
// MODEL INFO
// =============================================================================

export interface ModelInfo {
  provider: AIProvider;
  model: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
}

export const ModelRegistry: Record<string, ModelInfo> = {
  [GrokModels.GROK_4_1_FAST]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_4_1_FAST,
    contextWindow: 2_000_000, // 2M context
    supportsStreaming: true,
    supportsImages: false,
  },
  [GrokModels.GROK_CODE_FAST_1]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_CODE_FAST_1,
    contextWindow: 2_000_000,
    supportsStreaming: true,
    supportsImages: false,
  },
  [GrokModels.GROK_VISION]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_VISION,
    contextWindow: 128_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [OpenAIModels.GPT_5]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_5,
    contextWindow: 256_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [OpenAIModels.GPT_5_MINI]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_5_MINI,
    contextWindow: 128_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [OpenAIModels.GPT_5_NANO]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_5_NANO,
    contextWindow: 64_000,
    supportsStreaming: true,
    supportsImages: false,
  },
  [OpenAIModels.GPT_5_2]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_5_2,
    contextWindow: 256_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [GeminiModels.GEMINI_2_5_FLASH]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_2_5_FLASH,
    contextWindow: 1_000_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [GeminiModels.GEMINI_2_5_PRO]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_2_5_PRO,
    contextWindow: 2_000_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [GeminiModels.GEMINI_3_FLASH_PREVIEW]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_3_FLASH_PREVIEW,
    contextWindow: 1_000_000,
    supportsStreaming: true,
    supportsImages: true,
  },
  [GeminiModels.GEMINI_3_PRO_PREVIEW]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_3_PRO_PREVIEW,
    contextWindow: 2_000_000,
    supportsStreaming: true,
    supportsImages: true,
  },
};
