// =============================================================================
// ROUTING - Multi-model coordination with confidence scoring
// =============================================================================

import type { AITaskType } from "./types";

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

export const AI_PROVIDERS = {
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
} as const;

// =============================================================================
// TASK ROUTING MATRIX
// =============================================================================

export const TASK_ROUTING: Record<AITaskType, {
  provider: keyof typeof AI_PROVIDERS;
  model: string;
  confidenceThreshold: number;
  fallback: {
    provider: keyof typeof AI_PROVIDERS;
    model: string;
  };
}> = {
  intent: {
    provider: "gemini",
    model: "flash",
    confidenceThreshold: 0.85,
    fallback: { provider: "openai", model: "mini" },
  },
  planning: {
    provider: "gemini",
    model: "planning",
    confidenceThreshold: 0.80,
    fallback: { provider: "openai", model: "gpt4o" },
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
};

// =============================================================================
// PROVIDER AVAILABILITY
// =============================================================================

export function getApiKey(provider: keyof typeof AI_PROVIDERS): string | undefined {
  const envKeys: Record<string, string> = {
    grok: "GROK_API_KEY",
    gemini: "GEMINI_API_KEY",
    openai: "OPENAI_API_KEY",
  };
  return process.env[envKeys[provider]];
}

export function hasProvider(provider: keyof typeof AI_PROVIDERS): boolean {
  return !!getApiKey(provider);
}

export function hasAnyProvider(): boolean {
  return hasProvider("grok") || hasProvider("gemini") || hasProvider("openai");
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (hasProvider("grok")) providers.push("grok");
  if (hasProvider("gemini")) providers.push("gemini");
  if (hasProvider("openai")) providers.push("openai");
  return providers;
}

// =============================================================================
// CONFIDENCE SCORING
// =============================================================================

export interface ResponseQuality {
  confidence: number;
  hasRequiredFields: boolean;
  isValidJson: boolean;
  isValidCode: boolean;
  isComplete: boolean;
}

export function scoreResponse(response: string, task: AITaskType): ResponseQuality {
  let confidence = 0.5;
  let hasRequiredFields = true;
  let isValidJson = true;
  let isValidCode = true;
  let isComplete = true;

  // Check for placeholder content (reduces confidence)
  if (response.includes("// ...") || response.includes("// TODO") || response.includes("// rest of")) {
    confidence -= 0.3;
    isComplete = false;
  }

  // Check for proper structure based on task
  switch (task) {
    case "intent":
    case "planning":
      // Should have JSON output
      try {
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[1]);
          confidence += 0.2;
        } else if (response.trim().startsWith("{")) {
          JSON.parse(response.trim());
          confidence += 0.2;
        } else {
          isValidJson = false;
          confidence -= 0.2;
        }
      } catch {
        isValidJson = false;
        confidence -= 0.2;
      }
      break;

    case "coding":
    case "repair":
      // Should have code blocks
      const codeBlocks = response.match(/```(\w+)?:[^\n]+\n[\s\S]*?```/g);
      if (codeBlocks && codeBlocks.length > 0) {
        confidence += 0.2;
        
        // Check for balanced braces in code
        for (const block of codeBlocks) {
          const openBraces = (block.match(/\{/g) || []).length;
          const closeBraces = (block.match(/\}/g) || []).length;
          if (openBraces !== closeBraces) {
            isValidCode = false;
            confidence -= 0.1;
          }
        }
      } else {
        confidence -= 0.3;
        hasRequiredFields = false;
      }
      break;

    case "validation":
      // Should have structured output
      if (response.includes("valid") && (response.includes("true") || response.includes("false"))) {
        confidence += 0.2;
      } else {
        confidence -= 0.2;
        hasRequiredFields = false;
      }
      break;
  }

  // Length check
  if (response.length < 50) {
    confidence -= 0.2;
    isComplete = false;
  }

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    hasRequiredFields,
    isValidJson,
    isValidCode,
    isComplete,
  };
}

// =============================================================================
// AI CALLER WITH FALLBACK
// =============================================================================

export interface AICallResult {
  response: string;
  provider: string;
  model: string;
  latencyMs: number;
  usedFallback: boolean;
}

export async function callAIWithFallback(
  task: AITaskType,
  messages: Array<{ role: string; content: string }>
): Promise<AICallResult> {
  const routing = TASK_ROUTING[task];
  const startTime = Date.now();

  // Build provider priority list
  const providers: Array<{ provider: keyof typeof AI_PROVIDERS; model: string }> = [];

  // Add primary provider if available
  if (hasProvider(routing.provider)) {
    const config = AI_PROVIDERS[routing.provider];
    const model = config.models[routing.model as keyof typeof config.models];
    providers.push({ provider: routing.provider, model });
  }

  // Add fallback provider if available
  if (hasProvider(routing.fallback.provider)) {
    const config = AI_PROVIDERS[routing.fallback.provider];
    const model = config.models[routing.fallback.model as keyof typeof config.models];
    providers.push({ provider: routing.fallback.provider, model });
  }

  // Add any remaining available providers
  for (const providerKey of Object.keys(AI_PROVIDERS) as Array<keyof typeof AI_PROVIDERS>) {
    if (hasProvider(providerKey) && !providers.find(p => p.provider === providerKey)) {
      const config = AI_PROVIDERS[providerKey];
      providers.push({ provider: providerKey, model: Object.values(config.models)[0] });
    }
  }

  if (providers.length === 0) {
    throw new Error("No AI providers available");
  }

  let lastError: Error | null = null;
  let usedFallback = false;

  for (let i = 0; i < providers.length; i++) {
    const { provider, model } = providers[i];
    if (i > 0) usedFallback = true;

    try {
      const config = AI_PROVIDERS[provider];
      const apiKey = getApiKey(provider)!;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      let url = config.baseUrl;

      if (provider === "gemini") {
        url = `${config.baseUrl}?key=${apiKey}`;
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      console.log(`[Routing] ${task} → ${config.name} (${model})`);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: config.maxTokens,
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`${config.name} returned ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Score the response
      const quality = scoreResponse(content, task);

      // If confidence is too low and we have more providers, try the next one
      if (quality.confidence < routing.confidenceThreshold && i < providers.length - 1) {
        console.log(`[Routing] Low confidence (${quality.confidence.toFixed(2)}), trying fallback`);
        continue;
      }

      return {
        response: content,
        provider,
        model,
        latencyMs: Date.now() - startTime,
        usedFallback,
      };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`[Routing] ${provider} failed: ${lastError.message}`);
    }
  }

  throw lastError || new Error("All providers failed");
}
