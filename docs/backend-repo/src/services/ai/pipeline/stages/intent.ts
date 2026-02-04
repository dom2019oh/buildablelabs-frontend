// =============================================================================
// STAGE 1: INTENT EXTRACTION
// =============================================================================

import type { PipelineContext, IntentResult, StageResult } from "../types";
import { callAIWithFallback } from "../routing";

// =============================================================================
// INTENT PROMPT
// =============================================================================

const INTENT_PROMPT = `You are an intent classifier for a website builder AI.

Analyze the user's request and extract:
1. The TYPE of request (create, modify, question, debug, refactor)
2. The PRIMARY ACTION to take
3. KEY ENTITIES mentioned (project type, components, features)
4. Whether NEW FILES are needed
5. Whether EXISTING FILES need to be modified

## OUTPUT FORMAT (JSON only):
{
  "type": "create" | "modify" | "question" | "debug" | "refactor",
  "confidence": 0.0-1.0,
  "primaryAction": "short description of main action",
  "entities": {
    "projectType": "landing-page | e-commerce | dashboard | portfolio | blog | saas | null",
    "components": ["Navbar", "Hero", "Footer", ...],
    "features": ["contact form", "image gallery", ...],
    "modifications": ["change color", "add section", ...]
  },
  "requiresNewFiles": true/false,
  "requiresExistingFiles": true/false
}

Be precise. Return ONLY valid JSON.`;

// =============================================================================
// EXECUTE INTENT STAGE
// =============================================================================

export async function executeIntentStage(context: PipelineContext): Promise<StageResult<IntentResult>> {
  const startTime = Date.now();

  try {
    // Quick heuristic check for simple cases
    const prompt = context.originalPrompt.toLowerCase();
    
    // Question detection
    if (
      prompt.includes("how do i") ||
      prompt.includes("what is") ||
      prompt.includes("can you explain") ||
      prompt.includes("help me understand") ||
      prompt.endsWith("?")
    ) {
      return {
        success: true,
        data: {
          type: "question",
          confidence: 0.95,
          primaryAction: "Answer user question",
          entities: {},
          requiresNewFiles: false,
          requiresExistingFiles: false,
        },
        duration: Date.now() - startTime,
      };
    }

    // New project detection
    const isNewProject = context.existingFiles.length === 0;
    if (isNewProject) {
      // Use AI for detailed intent extraction on new projects
      const messages = [
        { role: "system", content: INTENT_PROMPT },
        { role: "user", content: `User request: "${context.originalPrompt}"\n\nExisting files: None (new project)\n\nExtract the intent.` },
      ];

      const result = await callAIWithFallback("intent", messages);
      context.modelsUsed.push(`Intent: ${result.provider}/${result.model}`);

      try {
        // Parse JSON from response
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const intent = JSON.parse(jsonMatch[0]) as IntentResult;
          return {
            success: true,
            data: intent,
            duration: Date.now() - startTime,
            modelUsed: `${result.provider}/${result.model}`,
          };
        }
      } catch (parseError) {
        console.warn("[Intent] Failed to parse AI response, using heuristics");
      }
    }

    // Heuristic fallback for modifications
    const isCreate = prompt.includes("create") || prompt.includes("build") || prompt.includes("make") || prompt.includes("generate");
    const isModify = prompt.includes("change") || prompt.includes("update") || prompt.includes("modify") || prompt.includes("add") || prompt.includes("remove");

    return {
      success: true,
      data: {
        type: isCreate && !context.existingFiles.length ? "create" : isModify ? "modify" : "create",
        confidence: 0.75,
        primaryAction: context.originalPrompt.slice(0, 50),
        entities: {
          projectType: detectProjectType(prompt),
          components: detectComponents(prompt),
          features: [],
          modifications: [],
        },
        requiresNewFiles: isCreate || isNewProject,
        requiresExistingFiles: isModify || context.existingFiles.length > 0,
      },
      duration: Date.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Intent extraction failed",
      duration: Date.now() - startTime,
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function detectProjectType(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("bakery") || p.includes("cafe") || p.includes("restaurant")) return "landing-page";
  if (p.includes("portfolio")) return "portfolio";
  if (p.includes("e-commerce") || p.includes("shop") || p.includes("store")) return "e-commerce";
  if (p.includes("dashboard")) return "dashboard";
  if (p.includes("blog")) return "blog";
  if (p.includes("saas")) return "saas";
  return "landing-page";
}

function detectComponents(prompt: string): string[] {
  const components: string[] = [];
  const p = prompt.toLowerCase();
  
  if (p.includes("navbar") || p.includes("nav") || p.includes("menu")) components.push("Navbar");
  if (p.includes("hero")) components.push("Hero");
  if (p.includes("footer")) components.push("Footer");
  if (p.includes("contact") || p.includes("form")) components.push("Contact");
  if (p.includes("gallery") || p.includes("images")) components.push("Gallery");
  if (p.includes("pricing")) components.push("Pricing");
  if (p.includes("testimonial") || p.includes("review")) components.push("Testimonials");
  if (p.includes("feature")) components.push("Features");
  if (p.includes("about")) components.push("About");
  if (p.includes("cta") || p.includes("call to action")) components.push("CTA");
  
  return components;
}
