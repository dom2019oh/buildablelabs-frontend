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
  const classificationPrompt = `You are a task classifier. Analyze the user's request and classify it into exactly one category.

Categories:
- "code": Writing new code, modifying existing code, fixing bugs, refactoring, adding features, file changes, logic changes
- "ui": Layout changes, styling, spacing, colors, fonts, component arrangement, visual improvements, UX improvements, making things look better
- "reasoning": Planning, explaining, breaking down complex tasks, architecture decisions, answering questions, general help
- "general": Simple greetings, clarifications, or non-technical requests

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

// Call OpenAI for reasoning/coordination
async function callOpenAI(messages: Message[], apiKey: string): Promise<string> {
  const systemPrompt = `You are Buildify, an AI assistant that helps users build web applications. 
You are helpful, friendly, and concise. You help users understand what they want to build, 
break down complex requests into steps, and guide them through the development process.
When discussing code or technical topics, be clear and actionable.
Keep responses focused and practical.`;

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
      max_tokens: 2000,
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
  const systemPrompt = `You are Buildify's code specialist. You excel at:
- Writing clean, maintainable code
- Modifying existing codebases safely
- Fixing bugs and refactoring
- Working across multiple files
- Explaining code changes clearly

You write React, TypeScript, and Tailwind CSS. Keep code examples focused and practical.
When suggesting changes, explain what you're doing and why.
Use markdown code blocks with appropriate language tags.`;

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
      max_tokens: 4000,
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
  const systemPrompt = `You are Buildify's UI/UX specialist. You excel at:
- Layout and visual structure
- Component organization and spacing
- Color schemes and typography
- User experience improvements
- Making interfaces clean and intuitive
- Copy writing and microcopy

You work with React components and Tailwind CSS. Focus on practical, implementable suggestions.
When recommending UI changes, be specific about spacing, colors (using Tailwind classes), and structure.`;

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "I understand. I'm Buildify's UI/UX specialist ready to help with layouts, styling, and user experience improvements." }] },
    ...messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
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

    if (!openaiKey || !claudeKey || !geminiKey) {
      throw new Error("Missing required API keys");
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

    // Route to appropriate model
    let response: string;
    let modelUsed: string;

    switch (taskType) {
      case "code":
        console.log("Routing to Claude for code task");
        response = await callClaude(messages, claudeKey);
        modelUsed = "claude";
        break;
      case "ui":
        console.log("Routing to Gemini for UI task");
        response = await callGemini(messages, geminiKey);
        modelUsed = "gemini";
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
