import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway endpoint
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Available models via Lovable AI Gateway
const MODELS = {
  architect: "openai/gpt-5",
  code: "google/gemini-2.5-pro",
  ui: "google/gemini-3-flash-preview",
  fast: "google/gemini-2.5-flash-lite",
};

type TaskType = "reasoning" | "code" | "ui" | "general";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  projectId: string;
  message: string;
  conversationHistory: Message[];
  stream?: boolean;
}

// System prompts with STRICT file output format and SMART DEFAULTS
const SYSTEM_PROMPTS = {
  code: `You are Buildable's CODE ENGINE. You CREATE COMPLETE, FUNCTIONAL FILES directly.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
code here
\`\`\`

RESPONSE STYLE:
- Keep explanations SHORT (1-2 sentences max)
- Focus on what you created, not how
- End with 2-3 actionable suggestions as bullet points

EXAMPLE RESPONSE:
"Here's your landing page with hero, features, and footer.

\`\`\`tsx:src/components/LandingPage.tsx
// full code here
\`\`\`

**What's next?**
• Add a contact form section
• Customize the color scheme
• Add animations to the hero"

COMPONENT RULES:
1. Export a single default component
2. Define ALL arrays/data INSIDE the component 
3. Use Tailwind CSS for styling
4. Use lucide-react for icons

NEVER add long explanations. Be concise.`,

  ui: `You are Buildable's UI ENGINE. You CREATE beautiful, complete designs.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
code here
\`\`\`

RULES:
1. Keep explanations to 1 sentence
2. Use Tailwind CSS
3. Generate COMPLETE components
4. End with 2-3 short suggestions

EXAMPLE:
"Updated the hero section with your new colors.

**Try these next:**
• Add a gradient background
• Make the CTA button larger"`,

  reasoning: `You are Buildable, an AI product builder.

When users ask to BUILD something:
1. Brief acknowledgment (1 sentence)
2. Create COMPLETE files
3. End with 2-3 suggestions

When users ask questions, be helpful but concise.

EXAMPLE:
"Great choice! Here's your dashboard.

**Suggestions:**
• Add user authentication
• Create a settings page"`,

  general: `You are Buildable, a friendly AI assistant.

Be helpful and concise. For build requests, create files using:
\`\`\`language:path/to/file.ext
code here
\`\`\`

Always end with 2-3 short, actionable suggestions.`,
};

async function classifyTask(message: string, apiKey: string): Promise<TaskType> {
  const classificationPrompt = `Classify this request:
- "code": CREATE/BUILD pages, components, apps, features, or any code generation
- "ui": ONLY styling/design changes to existing code (not creating new)
- "reasoning": Questions, explanations, planning without building
- "general": Greetings, simple questions

IMPORTANT: If user wants to CREATE or BUILD anything, classify as "code".

Request: "${message.slice(0, 500)}"

Respond with ONLY: code, ui, reasoning, or general`;

  try {
    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS.fast,
        messages: [{ role: "user", content: classificationPrompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!response.ok) return "code"; // Default to code for build requests

    const data = await response.json();
    const classification = data.choices?.[0]?.message?.content?.toLowerCase().trim();
    
    if (["code", "ui", "reasoning", "general"].includes(classification)) {
      return classification as TaskType;
    }
    return "code";
  } catch {
    return "code";
  }
}

function getModelConfig(taskType: TaskType): { model: string; systemPrompt: string; modelLabel: string } {
  switch (taskType) {
    case "code":
      return { model: MODELS.code, systemPrompt: SYSTEM_PROMPTS.code, modelLabel: "Gemini Pro (Code)" };
    case "ui":
      return { model: MODELS.ui, systemPrompt: SYSTEM_PROMPTS.ui, modelLabel: "Gemini Flash (UI)" };
    case "reasoning":
      return { model: MODELS.architect, systemPrompt: SYSTEM_PROMPTS.reasoning, modelLabel: "GPT-5 (Architect)" };
    default:
      return { model: MODELS.fast, systemPrompt: SYSTEM_PROMPTS.general, modelLabel: "Gemini Lite" };
  }
}

async function callLovableAI(messages: Message[], model: string, systemPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Credits exhausted");
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callLovableAIStream(opts: {
  messages: Message[];
  model: string;
  systemPrompt: string;
  apiKey: string;
}): Promise<Response> {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "system", content: opts.systemPrompt }, ...opts.messages],
      stream: true,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Credits exhausted");
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  if (!response.body) throw new Error("No response body");
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: rateLimitData } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rateLimitData?.[0] && !rateLimitData[0].allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", resetAt: rateLimitData[0].reset_at }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, message, conversationHistory, stream } = await req.json() as ChatRequest;
    if (!projectId || !message) throw new Error("Missing projectId or message");

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (!project) throw new Error("Project not found");

    const sanitizedMessage = message.slice(0, 10000).trim();
    if (!sanitizedMessage) throw new Error("Empty message");

    const taskType = await classifyTask(sanitizedMessage, lovableApiKey);
    console.log(`Task: ${taskType}`);

    const { model, systemPrompt, modelLabel } = getModelConfig(taskType);
    console.log(`Model: ${modelLabel}`);

    const messages: Message[] = [
      ...conversationHistory.slice(-10),
      { role: "user", content: sanitizedMessage },
    ];

    const metadata = {
      type: "metadata",
      taskType,
      modelUsed: modelLabel,
      model,
      remaining: rateLimitData?.[0]?.remaining ?? null,
    };

    if (stream) {
      const gatewayResp = await callLovableAIStream({
        messages,
        model,
        systemPrompt,
        apiKey: lovableApiKey,
      });

      const encoder = new TextEncoder();
      const ts = new TransformStream<Uint8Array, Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        },
      });

      gatewayResp.body!.pipeTo(ts.writable).catch(console.error);

      return new Response(ts.readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const responseText = await callLovableAI(messages, model, systemPrompt, lovableApiKey);

    return new Response(
      JSON.stringify({
        response: responseText,
        metadata: { taskType, modelUsed: modelLabel, model, remaining: rateLimitData?.[0]?.remaining ?? null },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Rate limit") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
