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
  REPAIR = 'repair',
}

// Grok models (xAI) - Primary for coding with massive context
export const GrokModels = {
  GROK_3_FAST: 'grok-3-fast',           // Fast general purpose - 131K context
  GROK_3: 'grok-3',                      // Full power Grok 3
  GROK_3_MINI: 'grok-3-mini',            // Lightweight, fast validation
  GROK_VISION: 'grok-vision-beta',       // Multimodal capability
} as const;

// OpenAI models - Advanced reasoning & fallbacks
export const OpenAIModels = {
  GPT_4O: 'gpt-4o',                      // Current flagship
  GPT_4O_MINI: 'gpt-4o-mini',            // Balanced performance/cost
  O1: 'o1',                              // Deep reasoning
  O1_MINI: 'o1-mini',                    // Fast reasoning
} as const;

// Gemini models - Planning & multimodal
export const GeminiModels = {
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',           // Fast, balanced
  GEMINI_2_5_PRO: 'gemini-2.5-pro',               // High capability, 1M context
  GEMINI_3_FLASH_PREVIEW: 'gemini-3-flash-preview', // Next-gen fast
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',     // Next-gen pro
} as const;

// Model routing configuration - BEAST MODE optimized
export const ModelRouting: Record<TaskType, { provider: AIProvider; model: string; fallback?: { provider: AIProvider; model: string } }> = {
  [TaskType.PLANNING]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_2_5_PRO,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_4O },
  },
  [TaskType.CODING]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_3_FAST,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_4O },
  },
  [TaskType.DEBUGGING]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_3_FAST,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_4O },
  },
  [TaskType.REASONING]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_4O,
    fallback: { provider: AIProvider.GEMINI, model: GeminiModels.GEMINI_2_5_PRO },
  },
  [TaskType.MULTIMODAL]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_3_PRO_PREVIEW,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_4O },
  },
  [TaskType.VALIDATION]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_3_MINI,
    fallback: { provider: AIProvider.OPENAI, model: OpenAIModels.GPT_4O_MINI },
  },
  [TaskType.REFINEMENT]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_4O,
    fallback: { provider: AIProvider.GROK, model: GrokModels.GROK_3_FAST },
  },
  [TaskType.REPAIR]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_4O,
    fallback: { provider: AIProvider.GROK, model: GrokModels.GROK_3_FAST },
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
  [AIProvider.GROK]: { input: 0.005, output: 0.015 },      // Grok 3 pricing
  [AIProvider.OPENAI]: { input: 0.005, output: 0.015 },    // GPT-4o pricing
  [AIProvider.GEMINI]: { input: 0.00125, output: 0.005 },  // Gemini Pro pricing
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
  maxOutput: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  strengths: string[];
}

export const ModelRegistry: Record<string, ModelInfo> = {
  [GrokModels.GROK_3_FAST]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_3_FAST,
    contextWindow: 131_072,
    maxOutput: 16_384,
    supportsStreaming: true,
    supportsImages: false,
    strengths: ['fast-coding', 'debugging', 'real-time'],
  },
  [GrokModels.GROK_3]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_3,
    contextWindow: 131_072,
    maxOutput: 16_384,
    supportsStreaming: true,
    supportsImages: false,
    strengths: ['coding', 'analysis', 'reasoning'],
  },
  [GrokModels.GROK_3_MINI]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_3_MINI,
    contextWindow: 131_072,
    maxOutput: 8_192,
    supportsStreaming: true,
    supportsImages: false,
    strengths: ['fast-validation', 'quick-fixes'],
  },
  [GrokModels.GROK_VISION]: {
    provider: AIProvider.GROK,
    model: GrokModels.GROK_VISION,
    contextWindow: 128_000,
    maxOutput: 8_192,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['vision', 'multimodal'],
  },
  [OpenAIModels.GPT_4O]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_4O,
    contextWindow: 128_000,
    maxOutput: 16_384,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['reasoning', 'multimodal', 'refinement'],
  },
  [OpenAIModels.GPT_4O_MINI]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.GPT_4O_MINI,
    contextWindow: 128_000,
    maxOutput: 16_384,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['fast-reasoning', 'cost-effective'],
  },
  [OpenAIModels.O1]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.O1,
    contextWindow: 200_000,
    maxOutput: 100_000,
    supportsStreaming: false,
    supportsImages: true,
    strengths: ['deep-reasoning', 'complex-problems'],
  },
  [OpenAIModels.O1_MINI]: {
    provider: AIProvider.OPENAI,
    model: OpenAIModels.O1_MINI,
    contextWindow: 128_000,
    maxOutput: 65_536,
    supportsStreaming: false,
    supportsImages: false,
    strengths: ['fast-reasoning', 'math', 'code'],
  },
  [GeminiModels.GEMINI_2_5_FLASH]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_2_5_FLASH,
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['fast-planning', 'cost-effective'],
  },
  [GeminiModels.GEMINI_2_5_PRO]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_2_5_PRO,
    contextWindow: 2_000_000,
    maxOutput: 65_536,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['planning', 'large-context', 'multimodal'],
  },
  [GeminiModels.GEMINI_3_FLASH_PREVIEW]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_3_FLASH_PREVIEW,
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['next-gen-fast', 'balanced'],
  },
  [GeminiModels.GEMINI_3_PRO_PREVIEW]: {
    provider: AIProvider.GEMINI,
    model: GeminiModels.GEMINI_3_PRO_PREVIEW,
    contextWindow: 2_000_000,
    maxOutput: 65_536,
    supportsStreaming: true,
    supportsImages: true,
    strengths: ['next-gen-pro', 'vision', 'reasoning'],
  },
};
