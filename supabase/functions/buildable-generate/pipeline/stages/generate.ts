// =============================================================================
// GENERATE STAGE - Code Generation with full Core Directive + ensemble AI
// =============================================================================

import type { PipelineContext, StageResult, FileOperation, ArchitecturePlan } from "../types.ts";
import { callAI, callAIEnsemble, getContextLimits, getAvailableProviders, profileRequest } from "../routing.ts";
import { StageTracer } from "../telemetry.ts";
import { CODE_QUALITY_RULES, VISUAL_STANDARDS, FULL_STACK_DIRECTIVE, IMAGE_LIBRARY, FORBIDDEN_PATTERNS } from "../core-directive.ts";

// =============================================================================
// CODER PROMPT — Uses full Core Directive sections for maximum quality
// =============================================================================

const CODER_SYSTEM_PROMPT = `You are BUILDABLE — an ELITE React developer creating PRODUCTION-READY websites.
You generate complete, deployable code. Every file is real, functional, and visually stunning.

${CODE_QUALITY_RULES}

${VISUAL_STANDARDS}

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

  // Use Gemini limits by default (largest context), will be narrowed by the actual provider
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
  const available = getAvailableProviders();
  const useEnsemble = available.length >= 2 && isNew;

  // Build context with provider-aware limits
  const fileContext = buildExistingFilesContext(ctx.existingFiles);
  const prompt = CODER_SYSTEM_PROMPT + fileContext;

  // Profile the request for smart routing
  const profile = profileRequest(
    ctx.originalPrompt,
    ctx.existingFiles.map(f => ({ path: f.path, content: f.content })),
  );

  try {
    let result;

    if (useEnsemble) {
      // ENSEMBLE MODE: Call multiple providers in parallel for new projects
      console.log("[Generate] Using ENSEMBLE mode (new project, multiple providers available)");
      result = await callAIEnsemble(
        [
          { role: "system", content: prompt },
          ...ctx.conversationHistory.slice(-3),
          { role: "user", content: `PLAN: ${JSON.stringify(ctx.plan)}\n\nREQUEST: ${ctx.originalPrompt}\n\nGenerate all files.` },
        ],
        { temperature: 0.5, profile },
      );
    } else {
      // STANDARD MODE: Single provider with fallback chain
      result = await callAI("coding", [
        { role: "system", content: prompt },
        ...ctx.conversationHistory.slice(-3),
        { role: "user", content: `PLAN: ${JSON.stringify(ctx.plan)}\n\nREQUEST: ${ctx.originalPrompt}\n\nGenerate all files.` },
      ], { temperature: 0.5, profile });
    }

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
  bakery: ["photo-1509440159596-0249088772ff", "photo-1555507036-ab1f4038808a", "photo-1517433670267-30f41c41e0fe"],
  cafe: ["photo-1495474472287-4d71bcdd2085", "photo-1442512595331-e89e73853f31"],
  restaurant: ["photo-1517248135467-4c7edcad34c4", "photo-1414235077428-338989a2e8c0"],
  fitness: ["photo-1534438327276-14e5300c3a48", "photo-1571019613454-1cb2f99b2d8b"],
  tech: ["photo-1551288049-bebda4e38f71", "photo-1460925895917-afdab827c52f"],
  ecommerce: ["photo-1472851294608-062f824d29cc", "photo-1441986300917-64674bd600d8"],
  portfolio: ["photo-1558655146-d09347e92766", "photo-1561070791-2526d30994b5"],
  realestate: ["photo-1600596542815-ffad4c1539a9", "photo-1600585154340-be6161a56a0c"],
  travel: ["photo-1507525428034-b723cf961d3e", "photo-1476514525535-07fb3b4ae5f1"],
  default: ["photo-1557683316-973673baf926", "photo-1553356084-58ef4a67b2a7"],
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
// TEMPLATES (Compact)
// =============================================================================

const CSS_TEMPLATE = `@tailwind base;
@tailwind components;
@tailwind utilities;
:root{--background:0 0% 7%;--foreground:0 0% 98%;--primary:270 70% 60%;}
body{background:hsl(var(--background));color:hsl(var(--foreground));}`;

const indexTemplate = (b: string) => `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Gallery from '../components/Gallery';
import Testimonials from '../components/Testimonials';
import CTA from '../components/CTA';
import Footer from '../components/layout/Footer';
export default function Index(){return(<div className="min-h-screen bg-zinc-900"><Navbar/><main><Hero/><Features/><Gallery/><Testimonials/><CTA/></main><Footer/></div>);}`;

const navbarTemplate = (b: string) => `import{useState}from'react';import{Menu,X}from'lucide-react';
export default function Navbar(){const[open,setOpen]=useState(false);const links=['Home','Features','Gallery','Contact'];
return(<nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800"><div className="max-w-7xl mx-auto px-4"><div className="flex items-center justify-between h-16"><a href="/" className="text-xl font-bold text-white">${b}</a><div className="hidden md:flex gap-6">{links.map(l=><a key={l}href={\`#\${l.toLowerCase()}\`}className="text-zinc-400 hover:text-white transition-colors">{l}</a>)}<button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Get Started</button></div><button className="md:hidden text-zinc-400"onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>{open&&(<div className="md:hidden py-4 border-t border-zinc-800">{links.map(l=><a key={l}href={\`#\${l.toLowerCase()}\`}className="block py-2 text-zinc-400 hover:text-white"onClick={()=>setOpen(false)}>{l}</a>)}</div>)}</div></nav>);}`;

const heroTemplate = (t: string, img: string) => `import{ArrowRight,Sparkles}from'lucide-react';
export default function Hero(){return(<section className="relative min-h-screen flex items-center justify-center"><img src="${img}"alt="Hero"className="absolute inset-0 w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"/><div className="relative z-10 text-center px-4 max-w-5xl"><div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-8"><Sparkles className="h-4 w-4"/><span>Welcome to ${t}</span></div><h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">Experience the Best<br/><span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">${t}</span></h1><p className="text-lg text-zinc-300 max-w-2xl mx-auto mb-10">Discover quality and passion in everything we do.</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><button className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg">Get Started<ArrowRight className="inline ml-2 h-5 w-5"/></button><button className="px-8 py-4 border border-white/30 text-white rounded-xl hover:bg-white/10">Learn More</button></div></div></section>);}`;

const FEATURES_TEMPLATE = `import{Zap,Shield,Globe,Layers,Code,Palette}from'lucide-react';
const f=[{icon:Zap,title:'Fast',desc:'Optimized performance.'},{icon:Shield,title:'Secure',desc:'Enterprise-grade security.'},{icon:Globe,title:'Global',desc:'Worldwide deployment.'},{icon:Layers,title:'Modular',desc:'Flexible components.'},{icon:Code,title:'Developer Friendly',desc:'Clean APIs.'},{icon:Palette,title:'Beautiful',desc:'Stunning design.'}];
export default function Features(){return(<section id="features"className="py-24 bg-zinc-900/50"><div className="max-w-7xl mx-auto px-4"><div className="text-center mb-16"><h2 className="text-3xl font-bold text-white mb-4">Features</h2><p className="text-zinc-400">Everything you need to succeed.</p></div><div className="grid md:grid-cols-3 gap-6">{f.map((x,i)=><div key={i}className="group p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-purple-500/50 transition-all"><div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><x.icon className="h-6 w-6 text-purple-400"/></div><h3 className="text-lg font-semibold text-white mb-2">{x.title}</h3><p className="text-zinc-400">{x.desc}</p></div>)}</div></div></section>);}`;

const galleryTemplate = (imgs: string[]) => `export default function Gallery(){const images=[${imgs.map(i=>`"${i}"`).join(',')}];
return(<section id="gallery"className="py-24"><div className="max-w-7xl mx-auto px-4"><div className="text-center mb-16"><h2 className="text-3xl font-bold text-white mb-4">Gallery</h2></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{images.map((img,i)=><div key={i}className="group relative overflow-hidden rounded-xl aspect-square"><img src={img}alt=""className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/><div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors"/></div>)}</div></div></section>);}`;

const TESTIMONIALS_TEMPLATE = `import{Star}from'lucide-react';
const t=[{name:'Sarah Johnson',role:'CEO',quote:'Absolutely incredible!'},{name:'Michael Chen',role:'Manager',quote:'Highly recommend.'},{name:'Emily Davis',role:'Director',quote:'Professional and creative.'}];
export default function Testimonials(){return(<section className="py-24 bg-zinc-900/50"><div className="max-w-7xl mx-auto px-4"><div className="text-center mb-16"><h2 className="text-3xl font-bold text-white mb-4">Testimonials</h2></div><div className="grid md:grid-cols-3 gap-6">{t.map((x,i)=><div key={i}className="p-6 rounded-2xl bg-zinc-800/80 border border-zinc-700"><div className="flex gap-1 mb-4">{[...Array(5)].map((_,j)=><Star key={j}className="h-4 w-4 fill-yellow-400 text-yellow-400"/>)}</div><p className="text-zinc-300 mb-4">"{x.quote}"</p><div><h4 className="font-semibold text-white">{x.name}</h4><p className="text-sm text-zinc-400">{x.role}</p></div></div>)}</div></div></section>);}`;

const CTA_TEMPLATE = `import{ArrowRight}from'lucide-react';
export default function CTA(){return(<section className="py-24"><div className="max-w-4xl mx-auto px-4"><div className="rounded-3xl bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 border border-purple-500/30 p-12 text-center"><h2 className="text-3xl font-bold text-white mb-4">Ready to Start?</h2><p className="text-zinc-300 mb-8">Join thousands building amazing products.</p><button className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-lg">Get Started<ArrowRight className="inline ml-2 h-5 w-5"/></button></div></div></section>);}`;

const footerTemplate = (b: string) => `export default function Footer(){const links={Product:['Features','Pricing'],Company:['About','Blog'],Resources:['Docs','Help']};
return(<footer className="py-16 bg-zinc-900 border-t border-zinc-800"><div className="max-w-7xl mx-auto px-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-8"><div><a href="/"className="text-xl font-bold text-white">${b}</a><p className="mt-4 text-sm text-zinc-400">Building the future.</p></div>{Object.entries(links).map(([cat,items])=><div key={cat}><h4 className="font-semibold text-white mb-4">{cat}</h4><ul className="space-y-2">{items.map(item=><li key={item}><a href="#"className="text-zinc-400 hover:text-white transition-colors">{item}</a></li>)}</ul></div>)}</div><div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-400 text-sm">© {new Date().getFullYear()} ${b}. All rights reserved.</div></div></footer>);}`;
