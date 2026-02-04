// =============================================================================
// TELEMETRY - Structured logging and stage tracing
// =============================================================================

import type { 
  PipelineContext, 
  StageName, 
  TelemetryEvent,
  ProviderKey 
} from "./types.ts";

// =============================================================================
// LOG LEVELS
// =============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIXES: Record<LogLevel, string> = {
  debug: "🔍",
  info: "📋",
  warn: "⚠️",
  error: "❌",
};

// =============================================================================
// STRUCTURED LOGGER
// =============================================================================

export class TelemetryLogger {
  private sessionId: string | null;
  private workspaceId: string;
  private enabled: boolean;

  constructor(sessionId: string | null, workspaceId: string, enabled = true) {
    this.sessionId = sessionId;
    this.workspaceId = workspaceId;
    this.enabled = enabled;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (!this.enabled) return;

    const prefix = LOG_PREFIXES[level];
    const timestamp = new Date().toISOString();
    const sessionTag = this.sessionId ? `[${this.sessionId.slice(0, 8)}]` : "[no-session]";
    
    const logData = {
      timestamp,
      level,
      sessionId: this.sessionId,
      workspaceId: this.workspaceId,
      message,
      ...data,
    };

    // Console output for Deno logs
    console.log(`${prefix} ${sessionTag} ${message}`, data ? JSON.stringify(data) : "");
    
    return logData;
  }

  debug(message: string, data?: Record<string, unknown>) {
    return this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    return this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    return this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    return this.log("error", message, data);
  }
}

// =============================================================================
// STAGE TRACER
// =============================================================================

export class StageTracer {
  private context: PipelineContext;
  private logger: TelemetryLogger;

  constructor(context: PipelineContext) {
    this.context = context;
    this.logger = new TelemetryLogger(context.sessionId, context.workspaceId);
  }

  // Record stage start
  stageStart(stage: StageName) {
    const event: TelemetryEvent = {
      stage,
      event: "start",
      timestamp: Date.now(),
    };
    
    this.context.telemetry.push(event);
    this.logger.info(`Stage ${stage} started`);
    
    return event;
  }

  // Record stage completion
  stageComplete(
    stage: StageName, 
    success: boolean, 
    duration: number, 
    options?: { 
      tokensUsed?: number; 
      modelUsed?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const event: TelemetryEvent = {
      stage,
      event: "complete",
      timestamp: Date.now(),
      duration,
      success,
      tokensUsed: options?.tokensUsed,
      modelUsed: options?.modelUsed,
      metadata: options?.metadata,
    };
    
    this.context.telemetry.push(event);
    
    if (success) {
      this.logger.info(`Stage ${stage} completed`, { 
        duration: `${duration}ms`,
        tokensUsed: options?.tokensUsed,
        modelUsed: options?.modelUsed,
      });
    } else {
      this.logger.warn(`Stage ${stage} failed`, { 
        duration: `${duration}ms`,
      });
    }
    
    return event;
  }

  // Record stage error
  stageError(stage: StageName, error: string, duration: number) {
    const event: TelemetryEvent = {
      stage,
      event: "error",
      timestamp: Date.now(),
      duration,
      success: false,
      error,
    };
    
    this.context.telemetry.push(event);
    this.logger.error(`Stage ${stage} error`, { error, duration: `${duration}ms` });
    
    return event;
  }

  // Record stage retry
  stageRetry(stage: StageName, attempt: number, maxRetries: number) {
    const event: TelemetryEvent = {
      stage,
      event: "retry",
      timestamp: Date.now(),
      metadata: { attempt, maxRetries },
    };
    
    this.context.telemetry.push(event);
    this.logger.warn(`Stage ${stage} retry`, { attempt, maxRetries });
    
    return event;
  }

  // Record model call
  modelCall(
    provider: ProviderKey, 
    model: string, 
    task: string,
    latencyMs: number, 
    tokensUsed?: number
  ) {
    this.logger.info(`Model call: ${provider}/${model}`, {
      task,
      latency: `${latencyMs}ms`,
      tokens: tokensUsed,
    });

    if (model && !this.context.modelsUsed.includes(`${task}: ${model}`)) {
      this.context.modelsUsed.push(`${task}: ${model}`);
    }
  }

  // Record validation result
  validationResult(valid: boolean, errorCount: number, warningCount: number, score: number) {
    this.logger.info("Validation complete", {
      valid,
      errorCount,
      warningCount,
      score: score.toFixed(2),
    });
  }

  // Record repair attempt
  repairAttempt(attempt: number, errorsFixed: number, errorsRemaining: number) {
    this.logger.info(`Repair attempt ${attempt}`, {
      errorsFixed,
      errorsRemaining,
    });
  }

  // Get telemetry summary
  getSummary() {
    const stages = this.context.telemetry
      .filter(e => e.event === "complete")
      .map(e => ({
        name: e.stage,
        duration: e.duration || 0,
        success: e.success ?? false,
      }));

    const totalDuration = Date.now() - this.context.startTime;
    const totalTokens = this.context.telemetry
      .filter(e => e.tokensUsed)
      .reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

    return {
      stages,
      totalDuration,
      totalTokens,
      modelsUsed: this.context.modelsUsed,
      repairAttempts: this.context.repairHistory.length,
    };
  }
}

// =============================================================================
// METRICS COLLECTOR
// =============================================================================

export interface PipelineMetrics {
  sessionId: string | null;
  workspaceId: string;
  prompt: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  filesGenerated: number;
  modelsUsed: string[];
  stageTimings: Record<StageName, number>;
  totalTokens: number;
  repairAttempts: number;
  validationPassed: boolean;
  errors: string[];
}

export function collectMetrics(context: PipelineContext, success: boolean, errors: string[]): PipelineMetrics {
  const endTime = Date.now();
  const stageTimings: Partial<Record<StageName, number>> = {};

  for (const event of context.telemetry) {
    if (event.event === "complete" && event.duration) {
      stageTimings[event.stage] = (stageTimings[event.stage] || 0) + event.duration;
    }
  }

  const totalTokens = context.telemetry
    .filter(e => e.tokensUsed)
    .reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

  return {
    sessionId: context.sessionId,
    workspaceId: context.workspaceId,
    prompt: context.originalPrompt.slice(0, 200),
    startTime: context.startTime,
    endTime,
    duration: endTime - context.startTime,
    success,
    filesGenerated: context.generatedFiles.length,
    modelsUsed: context.modelsUsed,
    stageTimings: stageTimings as Record<StageName, number>,
    totalTokens,
    repairAttempts: context.repairHistory.length,
    validationPassed: context.validationResults?.valid ?? false,
    errors,
  };
}

// =============================================================================
// DIAGNOSTICS EXPORT
// =============================================================================

export function exportDiagnostics(context: PipelineContext) {
  return {
    telemetry: context.telemetry,
    modelsUsed: context.modelsUsed,
    repairHistory: context.repairHistory,
    projectContext: context.projectContext,
    validationResults: context.validationResults,
    rollbackPointCount: context.rollbackPoints.length,
    totalDuration: Date.now() - context.startTime,
  };
}
