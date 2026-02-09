// =============================================================================
// MODEL ROUTING - Multi-model orchestration with ensemble coding
// =============================================================================
// ALL AI providers work together: Gemini for planning + context, Grok for speed,
// OpenAI for validation. Ensemble mode calls multiple providers in parallel for
// code generation, picking the best result via confidence scoring.

import type { 
  ProviderKey, 
  AITaskType, 
  ModelConfig, 
  TaskRouting 
} from "./types.ts";

// =============================================================================
// PROVIDER CONFIGURATIONS (Upgraded to latest models)
// =============================================================================

export const AI_PROVIDERS: Record<ProviderKey, ModelConfig> = {
  grok: {
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    models: {
      fast: "grok-3-mini-fast",
      code: "grok-3-fast",
      vision: "grok-2-vision-1212",
    },
    maxTokens: 16000,
  },
  gemini: {
    name: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: {
      pro: "gemini-2.5-pro",
      flash: "gemini-2.5-flash",
      planning: "gemini-2.5-flash",
      code: "gemini-2.5-flash",
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
// TASK ROUTING MATRIX - Optimized for collaboration
// =============================================================================
// Each task has a primary + fallback, but coding uses ensemble mode (see below)

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
    // Primary: Gemini Flash for speed + quality (large context, fast output)
    provider: "gemini",
    model: "code",
    confidenceThreshold: 0.70,
    fallback: { provider: "grok", model: "code" },
  },
  validation: {
    provider: "openai",
    model: "mini",
    confidenceThreshold: 0.90,
    fallback: { provider: "gemini", model: "flash" },
  },
  repair: {
    provider: "openai",
    model: "gpt4o",
    confidenceThreshold: 0.80,
    fallback: { provider: "gemini", model: "code" },
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
// SMART PROVIDER SELECTION
// =============================================================================
// Dynamically adjusts provider priority based on request characteristics

interface RequestProfile {
  promptLength: number;
  existingFileCount: number;
  isNewProject: boolean;
  complexity: "low" | "medium" | "high";
}

export function profileRequest(
  prompt: string,
  existingFiles: Array<{ path: string; content: string }>,
): RequestProfile {
  const promptLength = prompt.length;
  const existingFileCount = existingFiles.length;
  const isNewProject = existingFileCount === 0;

  // Estimate complexity
  let complexity: "low" | "medium" | "high" = "medium";
  const lower = prompt.toLowerCase();
  if (lower.includes("full") || lower.includes("complete") || lower.includes("entire") || isNewProject) {
    complexity = "high";
  } else if (lower.includes("fix") || lower.includes("change") || lower.includes("update")) {
    complexity = "low";
  }

  return { promptLength, existingFileCount, isNewProject, complexity };
}

// Get the best provider for a task considering the request profile
export function selectBestProvider(
  task: AITaskType,
  profile: RequestProfile,
): ProviderKey {
  const available = getAvailableProviders();
  if (available.length === 0) throw new Error("No AI providers configured");

  // For planning tasks: always prefer Gemini (2M context window)
  if (task === "planning" || task === "decompose") {
    return available.includes("gemini") ? "gemini" : available[0];
  }

  // For coding tasks with many existing files: prefer Gemini (large context)
  if (task === "coding" && profile.existingFileCount > 5) {
    return available.includes("gemini") ? "gemini" : TASK_ROUTING[task].provider;
  }

  // For complex new projects: prefer Gemini Pro
  if (task === "coding" && profile.isNewProject && profile.complexity === "high") {
    return available.includes("gemini") ? "gemini" : TASK_ROUTING[task].provider;
  }

  // For validation: OpenAI is fast and precise
  if (task === "validation") {
    return available.includes("openai") ? "openai" : available[0];
  }

  // Default: use routing table
  const defaultProvider = TASK_ROUTING[task].provider;
  return available.includes(defaultProvider) ? defaultProvider : available[0];
}

// =============================================================================
// PROVIDER CHAIN BUILDER (Enhanced with smart selection)
// =============================================================================

interface ProviderCandidate {
  provider: ProviderKey;
  model: string;
  priority: number;
}

export function buildProviderChain(
  task: AITaskType,
  profile?: RequestProfile,
): ProviderCandidate[] {
  const routing = TASK_ROUTING[task];
  const apiKeys = getApiKeys();
  const candidates: ProviderCandidate[] = [];
  let priority = 0;

  // If we have a request profile, use smart selection for primary
  if (profile) {
    const bestProvider = selectBestProvider(task, profile);
    if (apiKeys[bestProvider]) {
      const config = AI_PROVIDERS[bestProvider];
      // For coding, use "code" model key if available
      const modelKey = task === "coding" ? "code" : routing.model;
      const model = config.models[modelKey as keyof typeof config.models] 
        || config.models[routing.model as keyof typeof config.models]
        || Object.values(config.models)[0];
      candidates.push({ provider: bestProvider, model, priority: priority++ });
    }
  }

  // Add primary provider from routing table (if not already added)
  if (apiKeys[routing.provider] && !candidates.find(c => c.provider === routing.provider)) {
    const config = AI_PROVIDERS[routing.provider];
    const modelKey = routing.model as keyof typeof config.models;
    candidates.push({
      provider: routing.provider,
      model: config.models[modelKey] || Object.values(config.models)[0],
      priority: priority++,
    });
  }

  // Add fallback provider (if not already added)
  if (routing.fallback && apiKeys[routing.fallback.provider] && 
      !candidates.find(c => c.provider === routing.fallback!.provider)) {
    const fallbackConfig = AI_PROVIDERS[routing.fallback.provider];
    const fallbackModelKey = routing.fallback.model as keyof typeof fallbackConfig.models;
    candidates.push({
      provider: routing.fallback.provider,
      model: fallbackConfig.models[fallbackModelKey] || Object.values(fallbackConfig.models)[0],
      priority: priority++,
    });
  }

  // Add any remaining available providers as last resort
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
  codeBlockCount: number;
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
    codeBlockCount: 0,
  };

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

  switch (task) {
    case "intent":
    case "decompose":
    case "planning":
      try {
        const parsed = JSON.parse(response);
        quality.isValidJson = true;
        score += 0.3;
        if (expectedFields) {
          const hasAll = expectedFields.every(f => f in parsed);
          quality.hasRequiredFields = hasAll;
          score += hasAll ? 0.3 : -0.2;
        }
      } catch {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try { JSON.parse(jsonMatch[1]); quality.isValidJson = true; score += 0.2; }
          catch { quality.isValidJson = false; score -= 0.2; }
        } else {
          // Try extracting raw JSON
          const rawJson = response.match(/\{[\s\S]*\}/);
          if (rawJson) {
            try { JSON.parse(rawJson[0]); quality.isValidJson = true; score += 0.15; }
            catch { quality.isValidJson = false; score -= 0.3; }
          } else {
            quality.isValidJson = false;
            score -= 0.3;
          }
        }
      }
      break;

    case "coding":
    case "repair": {
      const codeBlocks = response.match(/```[\w]*:[^\n]+\n([\s\S]*?)```/g) || [];
      quality.codeBlockCount = codeBlocks.length;
      
      if (codeBlocks.length > 0) {
        score += 0.3;
        // More files = higher confidence for new projects
        if (codeBlocks.length >= 5) score += 0.1;
        if (codeBlocks.length >= 10) score += 0.1;
        
        let balanced = true;
        for (const block of codeBlocks) {
          const openBraces = (block.match(/\{/g) || []).length;
          const closeBraces = (block.match(/\}/g) || []).length;
          if (openBraces !== closeBraces) { balanced = false; break; }
        }
        quality.isValidCode = balanced;
        score += balanced ? 0.2 : -0.3;
      } else {
        quality.isValidCode = false;
        score -= 0.3;
      }
      break;
    }

    case "validation":
      if (response.includes('"valid"') && response.includes('"criticalErrors"')) {
        score += 0.3;
      }
      break;

    case "persona":
      if (response.length > 50 && !response.startsWith("{") && !response.startsWith("```")) {
        score += 0.3;
      }
      break;
  }

  quality.confidence = Math.max(0, Math.min(1, 0.5 + score));
  return quality;
}

export function meetsConfidenceThreshold(task: AITaskType, confidence: number): boolean {
  return confidence >= TASK_ROUTING[task].confidenceThreshold;
}

// =============================================================================
// CONTEXT LIMITS PER PROVIDER
// =============================================================================

export function getContextLimits(provider: ProviderKey): { maxFiles: number; maxCharsPerFile: number } {
  switch (provider) {
    case "gemini":
      // Gemini 2.5 Pro has 2M token context window
      return { maxFiles: 15, maxCharsPerFile: 3000 };
    case "openai":
      return { maxFiles: 8, maxCharsPerFile: 2000 };
    case "grok":
    default:
      return { maxFiles: 5, maxCharsPerFile: 1000 };
  }
}

// =============================================================================
// TIMEOUT HELPER (Edge functions have ~60s limit)
// =============================================================================

const AI_CALL_TIMEOUT_MS = 25_000; // 25 seconds for non-coding tasks
const AI_CODING_TIMEOUT_MS = 45_000; // 45 seconds for code generation

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = AI_CALL_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
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
    profile?: RequestProfile;
  } = {}
): Promise<AICallResult> {
  const chain = buildProviderChain(task, options.profile);
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

    // Cap maxTokens for edge function safety (16k is plenty for any single stage)
    const maxTokens = Math.min(options.maxTokens || config.maxTokens, 16000);

    console.log(`[Router] ${task} → ${config.name} (${model}) [maxTokens: ${maxTokens}]`);

    try {
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      };

      // Use longer timeout for coding tasks
      const timeout = task === "coding" ? AI_CODING_TIMEOUT_MS : AI_CALL_TIMEOUT_MS;
      const response = await fetchWithTimeout(config.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.5,
          stream: options.stream ?? false,
        }),
      }, timeout);

      if (!response.ok) {
        const errorText = await response.text();
        const brief = errorText.slice(0, 400);
        console.log(`[Router] ${config.name} failed: ${response.status} - ${brief}`);
        lastError = new Error(`${config.name}: ${response.status}${brief ? ` - ${brief}` : ""}`);
        attemptIndex++;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - startTime;
      const quality = scoreResponse(content, task, options.expectedFields);

      console.log(`[Router] ✓ ${config.name} (confidence: ${quality.confidence.toFixed(2)}, blocks: ${quality.codeBlockCount})`);

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
      const timeoutLabel = task === "coding" ? "50s" : "25s";
      const errMsg = (error as Error).name === "AbortError" ? `Timeout (${timeoutLabel})` : String(error);
      console.log(`[Router] ${config.name} error: ${errMsg}`);
      lastError = error instanceof Error ? error : new Error(String(error));
      attemptIndex++;
    }
  }

  throw lastError || new Error(`All providers failed for ${task}`);
}

// =============================================================================
// ENSEMBLE CODING - Call multiple providers, pick the best
// =============================================================================
// For code generation, we run 2 providers in parallel with a 25s timeout,
// picking the result with the highest confidence + most complete code blocks.

export async function callAIEnsemble(
  messages: Array<{ role: string; content: string }>,
  options: {
    maxTokens?: number;
    temperature?: number;
    profile?: RequestProfile;
  } = {}
): Promise<AICallResult> {
  const apiKeys = getApiKeys();
  const available = getAvailableProviders();
  const startTime = Date.now();

  if (available.length === 0) {
    throw new Error("No AI providers configured");
  }

  // If only one provider available, use standard call
  if (available.length === 1) {
    return callAI("coding", messages, { ...options, stream: false });
  }

  // Pick top 2 providers for ensemble
  const ensembleProviders: Array<{ provider: ProviderKey; model: string }> = [];
  
  // Prefer Gemini Flash for speed in edge functions (Pro is too slow)
  if (apiKeys.gemini) {
    ensembleProviders.push({ provider: "gemini", model: AI_PROVIDERS.gemini.models.flash });
  }
  // Include Grok for code if available (fast)
  if (apiKeys.grok) {
    ensembleProviders.push({ provider: "grok", model: AI_PROVIDERS.grok.models.code });
  }
  // Add OpenAI if we still need more
  if (ensembleProviders.length < 2 && apiKeys.openai) {
    ensembleProviders.push({ provider: "openai", model: AI_PROVIDERS.openai.models.gpt4o });
  }

  console.log(`[Ensemble] Running ${ensembleProviders.length} providers in parallel: ${ensembleProviders.map(p => p.provider).join(", ")}`);

  // Call all providers in parallel with timeouts
  const promises = ensembleProviders.map(async ({ provider, model }) => {
    const config = AI_PROVIDERS[provider];
    const apiKey = apiKeys[provider]!;
    // Cap at 16k tokens for edge function speed
    const maxTokens = Math.min(options.maxTokens || config.maxTokens, 16000);

    try {
      const response = await fetchWithTimeout(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.5,
          stream: false,
        }),
      }, AI_CODING_TIMEOUT_MS); // Use coding timeout (50s) for ensemble

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.log(`[Ensemble] ${config.name} failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const quality = scoreResponse(content, "coding");

      console.log(`[Ensemble] ${config.name}: confidence=${quality.confidence.toFixed(2)}, blocks=${quality.codeBlockCount}`);

      return {
        success: true,
        content,
        provider,
        model,
        tokensUsed: data.usage?.total_tokens,
        latencyMs: Date.now() - startTime,
        confidence: quality.confidence,
        usedFallback: false,
        codeBlockCount: quality.codeBlockCount,
      } as AICallResult & { codeBlockCount: number };
    } catch (err) {
      const errMsg = (err as Error).name === "AbortError" ? "Timeout (50s)" : String(err);
      console.log(`[Ensemble] ${config.name} error: ${errMsg}`);
      return null;
    }
  });

  const results = (await Promise.all(promises)).filter(Boolean) as Array<AICallResult & { codeBlockCount: number }>;

  if (results.length === 0) {
    // All providers failed/timed out — fall back to standard single call with Flash
    console.log("[Ensemble] All failed, falling back to single call");
    return callAI("coding", messages, { ...options, maxTokens: 16000, stream: false });
  }

  // Pick the best result: highest confidence, then most code blocks
  results.sort((a, b) => {
    // Primary: confidence
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return b.confidence - a.confidence;
    }
    // Secondary: more code blocks
    return b.codeBlockCount - a.codeBlockCount;
  });

  const winner = results[0];
  console.log(`[Ensemble] Winner: ${winner.provider} (confidence: ${winner.confidence.toFixed(2)}, blocks: ${winner.codeBlockCount})`);
  
  return winner;
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
    profile?: RequestProfile;
  } = {}
): Promise<AICallResult> {
  const chain = buildProviderChain(task, options.profile);
  const startTime = Date.now();

  if (chain.length === 0) {
    throw new Error("No AI providers configured");
  }

  for (const candidate of chain) {
    const { provider, model } = candidate;
    const config = AI_PROVIDERS[provider];
    const apiKey = getApiKeys()[provider]!;
    const maxTokens = Math.min(options.maxTokens || config.maxTokens, 16000);

    console.log(`[Router:Stream] ${task} → ${config.name} (${model}) [maxTokens: ${maxTokens}]`);

    try {
      const response = await fetchWithTimeout(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.5,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Router:Stream] ${config.name} failed: ${response.status} - ${errorText.slice(0, 200)}`);
        continue;
      }

      const reader = response.body?.getReader();
      if (!reader) continue;

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

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
