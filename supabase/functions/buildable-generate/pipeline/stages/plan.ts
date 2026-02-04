// =============================================================================
// PLAN STAGE - Architecture planning and file structure design
// =============================================================================

import type { 
  PipelineContext, 
  StageResult, 
  ArchitecturePlan,
  IntentResult
} from "../types.ts";
import { callAI } from "../routing.ts";
import { StageTracer } from "../telemetry.ts";
import { buildContextSummary } from "../context.ts";

// =============================================================================
// ARCHITECT PROMPT
// =============================================================================

const ARCHITECT_SYSTEM_PROMPT = `You are Buildable's Architect AI — a world-class software architect who creates STUNNING, VISUALLY RICH websites.

## YOUR MISSION:
Analyze the user's request and create a PRECISE implementation plan with VISUAL EXCELLENCE.

## CRITICAL ANALYSIS:
1. Identify the EXACT type of website/app needed
2. List ALL required pages and components
3. Determine the BEST file structure
4. Specify exact features for each component
5. **SELECT RELEVANT UNSPLASH IMAGES** for the niche

## IMAGE STRATEGY:
- For EVERY project, select 3-8 HIGH-QUALITY Unsplash images
- Use SPECIFIC photo IDs for consistent, beautiful results
- Match images to the industry/niche

## CURATED IMAGE LIBRARY BY NICHE:
- Bakery/Cafe: photo-1509440159596-0249088772ff, photo-1555507036-ab1f4038808a, photo-1517433670267-30f41c41e0fe
- Restaurant/Food: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0, photo-1424847651672-bf20a4b0982b
- Fitness/Gym: photo-1534438327276-14e5300c3a48, photo-1571019613454-1cb2f99b2d8b, photo-1517836357463-d25dfeac3438
- SaaS/Tech: photo-1551288049-bebda4e38f71, photo-1460925895917-afdab827c52f, photo-1504868584819-f8e8b4b6d7e3
- Portfolio/Creative: photo-1558655146-d09347e92766, photo-1561070791-2526d30994b5, photo-1545235617-7a424c1a60cc
- E-commerce/Shop: photo-1472851294608-062f824d29cc, photo-1441986300917-64674bd600d8, photo-1555529669-e69e7aa0ba9a
- Real Estate: photo-1600596542815-ffad4c1539a9, photo-1600585154340-be6161a56a0c
- Healthcare/Medical: photo-1576091160550-2173dba999ef, photo-1631217868264-e5b90bb7e133
- Travel/Tourism: photo-1507525428034-b723cf961d3e, photo-1476514525535-07fb3b4ae5f1

## OUTPUT FORMAT (JSON):
{
  "projectType": "landing-page | e-commerce | dashboard | portfolio | blog | saas",
  "theme": { "primary": "purple", "style": "modern-gradient | minimal | bold | glass" },
  "pages": [
    { "path": "src/pages/Index.tsx", "purpose": "Main landing page", "sections": ["hero", "features", "gallery", "testimonials", "cta", "footer"] }
  ],
  "components": [
    { "path": "src/components/layout/Navbar.tsx", "features": ["logo", "nav-links", "mobile-menu", "cta-button"] },
    { "path": "src/components/Hero.tsx", "features": ["hero-image", "gradient-overlay", "headline", "subheadline", "cta-buttons"] }
  ],
  "routes": ["/", "/about", "/contact"],
  "images": [
    { "usage": "hero-bg", "url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80" },
    { "usage": "gallery-1", "url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80" }
  ],
  "specialInstructions": "Use warm browns and cream colors to match bakery aesthetic"
}

Be EXHAUSTIVE. Include SPECIFIC image URLs for the niche.`;

// =============================================================================
// PLAN FOR MODIFICATIONS
// =============================================================================

const MODIFY_ARCHITECT_PROMPT = `You are Buildable's Architect AI for MODIFICATIONS.

## YOUR MISSION:
Analyze the user's modification request and create a surgical update plan.

## RULES:
1. ONLY modify files that need to change
2. PRESERVE existing structure and styling
3. Be SPECIFIC about what changes in each file
4. Don't recreate files that already exist unless they need changes

## OUTPUT FORMAT (JSON):
{
  "projectType": "modification",
  "theme": { "primary": "existing", "style": "existing" },
  "pages": [],
  "components": [
    { "path": "src/components/Hero.tsx", "features": ["update-headline", "change-background-image"] }
  ],
  "routes": [],
  "images": [],
  "specialInstructions": "Only modify the hero section headline and background"
}`;

// =============================================================================
// PARSE PLAN RESPONSE
// =============================================================================

function parsePlanResponse(content: string): ArchitecturePlan {
  // Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through to default
      }
    }
  }

  // Return default plan
  return {
    projectType: "landing-page",
    theme: { primary: "purple", style: "modern-gradient" },
    pages: [{ path: "src/pages/Index.tsx", purpose: "Main page", sections: ["hero", "features", "cta"] }],
    components: [
      { path: "src/components/layout/Navbar.tsx", features: ["logo", "nav-links", "mobile-menu"] },
      { path: "src/components/Hero.tsx", features: ["headline", "cta-buttons"] },
    ],
    routes: ["/"],
    images: [],
    specialInstructions: "",
  };
}

// =============================================================================
// MAIN PLAN STAGE
// =============================================================================

export async function executePlanStage(
  context: PipelineContext
): Promise<StageResult<ArchitecturePlan>> {
  const startTime = Date.now();
  const tracer = new StageTracer(context);
  
  tracer.stageStart("plan");

  const intent = context.intent;
  const isNewProject = intent?.type === "create_project" || context.existingFiles.length === 0;
  const isModification = !isNewProject;

  // Build context summary for existing projects
  let contextInfo = "";
  if (context.projectContext) {
    contextInfo = buildContextSummary(context.projectContext);
  }

  // Select appropriate prompt
  const systemPrompt = isModification ? MODIFY_ARCHITECT_PROMPT : ARCHITECT_SYSTEM_PROMPT;

  // Build user message
  let userMessage = `User wants: "${context.originalPrompt}"`;
  
  if (isModification && contextInfo) {
    userMessage += `\n\n${contextInfo}`;
    userMessage += `\n\nExisting files: ${context.existingFiles.map(f => f.path).slice(0, 20).join(", ")}`;
  } else {
    userMessage += `\n\nExisting files: None - NEW PROJECT`;
  }

  try {
    const result = await callAI(
      "planning",
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { 
        expectedFields: ["projectType", "pages", "components"],
        temperature: 0.4, // Lower temperature for more consistent plans
      }
    );

    tracer.modelCall(result.provider, result.model, "planning", result.latencyMs, result.tokensUsed);

    const plan = parsePlanResponse(result.content);
    const duration = Date.now() - startTime;

    tracer.stageComplete("plan", true, duration, {
      metadata: {
        projectType: plan.projectType,
        pageCount: plan.pages.length,
        componentCount: plan.components.length,
      },
    });

    return {
      success: true,
      data: plan,
      duration,
      modelUsed: result.model,
      tokensUsed: result.tokensUsed,
      canRetry: true,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Planning failed";
    
    tracer.stageError("plan", errorMessage, duration);

    return {
      success: false,
      error: errorMessage,
      duration,
      canRetry: true,
    };
  }
}

// =============================================================================
// DEFAULT PLAN GENERATOR
// =============================================================================

export function generateDefaultPlan(prompt: string): ArchitecturePlan {
  const p = prompt.toLowerCase();
  
  // Detect project type from prompt
  let projectType = "landing-page";
  let style = "modern-gradient";
  let primary = "purple";
  
  if (p.includes("dashboard")) {
    projectType = "dashboard";
    style = "minimal";
  } else if (p.includes("portfolio")) {
    projectType = "portfolio";
    style = "minimal";
  } else if (p.includes("blog")) {
    projectType = "blog";
    style = "minimal";
  } else if (p.includes("shop") || p.includes("store") || p.includes("ecommerce")) {
    projectType = "e-commerce";
  } else if (p.includes("saas")) {
    projectType = "saas";
    style = "modern-gradient";
  }

  // Detect color preferences
  if (p.includes("blue")) primary = "blue";
  else if (p.includes("green")) primary = "green";
  else if (p.includes("red") || p.includes("warm")) primary = "rose";
  else if (p.includes("orange")) primary = "orange";

  return {
    projectType,
    theme: { primary, style },
    pages: [
      { path: "src/pages/Index.tsx", purpose: "Main landing page", sections: ["hero", "features", "gallery", "cta"] },
    ],
    components: [
      { path: "src/components/layout/Navbar.tsx", features: ["logo", "nav-links", "mobile-menu", "cta-button"] },
      { path: "src/components/Hero.tsx", features: ["hero-image", "gradient-overlay", "headline", "cta-buttons"] },
      { path: "src/components/Features.tsx", features: ["feature-grid", "icons"] },
      { path: "src/components/Gallery.tsx", features: ["image-grid", "hover-effects"] },
      { path: "src/components/CTA.tsx", features: ["cta-box", "buttons"] },
      { path: "src/components/layout/Footer.tsx", features: ["links", "social", "copyright"] },
    ],
    routes: ["/"],
    images: [],
    specialInstructions: "",
  };
}
