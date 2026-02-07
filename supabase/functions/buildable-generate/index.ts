// =============================================================================
// BUILDABLE AI - SSE STREAMING PIPELINE
// =============================================================================
// Converts the blocking pipeline to Server-Sent Events for progressive delivery.
// Files are streamed as they're generated + saved to DB incrementally.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { 
  createPipelineContext, 
  runPipeline, 
  saveFileToDatabase,
  updateSessionStatus 
} from "./pipeline/index.ts";
import type { SyncEvent, OnSyncEvent } from "./pipeline/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAILWAY_BACKEND_URL = "https://api.buildablelabs.dev";

// deno-lint-ignore no-explicit-any
type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// TRY RAILWAY BACKEND
// =============================================================================

async function tryRailwayBackend(workspaceId: string, prompt: string, token: string): Promise<Response | null> {
  try {
    console.log("[Pipeline] Trying Railway backend...");
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/generate/${workspaceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ prompt }),
    });
    if (response.ok) {
      console.log("[Pipeline] ✓ Railway backend responded");
      return response;
    }
    console.log(`[Pipeline] Railway: ${response.status}`);
    return null;
  } catch {
    console.log("[Pipeline] Railway unreachable, using local pipeline");
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
    // Check provider availability
    const hasGrok = !!Deno.env.get("GROK_API_KEY");
    const hasGemini = !!Deno.env.get("GEMINI_API_KEY");
    const hasOpenAI = !!Deno.env.get("OPENAI_API_KEY");
    
    if (!hasGrok && !hasGemini && !hasOpenAI) {
      throw new Error("No AI providers configured");
    }

    console.log(`[Pipeline] 🔥 Providers: Grok=${hasGrok}, Gemini=${hasGemini}, OpenAI=${hasOpenAI}`);

    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase: DB = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Parse request
    const body: GenerateRequest = await req.json();
    const { 
      projectId, 
      workspaceId, 
      prompt, 
      conversationHistory = [], 
      existingFiles = [], 
      useRailwayBackend = true 
    } = body;

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
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
      return new Response(JSON.stringify({ error: "Could not create workspace" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Verify access
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, status")
      .eq("id", wsId)
      .eq("user_id", user.id)
      .single();
    
    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Rate limit check
    const { data: rl } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rl?.[0] && !rl[0].allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded", 
        resetAt: rl[0].reset_at 
      }), { 
        status: 429, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Try Railway backend first (if enabled and available)
    if (useRailwayBackend) {
      const railwayResponse = await tryRailwayBackend(wsId, prompt, token);
      if (railwayResponse) {
        return new Response(railwayResponse.body, { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }

    // =======================================================================
    // SSE STREAMING PIPELINE
    // =======================================================================
    console.log("[Pipeline] 🔥 Running SSE streaming pipeline...");

    // Create generation session
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

    // Transform existing files to FileOperation format
    const existingFileOps = existingFiles.map(f => ({
      path: f.path,
      content: f.content,
      operation: "update" as const,
    }));

    // Create pipeline context
    const pipelineContext = createPipelineContext(supabase, {
      sessionId,
      workspaceId: wsId,
      userId: user.id,
      projectId,
      prompt,
      conversationHistory,
      existingFiles: existingFileOps,
    });

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        function emit(event: SyncEvent) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Stream may be closed
          }
        }

        // Event callback for progressive delivery
        const onEvent: OnSyncEvent = async (event) => {
          emit(event);

          // Save files to DB as they're emitted
          if (event.type === "file" && (event as Record<string, unknown>).path) {
            const fileEvent = event as { path: string; content?: string; command: string };
            if (fileEvent.content && (fileEvent.command === "CREATE_FILE" || fileEvent.command === "UPDATE_FILE")) {
              await saveFileToDatabase(
                supabase, wsId, user.id, sessionId,
                { path: fileEvent.path, content: fileEvent.content, operation: fileEvent.command === "CREATE_FILE" ? "create" : "update" },
                pipelineContext.modelsUsed
              );
            }
          }
        };

        try {
          // Execute the pipeline with SSE event callback
          const result = await runPipeline(pipelineContext, onEvent);

          // Update session status
          await updateSessionStatus(supabase, sessionId, result, pipelineContext);

          // Update workspace status
          await supabase
            .from("workspaces")
            .update({ status: result.success ? "ready" : "error" })
            .eq("id", wsId);

          // Emit completion event
          emit({
            type: "complete",
            filesGenerated: result.files.length,
            filePaths: result.files.map(f => f.path),
            aiMessage: result.aiMessage,
            routes: result.routes,
            suggestions: result.suggestions,
            modelsUsed: result.modelsUsed,
            validationPassed: result.validationPassed,
            repairAttempts: result.repairAttempts,
            sessionId,
            providersAvailable: { grok: hasGrok, gemini: hasGemini, openai: hasOpenAI },
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Pipeline failed";
          console.error("[Pipeline] ❌ Error:", errorMessage);

          emit({ type: "error", message: errorMessage });

          // Update workspace status on error
          await supabase
            .from("workspaces")
            .update({ status: "error" })
            .eq("id", wsId);
        } finally {
          // Send done signal and close
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("[Pipeline] ❌ Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
