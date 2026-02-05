// =============================================================================
// AI Chat Edge Function with Tool/MCP Pipeline
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Model configuration for pipeline phases
const MODELS = {
  architect: "google/gemini-2.5-pro",
  code: "google/gemini-2.5-pro", 
  validate: "google/gemini-2.5-flash",
  ui: "google/gemini-3-flash-preview",
  fast: "google/gemini-2.5-flash",
};

// =============================================================================
// TOOL DEFINITIONS - MCP-style structured tools
// =============================================================================

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or update a file in the project",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path (e.g., 'src/components/Button.tsx')" },
          content: { type: "string", description: "Complete file content" },
          reason: { type: "string", description: "Why this file is being created/modified" }
        },
        required: ["path", "content"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "think",
      description: "Analyze the task before taking action",
      parameters: {
        type: "object",
        properties: {
          analysis: { type: "string", description: "Your reasoning about the task" },
          plan: { type: "array", items: { type: "string" }, description: "Steps to accomplish the task" }
        },
        required: ["analysis", "plan"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "complete",
      description: "Signal task completion",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "What was accomplished" },
          filesCreated: { type: "array", items: { type: "string" } },
          filesModified: { type: "array", items: { type: "string" } }
        },
        required: ["summary"],
        additionalProperties: false
      }
    }
  }
];

// =============================================================================
// TYPES
// =============================================================================

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ProjectFile {
  path: string;
  content: string;
}

interface ChatRequest {
  projectId: string;
  message: string;
  conversationHistory: Message[];
  stream?: boolean;
  existingFiles?: ProjectFile[];
  usePipeline?: boolean;
}

type TaskType = "reasoning" | "code" | "ui" | "general" | "fix_error" | "add_component" | "new_project";

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const BUILDABLE_IDENTITY = `You are Buildable — a professional AI code architect.

CORE PRINCIPLES:
- Build REAL software, not demos
- Make surgical, minimal changes
- Never break existing functionality
- Use React + TypeScript + Tailwind

OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
// Complete file content
\`\`\`

FILE STRUCTURE:
- src/pages/ for page components
- src/components/ for reusable components  
- src/components/layout/ for Navbar, Footer, etc.
- src/hooks/ for custom hooks
- src/lib/ for utilities`;

const ARCHITECT_PROMPT = `${BUILDABLE_IDENTITY}

You are the ARCHITECT phase. Analyze the request and create a structured plan.

OUTPUT (JSON):
{
  "understanding": "Brief summary of what user wants",
  "plan": [{"step": 1, "action": "create", "path": "src/...", "description": "What this does"}],
  "architecture": {"components": [], "dataFlow": "..."}
}`;

const CODE_PROMPT = `${BUILDABLE_IDENTITY}

You are the CODE phase. Follow the architect's plan and generate code.

Use write_file tool calls for each file:
{"tool_calls": [{"function": {"name": "write_file", "arguments": {"path": "...", "content": "..."}}}]}

Or use traditional format:
\`\`\`tsx:src/components/Example.tsx
// code here
\`\`\``;

const NEW_PROJECT_PROMPT = `${BUILDABLE_IDENTITY}

GENERATE A COMPLETE PROJECT with these files:
1. public/robots.txt
2. src/main.tsx
3. src/App.tsx
4. src/index.css (with Tailwind + CSS variables)
5. src/lib/utils.ts
6. src/pages/Index.tsx
7. src/pages/NotFound.tsx
8. src/components/layout/Navbar.tsx
9. src/components/layout/Footer.tsx

Use Tailwind semantic tokens: bg-background, text-foreground, etc.`;

const FIX_ERROR_PROMPT = `${BUILDABLE_IDENTITY}

DEBUGGING MODE:
1. Identify the root cause
2. Explain what went wrong
3. Provide the COMPLETE fixed file
4. Add safeguards to prevent recurrence`;

// =============================================================================
// TASK CLASSIFICATION
// =============================================================================

function classifyTask(message: string, hasExistingFiles: boolean): TaskType {
  const lower = message.toLowerCase();
  
  if (lower.includes('error') || lower.includes('fix') || lower.includes('broken') || lower.includes('bug')) {
    return "fix_error";
  }
  
  if (!hasExistingFiles && (lower.includes('create') || lower.includes('build') || lower.includes('make'))) {
    return "new_project";
  }
  
  if (hasExistingFiles && (lower.includes('add') || lower.includes('create'))) {
    return "add_component";
  }
  
  return "code";
}

function getSystemPrompt(taskType: TaskType): string {
  switch (taskType) {
    case "new_project": return NEW_PROJECT_PROMPT;
    case "fix_error": return FIX_ERROR_PROMPT;
    case "add_component": return CODE_PROMPT;
    default: return BUILDABLE_IDENTITY;
  }
}

function getModel(taskType: TaskType): string {
  switch (taskType) {
    case "new_project": return MODELS.code;
    case "fix_error": return MODELS.code;
    case "ui": return MODELS.ui;
    default: return MODELS.code;
  }
}

// =============================================================================
// CODE VALIDATION
// =============================================================================

function validateCode(code: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses`);
  }
  
  return { isValid: errors.length === 0, errors };
}

// =============================================================================
// FILE CONTEXT BUILDER
// =============================================================================

function buildFileContext(files: ProjectFile[]): string {
  if (!files.length) return "";
  
  let context = "\n\nEXISTING FILES:\n";
  for (const file of files.slice(0, 5)) {
    context += `\n📄 ${file.path}:\n\`\`\`\n${file.content.slice(0, 1500)}\n\`\`\`\n`;
  }
  return context;
}

// =============================================================================
// PIPELINE EXECUTION
// =============================================================================

interface PipelinePhase {
  name: string;
  model: string;
  duration: number;
}

async function executePipeline(
  message: string,
  history: Message[],
  existingFiles: ProjectFile[],
  apiKey: string
): Promise<{ response: string; phases: PipelinePhase[] }> {
  const phases: PipelinePhase[] = [];
  const startTime = Date.now();

  // Phase 1: Architect (Quick analysis)
  console.log("🏗️ Phase 1: Architect");
  const architectStart = Date.now();
  
  const architectResp = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.architect,
      messages: [
        { role: "system", content: ARCHITECT_PROMPT + buildFileContext(existingFiles) },
        ...history.slice(-5),
        { role: "user", content: message }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!architectResp.ok) {
    throw new Error(`Architect phase failed: ${await architectResp.text()}`);
  }

  const architectData = await architectResp.json();
  const plan = architectData.choices?.[0]?.message?.content || "";
  
  phases.push({
    name: "architect",
    model: MODELS.architect,
    duration: Date.now() - architectStart
  });

  // Phase 2: Code Generation
  console.log("💻 Phase 2: Code");
  const codeStart = Date.now();

  const codeResp = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.code,
      messages: [
        { role: "system", content: CODE_PROMPT + buildFileContext(existingFiles) },
        ...history.slice(-5),
        { role: "user", content: message },
        { role: "assistant", content: `PLAN:\n${plan}` },
        { role: "user", content: "Now generate the code following this plan." }
      ],
      max_tokens: 12000,
      temperature: 0.5,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto"
    }),
  });

  if (!codeResp.ok) {
    throw new Error(`Code phase failed: ${await codeResp.text()}`);
  }

  const codeData = await codeResp.json();
  let codeResponse = codeData.choices?.[0]?.message?.content || "";
  
  // Extract file operations from tool calls
  const toolCalls = codeData.choices?.[0]?.message?.tool_calls || [];
  if (toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.function?.name === "write_file") {
        try {
          const args = typeof call.function.arguments === "string"
            ? JSON.parse(call.function.arguments)
            : call.function.arguments;
          
          const ext = args.path.split('.').pop() || 'txt';
          codeResponse += `\n\n\`\`\`${ext}:${args.path}\n${args.content}\n\`\`\``;
        } catch {}
      }
    }
  }

  phases.push({
    name: "code",
    model: MODELS.code,
    duration: Date.now() - codeStart
  });

  // Phase 3: Validate
  console.log("✅ Phase 3: Validate");
  const validateStart = Date.now();
  
  const codeBlocks = codeResponse.match(/```[\s\S]*?```/g) || [];
  let hasErrors = false;
  
  for (const block of codeBlocks) {
    const validation = validateCode(block);
    if (!validation.isValid) {
      hasErrors = true;
      console.log("Validation errors:", validation.errors);
    }
  }

  phases.push({
    name: "validate",
    model: MODELS.validate,
    duration: Date.now() - validateStart
  });

  console.log(`✅ Pipeline complete in ${Date.now() - startTime}ms`);
  
  return { response: codeResponse, phases };
}

// =============================================================================
// STREAMING AI CALL
// =============================================================================

async function streamAI(
  messages: Message[],
  model: string,
  systemPrompt: string,
  apiKey: string
): Promise<Response> {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 12000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Credits exhausted");
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  return response;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Rate limit check
    const { data: rateLimitData } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rateLimitData?.[0] && !rateLimitData[0].allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", resetAt: rateLimitData[0].reset_at }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credits check
    const { data: hasCredits } = await supabase.rpc("user_has_credits", { p_user_id: user.id, p_amount: 0.10 });
    if (hasCredits === false) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, message, conversationHistory, stream, existingFiles = [], usePipeline = false } = await req.json() as ChatRequest;
    if (!projectId || !message) throw new Error("Missing projectId or message");

    // Verify project ownership
    const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).single();
    if (!project) throw new Error("Project not found");

    const taskType = classifyTask(message, existingFiles.length > 0);
    const model = getModel(taskType);
    const systemPrompt = getSystemPrompt(taskType) + buildFileContext(existingFiles);

    console.log(`Task: ${taskType}, Pipeline: ${usePipeline}, Files: ${existingFiles.length}`);

    // Deduct credits
    await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_action_type: "ai_chat",
      p_description: `AI: ${taskType}`,
      p_metadata: { taskType, projectId }
    });

    const metadata = {
      type: "metadata",
      taskType,
      modelUsed: model,
      remaining: rateLimitData?.[0]?.remaining ?? null,
      pipeline: usePipeline,
    };

    // Use pipeline for new projects or when requested
    if (usePipeline || taskType === "new_project") {
      const { response, phases } = await executePipeline(message, conversationHistory, existingFiles, apiKey);
      
      return new Response(
        JSON.stringify({
          response,
          metadata: { ...metadata, phases, duration: Date.now() - startTime }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standard streaming for other requests
    if (stream) {
      const messages: Message[] = [...conversationHistory.slice(-10), { role: "user", content: message }];
      const gatewayResp = await streamAI(messages, model, systemPrompt, apiKey);

      const encoder = new TextEncoder();
      const ts = new TransformStream<Uint8Array, Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        },
      });

      gatewayResp.body!.pipeTo(ts.writable).catch(console.error);

      return new Response(ts.readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Non-streaming
    const messages: Message[] = [...conversationHistory.slice(-10), { role: "user", content: message }];
    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...messages], max_tokens: 12000, temperature: 0.7 }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    const data = await response.json();

    return new Response(
      JSON.stringify({ response: data.choices?.[0]?.message?.content || "", metadata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Rate limit") ? 429 : msg.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
