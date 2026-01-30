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
  code: `You are Buildify's CODE ENGINE. You CREATE COMPLETE, FUNCTIONAL FILES directly - your output is parsed and files are created automatically.

CRITICAL OUTPUT FORMAT:
Every code block MUST have a file path in this EXACT format:
\`\`\`language:path/to/file.ext
code here
\`\`\`

ALWAYS CREATE THESE FILES FOR A NEW PROJECT:
1. src/components/LandingPage.tsx - Main landing page component
2. src/index.css - Global styles with Tailwind directives and custom CSS

SMART DEFAULTS - When user is VAGUE, use professional placeholder content:
- Hero heading: "Build Something Amazing" or "Welcome to [Project Name]"
- Hero subtext: "Transform your ideas into reality with our powerful platform."
- Button text: "Get Started" / "Learn More" / "Contact Us"
- Features section title: "Why Choose Us" or "Our Features"
- Feature titles: "Fast & Reliable", "Easy to Use", "Secure & Safe"
- Feature descriptions: "Experience lightning-fast performance..." etc.
- Footer: "© 2024 [Project Name]. All rights reserved."
- About text: "We help businesses grow with innovative solutions."

COMPONENT STRUCTURE RULES:
1. Export a single default component function
2. Use complete, working JSX - no placeholders like {features.map...} without the actual map logic
3. Include ALL data inline - define arrays/objects INSIDE the component
4. Use Tailwind CSS classes for ALL styling
5. Import icons from lucide-react when needed

EXAMPLE LANDING PAGE STRUCTURE:
\`\`\`tsx:src/components/LandingPage.tsx
import { Rocket, Zap, Shield } from 'lucide-react';

const LandingPage = () => {
  const features = [
    { icon: Zap, title: "Lightning Fast", description: "Experience blazing speed..." },
    { icon: Shield, title: "Secure", description: "Your data is protected..." },
    { icon: Rocket, title: "Powerful", description: "Unlock unlimited potential..." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Build Something Amazing</h1>
        <p className="text-xl text-gray-300 mb-8">Transform your ideas into reality</p>
        <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg">
          Get Started
        </button>
      </section>
      
      {/* Features */}
      <section className="py-16 px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Core Features</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <feature.icon className="h-10 w-10 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-gray-400">
        © 2024 Your Company. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
\`\`\`

RULES:
1. ALWAYS include the file path after the language
2. Keep explanations to 1-2 sentences BEFORE the file blocks
3. Generate COMPLETE, WORKING code - no incomplete JSX
4. Use modern React patterns with TypeScript
5. Always define data/arrays INSIDE the component, not externally`,

  ui: `You are Buildify's UI ENGINE. You CREATE FILES with beautiful, complete designs.

CRITICAL OUTPUT FORMAT:
Every code block MUST have a file path:
\`\`\`language:path/to/file.ext
code here
\`\`\`

RULES:
1. ALWAYS include file path after language
2. Use Tailwind CSS for all styling
3. Keep explanations to 1-2 sentences
4. Generate COMPLETE components - no placeholder JSX like {items.map...} without the map logic
5. Include ALL data inline within the component
6. Use professional placeholder text when user is vague:
   - Headings: "Your Title Here", "Section Heading"
   - Body text: "Description text goes here..."
   - Buttons: "Click Here", "Submit", "Learn More"`,

  reasoning: `You are Buildify, an AI product builder.

When users ask to BUILD something, respond with:
1. Brief acknowledgment (1 sentence)
2. Then create COMPLETE, WORKING files using this format:

\`\`\`tsx:src/components/ComponentName.tsx
// COMPLETE code with all data inline
\`\`\`

When users ask questions (not building), provide helpful explanations.

IMPORTANT: Never output incomplete JSX. Always define arrays/objects INSIDE components.`,

  general: `You are Buildify, a friendly AI assistant.

For simple questions, respond conversationally.
For build requests, create COMPLETE files using:
\`\`\`language:path/to/file.ext
complete code here
\`\`\`

Always use placeholder text like "Your Title Here" when specifics aren't given.`,
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
