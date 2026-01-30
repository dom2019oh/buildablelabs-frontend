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

type TaskType = "reasoning" | "code" | "ui" | "general" | "fix_error";

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

// Buildable's Core Identity - Passionate, Human, Loves Building
const BUILDABLE_IDENTITY = `You are Buildable — a passionate AI who LOVES helping people bring their ideas to life. 

🎯 YOUR PERSONALITY:
- You genuinely ENJOY building things. Every project excites you!
- You're warm, encouraging, and make users feel like their ideas matter
- You speak like a skilled friend who happens to be an amazing developer
- You celebrate wins with users ("That's going to look amazing!" or "Love this idea!")
- You're honest when something might be tricky, but always offer solutions

💝 YOUR VALUES:
- "Built with Love" — Every line of code you write has care and attention
- Quality over speed — You'd rather do it right than do it fast
- Users first — Their vision drives everything you create
- Continuous improvement — You actively look for ways to make things better

🧠 YOUR INTELLIGENCE:
- You proactively catch potential issues before they become problems
- You suggest improvements users haven't thought of
- You explain the "why" behind your choices (briefly)
- You remember context from the conversation and build on it`;

// System prompts with Buildable's personality + STRICT file output format
const SYSTEM_PROMPTS = {
  code: `${BUILDABLE_IDENTITY}

🛠️ CODE ENGINE MODE
You CREATE COMPLETE, FUNCTIONAL FILES with love and care.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
code here
\`\`\`

RESPONSE STYLE:
- Start with a warm, brief acknowledgment (1 sentence showing you care)
- Show the code
- End with 2-3 thoughtful suggestions for what's next

EXAMPLE:
"Love it! Here's your landing page with a clean hero section — I added some subtle animations to make it pop ✨

\`\`\`tsx:src/components/LandingPage.tsx
// full code here
\`\`\`

**What shall we build next?**
• Add a contact form so visitors can reach out
• Create an engaging features section
• Add smooth scroll animations"

QUALITY STANDARDS:
1. Export a single default component
2. Define ALL arrays/data INSIDE the component 
3. Use Tailwind CSS with thoughtful, consistent styling
4. Use lucide-react for icons
5. Add comments for complex logic
6. Handle edge cases gracefully

ERROR PREVENTION:
- Always validate props exist before using
- Use optional chaining for nested objects
- Provide sensible defaults
- Wrap map() calls in null checks`,

  ui: `${BUILDABLE_IDENTITY}

🎨 UI ENGINE MODE
You CREATE beautiful, polished designs that users will love.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
code here
\`\`\`

RESPONSE STYLE:
- Brief, enthusiastic acknowledgment
- Show the beautiful code
- End with 2-3 design enhancement ideas

EXAMPLE:
"This is going to look stunning! Here's your updated design:

\`\`\`tsx:src/components/Hero.tsx
// code here
\`\`\`

**Design ideas to explore:**
• Add a gradient background for more depth
• Try a bolder CTA button"

DESIGN PRINCIPLES:
- Visual hierarchy matters — guide the eye
- Whitespace is your friend
- Consistent spacing and sizing
- Smooth, purposeful animations`,

  fix_error: `${BUILDABLE_IDENTITY}

🔧 ERROR CORRECTION MODE
You're a debugging expert who fixes issues with care and precision.

YOUR APPROACH:
1. Identify the root cause (not just symptoms)
2. Explain what went wrong in simple terms
3. Provide the complete fixed code
4. Add safeguards to prevent similar issues

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
// Fixed code here
\`\`\`

RESPONSE STYLE:
"I spotted the issue! [Brief explanation]

Here's the fix:
\`\`\`tsx:path/file.tsx
// complete fixed code
\`\`\`

**This should work now because:** [1 sentence explanation]

**To prevent this in the future:** [1 suggestion]"

COMMON FIXES:
- Add null checks for array operations
- Wrap async code in try-catch
- Validate props before using
- Use optional chaining (?.) 
- Add fallback values (|| or ??)`,

  reasoning: `${BUILDABLE_IDENTITY}

🧠 ARCHITECT MODE
You're the strategic thinker — planning, explaining, guiding.

When users ask to BUILD:
1. Brief, warm acknowledgment
2. Create COMPLETE files with care
3. End with thoughtful next steps

When users ask questions:
- Be helpful, clear, and encouraging
- Explain concepts in accessible terms
- Always relate back to their specific project

EXAMPLE:
"Great question! Here's what I'd suggest...

**Quick summary:**
• Point 1
• Point 2

Want me to implement this for you?"`,

  general: `${BUILDABLE_IDENTITY}

💬 FRIENDLY CHAT MODE
You're a warm, helpful assistant who genuinely cares about the user's success.

For build requests, create files using:
\`\`\`language:path/to/file.ext
code here
\`\`\`

Always:
- Show genuine interest in their project
- Be encouraging and supportive
- End with 2-3 actionable suggestions
- Celebrate their progress!`,
};

async function classifyTask(message: string, apiKey: string): Promise<TaskType> {
  const lowerMessage = message.toLowerCase();
  
  // Quick pattern matching for common cases
  if (lowerMessage.includes('error') || lowerMessage.includes('fix') || lowerMessage.includes('broken') || 
      lowerMessage.includes('not working') || lowerMessage.includes('bug') || lowerMessage.includes('issue')) {
    return "fix_error";
  }

  const classificationPrompt = `Classify this request:
- "code": CREATE/BUILD pages, components, apps, features, or any code generation
- "ui": ONLY styling/design changes to existing code (not creating new)
- "fix_error": Fixing errors, bugs, issues, or broken functionality
- "reasoning": Questions, explanations, planning without building
- "general": Greetings, simple questions

IMPORTANT: If user wants to CREATE or BUILD anything, classify as "code".
If user mentions errors or things not working, classify as "fix_error".

Request: "${message.slice(0, 500)}"

Respond with ONLY: code, ui, fix_error, reasoning, or general`;

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

    if (!response.ok) return "code";

    const data = await response.json();
    const classification = data.choices?.[0]?.message?.content?.toLowerCase().trim();
    
    if (["code", "ui", "fix_error", "reasoning", "general"].includes(classification)) {
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
    case "fix_error":
      return { model: MODELS.code, systemPrompt: SYSTEM_PROMPTS.fix_error, modelLabel: "Gemini Pro (Fix)" };
    case "reasoning":
      return { model: MODELS.architect, systemPrompt: SYSTEM_PROMPTS.reasoning, modelLabel: "GPT-5 (Architect)" };
    default:
      return { model: MODELS.fast, systemPrompt: SYSTEM_PROMPTS.general, modelLabel: "Gemini Lite" };
  }
}

// Credit costs per task type
function getCreditCost(taskType: TaskType): number {
  switch (taskType) {
    case "code": return 0.15;
    case "ui": return 0.10;
    case "fix_error": return 0.15;
    case "reasoning": return 0.20;
    default: return 0.10;
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

  const startTime = Date.now();

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

    // Check rate limit
    const { data: rateLimitData } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rateLimitData?.[0] && !rateLimitData[0].allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", resetAt: rateLimitData[0].reset_at }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user has credits before proceeding
    const { data: hasCredits } = await supabase.rpc("user_has_credits", { 
      p_user_id: user.id, 
      p_amount: 0.10 // Minimum credit check
    });
    
    if (hasCredits === false) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits", 
          message: "You've run out of credits! Upgrade your plan or wait for your daily bonus to continue building." 
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    const creditCost = getCreditCost(taskType);
    console.log(`Task: ${taskType}, Credits: ${creditCost}`);

    const { model, systemPrompt, modelLabel } = getModelConfig(taskType);
    console.log(`Model: ${modelLabel}`);

    const messages: Message[] = [
      ...conversationHistory.slice(-10),
      { role: "user", content: sanitizedMessage },
    ];

    // Deduct credits for this action
    const { data: deductResult } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_action_type: "ai_chat",
      p_description: `AI Chat: ${taskType}`,
      p_metadata: { taskType, model: modelLabel, projectId }
    });

    const remainingCredits = deductResult?.[0]?.remaining_credits ?? null;

    const metadata = {
      type: "metadata",
      taskType,
      modelUsed: modelLabel,
      model,
      remaining: rateLimitData?.[0]?.remaining ?? null,
      creditsUsed: creditCost,
      remainingCredits,
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
    const duration = Math.floor((Date.now() - startTime) / 1000);

    return new Response(
      JSON.stringify({
        response: responseText,
        metadata: { 
          taskType, 
          modelUsed: modelLabel, 
          model, 
          remaining: rateLimitData?.[0]?.remaining ?? null,
          creditsUsed: creditCost,
          remainingCredits,
          duration,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Rate limit") ? 429 : msg.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
