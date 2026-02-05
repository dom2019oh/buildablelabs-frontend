// =============================================================================
// GENERATE STAGE - Enhanced Code Generation with Full-Stack Excellence
// =============================================================================

import type { 
  PipelineContext, 
  StageResult, 
  FileOperation,
  ArchitecturePlan
} from "../types.ts";
import { callAI } from "../routing.ts";
import { StageTracer } from "../telemetry.ts";
import { buildContextSummary } from "../context.ts";
import { CODE_QUALITY_RULES, FORBIDDEN_PATTERNS, VISUAL_STANDARDS, FULL_STACK_DIRECTIVE } from "../core-directive.ts";

// =============================================================================
// ENHANCED CODER PROMPT - FULL-STACK EXCELLENCE
// =============================================================================

const CODER_SYSTEM_PROMPT = `You are Buildable's Coder AI — an ELITE React developer creating VISUALLY STUNNING, PRODUCTION-READY websites.

## 🔥 FULL-STACK MINDSET (CRITICAL):
Even "simple" requests get the FULL treatment:
- Generate 10-15 complete files minimum
- Include Gallery, Testimonials, CTA sections
- 6-12 real Unsplash images
- Animations and hover effects throughout
- Mobile-responsive with hamburger menu
- Dark mode styling with gradients
- NO SHORTCUTS. NO LAZY OUTPUT.

## 🎨 VISUAL EXCELLENCE PATTERNS:

### HERO SECTION (MANDATORY):
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  <img src="https://images.unsplash.com/photo-XXX?w=1920&q=80" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
  <div className="relative z-10 text-center px-4">
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-8">
      <Sparkles className="h-4 w-4" />
      <span>Welcome</span>
    </div>
    <h1 className="text-5xl md:text-7xl font-bold mb-6">
      <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
        Your Title
      </span>
    </h1>
    <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-10">Description</p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25">
        Primary CTA <ArrowRight className="inline ml-2 h-5 w-5" />
      </button>
      <button className="px-8 py-4 border border-white/30 text-white rounded-xl hover:bg-white/10 transition-colors">
        Secondary CTA
      </button>
    </div>
  </div>
</section>

### GRADIENT TEXT PATTERN:
<h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">

### GLASS CARD PATTERN:
<div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all">

### FEATURE CARD PATTERN:
<div className="group p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all">
    <Icon className="h-6 w-6 text-purple-400" />
  </div>
  <h3 className="text-lg font-semibold text-white mb-2">Title</h3>
  <p className="text-zinc-400">Description</p>
</div>

### TESTIMONIAL PATTERN:
<div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700">
  <div className="flex items-center gap-4 mb-4">
    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
    <div>
      <h4 className="font-semibold text-white">Name</h4>
      <p className="text-sm text-zinc-400">Title</p>
    </div>
  </div>
  <p className="text-zinc-300">"Quote..."</p>
</div>

### GALLERY PATTERN:
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {images.map((img, i) => (
    <div key={i} className="group relative overflow-hidden rounded-xl aspect-square">
      <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
    </div>
  ))}
</div>

### CTA SECTION PATTERN:
<section className="py-24">
  <div className="max-w-4xl mx-auto px-4">
    <div className="relative rounded-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20" />
      <div className="absolute inset-0 bg-zinc-900/80" />
      <div className="relative p-12 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
        <p className="text-zinc-300 mb-8">Join thousands building amazing products.</p>
        <button className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg">
          Start Free <ArrowRight className="inline ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
</section>

## 🔒 CRITICAL CODE QUALITY RULES:

### 1. JSX TERNARY EXPRESSIONS (CRITICAL!)
CORRECT: {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
WRONG:   {darkMode ? : }  // This will BREAK the app!

### 2. JSX CONDITIONALS (CRITICAL!)
CORRECT:
{menuOpen && (
  <div className="menu">Content</div>
)}

WRONG:
{menuOpen && (
  <div className="menu">Content</div>
// MISSING )}

### 3. ALL IMPORTS MUST BE INCLUDED
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, Sparkles, Star, Check } from 'lucide-react';

### 4. MOBILE MENU PATTERN:
const [menuOpen, setMenuOpen] = useState(false);

<button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
  {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
</button>

{menuOpen && (
  <div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900 border-t border-zinc-800">
    {/* Mobile menu content */}
  </div>
)}

## 📁 REQUIRED FILES FOR NEW PROJECTS (10-15 minimum):

1.  public/favicon.ico
2.  public/placeholder.svg
3.  public/robots.txt
4.  src/index.css
5.  src/pages/Index.tsx
6.  src/components/layout/Navbar.tsx
7.  src/components/Hero.tsx
8.  src/components/Features.tsx
9.  src/components/Gallery.tsx           ← REQUIRED
10. src/components/Testimonials.tsx      ← REQUIRED
11. src/components/CTA.tsx               ← REQUIRED
12. src/components/layout/Footer.tsx
13. src/components/About.tsx             ← For most projects
14. src/components/Stats.tsx             ← For SaaS/business

## 📁 FILE OUTPUT FORMAT:
\`\`\`tsx:src/path/to/File.tsx
// Complete implementation
\`\`\`

## ⚠️ FORBIDDEN PATTERNS:
- "..." or "// more code" placeholders
- // TODO comments
- Incomplete ternaries: {x ? : }
- Orphaned conditionals: {x && (
- Missing imports
- Less than 10 files for new projects
- Missing hero background image
- No mobile menu
- No hover effects

Generate 10-15 COMPLETE files with REAL IMAGES. NO shortcuts. PRODUCTION READY.
DOUBLE CHECK: Every { has }, every ( has ), every < has >.
DOUBLE CHECK: Every ternary {x ? A : B} has BOTH A and B!`;

// =============================================================================
// MODIFICATION CODER PROMPT
// =============================================================================

const MODIFY_CODER_PROMPT = `You are Buildable's Coder AI for MODIFICATIONS.

## RULES FOR MODIFICATIONS:
1. ONLY output files that need to change
2. PRESERVE all existing code that doesn't need to change
3. Make SURGICAL changes — don't rewrite entire files unless necessary
4. Keep existing imports, just add new ones if needed
5. Maintain existing styling patterns
6. ENHANCE visual quality where possible

## ENHANCEMENT OPPORTUNITIES:
When modifying, look for chances to add:
- Hover effects if missing
- Gradient text if headings are plain
- Real images if using placeholders
- Animations if static
- Mobile responsiveness if lacking

## FILE OUTPUT FORMAT:
\`\`\`tsx:src/path/to/ModifiedFile.tsx
// Complete file with your changes incorporated
\`\`\`

Return COMPLETE files, not diffs. But ONLY return files that changed.`;

// =============================================================================
// FILE EXTRACTION
// =============================================================================

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
// BUILD CODER PROMPT
// =============================================================================

function buildCoderPrompt(
  context: PipelineContext,
  plan: ArchitecturePlan
): string {
  const isNewProject = context.existingFiles.length === 0;
  let systemPrompt = isNewProject ? CODER_SYSTEM_PROMPT : MODIFY_CODER_PROMPT;

  // Add existing files context for modifications
  if (!isNewProject && context.existingFiles.length > 0) {
    systemPrompt += "\n\n## EXISTING FILES (modify these, don't recreate):\n";
    
    const relevantFiles = context.existingFiles
      .filter(f => f.path.endsWith(".tsx") || f.path.endsWith(".ts"))
      .slice(0, 8);

    for (const file of relevantFiles) {
      systemPrompt += `\n### ${file.path}\n\`\`\`\n${file.content.slice(0, 1500)}\n\`\`\`\n`;
    }
  }

  return systemPrompt;
}

// =============================================================================
// MAIN GENERATE STAGE
// =============================================================================

export async function executeGenerateStage(
  context: PipelineContext
): Promise<StageResult<FileOperation[]>> {
  const startTime = Date.now();
  const tracer = new StageTracer(context);
  
  tracer.stageStart("generate");

  const plan = context.plan;
  if (!plan) {
    const duration = Date.now() - startTime;
    tracer.stageError("generate", "No plan available", duration);
    return {
      success: false,
      error: "No plan available for generation",
      duration,
      canRetry: false,
    };
  }

  const systemPrompt = buildCoderPrompt(context, plan);

  // Build user message with plan
  const planJson = JSON.stringify(plan, null, 2);
  const userMessage = `PLAN:
${planJson}

USER REQUEST: ${context.originalPrompt}

Generate ALL files now. COMPLETE CODE ONLY. 10-15 files minimum.`;

  try {
    const result = await callAI(
      "coding",
      [
        { role: "system", content: systemPrompt },
        ...context.conversationHistory.slice(-4),
        { role: "user", content: userMessage },
      ],
      { 
        temperature: 0.5,
        maxTokens: 16000,
      }
    );

    tracer.modelCall(result.provider, result.model, "coding", result.latencyMs, result.tokensUsed);

    // Extract files from response
    const files = extractFiles(result.content);
    const duration = Date.now() - startTime;

    if (files.length === 0) {
      tracer.stageError("generate", "No files extracted", duration);
      return {
        success: false,
        error: "AI response did not contain any valid files",
        duration,
        canRetry: true,
      };
    }

    tracer.stageComplete("generate", true, duration, {
      tokensUsed: result.tokensUsed,
      modelUsed: result.model,
      metadata: { fileCount: files.length },
    });

    return {
      success: true,
      data: files,
      duration,
      modelUsed: result.model,
      tokensUsed: result.tokensUsed,
      canRetry: true,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
    
    tracer.stageError("generate", errorMessage, duration);

    return {
      success: false,
      error: errorMessage,
      duration,
      canRetry: true,
    };
  }
}

// =============================================================================
// NICHE-SPECIFIC IMAGE LIBRARY (50+ CURATED)
// =============================================================================

const NICHE_IMAGES: Record<string, string[]> = {
  bakery: [
    "photo-1509440159596-0249088772ff",
    "photo-1555507036-ab1f4038808a",
    "photo-1517433670267-30f41c41e0fe",
    "photo-1486427944544-d2c6e7f3b60c",
    "photo-1558961363-fa8fdf82db35",
    "photo-1483695028939-5bb13f8648b0",
  ],
  cafe: [
    "photo-1495474472287-4d71bcdd2085",
    "photo-1442512595331-e89e73853f31",
    "photo-1501339847302-ac426a4a7cbb",
    "photo-1511920170033-f8396924c348",
    "photo-1559496417-e7f25cb247f3",
  ],
  restaurant: [
    "photo-1517248135467-4c7edcad34c4",
    "photo-1414235077428-338989a2e8c0",
    "photo-1424847651672-bf20a4b0982b",
    "photo-1555396273-367ea4eb4db5",
    "photo-1504674900247-0877df9cc836",
    "photo-1540189549336-e6e99c3679fe",
  ],
  fitness: [
    "photo-1534438327276-14e5300c3a48",
    "photo-1571019613454-1cb2f99b2d8b",
    "photo-1517836357463-d25dfeac3438",
    "photo-1571019614242-c5c5dee9f50b",
    "photo-1540497077202-7c8a3999166f",
    "photo-1576678927484-cc907957088c",
  ],
  tech: [
    "photo-1551288049-bebda4e38f71",
    "photo-1460925895917-afdab827c52f",
    "photo-1504868584819-f8e8b4b6d7e3",
    "photo-1519389950473-47ba0277781c",
    "photo-1535378620166-273708d44e4c",
    "photo-1550751827-4bd374c3f58b",
  ],
  ecommerce: [
    "photo-1472851294608-062f824d29cc",
    "photo-1441986300917-64674bd600d8",
    "photo-1555529669-e69e7aa0ba9a",
    "photo-1607082348824-0a96f2a4b9da",
    "photo-1483985988355-763728e1935b",
    "photo-1558618666-fcd25c85cd64",
  ],
  portfolio: [
    "photo-1558655146-d09347e92766",
    "photo-1561070791-2526d30994b5",
    "photo-1545235617-7a424c1a60cc",
    "photo-1542744094-3a31f272c490",
    "photo-1460661419201-fd4cecdf8a8b",
    "photo-1513542789411-b6a5d4f31634",
  ],
  realestate: [
    "photo-1600596542815-ffad4c1539a9",
    "photo-1600585154340-be6161a56a0c",
    "photo-1600573472592-401b489a3cdc",
    "photo-1512917774080-9991f1c4c750",
    "photo-1560448204-e02f11c3d0e2",
  ],
  healthcare: [
    "photo-1576091160550-2173dba999ef",
    "photo-1631217868264-e5b90bb7e133",
    "photo-1579684385127-1ef15d508118",
    "photo-1559839734-2b71ea197ec2",
  ],
  travel: [
    "photo-1507525428034-b723cf961d3e",
    "photo-1476514525535-07fb3b4ae5f1",
    "photo-1469474968028-56623f02e42e",
    "photo-1488085061387-422e29b40080",
    "photo-1530789253388-582c481c54b0",
  ],
  default: [
    "photo-1557683316-973673baf926",
    "photo-1553356084-58ef4a67b2a7",
    "photo-1618005182384-a83a8bd57fbe",
    "photo-1557682224-5b8590cd9ec5",
    "photo-1579546929518-9e396f3cc809",
  ],
};

// Avatar images for testimonials
const AVATAR_IMAGES = [
  "photo-1494790108377-be9c29b29330",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1438761681033-6461ffad8d80",
  "photo-1472099645785-5658abf4ff4e",
  "photo-1544005313-94ddf0286df2",
  "photo-1517841905240-472988babdf9",
];

function detectNiche(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("bakery") || p.includes("bread") || p.includes("pastry")) return "bakery";
  if (p.includes("cafe") || p.includes("coffee")) return "cafe";
  if (p.includes("restaurant") || p.includes("food") || p.includes("dining")) return "restaurant";
  if (p.includes("fitness") || p.includes("gym") || p.includes("workout")) return "fitness";
  if (p.includes("tech") || p.includes("saas") || p.includes("software") || p.includes("startup")) return "tech";
  if (p.includes("shop") || p.includes("store") || p.includes("ecommerce") || p.includes("product")) return "ecommerce";
  if (p.includes("portfolio") || p.includes("creative") || p.includes("designer")) return "portfolio";
  if (p.includes("real estate") || p.includes("property") || p.includes("house")) return "realestate";
  if (p.includes("health") || p.includes("medical") || p.includes("clinic")) return "healthcare";
  if (p.includes("travel") || p.includes("tourism") || p.includes("vacation")) return "travel";
  return "default";
}

function getNicheImages(niche: string, count: number = 6): string[] {
  const images = NICHE_IMAGES[niche] || NICHE_IMAGES.default;
  return images.slice(0, count).map(id => `https://images.unsplash.com/${id}?w=800&q=80`);
}

function getHeroImage(niche: string): string {
  const images = NICHE_IMAGES[niche] || NICHE_IMAGES.default;
  return `https://images.unsplash.com/${images[0]}?w=1920&q=80`;
}

function getAvatarImages(count: number = 3): string[] {
  return AVATAR_IMAGES.slice(0, count).map(id => `https://images.unsplash.com/${id}?w=100&q=80`);
}

// =============================================================================
// ENHANCED DEFAULTS
// =============================================================================

export function getEnhancedDefaults(prompt: string): FileOperation[] {
  const nameMatch = prompt.match(/(?:build|create|make)\s+(?:a\s+)?(?:nice\s+)?(.+?)(?:\s+(?:landing|page|website|site|shop|store))?$/i);
  const projectName = nameMatch ? nameMatch[1].trim() : "My Project";
  const brandName = projectName.split(" ").slice(0, 2).join("");
  
  const niche = detectNiche(prompt);
  const heroUrl = getHeroImage(niche);
  const galleryImages = getNicheImages(niche, 6);
  const avatars = getAvatarImages(3);

  return generateDefaultFiles(brandName, projectName, niche, heroUrl, galleryImages, avatars);
}

function generateDefaultFiles(
  brand: string, 
  title: string, 
  niche: string, 
  heroUrl: string,
  galleryImages: string[],
  avatars: string[]
): FileOperation[] {
  return [
    // Public assets
    {
      path: "public/favicon.ico",
      content: `<!-- Buildable Default Favicon -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect fill="#7c3aed" width="32" height="32" rx="6"/>
  <text x="50%" y="50%" fill="white" font-family="system-ui" font-size="18" font-weight="bold" text-anchor="middle" dominant-baseline="central">B</text>
</svg>`,
      operation: "create",
    },
    {
      path: "public/placeholder.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#27272a" width="400" height="300"/>
  <text x="50%" y="50%" fill="#71717a" font-family="system-ui" font-size="16" text-anchor="middle" dominant-baseline="middle">Image</text>
</svg>`,
      operation: "create",
    },
    {
      path: "public/robots.txt",
      content: `User-agent: *
Allow: /

Sitemap: /sitemap.xml`,
      operation: "create",
    },
    // CSS
    {
      path: "src/index.css",
      content: `@tailwind base;
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
  background: linear-gradient(to right, #a855f7, #ec4899, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`,
      operation: "create",
    },
    // Main Page
    {
      path: "src/pages/Index.tsx",
      content: `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import CTA from '../components/CTA';
import Footer from '../components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Gallery />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}`,
      operation: "create",
    },
    // Navbar
    {
      path: "src/components/layout/Navbar.tsx",
      content: `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ['Home', 'Features', 'Gallery', 'About', 'Contact'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold text-white">${brand}</a>
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                {link}
              </a>
            ))}
            <button className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
              Get Started
            </button>
          </div>
          <button className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-zinc-400 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  {link}
                </a>
              ))}
              <button className="mt-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}`,
      operation: "create",
    },
    // Hero
    {
      path: "src/components/Hero.tsx",
      content: `import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img src="${heroUrl}" alt="Hero background" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to ${title}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white">
          Experience the Best <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">${title}</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10">
          Discover quality, craftsmanship, and passion in everything we do. Join thousands who already trust us.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 hover:scale-105">
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}`,
      operation: "create",
    },
    // Features
    {
      path: "src/components/Features.tsx",
      content: `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed with optimized performance and instant loading.' },
  { icon: Shield, title: 'Secure by Design', description: 'Enterprise-grade security built into every layer.' },
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
            Powerful features to help you build, scale, and succeed.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="group p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all">
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
}`,
      operation: "create",
    },
    // Gallery
    {
      path: "src/components/Gallery.tsx",
      content: `const images = [
  "${galleryImages[0] || "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"}",
  "${galleryImages[1] || "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=800&q=80"}",
  "${galleryImages[2] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"}",
  "${galleryImages[3] || "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800&q=80"}",
  "${galleryImages[4] || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80"}",
  "${galleryImages[5] || "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"}",
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Our Gallery</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Explore our collection of beautiful work and creations.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, i) => (
            <div key={i} className="group relative overflow-hidden rounded-xl aspect-square cursor-pointer">
              <img src={img} alt={\`Gallery \${i + 1}\`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">View</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
      operation: "create",
    },
    // Testimonials
    {
      path: "src/components/Testimonials.tsx",
      content: `import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'CEO, TechStart',
    avatar: '${avatars[0] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"}',
    quote: 'Absolutely incredible service! They exceeded all our expectations and delivered beyond what we imagined.',
  },
  {
    name: 'Michael Chen',
    role: 'Product Manager',
    avatar: '${avatars[1] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"}',
    quote: 'The quality and attention to detail is unmatched. Highly recommend to anyone looking for excellence.',
  },
  {
    name: 'Emily Davis',
    role: 'Creative Director',
    avatar: '${avatars[2] || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80"}',
    quote: 'Working with them was a pleasure. Professional, creative, and always on time.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">What People Say</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Don't just take our word for it — hear from our satisfied customers.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700 hover:border-purple-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-zinc-300 mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-4">
                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h4 className="font-semibold text-white">{t.name}</h4>
                  <p className="text-sm text-zinc-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
      operation: "create",
    },
    // CTA
    {
      path: "src/components/CTA.tsx",
      content: `import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20" />
          <div className="absolute inset-0 bg-zinc-900/80" />
          <div className="relative p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-zinc-300 mb-8 max-w-xl mx-auto">
              Join thousands of satisfied customers building amazing things with us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 hover:scale-105">
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
}`,
      operation: "create",
    },
    // Footer
    {
      path: "src/components/layout/Footer.tsx",
      content: `export default function Footer() {
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
            <a href="/" className="text-xl font-bold text-white">${brand}</a>
            <p className="mt-4 text-sm text-zinc-400">Building the future, one product at a time.</p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.83 9.83 0 01-2.828.775 4.932 4.932 0 002.165-2.724 9.864 9.864 0 01-3.127 1.195 4.916 4.916 0 00-8.384 4.482A13.944 13.944 0 011.671 3.149a4.916 4.916 0 001.523 6.574 4.897 4.897 0 01-2.229-.616v.062a4.918 4.918 0 003.946 4.827 4.902 4.902 0 01-2.224.084 4.918 4.918 0 004.588 3.417A9.867 9.867 0 010 19.54a13.94 13.94 0 007.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636A10.012 10.012 0 0024 4.557z"/></svg>
              </a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">© {new Date().getFullYear()} ${brand}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}`,
      operation: "create",
    },
  ];
}
