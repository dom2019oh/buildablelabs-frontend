// =============================================================================
// GENERATE STAGE - Code Generation with Core Directive + library injection + ensemble AI
// =============================================================================

import type { PipelineContext, StageResult, FileOperation, ArchitecturePlan } from "../types.ts";
import { callAI, getContextLimits, getAvailableProviders, profileRequest } from "../routing.ts";
import { StageTracer } from "../telemetry.ts";
import { CODE_QUALITY_RULES, VISUAL_STANDARDS, FULL_STACK_DIRECTIVE, IMAGE_LIBRARY, FORBIDDEN_PATTERNS } from "../core-directive.ts";
import { DESIGN_EXCELLENCE } from "../core-directive.ts";
import { getLibraryCode, findLibraryMatches, getLibraryCatalog } from "../libraries.ts";

// =============================================================================
// CODER PROMPT — Uses full Core Directive + Design Excellence for max quality
// =============================================================================

const CODER_SYSTEM_PROMPT = `You are BUILDABLE — an ELITE React developer creating PRODUCTION-READY websites.
You generate complete, deployable code. Every file is real, functional, and visually stunning.

${CODE_QUALITY_RULES}

${VISUAL_STANDARDS}

${DESIGN_EXCELLENCE}

${FULL_STACK_DIRECTIVE}

${IMAGE_LIBRARY}

${FORBIDDEN_PATTERNS}

## OUTPUT FORMAT

All generated code MUST use this exact format with the file path after the language tag:

\`\`\`tsx:src/path/to/Component.tsx
// Complete, production-ready code here
\`\`\`

Generate ALL files listed in the plan. COMPLETE CODE ONLY. No placeholders, no TODOs.
Every hero section has a full-bleed Unsplash image + gradient overlay.
Every project includes: Navbar (with mobile menu), Hero, Features, Gallery, Testimonials, CTA, Footer.
Minimum 10 files for new projects.`;

// =============================================================================
// FILE EXTRACTION
// =============================================================================

function extractFiles(response: string): FileOperation[] {
  const ops: FileOperation[] = [];
  const regex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(response)) !== null) {
    const path = m[2].trim().replace(/^\/+/, "");
    if (path && m[3] && path.includes("/")) {
      ops.push({ path, content: m[3].trim(), operation: "create" });
    }
  }
  return ops;
}

// =============================================================================
// BUILD CONTEXT WITH PROVIDER-AWARE LIMITS
// =============================================================================

function buildExistingFilesContext(
  existingFiles: FileOperation[],
  providerHint?: string,
): string {
  if (existingFiles.length === 0) return "";

  const available = getAvailableProviders();
  const provider = providerHint || (available.includes("gemini") ? "gemini" : available[0] || "grok");
  const limits = getContextLimits(provider as any);

  let context = "\n\nEXISTING FILES (modify only what's needed):\n";
  const filesToInclude = existingFiles.slice(0, limits.maxFiles);
  
  for (const f of filesToInclude) {
    context += `\n${f.path}:\n\`\`\`\n${f.content.slice(0, limits.maxCharsPerFile)}\n\`\`\`\n`;
  }

  if (existingFiles.length > limits.maxFiles) {
    context += `\n... and ${existingFiles.length - limits.maxFiles} more files (paths only):\n`;
    for (const f of existingFiles.slice(limits.maxFiles)) {
      context += `- ${f.path}\n`;
    }
  }

  return context;
}

// =============================================================================
// BUILD LIBRARY INJECTION CONTEXT
// =============================================================================

function buildLibraryContext(ctx: PipelineContext): string {
  if (!ctx.libraryMatches || ctx.libraryMatches.length === 0) return "";

  let context = "\n\n## LIBRARY ASSETS TO USE (EXACT CODE — DO NOT MODIFY):\n\n";

  for (const match of ctx.libraryMatches) {
    const fullMatch = findLibraryMatches(match.name).find(fm => fm.id === match.id);
    if (!fullMatch) continue;

    const code = getLibraryCode(fullMatch);
    if (!code) continue;

    if (match.type === "background") {
      context += `### Background: "${match.name}"\nApply this EXACT background to the appropriate container:\n\`\`\`\n${code}\n\`\`\`\n\n`;
    } else if (match.type === "component") {
      context += `### Component: "${match.name}"\nUse this EXACT JSX as the base for the component:\n\`\`\`tsx\n${code}\n\`\`\`\n\n`;
    } else if (match.type === "page") {
      context += `### Page Template: "${match.name}"\nUse this as the base page template:\n\`\`\`tsx\n${code}\n\`\`\`\n\n`;
    }
  }

  context += "IMPORTANT: Use the library code EXACTLY as provided. You may adapt brand names and content, but keep the styling, layout, and classes intact.\n";

  return context;
}

// =============================================================================
// MAIN GENERATE STAGE
// =============================================================================

export async function executeGenerateStage(ctx: PipelineContext): Promise<StageResult<FileOperation[]>> {
  const start = Date.now();
  const tracer = new StageTracer(ctx);
  tracer.stageStart("generate");

  if (!ctx.plan) {
    return { success: false, error: "No plan", duration: Date.now() - start, canRetry: false };
  }

  const isNew = ctx.existingFiles.length === 0;

  // Build context with provider-aware limits
  const fileContext = buildExistingFilesContext(ctx.existingFiles);
  const libraryContext = buildLibraryContext(ctx);
  const prompt = CODER_SYSTEM_PROMPT + fileContext + libraryContext;

  // Profile the request for smart routing
  const profile = profileRequest(
    ctx.originalPrompt,
    ctx.existingFiles.map(f => ({ path: f.path, content: f.content })),
  );

  // Build a compact plan string (minimize tokens — only paths + purposes)
  const compactPlan = ctx.plan ? {
    projectType: ctx.plan.projectType,
    pages: ctx.plan.pages,
    components: ctx.plan.components,
  } : {};
  const planStr = JSON.stringify(compactPlan);

  try {
    let result;

    // Always use single-provider fast path (ensemble doubles latency for marginal quality)
    console.log(`[Generate] Using FAST single-provider mode (isNew=${isNew})`);
    result = await callAI("coding", [
      { role: "system", content: prompt },
      ...ctx.conversationHistory.slice(-2),
      { role: "user", content: `PLAN:\n${planStr}\n\nREQUEST: ${ctx.originalPrompt}\n\nGenerate ALL files. COMPLETE code only. No placeholders.` },
    ], { temperature: 0.4, profile });

    tracer.modelCall(result.provider, result.model, "coding", result.latencyMs, result.tokensUsed);
    const files = extractFiles(result.content);

    if (files.length === 0) {
      return { success: false, error: "No files extracted", duration: Date.now() - start, canRetry: true };
    }

    console.log(`[Generate] ✓ ${files.length} files from ${result.provider}/${result.model} (confidence: ${result.confidence.toFixed(2)})`);

    tracer.stageComplete("generate", true, Date.now() - start, { metadata: { fileCount: files.length, ensemble: useEnsemble } });
    return { success: true, data: files, duration: Date.now() - start, canRetry: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Generation failed";
    tracer.stageError("generate", err, Date.now() - start);
    return { success: false, error: err, duration: Date.now() - start, canRetry: true };
  }
}

// =============================================================================
// NICHE IMAGES
// =============================================================================

const IMAGES: Record<string, string[]> = {
  bakery: ["photo-1509440159596-0249088772ff", "photo-1555507036-ab1f4038808a", "photo-1517433670267-30f41c41e0fe", "photo-1486427944544-d2c6e8a5e93b", "photo-1558961363-fa8fdf82db35"],
  cafe: ["photo-1495474472287-4d71bcdd2085", "photo-1442512595331-e89e73853f31", "photo-1501339847302-ac426a4a7cbb", "photo-1559496417-e7f25cb247f3"],
  restaurant: ["photo-1517248135467-4c7edcad34c4", "photo-1414235077428-338989a2e8c0", "photo-1504674900247-0877df9cc836", "photo-1555939594-58d7cb561ad1"],
  fitness: ["photo-1534438327276-14e5300c3a48", "photo-1571019613454-1cb2f99b2d8b", "photo-1517836357463-d25dfeac3438", "photo-1576678927484-cc907957088c"],
  tech: ["photo-1551288049-bebda4e38f71", "photo-1460925895917-afdab827c52f", "photo-1504868584819-f8e8b4b6d7e3", "photo-1519389950473-47ba0277781c"],
  ecommerce: ["photo-1472851294608-062f824d29cc", "photo-1441986300917-64674bd600d8", "photo-1556742049-0cfed4f6a45d", "photo-1523275335684-37898b6baf30"],
  portfolio: ["photo-1558655146-d09347e92766", "photo-1561070791-2526d30994b5", "photo-1542744094-3a31f272c490", "photo-1559028012-481c04fa702d"],
  realestate: ["photo-1600596542815-ffad4c1539a9", "photo-1600585154340-be6161a56a0c", "photo-1600607687939-ce8a6c25118c", "photo-1600566753190-17f0baa2a6c3"],
  travel: ["photo-1507525428034-b723cf961d3e", "photo-1476514525535-07fb3b4ae5f1", "photo-1502920917128-1aa500764cbd", "photo-1500259571355-332da5cb07aa"],
  default: ["photo-1557683316-973673baf926", "photo-1553356084-58ef4a67b2a7", "photo-1618005182384-a83a8bd57fbe"],
};

function detectNiche(p: string): string {
  const l = p.toLowerCase();
  if (l.includes("bakery")) return "bakery";
  if (l.includes("cafe") || l.includes("coffee")) return "cafe";
  if (l.includes("restaurant") || l.includes("food")) return "restaurant";
  if (l.includes("fitness") || l.includes("gym")) return "fitness";
  if (l.includes("tech") || l.includes("saas")) return "tech";
  if (l.includes("shop") || l.includes("store")) return "ecommerce";
  if (l.includes("portfolio")) return "portfolio";
  if (l.includes("real estate") || l.includes("property")) return "realestate";
  if (l.includes("travel") || l.includes("tourism")) return "travel";
  return "default";
}

export function getEnhancedDefaults(prompt: string): FileOperation[] {
  const niche = detectNiche(prompt);
  const imgs = IMAGES[niche] || IMAGES.default;
  const hero = `https://images.unsplash.com/${imgs[0]}?w=1920&q=80`;
  const gallery = imgs.map(id => `https://images.unsplash.com/${id}?w=800&q=80`);
  
  const name = prompt.match(/(?:build|create)\s+(?:a\s+)?(.+?)(?:\s+(?:landing|page|website))?$/i)?.[1]?.trim() || "Project";
  const brand = name.split(" ").slice(0, 2).join("");

  return [
    { path: "src/index.css", content: CSS_TEMPLATE, operation: "create" },
    { path: "src/pages/Index.tsx", content: indexTemplate(brand), operation: "create" },
    { path: "src/components/layout/Navbar.tsx", content: navbarTemplate(brand), operation: "create" },
    { path: "src/components/Hero.tsx", content: heroTemplate(name, hero), operation: "create" },
    { path: "src/components/Features.tsx", content: FEATURES_TEMPLATE, operation: "create" },
    { path: "src/components/Gallery.tsx", content: galleryTemplate(gallery), operation: "create" },
    { path: "src/components/Testimonials.tsx", content: TESTIMONIALS_TEMPLATE, operation: "create" },
    { path: "src/components/CTA.tsx", content: CTA_TEMPLATE, operation: "create" },
    { path: "src/components/layout/Footer.tsx", content: footerTemplate(brand), operation: "create" },
  ];
}

// =============================================================================
// TEMPLATES (Enhanced with better spacing, animations, and visual depth)
// =============================================================================

const CSS_TEMPLATE = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 7%;
  --foreground: 0 0% 98%;
  --primary: 270 70% 60%;
  --primary-foreground: 0 0% 100%;
  --muted: 240 5% 15%;
  --muted-foreground: 240 5% 65%;
  --accent: 270 70% 50%;
  --border: 240 5% 18%;
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Smooth scroll */
html { scroll-behavior: smooth; }

/* Fade-in animation */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

.animation-delay-100 { animation-delay: 0.1s; }
.animation-delay-200 { animation-delay: 0.2s; }
.animation-delay-300 { animation-delay: 0.3s; }
.animation-delay-400 { animation-delay: 0.4s; }
.animation-delay-500 { animation-delay: 0.5s; }`;

const indexTemplate = (b: string) => `import Navbar from '../components/layout/Navbar';
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
}`;

const navbarTemplate = (b: string) => `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const links = ['Home', 'Features', 'Gallery', 'Contact'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/70 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          <a href="/" className="text-xl font-bold text-white tracking-tight">${b}</a>
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a key={l} href={\`#\${l.toLowerCase()}\`} className="text-zinc-400 hover:text-white transition-colors duration-200 text-sm font-medium">{l}</a>
            ))}
            <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-0.5">
              Get Started
            </button>
          </div>
          <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden py-4 border-t border-white/5 space-y-1">
            {links.map(l => (
              <a key={l} href={\`#\${l.toLowerCase()}\`} className="block py-3 px-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setOpen(false)}>{l}</a>
            ))}
            <button className="w-full mt-2 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold">
              Get Started
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}`;

const heroTemplate = (t: string, img: string) => `import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-bleed background */}
      <img src="${img}" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-zinc-900" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-8 animate-fade-in-up">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>Welcome to ${t}</span>
        </div>
        
        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up animation-delay-100">
          Experience the Best
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            ${t}
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-200">
          Discover quality and passion in everything we do. We bring creativity, dedication, and excellence to every project.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300">
          <button className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1">
            Get Started
            <ArrowRight className="inline ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 backdrop-blur-sm transition-all duration-300">
            Learn More
          </button>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/60 rounded-full" />
        </div>
      </div>
    </section>
  );
}`;

const FEATURES_TEMPLATE = `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Optimized for blazing performance on every device and every connection.', color: 'purple' },
  { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade encryption and security protocols protect your data 24/7.', color: 'pink' },
  { icon: Globe, title: 'Global CDN', desc: 'Content delivered from edge servers worldwide for instant load times.', color: 'cyan' },
  { icon: Layers, title: 'Modular Architecture', desc: 'Flexible, composable components that scale with your needs.', color: 'amber' },
  { icon: Code, title: 'Developer First', desc: 'Clean APIs, comprehensive docs, and a vibrant developer community.', color: 'emerald' },
  { icon: Palette, title: 'Beautiful Design', desc: 'Pixel-perfect interfaces crafted with attention to every detail.', color: 'violet' },
];

const colorMap: Record<string, string> = {
  purple: 'bg-purple-500/10 text-purple-400',
  pink: 'bg-pink-500/10 text-pink-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
  amber: 'bg-amber-500/10 text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-400',
};

export default function Features() {
  return (
    <section id="features" className="py-28 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Features</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">Everything You Need</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Powerful tools and features designed to help you succeed.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group p-8 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] hover:border-purple-500/30 hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-1">
              <div className={\`w-14 h-14 rounded-xl \${colorMap[f.color]} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300\`}>
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;

const galleryTemplate = (imgs: string[]) => `export default function Gallery() {
  const images = [${imgs.map(i => `"${i}"`).join(', ')}];

  return (
    <section id="gallery" className="py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Gallery</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">Our Work</h2>
          <p className="text-zinc-400 text-lg">A showcase of our finest creations.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl aspect-square">
              <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;

const TESTIMONIALS_TEMPLATE = `import { Star } from 'lucide-react';

const testimonials = [
  { name: 'Sarah Johnson', role: 'CEO, TechCorp', quote: 'Absolutely incredible experience. The attention to detail and quality of work exceeded all our expectations. Truly world-class.', avatar: 'SJ' },
  { name: 'Michael Chen', role: 'Product Manager', quote: 'The best decision we made this year. Our conversion rates jumped 40% after the redesign. Highly recommend to anyone serious about growth.', avatar: 'MC' },
  { name: 'Emily Davis', role: 'Creative Director', quote: 'Professional, creative, and a joy to work with. They understood our vision perfectly and brought it to life beautifully.', avatar: 'ED' },
];

export default function Testimonials() {
  return (
    <section className="py-28 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Testimonials</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mt-3 mb-4">What People Say</h2>
          <p className="text-zinc-400 text-lg">Trusted by industry leaders worldwide.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:border-purple-500/20 transition-all duration-500">
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-zinc-300 mb-6 leading-relaxed italic">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">{t.name}</h4>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;

const CTA_TEMPLATE = `import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-orange-600/30" />
          <div className="absolute inset-0 backdrop-blur-3xl" />
          <div className="absolute inset-0 border border-purple-500/20 rounded-3xl" />
          
          {/* Content */}
          <div className="relative p-12 sm:p-16 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5">Ready to Get Started?</h2>
            <p className="text-zinc-300 text-lg max-w-xl mx-auto mb-10">
              Join thousands of satisfied customers building amazing products. Start your journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group px-8 py-4 bg-white text-zinc-900 rounded-xl font-bold hover:bg-zinc-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                Start Free Trial
                <ArrowRight className="inline ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                Talk to Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}`;

const footerTemplate = (b: string) => `export default function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Gallery', 'Updates'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Documentation', 'Help Center', 'Community', 'API'],
  };

  return (
    <footer className="py-20 bg-zinc-900 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="text-xl font-bold text-white tracking-tight">${b}</a>
            <p className="mt-4 text-sm text-zinc-500 leading-relaxed">Building the future, one project at a time. Quality, passion, excellence.</p>
          </div>
          {Object.entries(links).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="font-semibold text-white text-sm mb-4 uppercase tracking-wider">{cat}</h4>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item}>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors duration-200 text-sm">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} ${b}. All rights reserved.</p>
          <div className="flex gap-6 text-zinc-600 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}`;
