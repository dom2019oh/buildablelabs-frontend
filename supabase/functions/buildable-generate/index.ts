// =============================================================================
// BUILDABLE AI - DETERMINISTIC AGENT PIPELINE 🔥
// =============================================================================
// 8-stage autonomous engineering agent with:
// - Structured intent extraction and planning
// - Context-aware code generation
// - Automated validation and self-repair
// - Multi-model coordination with confidence scoring
// - Full telemetry and observability
//
// Pipeline: Intent → Plan → Generate → Validate → Repair → Persona → Deploy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import new pipeline orchestrator
import { 
  createPipelineContext, 
  runPipeline, 
  saveFilesToDatabase,
  updateSessionStatus 
} from "./pipeline/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// RAILWAY BACKEND - Primary endpoint (fallback if available)
// =============================================================================
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
    // NEW: DETERMINISTIC AGENT PIPELINE
    // =======================================================================
    console.log("[Pipeline] 🔥 Running 8-stage deterministic pipeline...");

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

    // Execute the 8-stage pipeline
    const result = await runPipeline(pipelineContext);

    // Save generated files to database
    if (result.success && result.files.length > 0) {
      await saveFilesToDatabase(
        supabase, 
        wsId, 
        user.id, 
        sessionId, 
        result.files, 
        result.modelsUsed
      );
    }

    // Update session status
    await updateSessionStatus(supabase, sessionId, result, pipelineContext);

    // Update workspace status
    await supabase
      .from("workspaces")
      .update({ status: result.success ? "ready" : "error" })
      .eq("id", wsId);

    // Build response
    return new Response(JSON.stringify({
      success: result.success,
      sessionId,
      filesGenerated: result.files.length,
      filePaths: result.files.map(f => f.path),
      modelsUsed: result.modelsUsed,
      
      // Provider diagnostics
      providersAvailable: {
        grok: hasGrok,
        gemini: hasGemini,
        openai: hasOpenAI,
      },
      
      // Validation results
      validationPassed: result.validationPassed,
      repairAttempts: result.repairAttempts,
      errors: result.errors,
      
      // Persona response for chat display
      aiMessage: result.aiMessage,
      routes: result.routes,
      suggestions: result.suggestions,
      
      // Telemetry (for engineering debugging)
      telemetry: result.telemetry,
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
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
