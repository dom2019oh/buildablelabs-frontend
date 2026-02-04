// =============================================================================
// STAGE 4: CODE GENERATION
// =============================================================================

import type { PipelineContext, FileOperation, StageResult } from "../types";
import { callAIWithFallback } from "../routing";
import { isPathWriteable } from "../context";

// =============================================================================
// CODER PROMPT
// =============================================================================

const CODER_PROMPT = `You are Buildable's Coder AI — an ELITE React developer creating VISUALLY STUNNING websites.

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

### 5. TAILWIND PATTERNS
// Hero with gradient overlay
<section className="relative min-h-screen flex items-center">
  <img src="..." className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
  <div className="relative z-10 container mx-auto px-4">...</div>
</section>

// Gradient text
<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">

### 6. MOBILE MENU PATTERN:
const [menuOpen, setMenuOpen] = useState(false);
// Desktop: <div className="hidden md:flex">
// Mobile button: <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
// Mobile menu: {menuOpen && (<div className="md:hidden">...</div>)}

### 7. FILE OUTPUT FORMAT:
\`\`\`tsx:src/path/to/File.tsx
// Complete implementation
\`\`\`

Generate COMPLETE, PRODUCTION-READY code. NO shortcuts. NO placeholders.`;

// =============================================================================
// EXECUTE GENERATE STAGE
// =============================================================================

export async function executeGenerateStage(context: PipelineContext): Promise<StageResult<FileOperation[]>> {
  const startTime = Date.now();

  try {
    // Build context-aware prompt
    let coderPrompt = CODER_PROMPT;

    // Add existing files context for modifications
    if (context.existingFiles.length > 0) {
      coderPrompt += "\n\n## EXISTING FILES (modify these, don't recreate):\n";
      for (const file of context.existingFiles.slice(0, 8)) {
        coderPrompt += `\n### ${file.path}\n\`\`\`\n${file.content.slice(0, 1500)}\n\`\`\`\n`;
      }
    }

    // Add plan context if available
    let planContext = "";
    if (context.plan) {
      planContext = `
ARCHITECTURE PLAN:
- Project Type: ${context.plan.projectType}
- Theme: ${context.plan.theme.primary} / ${context.plan.theme.style}
- Pages: ${context.plan.pages.map(p => p.path).join(", ")}
- Components: ${context.plan.components.map(c => c.path).join(", ")}
- Routes: ${context.plan.routes.join(", ")}
${context.plan.images.length > 0 ? `- Hero Image: ${context.plan.images[0]?.url}` : ""}
${context.plan.specialInstructions ? `- Special Instructions: ${context.plan.specialInstructions}` : ""}
`;
    }

    const messages = [
      { role: "system", content: coderPrompt },
      ...context.conversationHistory.slice(-4),
      { 
        role: "user", 
        content: `${planContext}\n\nUSER REQUEST: ${context.originalPrompt}\n\nGenerate ALL files now. COMPLETE CODE ONLY.` 
      },
    ];

    const result = await callAIWithFallback("coding", messages);
    context.modelsUsed.push(`Code: ${result.provider}/${result.model}`);

    // Extract files from response
    const files = extractFiles(result.response);

    // Filter out non-writeable paths
    const writeableFiles = files.filter(f => isPathWriteable(f.path));

    if (writeableFiles.length === 0 && context.existingFiles.length === 0) {
      // Use enhanced defaults for new projects
      return {
        success: true,
        data: getEnhancedDefaults(context.originalPrompt),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: writeableFiles,
      duration: Date.now() - startTime,
      modelUsed: `${result.provider}/${result.model}`,
    };

  } catch (error) {
    console.warn("[Generate] AI generation failed:", error);
    
    // Fallback to defaults for new projects
    if (context.existingFiles.length === 0) {
      return {
        success: true,
        data: getEnhancedDefaults(context.originalPrompt),
        duration: Date.now() - startTime,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
      duration: Date.now() - startTime,
    };
  }
}

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
      operations.push({
        path,
        content: content.trim(),
        operation: "create",
      });
    }
  }

  return operations;
}

// =============================================================================
// ENHANCED DEFAULTS
// =============================================================================

export function getEnhancedDefaults(prompt: string): FileOperation[] {
  const p = prompt.toLowerCase();
  
  // Extract project name
  const nameMatch = prompt.match(/(?:build|create|make)\s+(?:a\s+)?(?:nice\s+)?(.+?)(?:\s+(?:landing|page|website|site))?$/i);
  const projectName = nameMatch ? nameMatch[1].trim() : "My Project";
  const brandName = projectName.split(" ").slice(0, 2).join("");
  
  // Detect niche for images
  let heroImage = "photo-1557683316-973673baf926";
  if (p.includes("bakery")) heroImage = "photo-1509440159596-0249088772ff";
  else if (p.includes("restaurant") || p.includes("cafe")) heroImage = "photo-1517248135467-4c7edcad34c4";
  else if (p.includes("fitness") || p.includes("gym")) heroImage = "photo-1534438327276-14e5300c3a48";
  else if (p.includes("tech") || p.includes("saas")) heroImage = "photo-1551288049-bebda4e38f71";
  else if (p.includes("shop") || p.includes("store")) heroImage = "photo-1472851294608-062f824d29cc";
  else if (p.includes("portfolio")) heroImage = "photo-1558655146-d09347e92766";

  return [
    { path: "src/index.css", content: getDefaultCSS(), operation: "create" },
    { path: "src/components/layout/Navbar.tsx", content: getDefaultNavbar(brandName), operation: "create" },
    { path: "src/components/Hero.tsx", content: getDefaultHero(projectName, heroImage), operation: "create" },
    { path: "src/components/Features.tsx", content: getDefaultFeatures(), operation: "create" },
    { path: "src/components/CTA.tsx", content: getDefaultCTA(), operation: "create" },
    { path: "src/components/layout/Footer.tsx", content: getDefaultFooter(brandName), operation: "create" },
    { path: "src/pages/Index.tsx", content: getDefaultIndex(), operation: "create" },
  ];
}

// Template getters
function getDefaultCSS(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 7%;
  --foreground: 0 0% 98%;
  --primary: 270 70% 60%;
  --primary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 65%;
  --border: 0 0% 18%;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}`;
}

function getDefaultNavbar(brand: string): string {
  return `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ['Home', 'About', 'Services', 'Contact'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold text-white">${brand}</a>
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-sm text-zinc-400 hover:text-white transition-colors">
                {link}
              </a>
            ))}
            <button className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
              Get Started
            </button>
          </div>
          <button className="md:hidden p-2 text-zinc-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800">
            {links.map((link) => (
              <a key={link} href={\`#\${link.toLowerCase()}\`} className="block py-2 text-zinc-400 hover:text-white" onClick={() => setMenuOpen(false)}>
                {link}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}`;
}

function getDefaultHero(title: string, imageId: string): string {
  return `import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img src="https://images.unsplash.com/${imageId}?w=1920&q=80" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to ${title}</span>
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
          Experience the Best <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">${title}</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10">
          Discover quality, craftsmanship, and passion in everything we do.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all">
            Get Started <ArrowRight className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}`;
}

function getDefaultFeatures(): string {
  return `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed with optimized performance.' },
  { icon: Shield, title: 'Secure by Design', description: 'Enterprise-grade security built-in.' },
  { icon: Globe, title: 'Global Reach', description: 'Deploy worldwide with automatic scaling.' },
  { icon: Layers, title: 'Modular System', description: 'Flexible components that work together.' },
  { icon: Code, title: 'Developer Friendly', description: 'Clean APIs and great documentation.' },
  { icon: Palette, title: 'Beautiful Design', description: 'Stunning visuals with dark mode support.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Powerful features to help you build and scale.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="group p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20">
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
}

function getDefaultCTA(): string {
  return `import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-purple-500/30 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-zinc-900/50" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-zinc-300 mb-8 max-w-xl mx-auto">
              Join thousands building amazing products with us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors">
                Start Free Trial <ArrowRight className="h-5 w-5" />
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
}

function getDefaultFooter(brand: string): string {
  return `export default function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Integrations'],
    Company: ['About', 'Blog', 'Careers'],
    Resources: ['Documentation', 'Help Center', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security'],
  };

  return (
    <footer className="py-16 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="text-xl font-bold text-white">${brand}</a>
            <p className="mt-4 text-sm text-zinc-400">Building the future, one product at a time.</p>
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

function getDefaultIndex(): string {
  return `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import CTA from '../components/CTA';
import Footer from '../components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}`;
}
