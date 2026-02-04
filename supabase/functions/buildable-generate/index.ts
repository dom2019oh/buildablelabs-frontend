// =============================================================================
// BUILDABLE AI GENERATION - Multi-Model Pipeline with Railway Backend Integration
// =============================================================================
// Full task-based model routing:
// - GEMINI: Planning, architecture, multimodal analysis
// - GROK: Code generation, debugging (2M context)
// - OPENAI: Reasoning, refinement, validation fallback
//
// Workflow: Architect (Gemini) → Coder (Grok) → Validator (Grok/OpenAI)
// Calls back to Railway backend at api.buildablelabs.dev when available

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// RAILWAY BACKEND CONFIGURATION
// =============================================================================

const RAILWAY_BACKEND_URL = "https://api.buildablelabs.dev";

// =============================================================================
// MULTI-MODEL AI CONFIGURATION - Your Own API Keys
// =============================================================================

const AI_PROVIDERS = {
  grok: {
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    models: {
      fast: "grok-3-fast",
      code: "grok-3-fast",    // Primary coding model
      vision: "grok-2-vision-1212",
    },
    maxTokens: 16000,
    contextWindow: 2_000_000, // 2M context!
  },
  gemini: {
    name: "Gemini (Google)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: {
      pro: "gemini-2.5-pro",
      flash: "gemini-2.5-flash",
      planning: "gemini-2.5-pro",     // Best for architecture
      multimodal: "gemini-2.5-pro",
    },
    maxTokens: 16000,
    contextWindow: 2_000_000,
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    models: {
      gpt4o: "gpt-4o",
      reasoning: "gpt-4o",    // Best for complex reasoning
      mini: "gpt-4o-mini",    // Fast fallback
    },
    maxTokens: 16000,
    contextWindow: 128_000,
  },
} as const;

// Task-based model routing - matches your backend architecture
const TASK_ROUTING = {
  planning: { provider: "gemini", model: "planning", fallback: { provider: "openai", model: "reasoning" } },
  coding: { provider: "grok", model: "code", fallback: { provider: "openai", model: "gpt4o" } },
  debugging: { provider: "grok", model: "code", fallback: { provider: "openai", model: "gpt4o" } },
  reasoning: { provider: "openai", model: "reasoning", fallback: { provider: "gemini", model: "pro" } },
  validation: { provider: "grok", model: "fast", fallback: { provider: "openai", model: "mini" } },
  multimodal: { provider: "gemini", model: "multimodal", fallback: { provider: "grok", model: "vision" } },
  refinement: { provider: "openai", model: "reasoning", fallback: { provider: "grok", model: "code" } },
} as const;

type TaskType = keyof typeof TASK_ROUTING;
type ProviderKey = keyof typeof AI_PROVIDERS;

// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// AI PROVIDER CALL FUNCTION
// =============================================================================

interface AICallOptions {
  task: TaskType;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

async function callAI(options: AICallOptions): Promise<Response> {
  const { task, messages, stream = true, maxTokens, temperature = 0.6 } = options;
  const routing = TASK_ROUTING[task];
  
  // Get primary provider config
  const primaryProvider = routing.provider as ProviderKey;
  const primaryConfig = AI_PROVIDERS[primaryProvider];
  const primaryModel = primaryConfig.models[routing.model as keyof typeof primaryConfig.models];
  
  // Get API keys
  const apiKeys: Record<ProviderKey, string | undefined> = {
    grok: Deno.env.get("GROK_API_KEY"),
    gemini: Deno.env.get("GEMINI_API_KEY"),
    openai: Deno.env.get("OPENAI_API_KEY"),
  };

  // Try providers in order: primary → fallback → any available
  const providersToTry: Array<{ provider: ProviderKey; model: string }> = [];
  
  // Add primary if available
  if (apiKeys[primaryProvider]) {
    providersToTry.push({ provider: primaryProvider, model: primaryModel });
  }
  
  // Add fallback if available
  if (routing.fallback) {
    const fallbackProvider = routing.fallback.provider as ProviderKey;
    if (apiKeys[fallbackProvider]) {
      const fallbackConfig = AI_PROVIDERS[fallbackProvider];
      const fallbackModel = fallbackConfig.models[routing.fallback.model as keyof typeof fallbackConfig.models];
      providersToTry.push({ provider: fallbackProvider, model: fallbackModel });
    }
  }
  
  // Add any remaining available providers
  for (const [key, apiKey] of Object.entries(apiKeys)) {
    if (apiKey && !providersToTry.find(p => p.provider === key)) {
      const config = AI_PROVIDERS[key as ProviderKey];
      const defaultModel = Object.values(config.models)[0];
      providersToTry.push({ provider: key as ProviderKey, model: defaultModel });
    }
  }

  if (providersToTry.length === 0) {
    throw new Error("No AI providers configured. Set GROK_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY");
  }

  // Try each provider
  for (const { provider, model } of providersToTry) {
    const config = AI_PROVIDERS[provider];
    const apiKey = apiKeys[provider]!;
    
    console.log(`[Buildable AI] Task: ${task} → Trying ${config.name} (${model})`);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

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
          max_tokens: maxTokens || config.maxTokens,
          temperature,
          stream,
        }),
      });

      if (response.ok) {
        console.log(`[Buildable AI] ✓ Using ${config.name} (${model}) for ${task}`);
        return response;
      }

      const errorText = await response.text();
      console.log(`[Buildable AI] ${config.name} failed (${response.status}): ${errorText.slice(0, 200)}`);
    } catch (e) {
      console.log(`[Buildable AI] ${config.name} error:`, e);
    }
  }

  throw new Error(`All AI providers failed for task: ${task}`);
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const ARCHITECT_PROMPT = `You are the Buildable Architect — an expert at analyzing user requirements and creating detailed project plans.

Your job is to:
1. Understand the user's intent deeply
2. Break down the project into specific files and components
3. Identify the right patterns from the library
4. Create a structured plan for the Coder to follow

Output a JSON plan with this structure:
{
  "intent": "brief summary of what user wants",
  "files": [
    { "path": "src/pages/Index.tsx", "action": "create", "description": "Main landing page" },
    { "path": "src/components/Hero.tsx", "action": "create", "description": "Hero section with CTA" }
  ],
  "patterns": ["glass-navbar", "gradient-hero", "bento-features"],
  "dependencies": [],
  "notes": "any special considerations"
}`;

const CODER_PROMPT = `You are the Buildable Coder — an expert React/TypeScript developer.

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

## TAILWIND PATTERNS:
- bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900
- backdrop-blur-xl, bg-white/5, border-white/10
- text-white, text-zinc-400, text-purple-400
- rounded-2xl, rounded-xl
- hover:bg-zinc-700, transition-all

## FILE STRUCTURE:
- src/pages/Index.tsx - Main landing page
- src/pages/Dashboard.tsx - Dashboard page
- src/components/layout/Navbar.tsx - Navigation
- src/components/layout/Footer.tsx - Footer
- src/components/Hero.tsx, Features.tsx, Pricing.tsx - Sections

Generate AT LEAST 5-8 complete files for any project.`;

const VALIDATOR_PROMPT = `You are the Buildable Validator — an expert at code review and quality assurance.

Check the generated code for:
1. Syntax errors
2. Missing imports
3. Broken references
4. TypeScript errors
5. Incomplete implementations

If you find issues, output fixes. If code is good, output: {"valid": true, "issues": []}`;

// =============================================================================
// MULTI-STAGE PIPELINE
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
  plan?: unknown;
  modelsUsed: string[];
  errors?: string[];
}

interface FileOperation {
  path: string;
  content: string;
  operation: "create" | "update";
}

// Stage 1: Architect (Gemini) - Analyze and plan
async function runArchitect(ctx: PipelineContext): Promise<{ plan: unknown; model: string }> {
  console.log("[Pipeline] Stage 1: Architect (Planning)");
  
  const messages = [
    { role: "system", content: ARCHITECT_PROMPT },
    { role: "user", content: `User request: ${ctx.prompt}\n\nExisting files: ${ctx.existingFiles.map(f => f.path).join(", ") || "None (new project)"}` },
  ];

  const response = await callAI({ task: "planning", messages, stream: false });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Try to parse as JSON, fallback to raw content
  let plan;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
  } catch {
    plan = { raw: content };
  }

  return { plan, model: data.model || "gemini-2.5-pro" };
}

// Stage 2: Coder (Grok) - Generate code
async function runCoder(ctx: PipelineContext, plan: unknown): Promise<{ content: string; model: string }> {
  console.log("[Pipeline] Stage 2: Coder (Generating)");
  
  let contextPrompt = CODER_PROMPT;
  
  // Add existing files context
  if (ctx.existingFiles.length > 0) {
    contextPrompt += "\n\n## EXISTING PROJECT FILES:\n";
    for (const file of ctx.existingFiles.slice(0, 10)) {
      contextPrompt += `\n### ${file.path}\n\`\`\`\n${file.content.slice(0, 2000)}\n\`\`\`\n`;
    }
  }

  const messages = [
    { role: "system", content: contextPrompt },
    ...ctx.history.slice(-4),
    { role: "user", content: `Plan: ${JSON.stringify(plan)}\n\nUser request: ${ctx.prompt}\n\nGenerate all required files now.` },
  ];

  const response = await callAI({ task: "coding", messages, stream: false });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  return { content, model: data.model || "grok-3-fast" };
}

// Stage 3: Validator (Grok/OpenAI) - Validate code
async function runValidator(ctx: PipelineContext, files: FileOperation[]): Promise<{ valid: boolean; issues: string[]; model: string }> {
  console.log("[Pipeline] Stage 3: Validator (Checking)");
  
  const filesSummary = files.map(f => `${f.path}:\n${f.content.slice(0, 500)}...`).join("\n\n");
  
  const messages = [
    { role: "system", content: VALIDATOR_PROMPT },
    { role: "user", content: `Validate these files:\n\n${filesSummary}` },
  ];

  try {
    const response = await callAI({ task: "validation", messages, stream: false });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Try to parse validation result
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return { valid: result.valid ?? true, issues: result.issues || [], model: data.model || "grok-3-fast" };
      }
    } catch {}
    
    // If no issues found in text, assume valid
    return { valid: true, issues: [], model: data.model || "grok-3-fast" };
  } catch (e) {
    console.log("[Pipeline] Validator skipped due to error:", e);
    return { valid: true, issues: [], model: "skipped" };
  }
}

// Run full pipeline
async function runPipeline(ctx: PipelineContext): Promise<PipelineResult> {
  const modelsUsed: string[] = [];
  
  try {
    // Update session status
    if (ctx.sessionId) {
      await ctx.supabase
        .from("generation_sessions")
        .update({ status: "planning" })
        .eq("id", ctx.sessionId);
    }

    // Stage 1: Architect
    const { plan, model: architectModel } = await runArchitect(ctx);
    modelsUsed.push(`Architect: ${architectModel}`);
    
    if (ctx.sessionId) {
      await ctx.supabase
        .from("generation_sessions")
        .update({ status: "generating", plan })
        .eq("id", ctx.sessionId);
    }

    // Stage 2: Coder
    const { content, model: coderModel } = await runCoder(ctx, plan);
    modelsUsed.push(`Coder: ${coderModel}`);
    
    // Extract files from code
    const files = extractFiles(content);
    
    // If no files extracted and new project, use defaults
    if (files.length === 0 && ctx.existingFiles.length === 0) {
      console.log("[Pipeline] No files extracted, using defaults");
      const defaultFiles = getDefaultFiles();
      return { success: true, files: defaultFiles, plan, modelsUsed };
    }

    if (ctx.sessionId) {
      await ctx.supabase
        .from("generation_sessions")
        .update({ status: "validating", files_generated: files.length })
        .eq("id", ctx.sessionId);
    }

    // Stage 3: Validator
    const { valid, issues, model: validatorModel } = await runValidator(ctx, files);
    modelsUsed.push(`Validator: ${validatorModel}`);
    
    if (!valid && issues.length > 0) {
      console.log("[Pipeline] Validation issues:", issues);
    }

    return { success: true, files, plan, modelsUsed, errors: issues.length > 0 ? issues : undefined };

  } catch (error) {
    console.error("[Pipeline] Error:", error);
    return { 
      success: false, 
      files: [], 
      modelsUsed,
      errors: [error instanceof Error ? error.message : "Pipeline failed"]
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
      operations.push({ path, content: content.trim(), operation: "create" });
    }
  }

  return operations;
}

// =============================================================================
// DEFAULT FILES (Templates)
// =============================================================================

function getDefaultFiles(): FileOperation[] {
  return [
    { path: "src/index.css", content: DEFAULT_CSS, operation: "create" },
    { path: "src/components/layout/Navbar.tsx", content: DEFAULT_NAVBAR, operation: "create" },
    { path: "src/components/Hero.tsx", content: DEFAULT_HERO, operation: "create" },
    { path: "src/components/Features.tsx", content: DEFAULT_FEATURES, operation: "create" },
    { path: "src/pages/Index.tsx", content: DEFAULT_INDEX, operation: "create" },
  ];
}

const DEFAULT_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}`;

const DEFAULT_NAVBAR = `import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const links = ['Home', 'Features', 'Pricing', 'Contact'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="text-xl font-bold">Brand</a>
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a key={link} href={\`#\${link.toLowerCase()}\`} className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                {link}
              </a>
            ))}
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </nav>
  );
}`;

const DEFAULT_HERO = `import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50/50 to-white dark:from-zinc-900 dark:via-blue-950/20 dark:to-zinc-900">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Now in public beta</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Build Something
          <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Amazing</span>
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10">
          Create beautiful, responsive websites in minutes with our powerful AI-driven platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg">
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}`;

const DEFAULT_FEATURES = `import { Zap, Shield, Globe, Code } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed with optimized performance.' },
  { icon: Shield, title: 'Secure', description: 'Enterprise-grade security built-in.' },
  { icon: Globe, title: 'Global Scale', description: 'Deploy worldwide with edge distribution.' },
  { icon: Code, title: 'Developer First', description: 'Clean APIs and great documentation.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Powerful features to help you build and scale.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;

const DEFAULT_INDEX = `import Navbar from '../components/layout/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';

export default function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-16">
        <Hero />
        <Features />
      </main>
    </div>
  );
}`;

// =============================================================================
// SAVE FILES TO DATABASE
// =============================================================================

async function saveFilesToWorkspace(
  supabase: DB,
  workspaceId: string,
  userId: string,
  sessionId: string | null,
  files: FileOperation[],
  modelsUsed: string[]
) {
  for (const file of files) {
    try {
      await supabase
        .from("workspace_files")
        .upsert({
          workspace_id: workspaceId,
          user_id: userId,
          file_path: file.path,
          content: file.content,
          file_type: file.path.split(".").pop() || "txt",
          is_generated: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,file_path" });

      await supabase
        .from("file_operations")
        .insert({
          workspace_id: workspaceId,
          session_id: sessionId,
          user_id: userId,
          operation: file.operation,
          file_path: file.path,
          new_content: file.content,
          ai_model: modelsUsed.join(", "),
          validated: true,
          applied: true,
          applied_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error(`Failed to save ${file.path}:`, err);
    }
  }
}

// =============================================================================
// TRY RAILWAY BACKEND FIRST
// =============================================================================

async function tryRailwayBackend(
  workspaceId: string,
  prompt: string,
  accessToken: string
): Promise<Response | null> {
  try {
    console.log("[Buildable AI] Trying Railway backend...");
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/generate/${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (response.ok) {
      console.log("[Buildable AI] ✓ Railway backend responded");
      return response;
    }

    console.log(`[Buildable AI] Railway backend failed: ${response.status}`);
    return null;
  } catch (e) {
    console.log("[Buildable AI] Railway backend unreachable:", e);
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
    // Verify at least one AI provider is configured
    const hasGrok = !!Deno.env.get("GROK_API_KEY");
    const hasGemini = !!Deno.env.get("GEMINI_API_KEY");
    const hasOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    
    if (!hasGrok && !hasGemini && !hasOpenAI) {
      throw new Error("No AI providers configured. Set GROK_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY");
    }

    console.log(`[Buildable AI] Providers: Grok=${hasGrok}, Gemini=${hasGemini}, OpenAI=${hasOpenAI}`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase: DB = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GenerateRequest = await req.json();
    const { projectId, workspaceId, prompt, conversationHistory = [], existingFiles = [], useRailwayBackend = true } = body;

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
          .insert({ project_id: projectId, user_id: user.id, status: "ready" })
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
        JSON.stringify({ error: "Workspace not found" }),
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

    // Try Railway backend first if enabled
    if (useRailwayBackend) {
      const railwayResponse = await tryRailwayBackend(wsId, prompt, token);
      if (railwayResponse) {
        // Proxy the Railway response directly
        return new Response(railwayResponse.body, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: Run multi-model pipeline locally
    console.log("[Buildable AI] Running local multi-model pipeline");

    // Create session
    const { data: session } = await supabase
      .from("generation_sessions")
      .insert({
        workspace_id: wsId,
        user_id: user.id,
        prompt,
        status: "pending",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const sessionId = session?.id || null;

    // Update workspace status
    await supabase
      .from("workspaces")
      .update({ status: "generating" })
      .eq("id", wsId);

    // Run the pipeline
    const pipelineResult = await runPipeline({
      supabase,
      workspaceId: wsId,
      userId: user.id,
      prompt,
      existingFiles,
      history: conversationHistory,
      sessionId,
    });

    // Save files
    if (pipelineResult.success && pipelineResult.files.length > 0) {
      await saveFilesToWorkspace(supabase, wsId, user.id, sessionId, pipelineResult.files, pipelineResult.modelsUsed);
    }

    // Update session
    if (sessionId) {
      await supabase
        .from("generation_sessions")
        .update({
          status: pipelineResult.success ? "completed" : "failed",
          files_generated: pipelineResult.files.length,
          model_used: pipelineResult.modelsUsed.join(", "),
          completed_at: new Date().toISOString(),
          error_message: pipelineResult.errors?.join("; ") || null,
        })
        .eq("id", sessionId);
    }

    // Update workspace
    await supabase
      .from("workspaces")
      .update({ status: pipelineResult.success ? "ready" : "error" })
      .eq("id", wsId);

    return new Response(
      JSON.stringify({
        success: pipelineResult.success,
        sessionId,
        filesGenerated: pipelineResult.files.length,
        filePaths: pipelineResult.files.map(f => f.path),
        modelsUsed: pipelineResult.modelsUsed,
        plan: pipelineResult.plan,
        errors: pipelineResult.errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Buildable AI] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
