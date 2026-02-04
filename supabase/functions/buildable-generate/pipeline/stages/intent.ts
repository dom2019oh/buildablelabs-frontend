// =============================================================================
// INTENT STAGE - Extract user intent and classify request type
// =============================================================================

import type { 
  PipelineContext, 
  StageResult, 
  IntentResult, 
  IntentType 
} from "../types.ts";
import { callAI } from "../routing.ts";
import { StageTracer } from "../telemetry.ts";

// =============================================================================
// INTENT EXTRACTION PROMPT
// =============================================================================

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a website builder. Analyze the user's request and extract their intent.

## INTENT TYPES:
- create_project: Building a new project from scratch (e.g., "build me a bakery website")
- add_page: Adding a new page to existing project (e.g., "add a contact page")
- add_component: Adding a component to a page (e.g., "add a pricing section")
- modify_component: Changing an existing component (e.g., "change the hero color")
- fix_error: Fixing a bug or error (e.g., "the button doesn't work")
- style_change: Changing styling/design (e.g., "make it more modern")
- refactor: Restructuring code without changing behavior
- question: User is asking a question, not requesting changes

## OUTPUT FORMAT (JSON):
{
  "type": "create_project",
  "confidence": 0.95,
  "summary": "Build a bakery landing page with hero, gallery, and contact sections",
  "targetFiles": ["src/pages/Index.tsx", "src/components/Hero.tsx"],
  "requiresNewFiles": true,
  "isDestructive": false
}

## RULES:
1. If no existing files, assume create_project
2. If user mentions "add" or "create", it's likely add_page or add_component
3. If user mentions "change", "update", "fix", it's modify_component or fix_error
4. Confidence should be 0.0-1.0 based on clarity of intent
5. isDestructive is true if the change removes content`;

// =============================================================================
// KEYWORD-BASED INTENT DETECTION (FAST PATH)
// =============================================================================

function detectIntentFromKeywords(prompt: string, hasExistingFiles: boolean): IntentResult | null {
  const p = prompt.toLowerCase();
  
  // High-confidence patterns
  const patterns: Array<{ keywords: string[]; type: IntentType; confidence: number }> = [
    // Create project patterns
    { keywords: ["build me", "create a", "make a", "build a", "new website", "new project"], type: "create_project", confidence: 0.9 },
    
    // Add page patterns
    { keywords: ["add a page", "create a page", "new page for"], type: "add_page", confidence: 0.85 },
    { keywords: ["add about", "add contact", "add pricing", "add a pricing", "add a contact", "add an about"], type: "add_page", confidence: 0.85 },
    
    // Add component patterns
    { keywords: ["add a section", "add a hero", "add a footer", "add a navbar", "add a form", "add a button"], type: "add_component", confidence: 0.85 },
    
    // Modify patterns
    { keywords: ["change the", "update the", "modify the", "make the", "make it"], type: "modify_component", confidence: 0.8 },
    
    // Fix patterns
    { keywords: ["fix the", "doesn't work", "not working", "broken", "bug", "error"], type: "fix_error", confidence: 0.85 },
    
    // Style patterns
    { keywords: ["change color", "change style", "more modern", "make it look", "styling", "design"], type: "style_change", confidence: 0.8 },
    
    // Question patterns
    { keywords: ["how do i", "how can i", "what is", "can you explain", "tell me about"], type: "question", confidence: 0.9 },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => p.includes(kw))) {
      // Adjust for existing files
      if (!hasExistingFiles && pattern.type !== "create_project" && pattern.type !== "question") {
        // If no existing files, treat add/modify as create
        return {
          type: "create_project",
          confidence: 0.85,
          summary: `Create new project: ${prompt.slice(0, 100)}`,
          targetFiles: ["src/pages/Index.tsx"],
          requiresNewFiles: true,
          isDestructive: false,
        };
      }

      return {
        type: pattern.type,
        confidence: pattern.confidence,
        summary: prompt.slice(0, 100),
        targetFiles: [],
        requiresNewFiles: pattern.type === "create_project" || pattern.type === "add_page" || pattern.type === "add_component",
        isDestructive: false,
      };
    }
  }

  // Default: if no existing files, it's a new project
  if (!hasExistingFiles) {
    return {
      type: "create_project",
      confidence: 0.7,
      summary: `Create: ${prompt.slice(0, 100)}`,
      targetFiles: ["src/pages/Index.tsx"],
      requiresNewFiles: true,
      isDestructive: false,
    };
  }

  return null;
}

// =============================================================================
// AI-BASED INTENT DETECTION (FULL ANALYSIS)
// =============================================================================

async function detectIntentWithAI(
  prompt: string,
  existingFiles: string[],
  tracer: StageTracer
): Promise<IntentResult> {
  const startTime = Date.now();

  const userMessage = `User request: "${prompt}"

Existing files in project: ${existingFiles.length > 0 ? existingFiles.slice(0, 20).join(", ") : "None (new project)"}

Analyze this request and return the intent as JSON.`;

  try {
    const result = await callAI(
      "intent",
      [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { expectedFields: ["type", "confidence", "summary"] }
    );

    tracer.modelCall(result.provider, result.model, "intent", result.latencyMs, result.tokensUsed);

    // Parse JSON response
    let parsed: IntentResult;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Try to extract JSON from markdown
      const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error("Failed to parse intent response");
      }
    }

    // Validate and return
    return {
      type: parsed.type || "modify_component",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      summary: parsed.summary || prompt.slice(0, 100),
      targetFiles: Array.isArray(parsed.targetFiles) ? parsed.targetFiles : [],
      requiresNewFiles: Boolean(parsed.requiresNewFiles),
      isDestructive: Boolean(parsed.isDestructive),
    };
  } catch (error) {
    console.error("[Intent] AI detection failed:", error);
    
    // Fallback to basic detection
    return {
      type: existingFiles.length === 0 ? "create_project" : "modify_component",
      confidence: 0.5,
      summary: prompt.slice(0, 100),
      targetFiles: [],
      requiresNewFiles: existingFiles.length === 0,
      isDestructive: false,
    };
  }
}

// =============================================================================
// MAIN INTENT STAGE
// =============================================================================

export async function executeIntentStage(
  context: PipelineContext
): Promise<StageResult<IntentResult>> {
  const startTime = Date.now();
  const tracer = new StageTracer(context);
  
  tracer.stageStart("intent");

  const hasExistingFiles = context.existingFiles.length > 0;
  const existingFilePaths = context.existingFiles.map(f => f.path);

  // Try fast keyword-based detection first
  const keywordResult = detectIntentFromKeywords(context.originalPrompt, hasExistingFiles);
  
  if (keywordResult && keywordResult.confidence >= 0.85) {
    // High confidence from keywords, use it directly
    const duration = Date.now() - startTime;
    tracer.stageComplete("intent", true, duration, { 
      metadata: { method: "keywords", type: keywordResult.type } 
    });

    return {
      success: true,
      data: keywordResult,
      duration,
      canRetry: false,
    };
  }

  // Use AI for more complex intent detection
  try {
    const intent = await detectIntentWithAI(context.originalPrompt, existingFilePaths, tracer);
    const duration = Date.now() - startTime;

    tracer.stageComplete("intent", true, duration, { 
      metadata: { method: "ai", type: intent.type, confidence: intent.confidence } 
    });

    return {
      success: true,
      data: intent,
      duration,
      canRetry: true,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Intent detection failed";
    
    tracer.stageError("intent", errorMessage, duration);

    // Return fallback intent
    const fallbackIntent: IntentResult = {
      type: hasExistingFiles ? "modify_component" : "create_project",
      confidence: 0.3,
      summary: context.originalPrompt.slice(0, 100),
      targetFiles: [],
      requiresNewFiles: !hasExistingFiles,
      isDestructive: false,
    };

    return {
      success: true, // Still succeed with fallback
      data: fallbackIntent,
      duration,
      canRetry: false,
    };
  }
}
