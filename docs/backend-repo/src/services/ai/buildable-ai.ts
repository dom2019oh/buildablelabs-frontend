// =============================================================================
// Buildable AI - Unified Agent Wrapper
// =============================================================================
// Single entry point for all AI operations with dynamic task-based routing.
// Abstracts model selection from consumers - they only specify the task type.

import OpenAI from 'openai';
import { aiLogger as logger } from '../../utils/logger';
import {
  AIProvider,
  TaskType,
  ModelRouting,
  getGrokClient,
  getOpenAIClient,
  getGeminiClient,
  isProviderAvailable,
  estimateCost,
  ModelRegistry,
} from './models';

// =============================================================================
// TYPES
// =============================================================================

export interface BuildableAIRequest {
  task: TaskType;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  images?: string[]; // Base64 or URLs for multimodal
  jsonMode?: boolean;
}

export interface BuildableAIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export interface BuildableAIStreamChunk {
  content: string;
  done: boolean;
}

// =============================================================================
// BUILDABLE AI CLASS
// =============================================================================

export class BuildableAI {
  private retryCount: number;
  private retryDelayMs: number;

  constructor(options?: { retryCount?: number; retryDelayMs?: number }) {
    this.retryCount = options?.retryCount ?? 2;
    this.retryDelayMs = options?.retryDelayMs ?? 1000;
  }

  /**
   * Execute a task with automatic model routing and fallback
   */
  async execute(request: BuildableAIRequest): Promise<BuildableAIResponse> {
    const startTime = Date.now();
    const routing = ModelRouting[request.task];

    // Try primary provider
    if (isProviderAvailable(routing.provider)) {
      try {
        const result = await this.executeWithProvider(
          routing.provider,
          routing.model,
          request
        );
        return {
          ...result,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        logger.warn(
          { error, provider: routing.provider, model: routing.model },
          'Primary provider failed, attempting fallback'
        );
      }
    }

    // Try fallback provider
    if (routing.fallback && isProviderAvailable(routing.fallback.provider)) {
      try {
        const result = await this.executeWithProvider(
          routing.fallback.provider,
          routing.fallback.model,
          request
        );
        return {
          ...result,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        logger.error(
          { error, provider: routing.fallback.provider },
          'Fallback provider also failed'
        );
        throw error;
      }
    }

    throw new Error(`No available providers for task: ${request.task}`);
  }

  /**
   * Stream a response for real-time UI updates
   */
  async *stream(
    request: BuildableAIRequest
  ): AsyncGenerator<BuildableAIStreamChunk> {
    const routing = ModelRouting[request.task];
    const provider = isProviderAvailable(routing.provider)
      ? routing.provider
      : routing.fallback?.provider;

    if (!provider || !isProviderAvailable(provider)) {
      throw new Error(`No available providers for task: ${request.task}`);
    }

    const model =
      provider === routing.provider
        ? routing.model
        : routing.fallback!.model;

    yield* this.streamWithProvider(provider, model, request);
  }

  /**
   * Execute with a specific provider
   */
  private async executeWithProvider(
    provider: AIProvider,
    model: string,
    request: BuildableAIRequest
  ): Promise<Omit<BuildableAIResponse, 'latencyMs'>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        switch (provider) {
          case AIProvider.GROK:
            return await this.executeGrok(model, request);
          case AIProvider.OPENAI:
            return await this.executeOpenAI(model, request);
          case AIProvider.GEMINI:
            return await this.executeGemini(model, request);
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
      } catch (error) {
        lastError = error as Error;
        
        // Check for rate limiting
        if (this.isRateLimitError(error)) {
          logger.warn(
            { provider, attempt, maxRetries: this.retryCount },
            'Rate limited, will retry'
          );
          await this.delay(this.retryDelayMs * (attempt + 1));
          continue;
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Unknown execution error');
  }

  /**
   * Execute with Grok (xAI) - OpenAI-compatible API
   */
  private async executeGrok(
    model: string,
    request: BuildableAIRequest
  ): Promise<Omit<BuildableAIResponse, 'latencyMs'>> {
    const client = getGrokClient();

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ];

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 8000,
      response_format: request.jsonMode ? { type: 'json_object' } : undefined,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content,
      provider: AIProvider.GROK,
      model,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost: estimateCost(AIProvider.GROK, usage.prompt_tokens, usage.completion_tokens),
    };
  }

  /**
   * Execute with OpenAI
   */
  private async executeOpenAI(
    model: string,
    request: BuildableAIRequest
  ): Promise<Omit<BuildableAIResponse, 'latencyMs'>> {
    const client = getOpenAIClient();

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
    ];

    // Handle multimodal content
    if (request.images && request.images.length > 0) {
      const content: OpenAI.ChatCompletionContentPart[] = [
        { type: 'text', text: request.userPrompt },
        ...request.images.map((img) => ({
          type: 'image_url' as const,
          image_url: { url: img },
        })),
      ];
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: request.userPrompt });
    }

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 8000,
      response_format: request.jsonMode ? { type: 'json_object' } : undefined,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content,
      provider: AIProvider.OPENAI,
      model,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost: estimateCost(AIProvider.OPENAI, usage.prompt_tokens, usage.completion_tokens),
    };
  }

  /**
   * Execute with Gemini
   */
  private async executeGemini(
    model: string,
    request: BuildableAIRequest
  ): Promise<Omit<BuildableAIResponse, 'latencyMs'>> {
    const client = getGeminiClient();
    const genModel = client.getGenerativeModel({ model });

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: `${request.systemPrompt}\n\n${request.userPrompt}` },
    ];

    // Add images for multimodal
    if (request.images && request.images.length > 0) {
      for (const img of request.images) {
        if (img.startsWith('data:')) {
          const [header, data] = img.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          parts.push({ inlineData: { mimeType, data } });
        }
      }
    }

    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: request.temperature ?? 0.3,
        maxOutputTokens: request.maxTokens ?? 8000,
        responseMimeType: request.jsonMode ? 'application/json' : 'text/plain',
      },
    });

    const response = result.response;
    const content = response.text();
    
    // Gemini usage metadata
    const usage = response.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };

    return {
      content,
      provider: AIProvider.GEMINI,
      model,
      usage: {
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
      cost: estimateCost(
        AIProvider.GEMINI,
        usage.promptTokenCount || 0,
        usage.candidatesTokenCount || 0
      ),
    };
  }

  /**
   * Stream with a specific provider
   */
  private async *streamWithProvider(
    provider: AIProvider,
    model: string,
    request: BuildableAIRequest
  ): AsyncGenerator<BuildableAIStreamChunk> {
    switch (provider) {
      case AIProvider.GROK:
      case AIProvider.OPENAI:
        yield* this.streamOpenAICompatible(
          provider === AIProvider.GROK ? getGrokClient() : getOpenAIClient(),
          model,
          request
        );
        break;
      case AIProvider.GEMINI:
        yield* this.streamGemini(model, request);
        break;
      default:
        throw new Error(`Streaming not supported for provider: ${provider}`);
    }
  }

  /**
   * Stream for OpenAI-compatible APIs (Grok, OpenAI)
   */
  private async *streamOpenAICompatible(
    client: OpenAI,
    model: string,
    request: BuildableAIRequest
  ): AsyncGenerator<BuildableAIStreamChunk> {
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 8000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }

  /**
   * Stream for Gemini
   */
  private async *streamGemini(
    model: string,
    request: BuildableAIRequest
  ): AsyncGenerator<BuildableAIStreamChunk> {
    const client = getGeminiClient();
    const genModel = client.getGenerativeModel({ model });

    const result = await genModel.generateContentStream({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${request.systemPrompt}\n\n${request.userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.3,
        maxOutputTokens: request.maxTokens ?? 8000,
      },
    });

    for await (const chunk of result.stream) {
      const content = chunk.text();
      yield { content, done: false };
    }

    yield { content: '', done: true };
  }

  /**
   * Check if error is rate limiting
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('too many requests')
      );
    }
    return false;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let buildableAI: BuildableAI | null = null;

export function getBuildableAI(): BuildableAI {
  if (!buildableAI) {
    buildableAI = new BuildableAI();
  }
  return buildableAI;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick function for planning tasks (uses Gemini)
 */
export async function plan(prompt: string, context?: string): Promise<BuildableAIResponse> {
  const ai = getBuildableAI();
  return ai.execute({
    task: TaskType.PLANNING,
    systemPrompt: `You are an expert software architect. Analyze requirements and create structured project plans.
${context ? `\nContext:\n${context}` : ''}`,
    userPrompt: prompt,
    jsonMode: true,
  });
}

/**
 * Quick function for code generation (uses Grok)
 */
export async function code(
  prompt: string,
  context?: string,
  options?: { language?: string; framework?: string }
): Promise<BuildableAIResponse> {
  const ai = getBuildableAI();
  const lang = options?.language || 'TypeScript';
  const framework = options?.framework || 'React';

  return ai.execute({
    task: TaskType.CODING,
    systemPrompt: `You are an expert ${lang} developer specializing in ${framework}.
Generate clean, production-ready code. Output ONLY code - no markdown, no explanations.
${context ? `\nContext:\n${context}` : ''}`,
    userPrompt: prompt,
    temperature: 0.2,
  });
}

/**
 * Quick function for debugging (uses Grok)
 */
export async function debug(
  code: string,
  error: string,
  context?: string
): Promise<BuildableAIResponse> {
  const ai = getBuildableAI();
  return ai.execute({
    task: TaskType.DEBUGGING,
    systemPrompt: `You are an expert debugger. Analyze errors and provide fixes.
${context ? `\nContext:\n${context}` : ''}`,
    userPrompt: `Code:\n\`\`\`\n${code}\n\`\`\`\n\nError:\n${error}\n\nProvide the corrected code.`,
    temperature: 0.1,
  });
}

/**
 * Quick function for reasoning/optimization (uses OpenAI)
 */
export async function reason(prompt: string, context?: string): Promise<BuildableAIResponse> {
  const ai = getBuildableAI();
  return ai.execute({
    task: TaskType.REASONING,
    systemPrompt: `You are an expert software architect focused on optimization and best practices.
${context ? `\nContext:\n${context}` : ''}`,
    userPrompt: prompt,
  });
}

/**
 * Quick function for validation (uses Grok)
 */
export async function validate(
  code: string,
  rules?: string[]
): Promise<BuildableAIResponse> {
  const ai = getBuildableAI();
  return ai.execute({
    task: TaskType.VALIDATION,
    systemPrompt: `You are a code validator. Check for errors, security issues, and best practices.
${rules ? `\nValidation rules:\n${rules.join('\n')}` : ''}`,
    userPrompt: `Validate this code:\n\`\`\`\n${code}\n\`\`\`\n\nReturn JSON: { "valid": boolean, "issues": string[], "suggestions": string[] }`,
    jsonMode: true,
  });
}

/**
 * Generate predictive suggestions post-generation
 */
export async function suggest(
  generatedFiles: string[],
  projectType: string
): Promise<BuildableAIResponse> {
  const ai = getBuildableAI();
  return ai.execute({
    task: TaskType.REASONING,
    systemPrompt: `You are a helpful AI assistant. Based on generated files, suggest next steps.`,
    userPrompt: `Project type: ${projectType}
Generated files: ${generatedFiles.join(', ')}

Suggest 3-5 helpful next steps or enhancements. Return JSON: { "suggestions": [{ "title": string, "description": string, "priority": "high" | "medium" | "low" }] }`,
    jsonMode: true,
  });
}
