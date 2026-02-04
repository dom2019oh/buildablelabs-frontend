// =============================================================================
// MODEL ROUTING - Task-to-model routing with confidence scoring and fallbacks
// =============================================================================

import type { 
  ProviderKey, 
  AITaskType, 
  ModelConfig, 
  TaskRouting 
} from "./types.ts";

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

export const AI_PROVIDERS: Record<ProviderKey, ModelConfig> = {
  grok: {
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    models: {
      fast: "grok-2-latest",
      code: "grok-2-latest",
      vision: "grok-2-vision-1212",
    },
    maxTokens: 16000,
  },
  gemini: {
    name: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: {
      pro: "gemini-1.5-pro",
      flash: "gemini-1.5-flash",
      planning: "gemini-1.5-pro",
    },
    maxTokens: 16000,
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    models: {
      gpt4o: "gpt-4o",
      reasoning: "gpt-4o",
      mini: "gpt-4o-mini",
    },
    maxTokens: 16000,
  },
};

// =============================================================================
// TASK ROUTING MATRIX
// =============================================================================

export const TASK_ROUTING: Record<AITaskType, TaskRouting> = {
  intent: {
    provider: "gemini",
    model: "flash",
    confidenceThreshold: 0.85,
    fallback: { provider: "openai", model: "mini" },
  },
  decompose: {
    provider: "gemini",
    model: "pro",
    confidenceThreshold: 0.80,
    fallback: { provider: "openai", model: "gpt4o" },
  },
  planning: {
    provider: "gemini",
    model: "planning",
    confidenceThreshold: 0.85,
    fallback: { provider: "openai", model: "reasoning" },
  },
  coding: {
    provider: "grok",
    model: "code",
    confidenceThreshold: 0.75,
    fallback: { provider: "openai", model: "gpt4o" },
  },
  validation: {
    provider: "openai",
    model: "mini",
    confidenceThreshold: 0.90,
    fallback: { provider: "grok", model: "fast" },
  },
  repair: {
    provider: "openai",
    model: "gpt4o",
    confidenceThreshold: 0.80,
    fallback: { provider: "grok", model: "code" },
  },
  persona: {
    provider: "openai",
    model: "mini",
    confidenceThreshold: 0.70,
    fallback: { provider: "gemini", model: "flash" },
  },
  root_cause: {
    provider: "openai",
    model: "gpt4o",
    confidenceThreshold: 0.85,
    fallback: { provider: "gemini", model: "pro" },
  },
};

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

export function getApiKeys(): Record<ProviderKey, string | undefined> {
  return {
    grok: Deno.env.get("GROK_API_KEY"),
    gemini: Deno.env.get("GEMINI_API_KEY"),
    openai: Deno.env.get("OPENAI_API_KEY"),
  };
}

export function getAvailableProviders(): ProviderKey[] {
  const keys = getApiKeys();
  return (Object.keys(keys) as ProviderKey[]).filter(k => !!keys[k]);
}

export function hasAnyProvider(): boolean {
  return getAvailableProviders().length > 0;
}

// =============================================================================
// PROVIDER CHAIN BUILDER
// =============================================================================

interface ProviderCandidate {
  provider: ProviderKey;
  model: string;
  priority: number;
}

export function buildProviderChain(task: AITaskType): ProviderCandidate[] {
  const routing = TASK_ROUTING[task];
  const apiKeys = getApiKeys();
  const candidates: ProviderCandidate[] = [];
  let priority = 0;

  // Primary provider
  if (apiKeys[routing.provider]) {
    const config = AI_PROVIDERS[routing.provider];
    const modelKey = routing.model as keyof typeof config.models;
    candidates.push({
      provider: routing.provider,
      model: config.models[modelKey] || Object.values(config.models)[0],
      priority: priority++,
    });
  }

  // Fallback provider
  if (routing.fallback && apiKeys[routing.fallback.provider]) {
    const fallbackConfig = AI_PROVIDERS[routing.fallback.provider];
    const fallbackModelKey = routing.fallback.model as keyof typeof fallbackConfig.models;
    candidates.push({
      provider: routing.fallback.provider,
      model: fallbackConfig.models[fallbackModelKey] || Object.values(fallbackConfig.models)[0],
      priority: priority++,
    });
  }

  // Add any remaining providers as last resort
  for (const [key, apiKey] of Object.entries(apiKeys)) {
    const providerKey = key as ProviderKey;
    if (apiKey && !candidates.find(c => c.provider === providerKey)) {
      const config = AI_PROVIDERS[providerKey];
      candidates.push({
        provider: providerKey,
        model: Object.values(config.models)[0],
        priority: priority++,
      });
    }
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// CONFIDENCE SCORING
// =============================================================================

interface ResponseQuality {
  hasRequiredFields: boolean;
  isValidJson: boolean;
  isValidCode: boolean;
  isComplete: boolean;
  confidence: number;
}

export function scoreResponse(
  response: string, 
  task: AITaskType,
  expectedFields?: string[]
): ResponseQuality {
  let score = 0;
  const quality: ResponseQuality = {
    hasRequiredFields: true,
    isValidJson: true,
    isValidCode: true,
    isComplete: true,
    confidence: 0,
  };

  // Check for empty or too short response
  if (!response || response.length < 10) {
    quality.isComplete = false;
    return quality;
  }

  // Check for placeholder content
  if (response.includes("// ...") || response.includes("// TODO") || response.includes("// rest of")) {
    quality.isComplete = false;
    score -= 0.3;
  } else {
    score += 0.2;
  }

  // Task-specific validation
  switch (task) {
    case "intent":
    case "decompose":
    case "planning":
      // Expect JSON output
      try {
        const parsed = JSON.parse(response);
        quality.isValidJson = true;
        score += 0.3;

        // Check for required fields
        if (expectedFields) {
          const hasAll = expectedFields.every(f => f in parsed);
          quality.hasRequiredFields = hasAll;
          score += hasAll ? 0.3 : -0.2;
        }
      } catch {
        // Try to extract JSON from markdown code block
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[1]);
            quality.isValidJson = true;
            score += 0.2;
          } catch {
            quality.isValidJson = false;
            score -= 0.2;
          }
        } else {
          quality.isValidJson = false;
          score -= 0.3;
        }
      }
      break;

    case "coding":
    case "repair":
      // Check for code blocks
      const codeBlockCount = (response.match(/```[\w]*:/g) || []).length;
      if (codeBlockCount > 0) {
        score += 0.3;
        
        // Check for balanced braces in code blocks
        const codeBlocks = response.match(/```[\w]*:[^\n]+\n([\s\S]*?)```/g) || [];
        let balanced = true;
        for (const block of codeBlocks) {
          const openBraces = (block.match(/\{/g) || []).length;
          const closeBraces = (block.match(/\}/g) || []).length;
          if (openBraces !== closeBraces) {
            balanced = false;
            break;
          }
        }
        quality.isValidCode = balanced;
        score += balanced ? 0.2 : -0.3;
      } else {
        quality.isValidCode = false;
        score -= 0.3;
      }
      break;

    case "validation":
      // Expect structured validation result
      if (response.includes('"valid"') && response.includes('"criticalErrors"')) {
        score += 0.3;
      }
      break;

    case "persona":
      // Check for natural language response
      if (response.length > 50 && !response.startsWith("{") && !response.startsWith("```")) {
        score += 0.3;
      }
      break;
  }

  // Normalize score to 0-1 range
  quality.confidence = Math.max(0, Math.min(1, 0.5 + score));
  return quality;
}

export function meetsConfidenceThreshold(task: AITaskType, confidence: number): boolean {
  const threshold = TASK_ROUTING[task].confidenceThreshold;
  return confidence >= threshold;
}

// =============================================================================
// AI CALLER WITH ROUTING
// =============================================================================

export interface AICallResult {
  success: boolean;
  content: string;
  provider: ProviderKey;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
  confidence: number;
  usedFallback: boolean;
}

export async function callAI(
  task: AITaskType,
  messages: Array<{ role: string; content: string }>,
  options: {
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
    expectedFields?: string[];
  } = {}
): Promise<AICallResult> {
  const chain = buildProviderChain(task);
  const startTime = Date.now();

  if (chain.length === 0) {
    throw new Error("No AI providers configured");
  }

  let lastError: Error | null = null;
  let attemptIndex = 0;

  for (const candidate of chain) {
    const { provider, model } = candidate;
    const config = AI_PROVIDERS[provider];
    const apiKey = getApiKeys()[provider]!;

    console.log(`[Router] ${task} → ${config.name} (${model})`);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let url: string = config.baseUrl;

      if (provider === "gemini") {
        url = `${config.baseUrl}?key=${apiKey}`;
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options.maxTokens || config.maxTokens,
          temperature: options.temperature ?? 0.5,
          stream: options.stream ?? false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Router] ${config.name} failed: ${response.status} - ${errorText.slice(0, 200)}`);
        lastError = new Error(`${config.name}: ${response.status}`);
        attemptIndex++;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - startTime;
      
      // Score the response
      const quality = scoreResponse(content, task, options.expectedFields);

      console.log(`[Router] ✓ ${config.name} succeeded (confidence: ${quality.confidence.toFixed(2)})`);

      // Check if we should try fallback due to low confidence
      if (!meetsConfidenceThreshold(task, quality.confidence) && attemptIndex < chain.length - 1) {
        console.log(`[Router] Low confidence (${quality.confidence.toFixed(2)}), trying fallback...`);
        attemptIndex++;
        continue;
      }

      return {
        success: true,
        content,
        provider,
        model,
        tokensUsed: data.usage?.total_tokens,
        latencyMs,
        confidence: quality.confidence,
        usedFallback: attemptIndex > 0,
      };
    } catch (error) {
      console.log(`[Router] ${config.name} error:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      attemptIndex++;
    }
  }

  throw lastError || new Error(`All providers failed for ${task}`);
}

// =============================================================================
// STREAMING AI CALLER
// =============================================================================

export async function callAIStreaming(
  task: AITaskType,
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<AICallResult> {
  const chain = buildProviderChain(task);
  const startTime = Date.now();

  if (chain.length === 0) {
    throw new Error("No AI providers configured");
  }

  for (const candidate of chain) {
    const { provider, model } = candidate;
    const config = AI_PROVIDERS[provider];
    const apiKey = getApiKeys()[provider]!;

    console.log(`[Router:Stream] ${task} → ${config.name} (${model})`);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let url: string = config.baseUrl;

      if (provider === "gemini") {
        url = `${config.baseUrl}?key=${apiKey}`;
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options.maxTokens || config.maxTokens,
          temperature: options.temperature ?? 0.5,
          stream: true,
        }),
      });

      if (!response.ok) {
        console.log(`[Router:Stream] ${config.name} failed: ${response.status}`);
        continue;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        continue;
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }

      const latencyMs = Date.now() - startTime;
      const quality = scoreResponse(fullContent, task);

      return {
        success: true,
        content: fullContent,
        provider,
        model,
        latencyMs,
        confidence: quality.confidence,
        usedFallback: false,
      };
    } catch (error) {
      console.log(`[Router:Stream] ${config.name} error:`, error);
    }
  }

  throw new Error(`All providers failed for streaming ${task}`);
}
