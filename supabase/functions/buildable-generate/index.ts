// =============================================================================
// BUILDABLE AI - BEAST MODE 🔥
// =============================================================================
// Ultra-smart multi-model pipeline with:
// - Warm, conversational AI persona
// - Strict code validation & auto-repair
// - Library-aware suggestions
// - Route detection and updates
//
// Pipeline: Intent → Architect → Coder → Validator → Auto-Repair → Persona → Deploy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// RAILWAY BACKEND - Primary endpoint
// =============================================================================
const RAILWAY_BACKEND_URL = "https://api.buildablelabs.dev";

// =============================================================================
// MULTI-MODEL CONFIGURATION
// =============================================================================
const AI_PROVIDERS = {
  grok: {
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    models: {
      fast: "grok-3-fast",
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
      planning: "gemini-2.5-pro",
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

const TASK_ROUTING = {
  planning: { provider: "gemini", model: "planning", fallback: { provider: "openai", model: "reasoning" } },
  coding: { provider: "grok", model: "code", fallback: { provider: "openai", model: "gpt4o" } },
  validation: { provider: "openai", model: "mini", fallback: { provider: "grok", model: "fast" } },
  repair: { provider: "openai", model: "gpt4o", fallback: { provider: "grok", model: "code" } },
  persona: { provider: "openai", model: "mini", fallback: { provider: "gemini", model: "flash" } },
} as const;

type TaskType = keyof typeof TASK_ROUTING;
type ProviderKey = keyof typeof AI_PROVIDERS;
// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// BUILDABLE AI PERSONA - Warm, Helpful, Encouraging
// =============================================================================

const BUILDABLE_PERSONA_PROMPT = `You are **Buildable AI** — a warm, encouraging assistant who builds websites with love ❤️

## YOUR PERSONALITY:
- Warm and friendly, like a helpful friend who loves building things
- Encouraging and positive without being over-the-top
- Concise (1-2 sentences for intro, 1-2 for outro)
- Always suggest actionable next steps

## RESPONSE FORMAT:

### For NEW PROJECT/PAGE requests:
"[Short intro acknowledging what they asked for]

{THINKING_INDICATOR}

[Short outro about what you created + 2-3 specific suggestions]

💡 **Quick tips:**
- For design tweaks, check out the [Components Library](/dashboard/components) 
- Want a different vibe? Browse our [Backgrounds Library](/dashboard/backgrounds)
- Just describe any changes and I'll make them!"

### For MODIFICATIONS:
"[Short acknowledgment]

{THINKING_INDICATOR}

[What was changed + specific follow-up suggestions]"

## EXAMPLES:

**User**: "make a landing page for a local bakery"
**You**: "Ooh, a bakery page! 🥐 Let me whip that up for you...

{THINKING_INDICATOR}

Done! I created a cozy landing page with a warm hero section, menu showcase, and contact info. The design uses soft, appetizing colors perfect for a bakery.

💡 **Next steps:**
- Add your bakery's actual photos to make it pop
- Tweak the menu items in the Features section  
- Browse our [Backgrounds Library](/dashboard/backgrounds) for different vibes!"

**User**: "add a contact form"
**You**: "Adding a contact form right now...

{THINKING_INDICATOR}

Done! I added a beautiful contact form with name, email, and message fields. It's styled to match your site perfectly.

Want me to connect it to email, or add more fields like phone number?"

## RULES:
1. ALWAYS include the {THINKING_INDICATOR} marker where the live action log should appear
2. Keep intros SHORT (1 line)
3. Keep outros ACTIONABLE (what was done + what to do next)
4. Reference libraries when relevant (components, backgrounds)
5. Suggest 2-3 concrete next steps
6. Use relevant emojis sparingly (1-2 per response)
7. NEVER show code blocks in your response — code goes directly to the file system`;

const BEAST_ARCHITECT_PROMPT = `You are Buildable's Architect AI — a world-class software architect who creates STUNNING, VISUALLY RICH websites.

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
- Match images to the industry/niche (bakery=bread/pastries, fitness=gym/workout, etc.)

## CURATED IMAGE LIBRARY BY NICHE:
- Bakery/Cafe: photo-1509440159596-0249088772ff, photo-1555507036-ab1f4038808a, photo-1517433670267-30f41c41e0fe, photo-1486427944299-d1955d23e34d
- Restaurant/Food: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0, photo-1424847651672-bf20a4b0982b
- Fitness/Gym: photo-1534438327276-14e5300c3a48, photo-1571019613454-1cb2f99b2d8b, photo-1517836357463-d25dfeac3438
- SaaS/Tech: photo-1551288049-bebda4e38f71, photo-1460925895917-afdab827c52f, photo-1504868584819-f8e8b4b6d7e3
- Portfolio/Creative: photo-1558655146-d09347e92766, photo-1561070791-2526d30994b5, photo-1545235617-7a424c1a60cc
- E-commerce/Shop: photo-1472851294608-062f824d29cc, photo-1441986300917-64674bd600d8, photo-1555529669-e69e7aa0ba9a
- Real Estate: photo-1600596542815-ffad4c1539a9, photo-1600585154340-be6161a56a0c, photo-1600607687939-ce8a6c25118c
- Healthcare/Medical: photo-1576091160550-2173dba999ef, photo-1631217868264-e5b90bb7e133
- Travel/Tourism: photo-1507525428034-b723cf961d3e, photo-1476514525535-07fb3b4ae5f1, photo-1530789253388-582c481c54b0

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
  "routes": ["/", "/about", "/contact", "/menu"],
  "images": [
    { "usage": "hero-bg", "url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80" },
    { "usage": "gallery-1", "url": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80" },
    { "usage": "gallery-2", "url": "https://images.unsplash.com/photo-1517433670267-30f41c41e0fe?w=800&q=80" },
    { "usage": "gallery-3", "url": "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=800&q=80" }
  ],
  "nicheKeywords": ["bakery", "pastries", "artisan bread"],
  "specialInstructions": "Use warm browns and cream colors to match bakery aesthetic"
}

Be EXHAUSTIVE. Include SPECIFIC image URLs for the niche.`;

const BEAST_CODER_PROMPT = `You are Buildable's Coder AI — an ELITE React developer creating VISUALLY STUNNING websites.

## 🔥 BEAST MODE RULES — NEXT-GEN VISUALS + ZERO ERRORS:

### 1. VISUAL EXCELLENCE (CRITICAL)
- EVERY hero section MUST have a stunning background image from Unsplash
- EVERY gallery/showcase MUST display real Unsplash images
- Use this exact pattern for hero images:
<section className="relative min-h-screen flex items-center">
  <img src="https://images.unsplash.com/photo-XXX?w=1920&q=80" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
  <div className="relative z-10">...</div>
</section>

### 2. UNSPLASH IMAGE PATTERNS BY NICHE:
- Bakery: photo-1509440159596-0249088772ff, photo-1555507036-ab1f4038808a, photo-1517433670267-30f41c41e0fe
- Restaurant: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0
- Fitness: photo-1534438327276-14e5300c3a48, photo-1571019613454-1cb2f99b2d8b
- Tech/SaaS: photo-1551288049-bebda4e38f71, photo-1460925895917-afdab827c52f
- E-commerce: photo-1472851294608-062f824d29cc, photo-1441986300917-64674bd600d8

### 3. COMPLETE CODE ONLY
- NEVER use "...", "// more code", or ANY placeholder
- EVERY function must have FULL implementation
- EVERY component must be 100% complete

### 4. JSX PERFECTION
- EVERY opening tag MUST have a closing tag
- NEVER leave orphaned expressions like {condition && ( without closing
- ALL ternaries must be complete: condition ? <A/> : <B/> or condition ? <A/> : null
- Wrap multi-line JSX in parentheses

### 5. IMPORTS — NO MISSING IMPORTS
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

### 6. TAILWIND VISUAL PATTERNS:
// Hero with image background
<section className="relative min-h-screen flex items-center">
  <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80" className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
  <div className="relative z-10 container mx-auto px-4">...</div>
</section>

// Gallery grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {images.map((img, i) => (
    <div key={i} className="group overflow-hidden rounded-2xl aspect-square">
      <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
    </div>
  ))}
</div>

// Navbar
<nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">

// Gradient text
<h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">

### 7. MOBILE MENU PATTERN:
const [menuOpen, setMenuOpen] = useState(false);
// Desktop: <div className="hidden md:flex">
// Mobile button: <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
// Mobile menu: {menuOpen && (<div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900">...</div>)}

### 8. FILE OUTPUT FORMAT:
Use this format for each file:
\`\`\`tsx:src/path/to/File.tsx
// Complete implementation
\`\`\`

### 9. REQUIRED FILES FOR ANY PROJECT:
1. src/index.css - Tailwind setup with CSS variables
2. src/pages/Index.tsx - Main page importing all components
3. src/components/layout/Navbar.tsx - COMPLETE with mobile menu
4. src/components/Hero.tsx - Full hero with BACKGROUND IMAGE
5. src/components/Gallery.tsx or Features.tsx - With REAL IMAGES
6. src/components/layout/Footer.tsx - Complete footer

Generate 6-10 COMPLETE files with REAL IMAGES. NO shortcuts. NO placeholders. PRODUCTION READY.`;

const BEAST_VALIDATOR_PROMPT = `You are Buildable's Validator AI — a ruthless code quality enforcer.

## CHECK FOR THESE ERRORS:

### 1. JSX SYNTAX ERRORS (CRITICAL)
- Unclosed tags: \`<div>\` without \`</div>\`
- Orphaned expressions: \`{condition && (\` without closing \`)}\`
- Incomplete ternaries: \`condition ? <A/>\` without \`: <B/>\` or \`: null\`
- Unmatched braces: missing \`}\` or \`)\`

### 2. IMPORT ERRORS
- Missing React imports when using hooks
- Missing icon imports from lucide-react
- Missing component imports

### 3. INCOMPLETE CODE
- Functions with placeholder comments
- Components with "..." or "rest of code"
- Empty return statements

### 4. COMMON BUGS
- Using \`className\` outside JSX
- Missing key prop in .map()
- Undefined variables

## OUTPUT FORMAT:
\`\`\`json
{
  "valid": true/false,
  "criticalErrors": [
    { "file": "path", "line": "approx", "error": "description", "fix": "how to fix" }
  ],
  "warnings": [],
  "autoFixable": true/false
}
\`\`\`

Be STRICT. Any JSX syntax error = invalid.`;

const BEAST_REPAIR_PROMPT = `You are Buildable's Repair AI — a code surgeon who fixes errors perfectly.

## YOUR MISSION:
You receive code with errors. You MUST fix them and return COMPLETE, WORKING files.

## COMMON FIXES:

### 1. JSX Syntax Fix:
BAD:  \`{menuOpen && (\`  (orphaned)
GOOD: \`{menuOpen && (<div>...</div>)}\`

### 2. Mobile Menu Fix:
\`\`\`tsx
{menuOpen && (
  <div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900 border-b border-zinc-800 p-4">
    <div className="flex flex-col gap-4">
      {links.map(link => (
        <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-zinc-300 hover:text-white">
          {link}
        </a>
      ))}
    </div>
  </div>
)}
\`\`\`

### 3. Missing Imports:
Add any missing imports at the top of the file.

## OUTPUT:
Return ONLY the fixed files in the standard format:
\`\`\`tsx:src/path/to/File.tsx
// Complete fixed code
\`\`\`

Fix ALL issues. Return COMPLETE files.`;

// =============================================================================
// AI CALL FUNCTION
// =============================================================================

async function callAI(task: TaskType, messages: Array<{ role: string; content: string }>, stream = false): Promise<Response> {
  const routing = TASK_ROUTING[task];
  const apiKeys: Record<ProviderKey, string | undefined> = {
    grok: Deno.env.get("GROK_API_KEY"),
    gemini: Deno.env.get("GEMINI_API_KEY"),
    openai: Deno.env.get("OPENAI_API_KEY"),
  };

  const providersToTry: Array<{ provider: ProviderKey; model: string }> = [];
  
  const primaryProvider = routing.provider as ProviderKey;
  if (apiKeys[primaryProvider]) {
    const config = AI_PROVIDERS[primaryProvider];
    providersToTry.push({ provider: primaryProvider, model: config.models[routing.model as keyof typeof config.models] });
  }
  
  if (routing.fallback) {
    const fallbackProvider = routing.fallback.provider as ProviderKey;
    if (apiKeys[fallbackProvider]) {
      const config = AI_PROVIDERS[fallbackProvider];
      providersToTry.push({ provider: fallbackProvider, model: config.models[routing.fallback.model as keyof typeof config.models] });
    }
  }

  for (const [key, apiKey] of Object.entries(apiKeys)) {
    if (apiKey && !providersToTry.find(p => p.provider === key)) {
      const config = AI_PROVIDERS[key as ProviderKey];
      providersToTry.push({ provider: key as ProviderKey, model: Object.values(config.models)[0] });
    }
  }

  if (providersToTry.length === 0) {
    throw new Error("No AI providers configured");
  }

  for (const { provider, model } of providersToTry) {
    const config = AI_PROVIDERS[provider];
    const apiKey = apiKeys[provider]!;
    
    console.log(`[Beast Mode] ${task} → ${config.name} (${model})`);

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
          max_tokens: config.maxTokens,
          temperature: 0.5, // Lower for more consistent output
          stream,
        }),
      });

      if (response.ok) {
        console.log(`[Beast Mode] ✓ ${config.name} succeeded`);
        return response;
      }
      console.log(`[Beast Mode] ${config.name} failed: ${response.status}`);
    } catch (e) {
      console.log(`[Beast Mode] ${config.name} error:`, e);
    }
  }

  throw new Error(`All providers failed for ${task}`);
}

// =============================================================================
// CODE VALIDATION - Catch errors BEFORE they ship
// =============================================================================

interface ValidationResult {
  valid: boolean;
  criticalErrors: Array<{ file: string; error: string; fix: string }>;
  warnings: string[];
}

function validateCodeLocally(files: FileOperation[]): ValidationResult {
  const errors: Array<{ file: string; error: string; fix: string }> = [];
  const warnings: string[] = [];

  for (const file of files) {
    const content = file.content;
    const path = file.path;

    // Check for orphaned JSX expressions (the bug in the screenshot!)
    const orphanedExpressions = content.match(/\{[a-zA-Z]+\s*&&\s*\(\s*$/gm);
    if (orphanedExpressions) {
      errors.push({
        file: path,
        error: "Orphaned JSX expression: `{condition && (` without closing `)}`",
        fix: "Complete the conditional rendering with proper closing tags"
      });
    }

    // Check for unclosed JSX in conditionals
    const conditionalWithoutClose = /\{[a-zA-Z]+\s*&&\s*\([^)]*$/gm;
    if (conditionalWithoutClose.test(content)) {
      errors.push({
        file: path,
        error: "Unclosed conditional JSX block",
        fix: "Add closing parenthesis and brace: `)}`"
      });
    }

    // Check for incomplete ternaries
    const incompleteTernary = /\?[^:]+$/gm;
    if (incompleteTernary.test(content) && !content.includes(": null") && !content.includes(": <")) {
      warnings.push(`${path}: Possible incomplete ternary operator`);
    }

    // Check for missing React hooks import when hooks are used
    const usesHooks = /\b(useState|useEffect|useRef|useMemo|useCallback)\b/.test(content);
    const hasReactImport = /import\s+.*\{[^}]*(useState|useEffect|useRef|useMemo|useCallback)[^}]*\}.*from\s+['"]react['"]/.test(content);
    if (usesHooks && !hasReactImport) {
      errors.push({
        file: path,
        error: "React hooks used but may not be imported from 'react'",
        fix: "Add: import { useState, useEffect } from 'react';"
      });
    }

    // Check for placeholder comments
    if (content.includes("// ...") || content.includes("// rest of") || content.includes("// more code")) {
      errors.push({
        file: path,
        error: "Placeholder comment found - incomplete code",
        fix: "Replace placeholder with actual implementation"
      });
    }

    // Check for empty components
    if (content.includes("return null") || content.includes("return;") || content.includes("return ()")) {
      warnings.push(`${path}: Possibly empty or incomplete component`);
    }

    // Check braces balance
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({
        file: path,
        error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
        fix: "Check for missing opening or closing braces"
      });
    }

    // Check parentheses balance
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        file: path,
        error: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
        fix: "Check for missing opening or closing parentheses"
      });
    }
  }

  return {
    valid: errors.length === 0,
    criticalErrors: errors,
    warnings
  };
}

// =============================================================================
// FILE EXTRACTION
// =============================================================================

interface FileOperation {
  path: string;
  content: string;
  operation: "create" | "update";
}

function extractFiles(response: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const path = match[2].trim().replace(/^\/+/, "");
    const content = match[3];

    if (path && content && path.includes("/")) {
      operations.push({ path, content: content.trim(), operation: "create" });
    }
  }

  return operations;
}

// =============================================================================
// BEAST MODE PIPELINE
// =============================================================================

interface PipelineContext {
  supabase: DB;
  workspaceId: string;
  userId: string;
  prompt: string;
  existingFiles: Array<{ path: string; content: string }>;
  history: Array<{ role: string; content: string }>;
  sessionId: string | null;
}

interface PipelineResult {
  success: boolean;
  files: FileOperation[];
  modelsUsed: string[];
  validationPassed: boolean;
  repairAttempts: number;
  errors?: string[];
  // NEW: Conversational response
  aiMessage: string;
  routes: string[];
  suggestions: string[];
}

// =============================================================================
// PERSONA RESPONSE GENERATOR
// =============================================================================

async function generatePersonaResponse(
  prompt: string,
  files: FileOperation[],
  plan: string,
  isNewProject: boolean
): Promise<{ message: string; routes: string[]; suggestions: string[] }> {
  // Extract routes from plan or files
  let routes: string[] = ["/"];
  try {
    const planJson = JSON.parse(plan);
    if (planJson.routes) {
      routes = planJson.routes;
    }
  } catch {
    // Extract routes from file paths
    const pageFiles = files.filter(f => f.path.includes("/pages/"));
    routes = pageFiles.map(f => {
      const name = f.path.split("/").pop()?.replace(".tsx", "").toLowerCase() || "";
      return name === "index" ? "/" : `/${name}`;
    });
    if (!routes.includes("/")) routes.unshift("/");
  }

  // Generate contextual suggestions based on what was created
  const suggestions: string[] = [];
  const hasNavbar = files.some(f => f.path.toLowerCase().includes("navbar"));
  const hasHero = files.some(f => f.path.toLowerCase().includes("hero"));
  const hasPricing = files.some(f => f.path.toLowerCase().includes("pricing"));
  const hasContact = files.some(f => f.path.toLowerCase().includes("contact"));

  if (!hasContact) suggestions.push("Add a contact form");
  if (!hasPricing) suggestions.push("Add a pricing section");
  if (hasHero) suggestions.push("Change the hero image or colors");
  suggestions.push("Browse the [Components Library](/dashboard/components) for more sections");
  suggestions.push("Try a different style from the [Backgrounds Library](/dashboard/backgrounds)");

  // Generate friendly message
  const fileList = files.map(f => f.path.split("/").pop()).slice(0, 5).join(", ");
  const projectType = detectProjectType(prompt);
  const emoji = getProjectEmoji(projectType);

  let message: string;
  if (isNewProject) {
    message = `${emoji} Creating your ${projectType}...\n\n{THINKING_INDICATOR}\n\nDone! I created ${files.length} files including ${fileList}. Everything's styled and ready to preview!\n\n💡 **Next steps:**\n${suggestions.slice(0, 3).map(s => `- ${s}`).join("\n")}`;
  } else {
    message = `Making those changes now...\n\n{THINKING_INDICATOR}\n\nDone! I updated ${files.length} file(s). Take a look at the preview!\n\n💡 **Want more?**\n${suggestions.slice(0, 2).map(s => `- ${s}`).join("\n")}`;
  }

  return { message, routes, suggestions: suggestions.slice(0, 3) };
}

function detectProjectType(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("bakery") || p.includes("cafe") || p.includes("restaurant")) return "bakery landing page";
  if (p.includes("portfolio")) return "portfolio site";
  if (p.includes("e-commerce") || p.includes("shop") || p.includes("store")) return "e-commerce site";
  if (p.includes("dashboard")) return "dashboard";
  if (p.includes("blog")) return "blog";
  if (p.includes("saas")) return "SaaS landing page";
  if (p.includes("landing")) return "landing page";
  return "website";
}

function getProjectEmoji(type: string): string {
  if (type.includes("bakery")) return "🥐";
  if (type.includes("portfolio")) return "✨";
  if (type.includes("e-commerce") || type.includes("shop")) return "🛒";
  if (type.includes("dashboard")) return "📊";
  if (type.includes("blog")) return "📝";
  if (type.includes("saas")) return "🚀";
  return "🎨";
}

async function runBeastPipeline(ctx: PipelineContext): Promise<PipelineResult> {
  const modelsUsed: string[] = [];
  let repairAttempts = 0;
  const MAX_REPAIR_ATTEMPTS = 2;
  const isNewProject = ctx.existingFiles.length === 0;

  try {
    // =======================================================================
    // STAGE 1: ARCHITECT (Gemini) - Deep analysis and planning
    // =======================================================================
    console.log("[Beast Mode] 🏗️ Stage 1: Architect analyzing...");
    
    if (ctx.sessionId) {
      await ctx.supabase.from("generation_sessions").update({ status: "planning" }).eq("id", ctx.sessionId);
    }

    const architectMessages = [
      { role: "system", content: BEAST_ARCHITECT_PROMPT },
      { role: "user", content: `User wants: "${ctx.prompt}"\n\nExisting files: ${ctx.existingFiles.map(f => f.path).join(", ") || "None - NEW PROJECT"}` }
    ];

    const architectResponse = await callAI("planning", architectMessages, false);
    const architectData = await architectResponse.json();
    const plan = architectData.choices?.[0]?.message?.content || "";
    modelsUsed.push(`Architect: ${architectData.model || "gemini"}`);
    
    console.log("[Beast Mode] 📋 Plan created");

    // =======================================================================
    // STAGE 2: CODER (Grok) - Generate production code
    // =======================================================================
    console.log("[Beast Mode] 💻 Stage 2: Coder generating...");
    
    if (ctx.sessionId) {
      await ctx.supabase.from("generation_sessions").update({ status: "generating" }).eq("id", ctx.sessionId);
    }

    let coderPrompt = BEAST_CODER_PROMPT;
    if (ctx.existingFiles.length > 0) {
      coderPrompt += "\n\n## EXISTING FILES (modify these, don't recreate):\n";
      for (const file of ctx.existingFiles.slice(0, 8)) {
        coderPrompt += `\n### ${file.path}\n\`\`\`\n${file.content.slice(0, 1500)}\n\`\`\`\n`;
      }
    }

    const coderMessages = [
      { role: "system", content: coderPrompt },
      ...ctx.history.slice(-4),
      { role: "user", content: `PLAN:\n${plan}\n\nUSER REQUEST: ${ctx.prompt}\n\nGenerate ALL files now. COMPLETE CODE ONLY.` }
    ];

    const coderResponse = await callAI("coding", coderMessages, false);
    const coderData = await coderResponse.json();
    let generatedCode = coderData.choices?.[0]?.message?.content || "";
    modelsUsed.push(`Coder: ${coderData.model || "grok"}`);

    let files = extractFiles(generatedCode);
    console.log(`[Beast Mode] 📁 Extracted ${files.length} files`);

    // Use defaults if nothing extracted for new project
    if (files.length === 0 && ctx.existingFiles.length === 0) {
      console.log("[Beast Mode] Using enhanced defaults");
      files = getEnhancedDefaults(ctx.prompt);
    }

    // =======================================================================
    // STAGE 3: VALIDATOR - Local + AI validation
    // =======================================================================
    console.log("[Beast Mode] 🔍 Stage 3: Validating...");
    
    if (ctx.sessionId) {
      await ctx.supabase.from("generation_sessions").update({ status: "validating" }).eq("id", ctx.sessionId);
    }

    let validation = validateCodeLocally(files);
    
    // =======================================================================
    // STAGE 4: AUTO-REPAIR - Fix any issues
    // =======================================================================
    while (!validation.valid && repairAttempts < MAX_REPAIR_ATTEMPTS) {
      repairAttempts++;
      console.log(`[Beast Mode] 🔧 Stage 4: Auto-repair attempt ${repairAttempts}...`);

      const errorSummary = validation.criticalErrors.map(e => `${e.file}: ${e.error}`).join("\n");
      const filesToFix = files.filter(f => validation.criticalErrors.some(e => e.file === f.path));
      
      const repairMessages = [
        { role: "system", content: BEAST_REPAIR_PROMPT },
        { role: "user", content: `ERRORS FOUND:\n${errorSummary}\n\nFILES TO FIX:\n${filesToFix.map(f => `\`\`\`tsx:${f.path}\n${f.content}\n\`\`\``).join("\n\n")}\n\nFix ALL errors and return COMPLETE files.` }
      ];

      const repairResponse = await callAI("repair", repairMessages, false);
      const repairData = await repairResponse.json();
      const repairedCode = repairData.choices?.[0]?.message?.content || "";
      modelsUsed.push(`Repair: ${repairData.model || "openai"}`);

      const repairedFiles = extractFiles(repairedCode);
      
      // Merge repaired files
      for (const repaired of repairedFiles) {
        const index = files.findIndex(f => f.path === repaired.path);
        if (index >= 0) {
          files[index] = repaired;
        } else {
          files.push(repaired);
        }
      }

      // Re-validate
      validation = validateCodeLocally(files);
      console.log(`[Beast Mode] Validation after repair: ${validation.valid ? "✓ PASSED" : "✗ FAILED"}`);
    }

    // Log final status
    if (validation.valid) {
      console.log("[Beast Mode] ✅ All validations passed!");
    } else {
      console.log("[Beast Mode] ⚠️ Some issues remain:", validation.criticalErrors);
    }

    // =======================================================================
    // STAGE 5: PERSONA - Generate friendly response
    // =======================================================================
    console.log("[Beast Mode] 💬 Stage 5: Generating persona response...");
    const personaResult = await generatePersonaResponse(ctx.prompt, files, plan, isNewProject);

    return {
      success: true,
      files,
      modelsUsed,
      validationPassed: validation.valid,
      repairAttempts,
      errors: validation.criticalErrors.map(e => e.error),
      aiMessage: personaResult.message,
      routes: personaResult.routes,
      suggestions: personaResult.suggestions,
    };

  } catch (error) {
    console.error("[Beast Mode] ❌ Pipeline error:", error);
    return {
      success: false,
      files: [],
      modelsUsed,
      validationPassed: false,
      repairAttempts,
      errors: [error instanceof Error ? error.message : "Pipeline failed"],
      aiMessage: "Oops! Something went wrong while building your project. Let me try again...",
      routes: ["/"],
      suggestions: ["Try simplifying your request", "Check the console for errors"],
    };
  }
}

// =============================================================================
// ENHANCED DEFAULTS - Production-ready templates
// =============================================================================

function getEnhancedDefaults(prompt: string): FileOperation[] {
  // Extract project name from prompt
  const nameMatch = prompt.match(/(?:build|create|make)\s+(?:a\s+)?(?:nice\s+)?(.+?)(?:\s+(?:landing|page|website|site|shop|store))?$/i);
  const projectName = nameMatch ? nameMatch[1].trim() : "My Project";
  const brandName = projectName.split(" ").slice(0, 2).join("");
  
  // Detect niche for image selection
  const p = prompt.toLowerCase();
  let nicheType = "default";
  if (p.includes("bakery") || p.includes("bread") || p.includes("pastry")) nicheType = "bakery";
  else if (p.includes("cafe") || p.includes("coffee")) nicheType = "cafe";
  else if (p.includes("restaurant") || p.includes("food")) nicheType = "restaurant";
  else if (p.includes("fitness") || p.includes("gym") || p.includes("workout")) nicheType = "fitness";
  else if (p.includes("tech") || p.includes("saas") || p.includes("software")) nicheType = "tech";
  else if (p.includes("shop") || p.includes("store") || p.includes("ecommerce")) nicheType = "ecommerce";
  else if (p.includes("portfolio") || p.includes("creative")) nicheType = "portfolio";
  else if (p.includes("real estate") || p.includes("property")) nicheType = "realestate";
  else if (p.includes("travel") || p.includes("tourism")) nicheType = "travel";

  return [
    { path: "src/index.css", content: ENHANCED_CSS, operation: "create" },
    { path: "src/components/layout/Navbar.tsx", content: getEnhancedNavbar(brandName), operation: "create" },
    { path: "src/components/Hero.tsx", content: getEnhancedHero(projectName, nicheType), operation: "create" },
    { path: "src/components/Gallery.tsx", content: getEnhancedGallery(nicheType), operation: "create" },
    { path: "src/components/Features.tsx", content: ENHANCED_FEATURES, operation: "create" },
    { path: "src/components/CTA.tsx", content: ENHANCED_CTA, operation: "create" },
    { path: "src/components/layout/Footer.tsx", content: getEnhancedFooter(brandName), operation: "create" },
    { path: "src/pages/Index.tsx", content: getEnhancedIndex(brandName), operation: "create" },
  ];
}

const ENHANCED_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 7%;
  --foreground: 0 0% 98%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 98%;
  --primary: 270 70% 60%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 15%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 65%;
  --border: 0 0% 18%;
  --ring: 270 70% 60%;
}

* { border-color: hsl(var(--border)); }

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, sans-serif;
}

.gradient-text {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`;

function getEnhancedNavbar(brand: string): string {
  return `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ['Home', 'Products', 'About', 'Contact'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="text-xl font-bold text-white">${brand}</a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link}
                href={\`#\${link.toLowerCase()}\`}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
            <button className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-zinc-400 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800">
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <a
                  key={link}
                  href={\`#\${link.toLowerCase()}\`}
                  className="text-zinc-400 hover:text-white transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link}
                </a>
              ))}
              <button className="w-full mt-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}`;
}

function getEnhancedHero(title: string, nicheType: string = "default"): string {
  // Select hero image based on niche
  const heroImages: Record<string, string> = {
    bakery: "photo-1509440159596-0249088772ff",
    cafe: "photo-1495474472287-4d71bcdd2085",
    restaurant: "photo-1517248135467-4c7edcad34c4",
    fitness: "photo-1534438327276-14e5300c3a48",
    gym: "photo-1571019613454-1cb2f99b2d8b",
    tech: "photo-1551288049-bebda4e38f71",
    saas: "photo-1460925895917-afdab827c52f",
    ecommerce: "photo-1472851294608-062f824d29cc",
    portfolio: "photo-1558655146-d09347e92766",
    realestate: "photo-1600596542815-ffad4c1539a9",
    travel: "photo-1507525428034-b723cf961d3e",
    default: "photo-1557683316-973673baf926",
  };
  
  const imageId = heroImages[nicheType.toLowerCase()] || heroImages.default;
  const imageUrl = `https://images.unsplash.com/${imageId}?w=1920&q=80`;
  
  return `import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <img 
        src="${imageUrl}" 
        alt="Hero background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to ${title}</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white">
          Experience the Best <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            ${title}
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10">
          Discover quality, craftsmanship, and passion in everything we do. Join thousands of satisfied customers.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40">
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 backdrop-blur-sm transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}`;
}

const ENHANCED_FEATURES = `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed with optimized performance and instant loading.' },
  { icon: Shield, title: 'Secure by Design', description: 'Enterprise-grade security with encryption built-in.' },
  { icon: Globe, title: 'Global Reach', description: 'Deploy worldwide with automatic scaling and CDN.' },
  { icon: Layers, title: 'Modular System', description: 'Flexible components that work together seamlessly.' },
  { icon: Code, title: 'Developer Friendly', description: 'Clean APIs and comprehensive documentation.' },
  { icon: Palette, title: 'Beautiful Design', description: 'Stunning visuals with dark mode support.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Powerful features to help you build, deploy, and scale your applications.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <feature.icon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;

const ENHANCED_PRICING = `import { Check } from 'lucide-react';

const plans = [
  { name: 'Starter', price: '$0', period: '/month', features: ['Up to 3 projects', 'Basic analytics', 'Community support', '1GB storage'], popular: false },
  { name: 'Pro', price: '$29', period: '/month', features: ['Unlimited projects', 'Advanced analytics', 'Priority support', '100GB storage', 'Custom domains', 'API access'], popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Everything in Pro', 'Dedicated support', 'SLA guarantee', 'Unlimited storage', 'SSO & SAML'], popular: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple Pricing</h2>
          <p className="text-lg text-zinc-400">Choose the plan that works for you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={\`relative p-8 rounded-2xl border \${plan.popular ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 bg-zinc-800/30'}\`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 text-white text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-400 ml-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className={\`w-full py-3 px-4 rounded-xl font-medium transition-colors \${plan.popular ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-zinc-700 text-white hover:bg-zinc-600'}\`}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;

const ENHANCED_CTA = `import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-purple-500/30 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-zinc-900/50" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-zinc-300 mb-8 max-w-xl mx-auto">
              Join thousands of developers building amazing products with us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </button>
              <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white border border-white/20 rounded-xl hover:bg-white/10 transition-colors">
                Book a Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}`;

function getEnhancedGallery(nicheType: string = "default"): string {
  // Curated gallery images by niche
  const galleryImages: Record<string, string[]> = {
    bakery: [
      "photo-1509440159596-0249088772ff",
      "photo-1555507036-ab1f4038808a",
      "photo-1517433670267-30f41c41e0fe",
      "photo-1486427944299-d1955d23e34d",
      "photo-1558961363-fa8fdf82db35",
      "photo-1509365390695-33aee754301f",
    ],
    restaurant: [
      "photo-1517248135467-4c7edcad34c4",
      "photo-1414235077428-338989a2e8c0",
      "photo-1424847651672-bf20a4b0982b",
      "photo-1550966871-3ed3cdb5ed0c",
      "photo-1544025162-d76694265947",
      "photo-1559339352-11d035aa65de",
    ],
    fitness: [
      "photo-1534438327276-14e5300c3a48",
      "photo-1571019613454-1cb2f99b2d8b",
      "photo-1517836357463-d25dfeac3438",
      "photo-1583454110551-21f2fa2afe61",
      "photo-1571902943202-507ec2618e8f",
      "photo-1549060279-7e168fcee0c2",
    ],
    tech: [
      "photo-1551288049-bebda4e38f71",
      "photo-1460925895917-afdab827c52f",
      "photo-1504868584819-f8e8b4b6d7e3",
      "photo-1518770660439-4636190af475",
      "photo-1531297484001-80022131f5a1",
      "photo-1519389950473-47ba0277781c",
    ],
    default: [
      "photo-1557683316-973673baf926",
      "photo-1618005182384-a83a8bd57fbe",
      "photo-1579546929518-9e396f3cc809",
      "photo-1557682250-33bd709cbe85",
      "photo-1557682224-5b8590cd9ec5",
      "photo-1557682260-96773eb01377",
    ],
  };
  
  const images = galleryImages[nicheType] || galleryImages.default;
  const imageUrls = images.map(id => `https://images.unsplash.com/${id}?w=800&q=80`);
  
  return `export default function Gallery() {
  const images = [
    { url: "${imageUrls[0]}", alt: "Gallery image 1" },
    { url: "${imageUrls[1]}", alt: "Gallery image 2" },
    { url: "${imageUrls[2]}", alt: "Gallery image 3" },
    { url: "${imageUrls[3]}", alt: "Gallery image 4" },
    { url: "${imageUrls[4]}", alt: "Gallery image 5" },
    { url: "${imageUrls[5]}", alt: "Gallery image 6" },
  ];

  return (
    <section id="gallery" className="py-24 bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Our Gallery</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Take a look at some of our finest work and creations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl aspect-square bg-zinc-800"
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white font-medium">View Details</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function getEnhancedFooter(brand: string): string {
  return `export default function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Documentation', 'Help Center', 'Community', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
  };

  return (
    <footer className="py-16 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="text-xl font-bold text-white">${brand}</a>
            <p className="mt-4 text-sm text-zinc-400">
              Building the future of technology, one product at a time.
            </p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">© {new Date().getFullYear()} ${brand}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">GitHub</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}`;
}

function getEnhancedIndex(brand: string): string {
  return `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Gallery from '../components/Gallery';
import Features from '../components/Features';
import CTA from '../components/CTA';
import Footer from '../components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <Navbar />
      <main>
        <Hero />
        <Gallery />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}`;
}

// =============================================================================
// SAVE FILES
// =============================================================================

async function saveFiles(supabase: DB, workspaceId: string, userId: string, sessionId: string | null, files: FileOperation[], modelsUsed: string[]) {
  for (const file of files) {
    try {
      await supabase.from("workspace_files").upsert({
        workspace_id: workspaceId,
        user_id: userId,
        file_path: file.path,
        content: file.content,
        file_type: file.path.split(".").pop() || "txt",
        is_generated: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,file_path" });

      await supabase.from("file_operations").insert({
        workspace_id: workspaceId,
        session_id: sessionId,
        user_id: userId,
        operation: file.operation,
        file_path: file.path,
        new_content: file.content,
        ai_model: modelsUsed.join(" → "),
        validated: true,
        applied: true,
        applied_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[Beast Mode] Failed to save ${file.path}:`, err);
    }
  }
}

// =============================================================================
// TRY RAILWAY BACKEND
// =============================================================================

async function tryRailwayBackend(workspaceId: string, prompt: string, token: string): Promise<Response | null> {
  try {
    console.log("[Beast Mode] Trying Railway backend...");
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/generate/${workspaceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ prompt }),
    });
    if (response.ok) {
      console.log("[Beast Mode] ✓ Railway backend responded");
      return response;
    }
    console.log(`[Beast Mode] Railway: ${response.status}`);
    return null;
  } catch {
    console.log("[Beast Mode] Railway unreachable");
    return null;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

interface GenerateRequest {
  projectId: string;
  workspaceId: string;
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  existingFiles?: Array<{ path: string; content: string }>;
  useRailwayBackend?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hasGrok = !!Deno.env.get("GROK_API_KEY");
    const hasGemini = !!Deno.env.get("GEMINI_API_KEY");
    const hasOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    
    if (!hasGrok && !hasGemini && !hasOpenAI) {
      throw new Error("No AI providers configured");
    }

    console.log(`[Beast Mode] 🔥 Providers: Grok=${hasGrok}, Gemini=${hasGemini}, OpenAI=${hasOpenAI}`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase: DB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: GenerateRequest = await req.json();
    const { projectId, workspaceId, prompt, conversationHistory = [], existingFiles = [], useRailwayBackend = true } = body;

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get or create workspace
    let wsId = workspaceId;
    if (!wsId) {
      const { data: existing } = await supabase.from("workspaces").select("id").eq("project_id", projectId).eq("user_id", user.id).single();
      if (existing) { wsId = existing.id; }
      else {
        const { data: newWs } = await supabase.from("workspaces").insert({ project_id: projectId, user_id: user.id, status: "ready" }).select().single();
        wsId = newWs?.id;
      }
    }

    if (!wsId) {
      return new Response(JSON.stringify({ error: "Could not create workspace" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify access
    const { data: workspace, error: wsError } = await supabase.from("workspaces").select("id, status").eq("id", wsId).eq("user_id", user.id).single();
    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit
    const { data: rl } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rl?.[0] && !rl[0].allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", resetAt: rl[0].reset_at }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try Railway first
    if (useRailwayBackend) {
      const railwayResponse = await tryRailwayBackend(wsId, prompt, token);
      if (railwayResponse) {
        return new Response(railwayResponse.body, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Beast Mode Pipeline
    console.log("[Beast Mode] 🔥 Running local pipeline...");

    const { data: session } = await supabase.from("generation_sessions").insert({
      workspace_id: wsId,
      user_id: user.id,
      prompt,
      status: "pending",
      started_at: new Date().toISOString(),
    }).select().single();

    const sessionId = session?.id || null;
    await supabase.from("workspaces").update({ status: "generating" }).eq("id", wsId);

    const result = await runBeastPipeline({
      supabase,
      workspaceId: wsId,
      userId: user.id,
      prompt,
      existingFiles,
      history: conversationHistory,
      sessionId,
    });

    if (result.success && result.files.length > 0) {
      await saveFiles(supabase, wsId, user.id, sessionId, result.files, result.modelsUsed);
    }

    if (sessionId) {
      await supabase.from("generation_sessions").update({
        status: result.success ? "completed" : "failed",
        files_generated: result.files.length,
        model_used: result.modelsUsed.join(" → "),
        validation_passed: result.validationPassed,
        completed_at: new Date().toISOString(),
        error_message: result.errors?.join("; ") || null,
      }).eq("id", sessionId);
    }

    await supabase.from("workspaces").update({ status: result.success ? "ready" : "error" }).eq("id", wsId);

    return new Response(JSON.stringify({
      success: result.success,
      sessionId,
      filesGenerated: result.files.length,
      filePaths: result.files.map(f => f.path),
      modelsUsed: result.modelsUsed,
      validationPassed: result.validationPassed,
      repairAttempts: result.repairAttempts,
      errors: result.errors,
      // NEW: Persona response for chat display
      aiMessage: result.aiMessage,
      routes: result.routes,
      suggestions: result.suggestions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[Beast Mode] ❌ Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
