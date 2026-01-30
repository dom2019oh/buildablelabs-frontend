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
  architect: "openai/gpt-5",           // Reasoning and planning
  code: "google/gemini-2.5-pro",       // Code generation
  ui: "google/gemini-3-flash-preview", // UI/UX and design
  fast: "google/gemini-2.5-flash-lite", // Fast classification
};

// Task classification types
type TaskType = "reasoning" | "code" | "ui" | "general";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  projectId: string;
  message: string;
  conversationHistory: Message[];
}

// System prompts for different task types
const SYSTEM_PROMPTS = {
  code: `You are Buildify's CODE GENERATION engine. You generate production-ready code.

Your capabilities:
- Generate complete, working React components with TypeScript
- Write clean, maintainable, well-structured code
- Use Tailwind CSS for all styling (no inline styles)
- Follow modern React patterns (hooks, functional components)
- Handle edge cases and error states
- Create responsive, accessible UI

CRITICAL - Project Structure Rules:
When creating a new project or feature, ALWAYS generate a proper file structure:
1. Create files with proper paths (e.g., src/components/Hero.tsx, src/pages/About.tsx)
2. Include mandatory files: public/favicon.png, public/robots.txt, public/placeholder.svg
3. Use this format for code blocks:

\`\`\`tsx:src/components/ComponentName.tsx
// Component code here
\`\`\`

Code Generation Rules:
1. ALWAYS provide complete, runnable code - never partial snippets
2. Use TypeScript with proper type definitions
3. Use Tailwind CSS classes for all styling
4. Include all necessary imports
5. Add helpful comments for complex logic
6. Use shadcn/ui components when appropriate (Button, Card, Input, etc.)
7. Follow the component structure: imports → types → component → export

Response Format:
- Start with a brief explanation of what you're building (1-2 sentences)
- List the files being created
- Provide complete code for each file in properly tagged code blocks
- End with integration instructions`,

  ui: `You are Buildify's UI/UX SPECIALIST, focused on visual design and user experience.

Your expertise:
- Layout composition and visual hierarchy
- Spacing, padding, and margins (using Tailwind spacing scale)
- Color schemes and contrast (using Tailwind colors or CSS variables)
- Typography and font pairing
- Component organization and structure
- Responsive design patterns
- Micro-interactions and animations with Framer Motion
- Accessibility best practices

Response Guidelines:
1. Provide specific, actionable recommendations
2. Use exact Tailwind CSS classes (e.g., "p-4", "gap-6", "text-lg")
3. When suggesting colors, use semantic tokens (bg-primary, text-muted-foreground) or Tailwind colors
4. Include complete code examples showing the improved styling
5. Explain WHY each change improves the UI

CRITICAL - Always provide file paths:
\`\`\`tsx:src/components/ComponentName.tsx
// Complete component code
\`\`\`

Always provide complete, usable code that can be directly implemented.`,

  reasoning: `You are Buildify, an advanced AI product builder. You help users build production-ready web applications.

Your role as the ARCHITECT:
- Understand what the user wants to build
- Break down complex requests into clear, actionable steps
- Explain architecture decisions and best practices
- Guide users through the development process
- Provide clear, concise explanations

When a user asks to build something, create a comprehensive plan:
1. List the pages/components needed
2. Describe the file structure
3. Outline the features to implement
4. Suggest any database/backend requirements

Tech Stack: React + TypeScript + Tailwind CSS + Supabase + shadcn/ui

Response Guidelines:
- Be conversational but professional
- Use bullet points for lists and steps
- Keep responses focused and actionable
- When discussing features, be specific about implementation
- Suggest improvements when appropriate`,

  general: `You are Buildify, a friendly AI assistant for web development.

Keep responses brief and helpful. If the user greets you or asks a simple question, respond conversationally.

For technical questions, provide clear, accurate answers about:
- React, TypeScript, Tailwind CSS
- Web development best practices
- UI/UX principles
- Supabase and backend concepts`,
};

// Classify the task using the fast model
async function classifyTask(message: string, apiKey: string): Promise<TaskType> {
  const classificationPrompt = `Classify this request into exactly one category:
- "code": Writing code, creating components, fixing bugs, adding features, file changes
- "ui": Layout, styling, colors, fonts, visual improvements, animations, design
- "reasoning": Planning, explaining, architecture, comparing options, advice
- "general": Greetings, simple questions, thank you, clarifications

Request: "${message.slice(0, 500)}"

Respond with ONLY the category name.`;

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

    if (!response.ok) {
      console.error("Classification failed, defaulting to reasoning");
      return "reasoning";
    }

    const data = await response.json();
    const classification = data.choices?.[0]?.message?.content?.toLowerCase().trim();
    
    if (["code", "ui", "reasoning", "general"].includes(classification)) {
      return classification as TaskType;
    }
    return "reasoning";
  } catch (error) {
    console.error("Classification error:", error);
    return "reasoning";
  }
}

// Get model configuration based on task type
function getModelConfig(taskType: TaskType): { model: string; systemPrompt: string; modelLabel: string } {
  switch (taskType) {
    case "code":
      return {
        model: MODELS.code,
        systemPrompt: SYSTEM_PROMPTS.code,
        modelLabel: "Gemini Pro (Code)",
      };
    case "ui":
      return {
        model: MODELS.ui,
        systemPrompt: SYSTEM_PROMPTS.ui,
        modelLabel: "Gemini Flash (UI)",
      };
    case "reasoning":
      return {
        model: MODELS.architect,
        systemPrompt: SYSTEM_PROMPTS.reasoning,
        modelLabel: "GPT-5 (Architect)",
      };
    case "general":
    default:
      return {
        model: MODELS.fast,
        systemPrompt: SYSTEM_PROMPTS.general,
        modelLabel: "Gemini Lite (Fast)",
      };
  }
}

// Call Lovable AI Gateway
async function callLovableAI(
  messages: Message[], 
  model: string, 
  systemPrompt: string, 
  apiKey: string
): Promise<string> {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Credits exhausted. Please add credits to continue.");
    }
    const error = await response.text();
    console.error("Lovable AI Gateway error:", response.status, error);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "I apologize, I couldn't generate a response.";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Lovable API key (automatically provided)
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc("check_ai_rate_limit", { p_user_id: user.id });

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
    } else if (rateLimitData && rateLimitData[0] && !rateLimitData[0].allowed) {
      const resetAt = new Date(rateLimitData[0].reset_at).toLocaleTimeString();
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded", 
          message: `You've reached your request limit. Please try again after ${resetAt}.`,
          resetAt: rateLimitData[0].reset_at,
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse request
    const { projectId, message, conversationHistory } = await req.json() as ChatRequest;

    if (!projectId || !message) {
      throw new Error("Missing required fields: projectId and message");
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found or access denied");
    }

    // Sanitize and limit message
    const sanitizedMessage = message.slice(0, 10000).trim();
    if (!sanitizedMessage) {
      throw new Error("Message cannot be empty");
    }

    // Classify the task
    console.log("Classifying task...");
    const taskType = await classifyTask(sanitizedMessage, lovableApiKey);
    console.log(`Task classified as: ${taskType}`);

    // Get model configuration
    const { model, systemPrompt, modelLabel } = getModelConfig(taskType);
    console.log(`Using model: ${modelLabel}`);

    // Build conversation context (limit to last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    const messages: Message[] = [
      ...recentHistory,
      { role: "user", content: sanitizedMessage },
    ];

    // Call Lovable AI Gateway
    const response = await callLovableAI(messages, model, systemPrompt, lovableApiKey);

    // Return response with metadata
    return new Response(
      JSON.stringify({
        response,
        metadata: {
          taskType,
          modelUsed: modelLabel,
          model,
          remaining: rateLimitData?.[0]?.remaining ?? null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Chat Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    const status = errorMessage.includes("Unauthorized") ? 401 : 
                   errorMessage.includes("Rate limit") ? 429 :
                   errorMessage.includes("Credits") ? 402 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
