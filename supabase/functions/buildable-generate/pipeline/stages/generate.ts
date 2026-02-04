// =============================================================================
// GENERATE STAGE - Code generation with multi-model coordination
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

// =============================================================================
// CODER PROMPT
// =============================================================================

const CODER_SYSTEM_PROMPT = `You are Buildable's Coder AI — an ELITE React developer creating VISUALLY STUNNING websites.

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

### 2. COMPLETE CODE ONLY
- NEVER use "...", "// more code", or ANY placeholder
- EVERY function must have FULL implementation
- EVERY component must be 100% complete

### 3. JSX PERFECTION
- EVERY opening tag MUST have a closing tag
- NEVER leave orphaned expressions like {condition && ( without closing
- ALL ternaries must be complete: condition ? <A/> : <B/> or condition ? <A/> : null
- Wrap multi-line JSX in parentheses

### 4. IMPORTS — NO MISSING IMPORTS
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

### 5. TAILWIND VISUAL PATTERNS:
// Hero with image background
<section className="relative min-h-screen flex items-center">
  <img src="https://images.unsplash.com/photo-XXX?w=1920&q=80" className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
  <div className="relative z-10 container mx-auto px-4">...</div>
</section>

### 6. MOBILE MENU PATTERN:
const [menuOpen, setMenuOpen] = useState(false);
// Desktop: <div className="hidden md:flex">
// Mobile button: <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
// Mobile menu: {menuOpen && (<div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900">...</div>)}

### 7. FILE OUTPUT FORMAT:
Use this format for each file:
\`\`\`tsx:src/path/to/File.tsx
// Complete implementation
\`\`\`

### 8. REQUIRED FILES FOR ANY PROJECT:
1. src/index.css - Tailwind setup with CSS variables
2. src/pages/Index.tsx - Main page importing all components
3. src/components/layout/Navbar.tsx - COMPLETE with mobile menu
4. src/components/Hero.tsx - Full hero with BACKGROUND IMAGE
5. src/components/Gallery.tsx or Features.tsx - With REAL IMAGES
6. src/components/layout/Footer.tsx - Complete footer

Generate 6-10 COMPLETE files with REAL IMAGES. NO shortcuts. NO placeholders. PRODUCTION READY.`;

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
    
    // Include most relevant files (up to 8)
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

Generate ALL files now. COMPLETE CODE ONLY.`;

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
// ENHANCED DEFAULTS
// =============================================================================

export function getEnhancedDefaults(prompt: string): FileOperation[] {
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

  // Generate default files based on niche
  return generateDefaultFiles(brandName, projectName, nicheType);
}

function generateDefaultFiles(brand: string, title: string, niche: string): FileOperation[] {
  const heroImages: Record<string, string> = {
    bakery: "photo-1509440159596-0249088772ff",
    cafe: "photo-1495474472287-4d71bcdd2085",
    restaurant: "photo-1517248135467-4c7edcad34c4",
    fitness: "photo-1534438327276-14e5300c3a48",
    tech: "photo-1551288049-bebda4e38f71",
    ecommerce: "photo-1472851294608-062f824d29cc",
    portfolio: "photo-1558655146-d09347e92766",
    default: "photo-1557683316-973673baf926",
  };

  const imageId = heroImages[niche] || heroImages.default;
  const heroUrl = `https://images.unsplash.com/${imageId}?w=1920&q=80`;

  return [
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
}`,
      operation: "create",
    },
    {
      path: "src/pages/Index.tsx",
      content: `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Footer from '../components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}`,
      operation: "create",
    },
    {
      path: "src/components/layout/Navbar.tsx",
      content: `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ['Home', 'Features', 'About', 'Contact'];

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
            <button className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
              Get Started
            </button>
          </div>
          <button className="md:hidden p-2 text-zinc-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800">
            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-zinc-400 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                  {link}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}`,
      operation: "create",
    },
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
          Discover quality, craftsmanship, and passion in everything we do.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25">
            Get Started
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}`,
      operation: "create",
    },
    {
      path: "src/components/Features.tsx",
      content: `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed with optimized performance.' },
  { icon: Shield, title: 'Secure by Design', description: 'Enterprise-grade security built-in.' },
  { icon: Globe, title: 'Global Reach', description: 'Deploy worldwide with automatic scaling.' },
  { icon: Layers, title: 'Modular System', description: 'Flexible components that work together.' },
  { icon: Code, title: 'Developer Friendly', description: 'Clean APIs and comprehensive docs.' },
  { icon: Palette, title: 'Beautiful Design', description: 'Stunning visuals with dark mode support.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Powerful features to help you build and scale.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="group p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-purple-500/50 transition-all">
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
}`,
      operation: "create",
    },
    {
      path: "src/components/layout/Footer.tsx",
      content: `export default function Footer() {
  return (
    <footer className="py-16 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
}`,
      operation: "create",
    },
  ];
}
