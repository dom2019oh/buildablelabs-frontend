// =============================================================================
// PLAN STAGE - Architecture Planning with enhanced context
// =============================================================================

import type { PipelineContext, StageResult, ArchitecturePlan } from "../types";
import { callAI, getContextLimits, getAvailableProviders, profileRequest } from "../routing";
import { StageTracer } from "../telemetry";

const PLAN_PROMPT = `You are an architect for a website builder. Create implementation plans.

OUTPUT JSON:
{
  "projectType": "landing-page|portfolio|ecommerce|saas",
  "theme": {"primary":"purple","style":"modern"},
  "pages": [{"path":"src/pages/Index.tsx","purpose":"Main page"}],
  "components": [{"path":"src/components/Hero.tsx","features":["image","gradient"]}],
  "routes": ["/"],
  "images": [{"usage":"hero","url":"https://images.unsplash.com/photo-XXX?w=1920&q=80"}]
}

IMAGE IDS BY NICHE:
- Bakery: photo-1509440159596-0249088772ff, photo-1555507036-ab1f4038808a
- Cafe: photo-1495474472287-4d71bcdd2085
- Restaurant: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0
- Fitness: photo-1534438327276-14e5300c3a48, photo-1571019613454-1cb2f99b2d8b
- Tech/SaaS: photo-1551288049-bebda4e38f71, photo-1460925895917-afdab827c52f
- E-commerce: photo-1472851294608-062f824d29cc, photo-1441986300917-64674bd600d8
- Portfolio: photo-1558655146-d09347e92766, photo-1561070791-2526d30994b5
- Real Estate: photo-1600596542815-ffad4c1539a9, photo-1600585154340-be6161a56a0c
- Travel: photo-1507525428034-b723cf961d3e, photo-1476514525535-07fb3b4ae5f1

Always include: Navbar, Hero, Features, Gallery, Testimonials, CTA, Footer.
Return ONLY valid JSON.`;

export async function executePlanStage(ctx: PipelineContext): Promise<StageResult<ArchitecturePlan>> {
  const start = Date.now();
  const tracer = new StageTracer(ctx);
  tracer.stageStart("plan");

  // Use provider-aware context limits for existing files
  const available = getAvailableProviders();
  const planningProvider = available.includes("gemini") ? "gemini" : available[0] || "grok";
  const limits = getContextLimits(planningProvider as any);

  let existingContext: string;
  if (ctx.existingFiles.length > 0) {
    const filesToShow = ctx.existingFiles.slice(0, limits.maxFiles);
    existingContext = filesToShow
      .map(f => `${f.path} (${f.content.slice(0, limits.maxCharsPerFile).length} chars)`)
      .join(", ");
    
    if (ctx.existingFiles.length > limits.maxFiles) {
      existingContext += ` ... and ${ctx.existingFiles.length - limits.maxFiles} more`;
    }
  } else {
    existingContext = "None (new project)";
  }

  // Profile request for smart routing
  const profile = profileRequest(
    ctx.originalPrompt,
    ctx.existingFiles.map(f => ({ path: f.path, content: f.content })),
  );

  try {
    const result = await callAI("planning", [
      { role: "system", content: PLAN_PROMPT },
      { role: "user", content: `Request: "${ctx.originalPrompt}"\nExisting: ${existingContext}\n\nCreate plan.` },
    ], { temperature: 0.3, maxTokens: 4000, profile });

    tracer.modelCall(result.provider, result.model, "planning", result.latencyMs, result.tokensUsed);

    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) {
      const plan = JSON.parse(match[0]) as ArchitecturePlan;
      plan.projectType = plan.projectType || "landing-page";
      plan.theme = plan.theme || { primary: "purple", style: "modern" };
      plan.pages = plan.pages || [];
      plan.components = plan.components || [];
      plan.routes = plan.routes || ["/"];
      plan.images = plan.images || [];

      tracer.stageComplete("plan", true, Date.now() - start, {});
      return { success: true, data: plan, duration: Date.now() - start, canRetry: true };
    }

    throw new Error("No JSON in response");
  } catch (e) {
    const plan = getDefaultPlan(ctx.originalPrompt);
    tracer.stageComplete("plan", true, Date.now() - start, { metadata: { fallback: true } });
    return { success: true, data: plan, duration: Date.now() - start, canRetry: false };
  }
}

function getDefaultPlan(prompt: string): ArchitecturePlan {
  const p = prompt.toLowerCase();
  let img = "photo-1557683316-973673baf926";
  if (p.includes("bakery")) img = "photo-1509440159596-0249088772ff";
  else if (p.includes("restaurant")) img = "photo-1517248135467-4c7edcad34c4";
  else if (p.includes("fitness")) img = "photo-1534438327276-14e5300c3a48";
  else if (p.includes("tech") || p.includes("saas")) img = "photo-1551288049-bebda4e38f71";
  else if (p.includes("shop")) img = "photo-1472851294608-062f824d29cc";
  else if (p.includes("portfolio")) img = "photo-1558655146-d09347e92766";
  else if (p.includes("real estate")) img = "photo-1600596542815-ffad4c1539a9";
  else if (p.includes("travel")) img = "photo-1507525428034-b723cf961d3e";

  return {
    projectType: "landing-page",
    theme: { primary: "purple", style: "modern" },
    pages: [{ path: "src/pages/Index.tsx", purpose: "Main" }],
    components: [
      { path: "src/components/layout/Navbar.tsx", features: ["logo", "menu"] },
      { path: "src/components/Hero.tsx", features: ["image", "gradient"] },
      { path: "src/components/Features.tsx", features: ["cards"] },
      { path: "src/components/Gallery.tsx", features: ["grid"] },
      { path: "src/components/Testimonials.tsx", features: ["cards"] },
      { path: "src/components/CTA.tsx", features: ["gradient"] },
      { path: "src/components/layout/Footer.tsx", features: ["links"] },
    ],
    routes: ["/"],
    images: [{ usage: "hero", url: `https://images.unsplash.com/${img}?w=1920&q=80` }],
  };
}
