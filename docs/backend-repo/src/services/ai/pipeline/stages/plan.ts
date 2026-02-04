// =============================================================================
// STAGE 3: ARCHITECTURE PLANNING
// =============================================================================

import type { PipelineContext, ArchitecturePlan, StageResult } from "../types";
import { callAIWithFallback } from "../routing";

// =============================================================================
// ARCHITECT PROMPT
// =============================================================================

const ARCHITECT_PROMPT = `You are Buildable's Architect AI — a world-class software architect who creates STUNNING, VISUALLY RICH websites.

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
- Restaurant/Food: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0
- Fitness/Gym: photo-1534438327276-14e5300c3a48, photo-1571019613454-1cb2f99b2d8b
- SaaS/Tech: photo-1551288049-bebda4e38f71, photo-1460925895917-afdab827c52f
- Portfolio/Creative: photo-1558655146-d09347e92766, photo-1561070791-2526d30994b5
- E-commerce/Shop: photo-1472851294608-062f824d29cc, photo-1441986300917-64674bd600d8
- Real Estate: photo-1600596542815-ffad4c1539a9, photo-1600585154340-be6161a56a0c
- Travel/Tourism: photo-1507525428034-b723cf961d3e, photo-1476514525535-07fb3b4ae5f1

## OUTPUT FORMAT (JSON only):
{
  "projectType": "landing-page | e-commerce | dashboard | portfolio | blog | saas",
  "theme": { "primary": "purple", "style": "modern-gradient | minimal | bold | glass" },
  "pages": [
    { "path": "src/pages/Index.tsx", "purpose": "Main landing page", "sections": ["hero", "features", "gallery", "cta", "footer"] }
  ],
  "components": [
    { "path": "src/components/layout/Navbar.tsx", "features": ["logo", "nav-links", "mobile-menu", "cta-button"] },
    { "path": "src/components/Hero.tsx", "features": ["hero-image", "gradient-overlay", "headline", "cta-buttons"] }
  ],
  "routes": ["/", "/about", "/contact"],
  "images": [
    { "usage": "hero-bg", "url": "https://images.unsplash.com/photo-XXXXX?w=1920&q=80" }
  ],
  "specialInstructions": "Any specific styling or feature notes"
}

Return ONLY valid JSON.`;

// =============================================================================
// EXECUTE PLAN STAGE
// =============================================================================

export async function executePlanStage(context: PipelineContext): Promise<StageResult<ArchitecturePlan>> {
  const startTime = Date.now();

  try {
    const existingFilesList = context.existingFiles.length > 0
      ? context.existingFiles.map(f => f.path).join(", ")
      : "None - NEW PROJECT";

    const messages = [
      { role: "system", content: ARCHITECT_PROMPT },
      { 
        role: "user", 
        content: `User wants: "${context.originalPrompt}"\n\nExisting files: ${existingFilesList}\n\nCreate the architecture plan.` 
      },
    ];

    const result = await callAIWithFallback("planning", messages);
    context.modelsUsed.push(`Plan: ${result.provider}/${result.model}`);

    // Parse JSON from response
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]) as ArchitecturePlan;
      
      // Ensure required fields
      plan.projectType = plan.projectType || "landing-page";
      plan.theme = plan.theme || { primary: "purple", style: "modern-gradient" };
      plan.pages = plan.pages || [];
      plan.components = plan.components || [];
      plan.routes = plan.routes || ["/"];
      plan.images = plan.images || [];

      return {
        success: true,
        data: plan,
        duration: Date.now() - startTime,
        modelUsed: `${result.provider}/${result.model}`,
      };
    }

    throw new Error("No valid JSON in response");

  } catch (error) {
    console.warn("[Plan] AI planning failed, using defaults:", error);
    
    return {
      success: true,
      data: generateDefaultPlan(context.originalPrompt),
      duration: Date.now() - startTime,
    };
  }
}

// =============================================================================
// DEFAULT PLAN GENERATOR
// =============================================================================

export function generateDefaultPlan(prompt: string): ArchitecturePlan {
  const p = prompt.toLowerCase();
  
  // Detect niche
  let nicheType = "default";
  let heroImage = "photo-1557683316-973673baf926";
  
  if (p.includes("bakery") || p.includes("bread") || p.includes("pastry")) {
    nicheType = "bakery";
    heroImage = "photo-1509440159596-0249088772ff";
  } else if (p.includes("restaurant") || p.includes("food") || p.includes("cafe")) {
    nicheType = "restaurant";
    heroImage = "photo-1517248135467-4c7edcad34c4";
  } else if (p.includes("fitness") || p.includes("gym")) {
    nicheType = "fitness";
    heroImage = "photo-1534438327276-14e5300c3a48";
  } else if (p.includes("tech") || p.includes("saas") || p.includes("software")) {
    nicheType = "tech";
    heroImage = "photo-1551288049-bebda4e38f71";
  } else if (p.includes("shop") || p.includes("store") || p.includes("ecommerce")) {
    nicheType = "ecommerce";
    heroImage = "photo-1472851294608-062f824d29cc";
  } else if (p.includes("portfolio") || p.includes("creative")) {
    nicheType = "portfolio";
    heroImage = "photo-1558655146-d09347e92766";
  }

  return {
    projectType: nicheType === "portfolio" ? "portfolio" : "landing-page",
    theme: { primary: "purple", style: "modern-gradient" },
    pages: [
      { path: "src/pages/Index.tsx", purpose: "Main landing page", sections: ["hero", "features", "gallery", "cta", "footer"] },
    ],
    components: [
      { path: "src/components/layout/Navbar.tsx", features: ["logo", "nav-links", "mobile-menu", "cta-button"] },
      { path: "src/components/Hero.tsx", features: ["hero-image", "gradient-overlay", "headline", "cta-buttons"] },
      { path: "src/components/Features.tsx", features: ["icon-cards", "grid-layout", "descriptions"] },
      { path: "src/components/Gallery.tsx", features: ["image-grid", "hover-effects", "modal-view"] },
      { path: "src/components/CTA.tsx", features: ["gradient-bg", "headline", "action-buttons"] },
      { path: "src/components/layout/Footer.tsx", features: ["links", "social-icons", "copyright"] },
    ],
    routes: ["/"],
    images: [
      { usage: "hero-bg", url: `https://images.unsplash.com/${heroImage}?w=1920&q=80` },
    ],
    specialInstructions: `Create a modern ${nicheType} website with stunning visuals`,
  };
}
