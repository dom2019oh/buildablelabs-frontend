import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Classify the task to determine which model to use
async function classifyTask(message: string, openaiKey: string): Promise<TaskType> {
  const classificationPrompt = `You are a task classifier for an AI code builder. Analyze the user's request and classify it into exactly one category.

Categories:
- "code": Writing new code, creating components, modifying existing code, fixing bugs, refactoring, adding features, file changes, logic changes, API integration, database operations, creating pages
- "ui": Layout changes, styling, spacing, colors, fonts, component arrangement, visual improvements, UX improvements, animations, responsive design, making things look better
- "reasoning": Planning, explaining concepts, breaking down complex tasks, architecture decisions, answering questions, comparing options, giving advice
- "general": Simple greetings, clarifications, thank you messages, or non-technical requests

User request: "${message}"

Respond with ONLY the category name (code, ui, reasoning, or general), nothing else.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
    const classification = data.choices[0]?.message?.content?.toLowerCase().trim();
    
    if (["code", "ui", "reasoning", "general"].includes(classification)) {
      return classification as TaskType;
    }
    return "reasoning";
  } catch (error) {
    console.error("Classification error:", error);
    return "reasoning";
  }
}

// Call OpenAI for reasoning/coordination and as fallback
async function callOpenAI(messages: Message[], apiKey: string, taskType: TaskType = "reasoning"): Promise<string> {
  let systemPrompt: string;
  
  switch (taskType) {
    case "code":
      systemPrompt = `You are Buildify's CODE GENERATION engine. You generate production-ready code.

Your capabilities:
- Generate complete, working React components with TypeScript
- Write clean, maintainable, well-structured code
- Use Tailwind CSS for all styling (no inline styles)
- Follow modern React patterns (hooks, functional components)
- Handle edge cases and error states
- Create responsive, accessible UI

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
- Provide the complete code in a code block with proper language tag
- End with a brief note on how to use/integrate the component`;
      break;
    case "ui":
      systemPrompt = `You are Buildify's UI/UX SPECIALIST, focused on visual design and user experience.

Your expertise:
- Layout composition and visual hierarchy
- Spacing, padding, and margins (using Tailwind spacing scale)
- Color schemes and contrast (using Tailwind colors or CSS variables)
- Typography and font pairing
- Component organization and structure
- Responsive design patterns
- Micro-interactions and animations
- Accessibility best practices

Response Guidelines:
1. Provide specific, actionable recommendations
2. Use exact Tailwind CSS classes (e.g., "p-4", "gap-6", "text-lg")
3. When suggesting colors, use semantic tokens (bg-primary, text-muted-foreground) or Tailwind colors
4. Include code examples showing the improved styling
5. Explain WHY each change improves the UI

Always provide complete, usable code that can be directly implemented.`;
      break;
    default:
      systemPrompt = `You are Buildify, an advanced AI product builder. You help users build production-ready web applications.

Your role as the REASONING MODEL:
- Understand what the user wants to build
- Break down complex requests into clear, actionable steps
- Explain architecture decisions and best practices
- Guide users through the development process
- Provide clear, concise explanations

Response Guidelines:
- Be conversational but professional
- Use bullet points for lists and steps
- Keep responses focused and actionable
- When discussing features, be specific about implementation
- Suggest improvements when appropriate

You work with a React + TypeScript + Tailwind CSS + Supabase stack.`;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";
}

// Call Claude for code-related tasks
async function callClaude(messages: Message[], apiKey: string): Promise<string> {
  const systemPrompt = `You are Buildify's CODE GENERATION engine, similar to Lovable. You generate production-ready code.

Your capabilities:
- Generate complete, working React components with TypeScript
- Write clean, maintainable, well-structured code
- Use Tailwind CSS for all styling (no inline styles)
- Follow modern React patterns (hooks, functional components)
- Handle edge cases and error states
- Create responsive, accessible UI

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
- Provide the complete code in a code block with proper language tag
- End with a brief note on how to use/integrate the component

Example output format:
I'll create a [component name] that [brief description].

\`\`\`tsx
// Complete working code here
\`\`\`

This component [brief usage note].`;

  const anthropicMessages = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "I apologize, I couldn't generate a response.";
}

// Call Gemini for UI/UX tasks
async function callGemini(messages: Message[], apiKey: string): Promise<string> {
  const systemPrompt = `You are Buildify's UI/UX SPECIALIST, focused on visual design and user experience.

Your expertise:
- Layout composition and visual hierarchy
- Spacing, padding, and margins (using Tailwind spacing scale)
- Color schemes and contrast (using Tailwind colors or CSS variables)
- Typography and font pairing
- Component organization and structure
- Responsive design patterns
- Micro-interactions and animations
- Accessibility best practices

Response Guidelines:
1. Provide specific, actionable recommendations
2. Use exact Tailwind CSS classes (e.g., "p-4", "gap-6", "text-lg")
3. When suggesting colors, use semantic tokens (bg-primary, text-muted-foreground) or Tailwind colors
4. Include code examples showing the improved styling
5. Explain WHY each change improves the UI

Response Format:
- Start with an assessment of the current UI (1-2 sentences)
- List specific improvements with Tailwind classes
- Provide a code example showing the changes
- Summarize the visual impact

Always provide complete, usable code that can be directly implemented.`;

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "I understand. I'm Buildify's UI/UX specialist. I'll provide specific, actionable improvements with exact Tailwind classes and complete code examples." }] },
    ...messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, I couldn't generate a response.";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API keys
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const claudeKey = Deno.env.get("CLAUDE_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!openaiKey) {
      throw new Error("Missing OpenAI API key");
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
    const taskType = await classifyTask(sanitizedMessage, openaiKey);
    console.log(`Task classified as: ${taskType}`);

    // Build conversation context (limit to last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    const messages: Message[] = [
      ...recentHistory,
      { role: "user", content: sanitizedMessage },
    ];

    // Route to appropriate model with fallback to OpenAI
    let response: string;
    let modelUsed: string;

    switch (taskType) {
      case "code":
        // Try Claude first, fallback to OpenAI
        if (claudeKey) {
          try {
            console.log("Routing to Claude for code task");
            response = await callClaude(messages, claudeKey);
            modelUsed = "claude";
          } catch (error) {
            console.warn("Claude failed, falling back to OpenAI:", error);
            response = await callOpenAI(messages, openaiKey, "code");
            modelUsed = "openai";
          }
        } else {
          response = await callOpenAI(messages, openaiKey, "code");
          modelUsed = "openai";
        }
        break;
      case "ui":
        // Try Gemini first, fallback to OpenAI
        if (geminiKey) {
          try {
            console.log("Routing to Gemini for UI task");
            response = await callGemini(messages, geminiKey);
            modelUsed = "gemini";
          } catch (error) {
            console.warn("Gemini failed, falling back to OpenAI:", error);
            response = await callOpenAI(messages, openaiKey, "ui");
            modelUsed = "openai";
          }
        } else {
          response = await callOpenAI(messages, openaiKey, "ui");
          modelUsed = "openai";
        }
        break;
      case "reasoning":
      case "general":
      default:
        console.log("Routing to OpenAI for reasoning/general task");
        response = await callOpenAI(messages, openaiKey);
        modelUsed = "openai";
        break;
    }

    // Return response with metadata
    return new Response(
      JSON.stringify({
        response,
        metadata: {
          taskType,
          modelUsed,
          remaining: rateLimitData?.[0]?.remaining ?? null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Chat Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    const status = errorMessage.includes("Unauthorized") ? 401 : 
                   errorMessage.includes("Rate limit") ? 429 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
