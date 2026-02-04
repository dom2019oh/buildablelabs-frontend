// =============================================================================
// PIPELINE ORCHESTRATOR - Main 8-stage deterministic pipeline
// =============================================================================

import type { 
  PipelineContext, 
  PipelineResult, 
  FileOperation,
  DB
} from "./types";
import { SAFETY_LIMITS } from "./types";
import { TelemetryLogger, StageTracer, collectMetrics } from "./telemetry";
import { 
  buildProjectContext, 
  saveContextToSession, 
  createRollbackPoint,
  isPathWriteable 
} from "./context";
import { validateCodeLocally } from "./validation";
import { runRepairLoop } from "./repair";
import { hasAnyProvider, getAvailableProviders } from "./routing";

// Stage imports
import { executeIntentStage } from "./stages/intent";
import { executePlanStage, generateDefaultPlan } from "./stages/plan";
import { executeGenerateStage, getEnhancedDefaults } from "./stages/generate";

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
  // Generate contextual suggestions based on what was created
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

  // Detect project type for emoji
  const p = prompt.toLowerCase();
  let emoji = "🎨";
  let projectType = "website";
  if (p.includes("bakery")) { emoji = "🥐"; projectType = "bakery landing page"; }
  else if (p.includes("portfolio")) { emoji = "✨"; projectType = "portfolio site"; }
  else if (p.includes("shop") || p.includes("store")) { emoji = "🛒"; projectType = "e-commerce site"; }
  else if (p.includes("dashboard")) { emoji = "📊"; projectType = "dashboard"; }
  else if (p.includes("blog")) { emoji = "📝"; projectType = "blog"; }
  else if (p.includes("saas")) { emoji = "🚀"; projectType = "SaaS landing page"; }

  // Build file list
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
// MAIN PIPELINE EXECUTION
// =============================================================================

export async function runPipeline(context: PipelineContext): Promise<PipelineResult> {
  const logger = new TelemetryLogger(context.sessionId, context.workspaceId);
  const tracer = new StageTracer(context);
  const isNewProject = context.existingFiles.length === 0;

  logger.info("Pipeline started", {
    prompt: context.originalPrompt.slice(0, 100),
    existingFiles: context.existingFiles.length,
  });

  try {
    // Check for available providers
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
    logger.info("Building project context...");
    context.projectContext = await buildProjectContext(
      context.supabase,
      context.workspaceId,
      context.existingFiles
    );

    // Save context to session
    await saveContextToSession(context.supabase, context.sessionId, context.projectContext);

    // =======================================================================
    // STAGE 1: INTENT EXTRACTION
    // =======================================================================
    logger.info("Stage 1: Intent extraction...");
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
    logger.info("Stage 3: Architecture planning...");
    
    if (context.sessionId) {
      await context.supabase
        .from("generation_sessions")
        .update({ status: "planning" })
        .eq("id", context.sessionId);
    }

    const planResult = await executePlanStage(context);
    
    if (!planResult.success || !planResult.data) {
      logger.warn("Plan generation failed, using defaults");
      context.plan = generateDefaultPlan(context.originalPrompt);
    } else {
      context.plan = planResult.data;
      logger.info("Plan created", {
        projectType: context.plan.projectType,
        pages: context.plan.pages.length,
        components: context.plan.components.length,
      });
    }

    // Create rollback point before generation
    createRollbackPoint(context, "plan");

    // =======================================================================
    // STAGE 4: CODE GENERATION
    // =======================================================================
    logger.info("Stage 4: Code generation...");
    
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

    // Create rollback point after generation
    createRollbackPoint(context, "generate");

    // =======================================================================
    // STAGE 5: VALIDATION
    // =======================================================================
    logger.info("Stage 5: Validation...");
    
    if (context.sessionId) {
      await context.supabase
        .from("generation_sessions")
        .update({ status: "validating" })
        .eq("id", context.sessionId);
    }

    let validation = validateCodeLocally(context.generatedFiles);
    context.validationResults = validation;

    tracer.validationResult(
      validation.valid,
      validation.criticalErrors.length,
      validation.warnings.length,
      validation.score
    );

    // =======================================================================
    // STAGE 6-8: REPAIR LOOP (if needed)
    // =======================================================================
    if (!validation.valid) {
      logger.info("Running repair loop...");
      
      const repairResult = await runRepairLoop(context, validation);
      
      context.generatedFiles = repairResult.files;
      context.validationResults = repairResult.validation;
      validation = repairResult.validation;

      logger.info("Repair complete", {
        attempts: repairResult.repairAttempts,
        success: repairResult.success,
      });
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
      errors: validation.criticalErrors.map(e => e.error),
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
// SAVE FILES TO DATABASE
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
