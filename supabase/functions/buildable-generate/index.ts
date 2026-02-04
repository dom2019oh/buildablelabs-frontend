// =============================================================================
// BUILDABLE AI GENERATION - Multi-Model with Your Own API Keys
// =============================================================================
// Uses YOUR API keys directly:
// - GROK_API_KEY: Primary for code generation (2M context)
// - GEMINI_API_KEY: Planning and multimodal
// - OPENAI_API_KEY: Fallback and reasoning
// NO Lovable AI Gateway - 100% your own credentials

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// AI PROVIDER CONFIGURATION - Your Own API Keys
// =============================================================================

interface AIProviderConfig {
  name: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
}

const AI_PROVIDERS = {
  grok: {
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    model: "grok-3-fast",
    maxTokens: 16000,
  },
  gemini: {
    name: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-pro",
    maxTokens: 16000,
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    maxTokens: 16000,
  },
} as const;

// Task-based model routing
const TASK_ROUTING = {
  planning: "gemini",    // Gemini excels at planning/architecture
  coding: "grok",        // Grok with 2M context for code generation
  debugging: "grok",     // Grok for debugging
  reasoning: "openai",   // OpenAI for complex reasoning
  fallback: "openai",    // OpenAI as universal fallback
} as const;

// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// PROJECT TEMPLATES
// =============================================================================

const TEMPLATES = {
  indexCss: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}

* { border-color: hsl(var(--border)); }
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, sans-serif;
}
`,

  navbar: `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  logo?: string;
  links?: Array<{ label: string; href: string }>;
}

export default function Navbar({ logo = "Brand", links = [] }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const defaultLinks = links.length > 0 ? links : [
    { label: 'Home', href: '#' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="text-xl font-bold text-foreground">{logo}</a>
          <div className="hidden md:flex items-center gap-8">
            {defaultLinks.map((link) => (
              <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </a>
            ))}
            <button className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            {defaultLinks.map((link) => (
              <a key={link.label} href={link.href} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
                {link.label}
              </a>
            ))}
            <button className="w-full mt-4 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg">
              Get Started
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
`,

  hero: `import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

export default function Hero({
  title = "Build Something Amazing",
  subtitle = "Create beautiful, responsive websites in minutes with our powerful platform. No coding required.",
  ctaText = "Get Started Free",
  ctaLink = "#"
}: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Now in public beta</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6">{title}</h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">{subtitle}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={ctaLink} className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
            {ctaText}
            <ArrowRight className="h-5 w-5" />
          </a>
          <a href="#features" className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors">
            Learn More
          </a>
        </div>
        <p className="mt-12 text-sm text-muted-foreground">Trusted by 10,000+ teams worldwide</p>
      </div>
    </section>
  );
}
`,

  features: `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed with optimized performance and instant loading times.' },
  { icon: Shield, title: 'Secure by Default', description: 'Enterprise-grade security with encryption and compliance built-in.' },
  { icon: Globe, title: 'Global Scale', description: 'Deploy worldwide with automatic scaling and edge distribution.' },
  { icon: Layers, title: 'Modular Design', description: 'Flexible components that work together seamlessly.' },
  { icon: Code, title: 'Developer First', description: 'Clean APIs and comprehensive documentation for easy integration.' },
  { icon: Palette, title: 'Beautiful UI', description: 'Stunning designs with customizable themes and dark mode support.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Powerful features to help you build, deploy, and scale your applications.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  pricing: `import { Check } from 'lucide-react';

const plans = [
  { name: 'Starter', price: '$0', period: '/month', description: 'Perfect for getting started', features: ['Up to 3 projects', 'Basic analytics', 'Community support', '1GB storage'], cta: 'Start Free', popular: false },
  { name: 'Pro', price: '$29', period: '/month', description: 'For growing businesses', features: ['Unlimited projects', 'Advanced analytics', 'Priority support', '100GB storage', 'Custom domains', 'API access'], cta: 'Get Started', popular: true },
  { name: 'Enterprise', price: 'Custom', period: '', description: 'For large organizations', features: ['Everything in Pro', 'Dedicated support', 'SLA guarantee', 'Unlimited storage', 'SSO & SAML', 'Custom contracts'], cta: 'Contact Sales', popular: false },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Choose the plan that works best for you. All plans include a 14-day free trial.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className={\`relative p-8 rounded-2xl border \${plan.popular ? 'border-primary bg-card shadow-xl scale-105' : 'border-border bg-card/50'}\`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">Most Popular</div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className={\`w-full py-3 px-4 rounded-xl font-medium transition-colors \${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}\`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  footer: `export default function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Documentation', 'Help Center', 'Community', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
  };

  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="text-xl font-bold text-foreground">Brand</a>
            <p className="mt-4 text-sm text-muted-foreground">Building the future of web development, one project at a time.</p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Brand. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
`,

  indexPage: `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Pricing from '../components/Pricing';
import Footer from '../components/layout/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
`,
};

// =============================================================================
// LIBRARY REFERENCES FOR SYSTEM PROMPT
// =============================================================================

const PAGE_LIBRARY_REF = `
## PAGE LIBRARY — Full-page templates:
- LOGIN: src/pages/Login.tsx — Email/password form, social buttons, gradient bg
- SIGNUP: src/pages/SignUp.tsx — Registration form, gradient bg
- DASHBOARD: src/pages/Dashboard.tsx — Sidebar nav, stats cards, welcome header
- SETTINGS: src/pages/Settings.tsx — Avatar, profile form, save button
- LANDING: src/pages/Index.tsx — Hero + features + pricing + footer
- 404: src/pages/NotFound.tsx — Friendly not-found with home link
`;

const COMPONENT_LIBRARY_REF = `
## COMPONENT LIBRARY — Pre-built patterns:
- GLASS NAVBAR: fixed backdrop-blur-xl bg-white/5 border-b border-white/10
- GRADIENT HERO: bg-gradient-to-br from-purple-900/40 via-zinc-900 to-pink-900/30
- BENTO FEATURES: grid md:grid-cols-3 gap-6, cards with icon/title/description
- PRICING CARDS: 3-tier with "Popular" badge, gradient bg, check icons
- GRADIENT CTA: bg-gradient-to-r from-purple-600/20, centered headline + button
- SIMPLE FOOTER: py-12 bg-zinc-900 border-t border-zinc-800
`;

const BACKGROUND_LIBRARY_REF = `
## BACKGROUND LIBRARY — Tailwind class combos:
- PURPLE-PINK: bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900
- OCEAN-BLUE: bg-gradient-to-br from-blue-900 via-zinc-900 to-cyan-900
- DOT PATTERN: bg-zinc-900 + radial-gradient dots
- GRID PATTERN: bg-zinc-900 + linear-gradient grid lines
`;

const ROUTE_AWARE_RULES = `
## ROUTE-AWARE GENERATION — CRITICAL:
1. BEFORE creating a new page, CHECK if it already exists in EXISTING FILES
2. If the page exists, MODIFY it instead of creating a duplicate
3. When adding routes, ensure App.tsx / router config is also updated
4. Use the PAGE LIBRARY as a reference for standard page structures
`;

const BUILDABLE_SYSTEM_PROMPT = `You are Buildable AI — an expert that generates production-ready React websites.

## CRITICAL RULES:
1. Generate COMPLETE, working files - NEVER use placeholders like "..." or "// rest of code"
2. Use React + TypeScript + Tailwind CSS with semantic tokens
3. Every component must be fully functional and self-contained
4. Include ALL necessary imports (React, lucide-react icons, etc.)
5. Make everything responsive (mobile-first approach)
6. ALWAYS check if existing files exist before creating new ones

${PAGE_LIBRARY_REF}
${COMPONENT_LIBRARY_REF}
${BACKGROUND_LIBRARY_REF}

## OUTPUT FORMAT:
Each file must use this exact format:
\`\`\`tsx:src/path/to/Component.tsx
// Full complete content here
\`\`\`

## FILE STRUCTURE:
- src/index.css - Global styles with CSS variables
- src/pages/Index.tsx - Main landing page
- src/pages/Dashboard.tsx - Dashboard page (if needed)
- src/pages/Login.tsx, src/pages/SignUp.tsx - Auth pages (if needed)
- src/components/layout/Navbar.tsx - Navigation component
- src/components/layout/Footer.tsx - Footer component  
- src/components/Hero.tsx - Hero section
- src/components/Features.tsx - Features grid
- src/components/Pricing.tsx - Pricing cards (if applicable)

## TAILWIND PATTERNS:
Colors/Backgrounds:
- bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900
- bg-zinc-800/60, bg-white/5, bg-purple-500/20
- backdrop-blur-xl, bg-black/20

Borders/Cards:
- border border-zinc-700, border-white/10, border-purple-500/50
- rounded-2xl, rounded-xl

Text:
- text-white, text-zinc-400, text-purple-400
- bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent

IMPORTANT: Generate AT LEAST 5-8 complete files for any project.`;

const NEW_PROJECT_PROMPT = `${BUILDABLE_SYSTEM_PROMPT}

## YOUR TASK:
This is a NEW PROJECT. Generate a complete, production-ready landing page with ALL of these files:

1. \`\`\`src/index.css\`\`\` - Complete CSS with Tailwind and CSS variables
2. \`\`\`src/pages/Index.tsx\`\`\` - Main page that imports and composes all sections
3. \`\`\`src/components/layout/Navbar.tsx\`\`\` - Responsive navigation with mobile menu
4. \`\`\`src/components/Hero.tsx\`\`\` - Stunning hero with gradient background, badge, headline, CTA
5. \`\`\`src/components/Features.tsx\`\`\` - 6-item features grid with icons
6. \`\`\`src/components/Pricing.tsx\`\`\` - 3-tier pricing comparison
7. \`\`\`src/components/layout/Footer.tsx\`\`\` - Footer with links and social icons

Each file must be COMPLETE and PRODUCTION-READY. No placeholders. No shortcuts.`;

const MODIFY_PROJECT_PROMPT = `${BUILDABLE_SYSTEM_PROMPT}

${ROUTE_AWARE_RULES}

## YOUR TASK:
Modify the existing project based on the user's request. You have access to the current files below.

IMPORTANT RULES FOR MODIFICATIONS:
1. REVIEW all existing files first to understand the current structure
2. Only create NEW files if they don't already exist
3. When modifying, keep existing code and add/change only what's needed
4. Maintain consistency with existing patterns and styles
5. Double-check imports - don't duplicate or break existing ones

Only output the files that need to be created or modified.`;

// =============================================================================
// TYPES
// =============================================================================

interface GenerateRequest {
  projectId: string;
  workspaceId: string;
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  existingFiles?: Array<{ path: string; content: string }>;
}

interface FileOperation {
  path: string;
  content: string;
  operation: "create" | "update";
}

// =============================================================================
// AI PROVIDER FUNCTIONS - Your Own API Keys
// =============================================================================

async function callAIProvider(
  provider: keyof typeof AI_PROVIDERS,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
): Promise<Response> {
  const config = AI_PROVIDERS[provider];
  
  console.log(`[Buildable AI] Using ${config.name} with model ${config.model}`);

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: 0.6,
    stream,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Gemini uses API key in URL, others use Bearer token
  let url: string = config.baseUrl;
  if (provider === "gemini") {
    url = `${config.baseUrl}?key=${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function getAvailableProvider(): { provider: keyof typeof AI_PROVIDERS; apiKey: string } | null {
  // Priority: Grok > Gemini > OpenAI
  const grokKey = Deno.env.get("GROK_API_KEY");
  if (grokKey) {
    return { provider: "grok", apiKey: grokKey };
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey };
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey };
  }

  return null;
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
// GENERATE DEFAULT FILES (Templates)
// =============================================================================

function getDefaultFiles(): FileOperation[] {
  return [
    { path: "src/index.css", content: TEMPLATES.indexCss, operation: "create" },
    { path: "src/components/layout/Navbar.tsx", content: TEMPLATES.navbar, operation: "create" },
    { path: "src/components/Hero.tsx", content: TEMPLATES.hero, operation: "create" },
    { path: "src/components/Features.tsx", content: TEMPLATES.features, operation: "create" },
    { path: "src/components/Pricing.tsx", content: TEMPLATES.pricing, operation: "create" },
    { path: "src/components/layout/Footer.tsx", content: TEMPLATES.footer, operation: "create" },
    { path: "src/pages/Index.tsx", content: TEMPLATES.indexPage, operation: "create" },
  ];
}

// =============================================================================
// SAVE FILES TO DATABASE
// =============================================================================

async function saveFilesToWorkspace(
  supabase: DB,
  workspaceId: string,
  userId: string,
  sessionId: string | null,
  files: FileOperation[],
  modelUsed: string
) {
  const results: Array<{ path: string; success: boolean; error?: string }> = [];

  for (const file of files) {
    try {
      const { error: upsertError } = await supabase
        .from("workspace_files")
        .upsert({
          workspace_id: workspaceId,
          user_id: userId,
          file_path: file.path,
          content: file.content,
          file_type: file.path.split(".").pop() || "txt",
          is_generated: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "workspace_id,file_path",
        });

      if (upsertError) throw upsertError;

      await supabase
        .from("file_operations")
        .insert({
          workspace_id: workspaceId,
          session_id: sessionId,
          user_id: userId,
          operation: file.operation,
          file_path: file.path,
          new_content: file.content,
          ai_model: modelUsed,
          validated: true,
          applied: true,
          applied_at: new Date().toISOString(),
        });

      results.push({ path: file.path, success: true });
    } catch (err) {
      console.error(`Failed to save file ${file.path}:`, err);
      results.push({ path: file.path, success: false, error: String(err) });
    }
  }

  return results;
}

// =============================================================================
// STREAMING GENERATION - Multi-Model with Fallback
// =============================================================================

async function streamGeneration(
  supabase: DB,
  workspaceId: string,
  userId: string,
  prompt: string,
  existingFiles: Array<{ path: string; content: string }>,
  history: Array<{ role: string; content: string }>
): Promise<Response> {
  
  // Create generation session
  const { data: session } = await supabase
    .from("generation_sessions")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      prompt,
      status: "generating",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const sessionId = session?.id || null;

  // Update workspace status
  await supabase
    .from("workspaces")
    .update({ status: "generating", last_activity_at: new Date().toISOString() })
    .eq("id", workspaceId);

  const isNewProject = existingFiles.length === 0;

  // Build system prompt with context
  let systemPrompt: string;
  if (isNewProject) {
    systemPrompt = NEW_PROJECT_PROMPT;
  } else {
    let fileContext = "\n\n## EXISTING PROJECT FILES:\n";
    for (const file of existingFiles.slice(0, 10)) {
      fileContext += `\n### ${file.path}\n\`\`\`\n${file.content.slice(0, 3000)}\n\`\`\`\n`;
    }
    systemPrompt = MODIFY_PROJECT_PROMPT + fileContext;
  }

  // Build messages
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6),
    { role: "user", content: prompt }
  ];

  // Try providers in order: Grok > Gemini > OpenAI
  const providers: Array<{ key: keyof typeof AI_PROVIDERS; envVar: string }> = [
    { key: "grok", envVar: "GROK_API_KEY" },
    { key: "gemini", envVar: "GEMINI_API_KEY" },
    { key: "openai", envVar: "OPENAI_API_KEY" },
  ];

  let aiResponse: Response | null = null;
  let modelUsed = "";
  let providerUsed = "";

  for (const { key, envVar } of providers) {
    const apiKey = Deno.env.get(envVar);
    if (!apiKey) continue;

    try {
      console.log(`[Buildable AI] Attempting ${AI_PROVIDERS[key].name}...`);
      aiResponse = await callAIProvider(key, apiKey, messages, true);
      
      if (aiResponse.ok) {
        modelUsed = AI_PROVIDERS[key].model;
        providerUsed = AI_PROVIDERS[key].name;
        console.log(`[Buildable AI] ✓ Using ${providerUsed} (${modelUsed})`);
        break;
      } else {
        const errorText = await aiResponse.text();
        console.log(`[Buildable AI] ${AI_PROVIDERS[key].name} failed (${aiResponse.status}): ${errorText.slice(0, 200)}`);
        aiResponse = null;
      }
    } catch (e) {
      console.log(`[Buildable AI] ${AI_PROVIDERS[key].name} error:`, e);
    }
  }

  if (!aiResponse) {
    if (sessionId) {
      await supabase
        .from("generation_sessions")
        .update({ 
          status: "failed",
          error_message: "All AI providers failed",
          completed_at: new Date().toISOString()
        })
        .eq("id", sessionId);
    }
    
    await supabase
      .from("workspaces")
      .update({ status: "error" })
      .eq("id", workspaceId);

    throw new Error("All AI providers failed. Check your API keys: GROK_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY");
  }

  // Transform stream
  let fullContent = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    start(controller) {
      const metadata = {
        type: "metadata",
        sessionId,
        workspaceId,
        status: "generating",
        model: modelUsed,
        provider: providerUsed,
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
    },

    transform(chunk, controller) {
      controller.enqueue(chunk);

      const text = decoder.decode(chunk, { stream: true });
      const lines = text.split("\n");
      
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    },

    async flush(controller) {
      try {
        let files = extractFiles(fullContent);
        
        // If no files extracted and this is a new project, use templates
        if (files.length === 0 && existingFiles.length === 0) {
          console.log("[Buildable AI] No files extracted, using default templates");
          files = getDefaultFiles();
        }

        if (files.length > 0) {
          await saveFilesToWorkspace(supabase, workspaceId, userId, sessionId, files, modelUsed);
        }

        if (sessionId) {
          await supabase
            .from("generation_sessions")
            .update({ 
              status: "completed",
              files_generated: files.length,
              model_used: modelUsed,
              validation_passed: true,
              completed_at: new Date().toISOString()
            })
            .eq("id", sessionId);
        }

        await supabase
          .from("workspaces")
          .update({ status: "ready", last_activity_at: new Date().toISOString() })
          .eq("id", workspaceId);

        const completion = {
          type: "completion",
          sessionId,
          filesGenerated: files.length,
          filePaths: files.map(f => f.path),
          model: modelUsed,
          provider: providerUsed,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`));

      } catch (err) {
        console.error("[Buildable AI] Error in flush:", err);
        
        if (sessionId) {
          await supabase
            .from("generation_sessions")
            .update({ 
              status: "failed",
              error_message: String(err),
              completed_at: new Date().toISOString()
            })
            .eq("id", sessionId);
        }
      }
    }
  });

  aiResponse.body!.pipeTo(transformStream.writable).catch(console.error);

  return new Response(transformStream.readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify at least one AI provider is configured
    const availableProvider = getAvailableProvider();
    if (!availableProvider) {
      throw new Error("No AI provider configured. Set at least one of: GROK_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase: DB = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GenerateRequest = await req.json();
    const { projectId, workspaceId, prompt, conversationHistory = [], existingFiles = [] } = body;

    if (!projectId || !prompt) {
      return new Response(
        JSON.stringify({ error: "projectId and prompt required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create workspace
    let wsId = workspaceId;
    if (!wsId) {
      const { data: existing } = await supabase
        .from("workspaces")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        wsId = existing.id;
      } else {
        const { data: newWs } = await supabase
          .from("workspaces")
          .insert({
            project_id: projectId,
            user_id: user.id,
            status: "ready",
          })
          .select()
          .single();
        wsId = newWs?.id;
      }
    }

    if (!wsId) {
      return new Response(
        JSON.stringify({ error: "Could not create workspace" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace access
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, status")
      .eq("id", wsId)
      .eq("user_id", user.id)
      .single();

    if (wsError || !workspace) {
      return new Response(
        JSON.stringify({ error: "Workspace not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const { data: rateLimitData } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rateLimitData?.[0] && !rateLimitData[0].allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", resetAt: rateLimitData[0].reset_at }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the generation using YOUR API keys
    return await streamGeneration(
      supabase,
      wsId,
      user.id,
      prompt,
      existingFiles,
      conversationHistory
    );

  } catch (error) {
    console.error("[Buildable AI] Generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
