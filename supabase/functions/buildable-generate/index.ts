// =============================================================================
// BUILDABLE AI GENERATION - Template-Based + Streaming
// =============================================================================
// Lovable-quality code generation with:
// 1. Rich project templates as starting points
// 2. GPT-4o for high-quality output
// 3. Proper file structure and routes
// 4. Comprehensive component generation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";

// Use GPT-4o for high quality generation
const MODEL = "gpt-4o";

// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// PROJECT TEMPLATES - Complete starter code like Lovable uses
// =============================================================================

const TEMPLATES = {
  // Base CSS with design tokens
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

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, sans-serif;
}
`,

  // Navbar component
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
          {/* Logo */}
          <a href="#" className="text-xl font-bold text-foreground">
            {logo}
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {defaultLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
            <button className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            {defaultLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
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

  // Hero component
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
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Now in public beta</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          {subtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={ctaLink}
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            {ctaText}
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
          >
            Learn More
          </a>
        </div>

        {/* Trust indicators */}
        <p className="mt-12 text-sm text-muted-foreground">
          Trusted by 10,000+ teams worldwide
        </p>
      </div>
    </section>
  );
}
`,

  // Features component
  features: `import { Zap, Shield, Globe, Layers, Code, Palette } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed with optimized performance and instant loading times.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Enterprise-grade security with encryption and compliance built-in.',
  },
  {
    icon: Globe,
    title: 'Global Scale',
    description: 'Deploy worldwide with automatic scaling and edge distribution.',
  },
  {
    icon: Layers,
    title: 'Modular Design',
    description: 'Flexible components that work together seamlessly.',
  },
  {
    icon: Code,
    title: 'Developer First',
    description: 'Clean APIs and comprehensive documentation for easy integration.',
  },
  {
    icon: Palette,
    title: 'Beautiful UI',
    description: 'Stunning designs with customizable themes and dark mode support.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features to help you build, deploy, and scale your applications.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,

  // Pricing component
  pricing: `import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: ['Up to 3 projects', 'Basic analytics', 'Community support', '1GB storage'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing businesses',
    features: ['Unlimited projects', 'Advanced analytics', 'Priority support', '100GB storage', 'Custom domains', 'API access'],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['Everything in Pro', 'Dedicated support', 'SLA guarantee', 'Unlimited storage', 'SSO & SAML', 'Custom contracts'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that works best for you. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={\`relative p-8 rounded-2xl border \${
                plan.popular 
                  ? 'border-primary bg-card shadow-xl scale-105' 
                  : 'border-border bg-card/50'
              }\`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                  Most Popular
                </div>
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

              <button
                className={\`w-full py-3 px-4 rounded-xl font-medium transition-colors \${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }\`}
              >
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

  // Footer component
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
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="text-xl font-bold text-foreground">
              Brand
            </a>
            <p className="mt-4 text-sm text-muted-foreground">
              Building the future of web development, one project at a time.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Brand. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
`,

  // Complete Index page template
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
// SYSTEM PROMPTS - Production quality
// =============================================================================

const BUILDABLE_SYSTEM_PROMPT = `You are Buildable — an expert AI that generates production-ready React websites like Lovable.

## CRITICAL RULES:
1. Generate COMPLETE, working files - NEVER use placeholders like "..." or "// rest of code"
2. Use React + TypeScript + Tailwind CSS with semantic tokens
3. Every component must be fully functional and self-contained
4. Include ALL necessary imports (React, lucide-react icons, etc.)
5. Make everything responsive (mobile-first approach)

## OUTPUT FORMAT:
Each file must use this exact format:
\`\`\`tsx:src/path/to/Component.tsx
// Full complete content here
\`\`\`

## FILE STRUCTURE TO FOLLOW:
- src/index.css - Global styles with CSS variables
- src/pages/Index.tsx - Main landing page (imports and uses components)
- src/components/layout/Navbar.tsx - Navigation component
- src/components/layout/Footer.tsx - Footer component  
- src/components/Hero.tsx - Hero section
- src/components/Features.tsx - Features grid
- src/components/Pricing.tsx - Pricing cards (if applicable)
- src/components/[SectionName].tsx - Additional sections as needed

## TAILWIND SEMANTIC TOKENS (ALWAYS USE THESE):
Colors:
- bg-background, bg-card, bg-muted, bg-primary, bg-secondary, bg-accent
- text-foreground, text-muted-foreground, text-primary, text-primary-foreground
- border-border, border-input

Utilities:
- rounded-md, rounded-lg, rounded-xl, rounded-2xl
- shadow-sm, shadow-md, shadow-lg, shadow-xl
- hover:*, focus:*, transition-*

## COMPONENT REQUIREMENTS:
1. Every component needs proper TypeScript interfaces for props
2. Use lucide-react for all icons (import specific icons)
3. Add hover/focus states for interactive elements
4. Include smooth transitions (transition-all, transition-colors)
5. Use proper semantic HTML (section, nav, main, footer, etc.)

## EXAMPLE QUALITY LEVEL:
Components should be visually polished like Tailwind UI or shadcn/ui:
- Gradient backgrounds for hero sections
- Subtle shadows and borders
- Proper spacing (py-24, px-4 sm:px-6 lg:px-8)
- Grid layouts for features (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Hover effects that feel premium (hover:shadow-lg, hover:scale-105)

IMPORTANT: Generate AT LEAST 5-8 complete files for any project. Never give minimal output.`;

const NEW_PROJECT_PROMPT = `${BUILDABLE_SYSTEM_PROMPT}

## YOUR TASK:
This is a NEW PROJECT. Generate a complete, production-ready landing page with ALL of these files:

1. \`src/index.css\` - Complete CSS with Tailwind and CSS variables
2. \`src/pages/Index.tsx\` - Main page that imports and composes all sections
3. \`src/components/layout/Navbar.tsx\` - Responsive navigation with mobile menu
4. \`src/components/Hero.tsx\` - Stunning hero with gradient background, badge, headline, CTA
5. \`src/components/Features.tsx\` - 6-item features grid with icons
6. \`src/components/Pricing.tsx\` - 3-tier pricing comparison
7. \`src/components/layout/Footer.tsx\` - Footer with links and social icons

Each file must be COMPLETE and PRODUCTION-READY. No placeholders. No shortcuts.`;

const MODIFY_PROJECT_PROMPT = `${BUILDABLE_SYSTEM_PROMPT}

## YOUR TASK:
Modify the existing project based on the user's request. You have access to the current files below.
Only output the files that need to be created or modified. Keep the same quality standards.`;

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
  files: FileOperation[]
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
          ai_model: MODEL,
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
// STREAMING GENERATION
// =============================================================================

async function streamGeneration(
  supabase: DB,
  openaiApiKey: string,
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
    // Include existing files for context
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

  // Call OpenAI with GPT-4o
  const aiResponse = await fetch(OPENAI_CHAT_COMPLETIONS, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 16000,
      temperature: 0.7,
    }),
  });

  if (!aiResponse.ok) {
    const error = await aiResponse.text();
    
    if (sessionId) {
      await supabase
        .from("generation_sessions")
        .update({ 
          status: "failed",
          error_message: error,
          completed_at: new Date().toISOString()
        })
        .eq("id", sessionId);
    }
    
    await supabase
      .from("workspaces")
      .update({ status: "error" })
      .eq("id", workspaceId);

    throw new Error(`AI error: ${aiResponse.status} - ${error}`);
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
        model: MODEL,
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
          console.log("No files extracted from AI, using default templates");
          files = getDefaultFiles();
        }

        if (files.length > 0) {
          await saveFilesToWorkspace(supabase, workspaceId, userId, sessionId, files);
        }

        if (sessionId) {
          await supabase
            .from("generation_sessions")
            .update({ 
              status: "completed",
              files_generated: files.length,
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
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`));

      } catch (err) {
        console.error("Error in flush:", err);
        
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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
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

    // Stream the generation
    return await streamGeneration(
      supabase,
      openaiApiKey,
      wsId,
      user.id,
      prompt,
      existingFiles,
      conversationHistory
    );

  } catch (error) {
    console.error("Generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
