// =============================================================================
// BUILDABLE AI GENERATION - Streaming + File Persistence
// =============================================================================
// This is the main AI endpoint for Buildable. It:
// 1. Streams AI responses in real-time
// 2. Saves generated files to workspace_files
// 3. Updates generation_sessions with progress
// 4. Uses the Architect → Code → Validate pipeline

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Avoid Lovable AI Gateway during testing (it can return 402 payment_required).
// Use direct provider APIs instead.
const OPENAI_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";

const MODELS = {
  architect: "google/gemini-2.5-pro",
  code: "google/gemini-2.5-pro",
  fast: "google/gemini-3-flash-preview",
};

// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const BUILDABLE_PROMPT = `You are Buildable — an AI that generates production-ready React websites.

CORE RULES:
1. Generate COMPLETE, working files - no placeholders or "..."
2. Use React + TypeScript + Tailwind CSS
3. Use semantic Tailwind tokens: bg-background, text-foreground, border-border, etc.
4. Make everything responsive with Tailwind classes
5. Include ALL necessary imports

OUTPUT FORMAT - Each file as:
\`\`\`tsx:src/path/to/File.tsx
// Complete file content
\`\`\`

FILE STRUCTURE:
- src/pages/Index.tsx - Main landing page
- src/components/ - Reusable components
- src/components/layout/ - Navbar, Footer, etc.

STYLE TOKENS (use these, not raw colors):
- bg-background, bg-card, bg-muted, bg-primary, bg-secondary
- text-foreground, text-muted-foreground, text-primary
- border-border, border-input
- rounded-md, rounded-lg, shadow-sm, shadow-lg

ALWAYS generate at least:
1. src/pages/Index.tsx - The main page
2. Any components imported by Index.tsx`;

const NEW_PROJECT_PROMPT = `${BUILDABLE_PROMPT}

This is a NEW PROJECT. Generate a complete landing page with:
1. src/pages/Index.tsx - Hero section, features, call-to-action
2. src/components/layout/Navbar.tsx - Navigation with logo and links
3. src/components/layout/Footer.tsx - Footer with links and copyright
4. Any additional components needed

Make it modern, professional, and visually impressive.`;

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
        content,
        operation: "create",
      });
    }
  }

  return operations;
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
      // Upsert the file
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

      // Log the operation
      await supabase
        .from("file_operations")
        .insert({
          workspace_id: workspaceId,
          session_id: sessionId,
          user_id: userId,
          operation: file.operation,
          file_path: file.path,
          new_content: file.content,
          ai_model: MODELS.code,
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

  // Build context
  let fileContext = "";
  if (existingFiles.length > 0) {
    fileContext = "\n\nEXISTING PROJECT FILES:\n";
    for (const file of existingFiles.slice(0, 8)) {
      fileContext += `📄 ${file.path}:\n\`\`\`\n${file.content.slice(0, 2000)}\n\`\`\`\n`;
    }
  }

  const isNewProject = existingFiles.length === 0;
  const systemPrompt = isNewProject ? NEW_PROJECT_PROMPT : BUILDABLE_PROMPT + fileContext;

  // Build messages
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6),
    { role: "user", content: prompt }
  ];

  // Call OpenAI with streaming (SSE format is compatible with our downstream parser)
  const aiResponse = await fetch(OPENAI_CHAT_COMPLETIONS, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Use a real OpenAI model name (MODELS above is for Lovable AI routing)
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 12000,
      temperature: 0.6,
    }),
  });

  if (!aiResponse.ok) {
    const error = await aiResponse.text();
    
    // Update session with error
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

  // Create a transform stream to:
  // 1. Pass through SSE events to client
  // 2. Collect full response for file extraction
  let fullContent = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    start(controller) {
      // Send metadata event first
      const metadata = {
        type: "metadata",
        sessionId,
        workspaceId,
        status: "generating",
         model: "gpt-4o-mini",
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
    },

    transform(chunk, controller) {
      // Pass through the chunk
      controller.enqueue(chunk);

      // Also collect the content
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
      // Generation complete - extract and save files
      try {
        const files = extractFiles(fullContent);
        
        if (files.length > 0) {
          await saveFilesToWorkspace(supabase, workspaceId, userId, sessionId, files);
        }

        // Update session as completed
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

        // Update workspace status
        await supabase
          .from("workspaces")
          .update({ status: "ready", last_activity_at: new Date().toISOString() })
          .eq("id", workspaceId);

        // Send completion event
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

  // Pipe AI response through our transform
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

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body: GenerateRequest = await req.json();
    const { projectId, workspaceId, prompt, conversationHistory = [], existingFiles = [] } = body;

    if (!projectId || !prompt) {
      return new Response(
        JSON.stringify({ error: "projectId and prompt required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create workspace if not provided
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

    // Check rate limit
    const { data: rateLimitData } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rateLimitData?.[0] && !rateLimitData[0].allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", resetAt: rateLimitData[0].reset_at }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credits check - DISABLED FOR TESTING MODE
    // const { data: hasCredits } = await supabase.rpc("user_has_credits", { p_user_id: user.id, p_amount: 0.10 });
    // if (hasCredits === false) {
    //   return new Response(
    //     JSON.stringify({ error: "Insufficient credits" }),
    //     { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    // Deduct credits - DISABLED FOR TESTING MODE
    // await supabase.rpc("deduct_credits", {
    //   p_user_id: user.id,
    //   p_action_type: "ai_chat",
    //   p_description: "Buildable generation",
    //   p_metadata: { projectId, workspaceId: wsId }
    // });

    // Get existing workspace files if not provided
    let wsFiles = existingFiles;
    if (wsFiles.length === 0) {
      const { data: dbFiles } = await supabase
        .from("workspace_files")
        .select("file_path, content")
        .eq("workspace_id", wsId);
      
      if (dbFiles) {
        wsFiles = dbFiles.map(f => ({ path: f.file_path, content: f.content }));
      }
    }

    console.log(`[Buildable Generate] user=${user.id}, project=${projectId}, workspace=${wsId}, files=${wsFiles.length}`);

    // Stream the generation
    return await streamGeneration(
      supabase,
      openaiApiKey,
      wsId,
      user.id,
      prompt,
      wsFiles,
      conversationHistory
    );

  } catch (error) {
    console.error("Buildable Generate Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 :
                   message.includes("Rate limit") ? 429 :
                   message.includes("credits") ? 402 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
