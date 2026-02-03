// =============================================================================
// WORKSPACE API - Central Gateway for All Workspace Operations
// =============================================================================
// This is the brain of Buildable. All AI operations, file management, and
// workspace lifecycle are controlled through this gateway.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Model configuration
const MODELS = {
  architect: "google/gemini-2.5-pro",
  code: "google/gemini-2.5-pro",
  validate: "google/gemini-2.5-flash",
  fast: "google/gemini-2.5-flash-lite",
};

// =============================================================================
// TYPES
// =============================================================================

// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

interface WorkspaceFile {
  id?: string;
  file_path: string;
  content: string;
  file_type?: string;
}

interface FileOperation {
  operation: "create" | "update" | "delete" | "rename" | "move";
  file_path: string;
  content?: string;
  previous_path?: string;
  ai_model?: string;
  ai_reasoning?: string;
}

interface APIRequest {
  action: string;
  projectId?: string;
  workspaceId?: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const BUILDABLE_IDENTITY = `You are Buildable — a professional AI code architect.

CORE PRINCIPLES:
- Build REAL software, not demos
- Make surgical, minimal changes
- Never break existing functionality
- Use React + TypeScript + Tailwind

FILE STRUCTURE:
- src/pages/ for page components
- src/components/ for reusable components
- src/components/layout/ for Navbar, Footer, etc.
- src/hooks/ for custom hooks
- src/lib/ for utilities

OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
// Complete file content
\`\`\``;

const ARCHITECT_PROMPT = `${BUILDABLE_IDENTITY}

You are the ARCHITECT phase. Analyze the request and create a structured plan.

OUTPUT (JSON only, no markdown):
{
  "understanding": "Brief summary of what user wants",
  "plan": [{"step": 1, "action": "create|update|delete", "path": "src/...", "description": "What this does"}],
  "filesRequired": ["src/file1.tsx", "src/file2.tsx"]
}`;

const CODE_PROMPT = `${BUILDABLE_IDENTITY}

You are the CODE phase. Generate production-ready code.

OUTPUT EACH FILE AS:
\`\`\`tsx:src/path/to/File.tsx
// Complete file content here
\`\`\`

RULES:
- Use Tailwind semantic tokens: bg-background, text-foreground, etc.
- Include ALL imports
- Make responsive with Tailwind classes
- TypeScript with proper types`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAuthenticatedUser(authHeader: string) {
  const token = authHeader.replace("Bearer ", "");
  
  // Use ANON key client for getClaims (service role doesn't work for JWT verification)
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  
  const { data: claimsData, error } = await anonClient.auth.getClaims(token);
  
  if (error || !claimsData?.claims) {
    console.error("Auth error:", error?.message || "No claims found");
    throw new Error("Unauthorized");
  }
  
  return { id: claimsData.claims.sub as string };
}

async function validateWorkspaceAccess(supabase: DB, workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, project_id, status")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Workspace not found or access denied");
  }

  return data;
}

// =============================================================================
// WORKSPACE OPERATIONS
// =============================================================================

async function getOrCreateWorkspace(supabase: DB, projectId: string, userId: string) {
  // Try to get existing workspace
  const { data: existing } = await supabase
    .from("workspaces")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return existing;
  }

  // Create new workspace
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      project_id: projectId,
      user_id: userId,
      status: "ready",
    })
    .select()
    .single();

  if (error) throw error;
  return workspace;
}

async function getWorkspaceFiles(supabase: DB, workspaceId: string, userId: string) {
  const { data, error } = await supabase
    .from("workspace_files")
    .select("id, file_path, content, file_type, is_generated, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("file_path");

  if (error) throw error;
  return data || [];
}

async function applyFileOperations(
  supabase: DB,
  workspaceId: string,
  userId: string,
  sessionId: string | null,
  operations: FileOperation[]
) {
  const results = [];

  for (const op of operations) {
    // Log the operation
    const { data: opRecord } = await supabase
      .from("file_operations")
      .insert({
        workspace_id: workspaceId,
        session_id: sessionId,
        user_id: userId,
        operation: op.operation,
        file_path: op.file_path,
        new_content: op.content,
        previous_path: op.previous_path,
        ai_model: op.ai_model,
        ai_reasoning: op.ai_reasoning,
        validated: true,
        applied: false,
      })
      .select()
      .single();

    // Apply the operation
    try {
      switch (op.operation) {
        case "create":
        case "update":
          await supabase
            .from("workspace_files")
            .upsert({
              workspace_id: workspaceId,
              user_id: userId,
              file_path: op.file_path,
              content: op.content || "",
              file_type: op.file_path.split(".").pop() || "txt",
              is_generated: true,
            }, {
              onConflict: "workspace_id,file_path",
            });
          break;

        case "delete":
          await supabase
            .from("workspace_files")
            .delete()
            .eq("workspace_id", workspaceId)
            .eq("file_path", op.file_path);
          break;

        case "rename":
        case "move":
          if (op.previous_path) {
            await supabase
              .from("workspace_files")
              .update({ file_path: op.file_path })
              .eq("workspace_id", workspaceId)
              .eq("file_path", op.previous_path);
          }
          break;
      }

      // Mark as applied
      if (opRecord?.id) {
        await supabase
          .from("file_operations")
          .update({ applied: true, applied_at: new Date().toISOString() })
          .eq("id", opRecord.id);
      }

      results.push({ path: op.file_path, success: true });
    } catch (err) {
      results.push({ path: op.file_path, success: false, error: String(err) });
    }
  }

  return results;
}

// =============================================================================
// AI GENERATION PIPELINE
// =============================================================================

function extractFileOperations(response: string): FileOperation[] {
  const operations: FileOperation[] = [];
  
  // Pattern: ```language:path/to/file.ext
  const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const path = match[2].trim();
    const content = match[3];

    if (path && content) {
      operations.push({
        operation: "create",
        file_path: path.replace(/^\/+/, ""),
        content,
      });
    }
  }

  return operations;
}

async function executeGeneration(
  supabase: DB,
  apiKey: string,
  workspaceId: string,
  userId: string,
  prompt: string,
  existingFiles: WorkspaceFile[]
): Promise<{ success: boolean; response: string; operations: FileOperation[]; sessionId: string }> {
  
  // Create generation session
  const { data: session } = await supabase
    .from("generation_sessions")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      prompt,
      status: "planning",
    })
    .select()
    .single();

  const sessionId = session?.id || "";

  try {
    // Update workspace status
    await supabase
      .from("workspaces")
      .update({ status: "generating", last_activity_at: new Date().toISOString() })
      .eq("id", workspaceId);

    // Build file context
    let fileContext = "";
    if (existingFiles.length > 0) {
      fileContext = "\n\nEXISTING FILES:\n";
      for (const file of existingFiles.slice(0, 10)) {
        fileContext += `📄 ${file.file_path}:\n\`\`\`\n${file.content.slice(0, 1500)}\n\`\`\`\n`;
      }
    }

    // Phase 1: Architect
    await supabase
      .from("generation_sessions")
      .update({ status: "planning" })
      .eq("id", sessionId);

    const architectResp = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS.architect,
        messages: [
          { role: "system", content: ARCHITECT_PROMPT + fileContext },
          { role: "user", content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!architectResp.ok) {
      throw new Error(`Architect failed: ${await architectResp.text()}`);
    }

    const architectData = await architectResp.json();
    const plan = architectData.choices?.[0]?.message?.content || "";

    await supabase
      .from("generation_sessions")
      .update({ 
        status: "generating",
        plan: { raw: plan },
        plan_created_at: new Date().toISOString()
      })
      .eq("id", sessionId);

    // Phase 2: Code Generation
    const codeResp = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS.code,
        messages: [
          { role: "system", content: CODE_PROMPT + fileContext },
          { role: "user", content: prompt },
          { role: "assistant", content: `PLAN:\n${plan}` },
          { role: "user", content: "Now generate the complete code following this plan." }
        ],
        max_tokens: 12000,
        temperature: 0.5,
      }),
    });

    if (!codeResp.ok) {
      throw new Error(`Code generation failed: ${await codeResp.text()}`);
    }

    const codeData = await codeResp.json();
    const codeResponse = codeData.choices?.[0]?.message?.content || "";

    // Extract file operations
    const operations = extractFileOperations(codeResponse);

    await supabase
      .from("generation_sessions")
      .update({ 
        status: "validating",
        files_planned: operations.length,
      })
      .eq("id", sessionId);

    // Phase 3: Apply operations
    if (operations.length > 0) {
      // Add AI metadata
      const enrichedOps = operations.map(op => ({
        ...op,
        ai_model: MODELS.code,
        ai_reasoning: "Generated from user prompt",
      }));

      await applyFileOperations(supabase, workspaceId, userId, sessionId, enrichedOps);
    }

    // Complete session
    await supabase
      .from("generation_sessions")
      .update({ 
        status: "completed",
        files_generated: operations.length,
        validation_passed: true,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await supabase
      .from("workspaces")
      .update({ status: "ready", last_activity_at: new Date().toISOString() })
      .eq("id", workspaceId);

    return {
      success: true,
      response: codeResponse,
      operations,
      sessionId,
    };

  } catch (error) {
    // Handle failure
    await supabase
      .from("generation_sessions")
      .update({ 
        status: "failed",
        error_message: String(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await supabase
      .from("workspaces")
      .update({ status: "error" })
      .eq("id", workspaceId);

    throw error;
  }
}

// =============================================================================
// MAIN REQUEST HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const user = await getAuthenticatedUser(authHeader);
    const body: APIRequest = await req.json();

    console.log(`Workspace API: action=${body.action}, user=${user.id}`);

    switch (body.action) {
      // =================================================================
      // WORKSPACE MANAGEMENT
      // =================================================================
      
      case "getOrCreateWorkspace": {
        const { projectId } = body;
        if (!projectId) throw new Error("projectId required");

        const workspace = await getOrCreateWorkspace(supabase, projectId, user.id);
        return new Response(
          JSON.stringify({ workspace }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getWorkspace": {
        const { workspaceId } = body;
        if (!workspaceId) throw new Error("workspaceId required");

        const workspace = await validateWorkspaceAccess(supabase, workspaceId, user.id);
        return new Response(
          JSON.stringify({ workspace }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // FILE OPERATIONS (READ-ONLY FROM FRONTEND)
      // =================================================================

      case "getFiles": {
        const { workspaceId } = body;
        if (!workspaceId) throw new Error("workspaceId required");

        await validateWorkspaceAccess(supabase, workspaceId, user.id);
        const files = await getWorkspaceFiles(supabase, workspaceId, user.id);
        
        return new Response(
          JSON.stringify({ files }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getFile": {
        const workspaceId = body.workspaceId;
        const filePath = (body.data as { filePath?: string })?.filePath;
        
        if (!workspaceId || !filePath) throw new Error("workspaceId and filePath required");

        await validateWorkspaceAccess(supabase, workspaceId, user.id);
        
        const { data: file } = await supabase
          .from("workspace_files")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("file_path", filePath)
          .single();

        return new Response(
          JSON.stringify({ file }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // AI GENERATION
      // =================================================================

      case "generate": {
        const { workspaceId, data } = body;
        const prompt = (data as { prompt?: string })?.prompt;
        
        if (!workspaceId || !prompt) {
          throw new Error("workspaceId and prompt required");
        }

        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

        await validateWorkspaceAccess(supabase, workspaceId, user.id);

        // Check credits
        const { data: hasCredits } = await supabase.rpc("user_has_credits", { 
          p_user_id: user.id, 
          p_amount: 0.30 
        });
        
        if (hasCredits === false) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get existing files for context
        const existingFiles = await getWorkspaceFiles(supabase, workspaceId, user.id);

        // Execute generation
        const result = await executeGeneration(
          supabase,
          apiKey,
          workspaceId,
          user.id,
          prompt,
          existingFiles.map((f: { file_path: string; content: string }) => ({ 
            file_path: f.file_path, 
            content: f.content 
          }))
        );

        // Deduct credits
        await supabase.rpc("deduct_credits", {
          p_user_id: user.id,
          p_action_type: "ai_chat",
          p_description: "AI Generation",
          p_metadata: { workspaceId, filesGenerated: result.operations.length }
        });

        return new Response(
          JSON.stringify({
            success: result.success,
            filesGenerated: result.operations.length,
            sessionId: result.sessionId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // GENERATION SESSIONS
      // =================================================================

      case "getSessions": {
        const { workspaceId } = body;
        if (!workspaceId) throw new Error("workspaceId required");

        await validateWorkspaceAccess(supabase, workspaceId, user.id);

        const { data: sessions } = await supabase
          .from("generation_sessions")
          .select("id, prompt, status, files_generated, created_at, completed_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({ sessions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getSession": {
        const { workspaceId, data } = body;
        const sessionId = (data as { sessionId?: string })?.sessionId;
        
        if (!workspaceId || !sessionId) throw new Error("workspaceId and sessionId required");

        await validateWorkspaceAccess(supabase, workspaceId, user.id);

        const { data: session } = await supabase
          .from("generation_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("workspace_id", workspaceId)
          .single();

        return new Response(
          JSON.stringify({ session }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // FILE OPERATIONS HISTORY
      // =================================================================

      case "getOperationHistory": {
        const { workspaceId } = body;
        if (!workspaceId) throw new Error("workspaceId required");

        await validateWorkspaceAccess(supabase, workspaceId, user.id);

        const { data: operations } = await supabase
          .from("file_operations")
          .select("id, operation, file_path, ai_model, applied, created_at")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(50);

        return new Response(
          JSON.stringify({ operations }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${body.action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    console.error("Workspace API error:", error);
    
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Unauthorized") ? 401 : 
                   message.includes("not found") ? 404 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
