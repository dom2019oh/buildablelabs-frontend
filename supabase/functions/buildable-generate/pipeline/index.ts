// =============================================================================
// PIPELINE ORCHESTRATOR - SSE-enabled 8-stage deterministic pipeline
// =============================================================================

import type { 
  PipelineContext, 
  PipelineResult, 
  FileOperation,
  DB,
  OnSyncEvent
} from "./types.ts";
import { SAFETY_LIMITS } from "./types.ts";
import { TelemetryLogger, StageTracer, collectMetrics } from "./telemetry.ts";
import { 
  buildProjectContext, 
  saveContextToSession, 
  createRollbackPoint,
  isPathWriteable 
} from "./context.ts";
import { validateFiles } from "./validation.ts";
import { runRepairLoop } from "./repair.ts";
import { hasAnyProvider, getAvailableProviders } from "./routing.ts";

// Stage imports
import { executeIntentStage } from "./stages/intent.ts";
import { executePlanStage } from "./stages/plan.ts";
import { executeGenerateStage, getEnhancedDefaults } from "./stages/generate.ts";

// =============================================================================
// PIPELINE INITIALIZATION
// =============================================================================

export function createPipelineContext(
  supabase: DB,
  options: {
    sessionId: string | null;
    workspaceId: string;
    userId: string;
    projectId: string;
    prompt: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    existingFiles?: FileOperation[];
  }
): PipelineContext {
  return {
    supabase,
    sessionId: options.sessionId,
    workspaceId: options.workspaceId,
    userId: options.userId,
    projectId: options.projectId,
    originalPrompt: options.prompt,
    conversationHistory: options.conversationHistory || [],
    existingFiles: options.existingFiles || [],
    generatedFiles: [],
    executionLogs: [],
    repairHistory: [],
    rollbackPoints: [],
    telemetry: [],
    startTime: Date.now(),
    modelsUsed: [],
  };
}

// =============================================================================
// PERSONA RESPONSE GENERATOR
// =============================================================================

function generatePersonaResponse(
  prompt: string,
  files: FileOperation[],
  routes: string[],
  isNewProject: boolean
): { message: string; routes: string[]; suggestions: string[] } {
  const suggestions: string[] = [];
  const hasNavbar = files.some(f => f.path.toLowerCase().includes("navbar"));
  const hasHero = files.some(f => f.path.toLowerCase().includes("hero"));
  const hasPricing = files.some(f => f.path.toLowerCase().includes("pricing"));
  const hasContact = files.some(f => f.path.toLowerCase().includes("contact"));

  if (!hasContact) suggestions.push("Add a contact form");
  if (!hasPricing) suggestions.push("Add a pricing section");
  if (hasHero) suggestions.push("Change the hero image or colors");
  suggestions.push("Browse the [Components Library](/dashboard/components)");
  suggestions.push("Try a different style from the [Backgrounds Library](/dashboard/backgrounds)");

  const p = prompt.toLowerCase();
  let emoji = "🎨";
  let projectType = "website";
  if (p.includes("bakery")) { emoji = "🥐"; projectType = "bakery landing page"; }
  else if (p.includes("portfolio")) { emoji = "✨"; projectType = "portfolio site"; }
  else if (p.includes("shop") || p.includes("store")) { emoji = "🛒"; projectType = "e-commerce site"; }
  else if (p.includes("dashboard")) { emoji = "📊"; projectType = "dashboard"; }
  else if (p.includes("blog")) { emoji = "📝"; projectType = "blog"; }
  else if (p.includes("saas")) { emoji = "🚀"; projectType = "SaaS landing page"; }

  const fileList = files.map(f => f.path.split("/").pop()).slice(0, 5).join(", ");

  let message: string;
  if (isNewProject) {
    message = `${emoji} Creating your ${projectType}...\n\n{THINKING_INDICATOR}\n\nDone! I created ${files.length} files including ${fileList}. Everything's styled and ready to preview!\n\n💡 **Next steps:**\n${suggestions.slice(0, 3).map(s => `- ${s}`).join("\n")}`;
  } else {
    message = `Making those changes now...\n\n{THINKING_INDICATOR}\n\nDone! I updated ${files.length} file(s). Take a look at the preview!\n\n💡 **Want more?**\n${suggestions.slice(0, 2).map(s => `- ${s}`).join("\n")}`;
  }

  return { message, routes, suggestions: suggestions.slice(0, 3) };
}

// =============================================================================
// EXTRACT ROUTES FROM FILES
// =============================================================================

function extractRoutesFromFiles(files: FileOperation[]): string[] {
  const routes: string[] = ["/"];
  
  const pageFiles = files.filter(f => f.path.includes("/pages/"));
  for (const file of pageFiles) {
    const name = file.path.split("/").pop()?.replace(".tsx", "").toLowerCase() || "";
    if (name && name !== "index") {
      routes.push(`/${name}`);
    }
  }

  return [...new Set(routes)];
}

// =============================================================================
// MAIN PIPELINE EXECUTION (SSE-enabled)
// =============================================================================

export async function runPipeline(
  context: PipelineContext,
  onEvent?: OnSyncEvent
): Promise<PipelineResult> {
  const logger = new TelemetryLogger(context.sessionId, context.workspaceId);
  const tracer = new StageTracer(context);
  const isNewProject = context.existingFiles.length === 0;

  // Helper to emit SSE events
  const emit = (event: Record<string, unknown>) => {
    if (onEvent) {
      try { onEvent(event as any); } catch { /* ignore */ }
    }
  };

  logger.info("Pipeline started", {
    prompt: context.originalPrompt.slice(0, 100),
    existingFiles: context.existingFiles.length,
  });

  try {
    if (!hasAnyProvider()) {
      throw new Error("No AI providers configured");
    }

    logger.info("Providers available", { providers: getAvailableProviders() });

    // Update session status
    if (context.sessionId) {
      await context.supabase
        .from("generation_sessions")
        .update({ status: "planning", started_at: new Date().toISOString() })
        .eq("id", context.sessionId);
    }

    // =======================================================================
    // STAGE 0: BUILD PROJECT CONTEXT
    // =======================================================================
    emit({ type: "stage", stage: "context", status: "start", message: "Analyzing project..." });
    
    context.projectContext = await buildProjectContext(
      context.supabase,
      context.workspaceId,
      context.existingFiles
    );
    await saveContextToSession(context.supabase, context.sessionId, context.projectContext);
    
    emit({ type: "stage", stage: "context", status: "complete" });

    // =======================================================================
    // STAGE 1: INTENT EXTRACTION
    // =======================================================================
    emit({ type: "stage", stage: "intent", status: "start", message: "Understanding your request..." });
    
    const intentResult = await executeIntentStage(context);
    
    if (!intentResult.success || !intentResult.data) {
      logger.warn("Intent extraction failed, using default");
    } else {
      context.intent = intentResult.data;
      logger.info("Intent detected", { 
        type: context.intent.type, 
        confidence: context.intent.confidence 
      });
    }

    emit({ type: "stage", stage: "intent", status: "complete", data: { type: context.intent?.type } });

    // Check if this is a question (no code generation needed)
    if (context.intent?.type === "question") {
      return {
        success: true,
        files: [],
        modelsUsed: context.modelsUsed,
        validationPassed: true,
        repairAttempts: 0,
        aiMessage: "I understand you have a question. Let me help you with that! What would you like to know?",
        routes: ["/"],
        suggestions: [],
      };
    }

    // =======================================================================
    // STAGE 3: ARCHITECTURE PLANNING
    // =======================================================================
    emit({ type: "stage", stage: "plan", status: "start", message: "Planning architecture..." });
    
    if (context.sessionId) {
      await context.supabase
        .from("generation_sessions")
        .update({ status: "planning" })
        .eq("id", context.sessionId);
    }

    const planResult = await executePlanStage(context);
    
    if (!planResult.success || !planResult.data) {
      logger.warn("Plan generation failed, will use defaults");
    } else {
      context.plan = planResult.data;
      logger.info("Plan created", {
        projectType: context.plan.projectType,
        pages: context.plan.pages.length,
        components: context.plan.components.length,
      });
    }

    emit({ type: "stage", stage: "plan", status: "complete", data: { projectType: context.plan?.projectType } });
    createRollbackPoint(context, "plan");

    // =======================================================================
    // STAGE 4: CODE GENERATION (with progressive file emission)
    // =======================================================================
    emit({ type: "stage", stage: "generate", status: "start", message: "Generating code..." });
    
    if (context.sessionId) {
      await context.supabase
        .from("generation_sessions")
        .update({ status: "generating" })
        .eq("id", context.sessionId);
    }

    const generateResult = await executeGenerateStage(context);
    
    if (!generateResult.success || !generateResult.data || generateResult.data.length === 0) {
      logger.warn("Generation failed, using enhanced defaults");
      context.generatedFiles = getEnhancedDefaults(context.originalPrompt);
    } else {
      context.generatedFiles = generateResult.data;
      logger.info("Files generated", { count: context.generatedFiles.length });
    }

    // Filter out non-writeable files
    context.generatedFiles = context.generatedFiles.filter(f => isPathWriteable(f.path));

    // Emit each generated file as an SSE event
    for (const file of context.generatedFiles) {
      emit({
        type: "file",
        command: file.operation === "create" ? "CREATE_FILE" : "UPDATE_FILE",
        path: file.path,
        content: file.content,
      });
    }

    emit({ type: "stage", stage: "generate", status: "complete", data: { fileCount: context.generatedFiles.length } });
    createRollbackPoint(context, "generate");

    // =======================================================================
    // STAGE 5: VALIDATION
    // =======================================================================
    emit({ type: "stage", stage: "validate", status: "start", message: "Validating code..." });
    
    if (context.sessionId) {
      await context.supabase
        .from("generation_sessions")
        .update({ status: "validating" })
        .eq("id", context.sessionId);
    }

    let validation = validateFiles(context.generatedFiles);
    context.validationResults = validation;

    tracer.validationResult(
      validation.valid,
      validation.criticalErrors.length,
      validation.warnings.length,
      validation.score
    );

    emit({ type: "stage", stage: "validate", status: "complete", data: { valid: validation.valid, score: validation.score } });

    // =======================================================================
    // STAGE 6-8: REPAIR LOOP (if needed)
    // =======================================================================
    if (!validation.valid) {
      emit({ type: "stage", stage: "repair", status: "start", message: "Fixing issues..." });
      
      const repairResult = await runRepairLoop(context, validation);
      
      context.generatedFiles = repairResult.files;
      context.validationResults = repairResult.validation;
      validation = repairResult.validation;

      // Re-emit repaired files
      for (const file of context.generatedFiles) {
        emit({
          type: "file",
          command: "UPDATE_FILE",
          path: file.path,
          content: file.content,
        });
      }

      emit({ type: "stage", stage: "repair", status: "complete", data: { attempts: repairResult.repairAttempts, success: repairResult.success } });
    }

    // =======================================================================
    // GENERATE PERSONA RESPONSE
    // =======================================================================
    const routes = extractRoutesFromFiles(context.generatedFiles);
    const personaResult = generatePersonaResponse(
      context.originalPrompt,
      context.generatedFiles,
      routes,
      isNewProject
    );

    // =======================================================================
    // BUILD RESULT
    // =======================================================================
    const result: PipelineResult = {
      success: true,
      files: context.generatedFiles,
      modelsUsed: context.modelsUsed,
      validationPassed: validation.valid,
      repairAttempts: context.repairHistory.length,
      errors: validation.criticalErrors.map(e => e.message),
      aiMessage: personaResult.message,
      routes: personaResult.routes,
      suggestions: personaResult.suggestions,
      telemetry: tracer.getSummary(),
    };

    logger.info("Pipeline complete", {
      success: true,
      files: result.files.length,
      validationPassed: result.validationPassed,
      duration: Date.now() - context.startTime,
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Pipeline failed";
    logger.error("Pipeline error", { error: errorMessage });

    emit({ type: "error", message: errorMessage });

    return {
      success: false,
      files: [],
      modelsUsed: context.modelsUsed,
      validationPassed: false,
      repairAttempts: context.repairHistory.length,
      errors: [errorMessage],
      aiMessage: "Oops! Something went wrong while building your project. Let me try again...",
      routes: ["/"],
      suggestions: ["Try simplifying your request", "Check the console for errors"],
    };
  }
}

// =============================================================================
// SAVE SINGLE FILE TO DATABASE (for progressive saving)
// =============================================================================

export async function saveFileToDatabase(
  supabase: DB,
  workspaceId: string,
  userId: string,
  sessionId: string | null,
  file: FileOperation,
  modelsUsed: string[]
): Promise<void> {
  try {
    await supabase.from("workspace_files").upsert({
      workspace_id: workspaceId,
      user_id: userId,
      file_path: file.path,
      content: file.content,
      file_type: file.path.split(".").pop() || "txt",
      is_generated: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,file_path" });

    await supabase.from("file_operations").insert({
      workspace_id: workspaceId,
      session_id: sessionId,
      user_id: userId,
      operation: file.operation,
      file_path: file.path,
      new_content: file.content,
      ai_model: modelsUsed.join(" → "),
      validated: true,
      applied: true,
      applied_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[Pipeline] Failed to save ${file.path}:`, err);
  }
}

// =============================================================================
// SAVE FILES TO DATABASE (batch - kept for backwards compat)
// =============================================================================

export async function saveFilesToDatabase(
  supabase: DB,
  workspaceId: string,
  userId: string,
  sessionId: string | null,
  files: FileOperation[],
  modelsUsed: string[]
): Promise<void> {
  for (const file of files) {
    await saveFileToDatabase(supabase, workspaceId, userId, sessionId, file, modelsUsed);
  }
}

// =============================================================================
// UPDATE SESSION STATUS
// =============================================================================

export async function updateSessionStatus(
  supabase: DB,
  sessionId: string | null,
  result: PipelineResult,
  context: PipelineContext
): Promise<void> {
  if (!sessionId) return;

  try {
    await supabase.from("generation_sessions").update({
      status: result.success ? "completed" : "failed",
      files_generated: result.files.length,
      model_used: result.modelsUsed.join(" → "),
      validation_passed: result.validationPassed,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - context.startTime,
      error_message: result.errors?.join("; ") || null,
      metadata: {
        telemetry: result.telemetry,
        context: context.projectContext,
        repairHistory: context.repairHistory,
      },
    }).eq("id", sessionId);
  } catch (err) {
    console.error("[Pipeline] Failed to update session:", err);
  }
}
