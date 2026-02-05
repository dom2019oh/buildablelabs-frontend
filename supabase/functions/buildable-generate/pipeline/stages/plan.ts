// =============================================================================
// PLAN STAGE - Enhanced Architecture Planning with Full-Stack Excellence
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
// ENHANCED ARCHITECT PROMPT - FULL-STACK GENERATION
// =============================================================================

const ARCHITECT_SYSTEM_PROMPT = `You are Buildable's Architect AI — a world-class software architect who creates STUNNING, VISUALLY RICH, PRODUCTION-READY websites.

## 🔥 FULL-STACK MINDSET (CRITICAL):
Even "simple" requests MUST get the FULL treatment:
- Plan 10-15 files minimum for every new project
- ALWAYS include: Gallery, Testimonials, CTA sections
- ALWAYS select 6-12 relevant Unsplash images
- NEVER plan "basic" or "minimal" output

## YOUR MISSION:
1. Identify the EXACT type of website/app needed
2. Plan 10-15 complete files with specific sections
3. Select 6-12 niche-appropriate Unsplash images
4. Specify exact features for EVERY component
5. Include animations and hover effects in requirements

## MANDATORY COMPONENTS FOR ALL PROJECTS:
1. Navbar (with mobile menu, CTA button, backdrop blur)
2. Hero (with full-bleed image, gradient overlay, gradient text)
3. Features (4-6 cards with icons, hover effects)
4. Gallery (4-8 real images, hover zoom)
5. Testimonials (3+ cards with avatars, star ratings)
6. CTA (gradient background, compelling copy)
7. Footer (multi-column, social icons, copyright)

## CURATED IMAGE LIBRARY (50+ IMAGES):

### BAKERY/CAFE:
- photo-1509440159596-0249088772ff (croissants - HERO)
- photo-1555507036-ab1f4038808a (bread loaves)
- photo-1517433670267-30f41c41e0fe (pastries)
- photo-1486427944544-d2c6e7f3b60c (baguettes)
- photo-1558961363-fa8fdf82db35 (donuts)
- photo-1495474472287-4d71bcdd2085 (coffee)

### RESTAURANT/FOOD:
- photo-1517248135467-4c7edcad34c4 (interior - HERO)
- photo-1414235077428-338989a2e8c0 (gourmet dish)
- photo-1424847651672-bf20a4b0982b (chef)
- photo-1555396273-367ea4eb4db5 (outdoor dining)
- photo-1504674900247-0877df9cc836 (plating)
- photo-1540189549336-e6e99c3679fe (ingredients)

### FITNESS/GYM:
- photo-1534438327276-14e5300c3a48 (gym - HERO)
- photo-1571019613454-1cb2f99b2d8b (workout)
- photo-1517836357463-d25dfeac3438 (weights)
- photo-1571019614242-c5c5dee9f50b (yoga)
- photo-1540497077202-7c8a3999166f (running)
- photo-1576678927484-cc907957088c (training)

### TECH/SAAS:
- photo-1551288049-bebda4e38f71 (dashboard - HERO)
- photo-1460925895917-afdab827c52f (data)
- photo-1504868584819-f8e8b4b6d7e3 (monitors)
- photo-1519389950473-47ba0277781c (team)
- photo-1535378620166-273708d44e4c (code)
- photo-1550751827-4bd374c3f58b (security)

### E-COMMERCE/SHOP:
- photo-1472851294608-062f824d29cc (shopping - HERO)
- photo-1441986300917-64674bd600d8 (store)
- photo-1555529669-e69e7aa0ba9a (products)
- photo-1607082348824-0a96f2a4b9da (cart)
- photo-1483985988355-763728e1935b (fashion)
- photo-1558618666-fcd25c85cd64 (beauty)

### PORTFOLIO/CREATIVE:
- photo-1558655146-d09347e92766 (studio - HERO)
- photo-1561070791-2526d30994b5 (workspace)
- photo-1545235617-7a424c1a60cc (tools)
- photo-1542744094-3a31f272c490 (photography)
- photo-1460661419201-fd4cecdf8a8b (art)
- photo-1513542789411-b6a5d4f31634 (design)

### REAL ESTATE:
- photo-1600596542815-ffad4c1539a9 (house - HERO)
- photo-1600585154340-be6161a56a0c (interior)
- photo-1600573472592-401b489a3cdc (living room)
- photo-1512917774080-9991f1c4c750 (luxury)
- photo-1560448204-e02f11c3d0e2 (modern)

### HEALTHCARE/MEDICAL:
- photo-1576091160550-2173dba999ef (team - HERO)
- photo-1631217868264-e5b90bb7e133 (doctor)
- photo-1579684385127-1ef15d508118 (healthcare)
- photo-1559839734-2b71ea197ec2 (nurse)

### TRAVEL/TOURISM:
- photo-1507525428034-b723cf961d3e (beach - HERO)
- photo-1476514525535-07fb3b4ae5f1 (waterfall)
- photo-1469474968028-56623f02e42e (mountain)
- photo-1488085061387-422e29b40080 (adventure)
- photo-1530789253388-582c481c54b0 (vacation)

### DEFAULT/PROFESSIONAL:
- photo-1557683316-973673baf926 (gradient - HERO)
- photo-1553356084-58ef4a67b2a7 (purple)
- photo-1618005182384-a83a8bd57fbe (colorful)
- photo-1557682224-5b8590cd9ec5 (blue)
- photo-1579546929518-9e396f3cc809 (abstract)

### AVATAR IMAGES (For Testimonials):
- photo-1494790108377-be9c29b29330 (woman 1)
- photo-1507003211169-0a1dd7228f2d (man 1)
- photo-1438761681033-6461ffad8d80 (woman 2)
- photo-1472099645785-5658abf4ff4e (man 2)
- photo-1544005313-94ddf0286df2 (woman 3)
- photo-1517841905240-472988babdf9 (woman 4)

## OUTPUT FORMAT (JSON):
{
  "projectType": "landing-page | e-commerce | dashboard | portfolio | blog | saas",
  "theme": { 
    "primary": "purple | blue | green | rose | orange", 
    "style": "modern-gradient | minimal | bold | glass" 
  },
  "pages": [
    { 
      "path": "src/pages/Index.tsx", 
      "purpose": "Main landing page", 
      "sections": ["hero", "features", "gallery", "testimonials", "cta", "footer"] 
    }
  ],
  "components": [
    { "path": "src/components/layout/Navbar.tsx", "features": ["logo", "nav-links", "mobile-menu", "cta-button", "backdrop-blur"] },
    { "path": "src/components/Hero.tsx", "features": ["hero-image", "gradient-overlay", "gradient-text", "headline", "subheadline", "two-cta-buttons", "badge"] },
    { "path": "src/components/Features.tsx", "features": ["6-feature-cards", "icons", "hover-effects", "grid-layout"] },
    { "path": "src/components/Gallery.tsx", "features": ["6-images", "hover-zoom", "grid-layout"] },
    { "path": "src/components/Testimonials.tsx", "features": ["3-cards", "avatars", "star-ratings", "quotes"] },
    { "path": "src/components/CTA.tsx", "features": ["gradient-background", "headline", "two-buttons"] },
    { "path": "src/components/layout/Footer.tsx", "features": ["multi-column-links", "social-icons", "copyright"] }
  ],
  "routes": ["/"],
  "images": [
    { "usage": "hero-bg", "url": "https://images.unsplash.com/photo-XXX?w=1920&q=80" },
    { "usage": "gallery-1", "url": "https://images.unsplash.com/photo-XXX?w=800&q=80" },
    { "usage": "gallery-2", "url": "https://images.unsplash.com/photo-XXX?w=800&q=80" },
    { "usage": "gallery-3", "url": "https://images.unsplash.com/photo-XXX?w=800&q=80" },
    { "usage": "avatar-1", "url": "https://images.unsplash.com/photo-XXX?w=100&q=80" },
    { "usage": "avatar-2", "url": "https://images.unsplash.com/photo-XXX?w=100&q=80" }
  ],
  "specialInstructions": "Include gradient text, glass effects, hover animations"
}

Be EXHAUSTIVE. Plan 10-15 files. Include 6-12 SPECIFIC image URLs.`;

// =============================================================================
// MODIFICATION ARCHITECT PROMPT
// =============================================================================

const MODIFY_ARCHITECT_PROMPT = `You are Buildable's Architect AI for MODIFICATIONS.

## RULES:
1. ONLY modify files that need to change
2. PRESERVE existing structure and styling
3. Be SPECIFIC about what changes in each file
4. Look for ENHANCEMENT opportunities (add hover effects, gradients, images)

## OUTPUT FORMAT (JSON):
{
  "projectType": "modification",
  "theme": { "primary": "existing", "style": "existing" },
  "pages": [],
  "components": [
    { "path": "src/components/Hero.tsx", "features": ["update-headline", "add-gradient-text", "add-animation"] }
  ],
  "routes": [],
  "images": [],
  "specialInstructions": "Enhance with gradient text and hover effects"
}`;

// =============================================================================
// PARSE PLAN RESPONSE
// =============================================================================

function parsePlanResponse(content: string): ArchitecturePlan {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through to default
      }
    }
  }

  // Return RICH default plan (not minimal)
  return generateDefaultPlan("");
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

  let contextInfo = "";
  if (context.projectContext) {
    contextInfo = buildContextSummary(context.projectContext);
  }

  const systemPrompt = isModification ? MODIFY_ARCHITECT_PROMPT : ARCHITECT_SYSTEM_PROMPT;

  let userMessage = `User wants: "${context.originalPrompt}"`;
  
  if (isModification && contextInfo) {
    userMessage += `\n\n${contextInfo}`;
    userMessage += `\n\nExisting files: ${context.existingFiles.map(f => f.path).slice(0, 20).join(", ")}`;
  } else {
    userMessage += `\n\nExisting files: None - NEW PROJECT (plan 10-15 files with 6-12 images)`;
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
        temperature: 0.4,
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
        imageCount: plan.images?.length || 0,
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
// ENHANCED DEFAULT PLAN GENERATOR
// =============================================================================

export function generateDefaultPlan(prompt: string): ArchitecturePlan {
  const p = prompt.toLowerCase();
  
  // Detect project type
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
  }

  // Detect color
  if (p.includes("blue")) primary = "blue";
  else if (p.includes("green")) primary = "green";
  else if (p.includes("red") || p.includes("warm")) primary = "rose";
  else if (p.includes("orange")) primary = "orange";

  // Detect niche for images
  let heroImage = "photo-1557683316-973673baf926";
  const galleryImages: string[] = [];
  const avatarImages = [
    "photo-1494790108377-be9c29b29330",
    "photo-1507003211169-0a1dd7228f2d",
    "photo-1438761681033-6461ffad8d80",
  ];
  
  if (p.includes("bakery") || p.includes("bread") || p.includes("pastry")) {
    heroImage = "photo-1509440159596-0249088772ff";
    galleryImages.push("photo-1555507036-ab1f4038808a", "photo-1517433670267-30f41c41e0fe", "photo-1486427944544-d2c6e7f3b60c", "photo-1558961363-fa8fdf82db35", "photo-1495474472287-4d71bcdd2085", "photo-1483695028939-5bb13f8648b0");
  } else if (p.includes("cafe") || p.includes("coffee")) {
    heroImage = "photo-1495474472287-4d71bcdd2085";
    galleryImages.push("photo-1442512595331-e89e73853f31", "photo-1501339847302-ac426a4a7cbb", "photo-1511920170033-f8396924c348", "photo-1559496417-e7f25cb247f3", "photo-1509042239860-f550ce710b93");
  } else if (p.includes("restaurant") || p.includes("food")) {
    heroImage = "photo-1517248135467-4c7edcad34c4";
    galleryImages.push("photo-1414235077428-338989a2e8c0", "photo-1424847651672-bf20a4b0982b", "photo-1555396273-367ea4eb4db5", "photo-1504674900247-0877df9cc836", "photo-1540189549336-e6e99c3679fe");
  } else if (p.includes("fitness") || p.includes("gym")) {
    heroImage = "photo-1534438327276-14e5300c3a48";
    galleryImages.push("photo-1571019613454-1cb2f99b2d8b", "photo-1517836357463-d25dfeac3438", "photo-1571019614242-c5c5dee9f50b", "photo-1540497077202-7c8a3999166f", "photo-1576678927484-cc907957088c");
  } else if (p.includes("tech") || p.includes("saas") || p.includes("software")) {
    heroImage = "photo-1551288049-bebda4e38f71";
    galleryImages.push("photo-1460925895917-afdab827c52f", "photo-1504868584819-f8e8b4b6d7e3", "photo-1519389950473-47ba0277781c", "photo-1535378620166-273708d44e4c", "photo-1550751827-4bd374c3f58b");
  } else if (p.includes("shop") || p.includes("store") || p.includes("ecommerce")) {
    heroImage = "photo-1472851294608-062f824d29cc";
    galleryImages.push("photo-1441986300917-64674bd600d8", "photo-1555529669-e69e7aa0ba9a", "photo-1607082348824-0a96f2a4b9da", "photo-1483985988355-763728e1935b", "photo-1558618666-fcd25c85cd64");
  } else if (p.includes("portfolio") || p.includes("creative")) {
    heroImage = "photo-1558655146-d09347e92766";
    galleryImages.push("photo-1561070791-2526d30994b5", "photo-1545235617-7a424c1a60cc", "photo-1542744094-3a31f272c490", "photo-1460661419201-fd4cecdf8a8b", "photo-1513542789411-b6a5d4f31634");
  } else if (p.includes("real estate") || p.includes("property")) {
    heroImage = "photo-1600596542815-ffad4c1539a9";
    galleryImages.push("photo-1600585154340-be6161a56a0c", "photo-1600573472592-401b489a3cdc", "photo-1512917774080-9991f1c4c750", "photo-1560448204-e02f11c3d0e2", "photo-1565538810643-b5bdb714032a");
  } else if (p.includes("travel") || p.includes("tourism")) {
    heroImage = "photo-1507525428034-b723cf961d3e";
    galleryImages.push("photo-1476514525535-07fb3b4ae5f1", "photo-1469474968028-56623f02e42e", "photo-1488085061387-422e29b40080", "photo-1530789253388-582c481c54b0", "photo-1501785888041-af3ef285b470");
  } else {
    // Default professional images
    galleryImages.push("photo-1553356084-58ef4a67b2a7", "photo-1618005182384-a83a8bd57fbe", "photo-1557682224-5b8590cd9ec5", "photo-1579546929518-9e396f3cc809", "photo-1557683316-973673baf926");
  }

  // Build images array
  const images = [
    { usage: "hero-bg", url: `https://images.unsplash.com/${heroImage}?w=1920&q=80` },
    ...galleryImages.map((id, i) => ({ usage: `gallery-${i + 1}`, url: `https://images.unsplash.com/${id}?w=800&q=80` })),
    ...avatarImages.map((id, i) => ({ usage: `avatar-${i + 1}`, url: `https://images.unsplash.com/${id}?w=100&q=80` })),
  ];

  return {
    projectType,
    theme: { primary, style },
    pages: [
      { path: "src/pages/Index.tsx", purpose: "Main landing page", sections: ["hero", "features", "gallery", "testimonials", "cta", "footer"] },
    ],
    components: [
      { path: "src/components/layout/Navbar.tsx", features: ["logo", "nav-links", "mobile-menu", "cta-button", "backdrop-blur"] },
      { path: "src/components/Hero.tsx", features: ["hero-image", "gradient-overlay", "gradient-text", "headline", "subheadline", "two-cta-buttons", "badge"] },
      { path: "src/components/Features.tsx", features: ["6-feature-cards", "icons", "hover-effects", "grid-layout"] },
      { path: "src/components/Gallery.tsx", features: ["6-images", "hover-zoom", "grid-layout"] },
      { path: "src/components/Testimonials.tsx", features: ["3-cards", "avatars", "star-ratings", "quotes"] },
      { path: "src/components/CTA.tsx", features: ["gradient-background", "headline", "two-buttons"] },
      { path: "src/components/layout/Footer.tsx", features: ["multi-column-links", "social-icons", "copyright"] },
    ],
    routes: ["/"],
    images,
    specialInstructions: "Include gradient text, glass effects, hover animations on all interactive elements",
  };
}
