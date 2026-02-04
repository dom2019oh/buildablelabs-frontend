// =============================================================================
// TELEMETRY - Observability infrastructure for the pipeline
// =============================================================================

import type { PipelineContext, TelemetrySummary, TelemetryEvent } from "./types";

// =============================================================================
// TELEMETRY LOGGER
// =============================================================================

export class TelemetryLogger {
  private sessionId: string | null;
  private workspaceId: string;
  private events: TelemetryEvent[] = [];

  constructor(sessionId: string | null, workspaceId: string) {
    this.sessionId = sessionId;
    this.workspaceId = workspaceId;
  }

  info(message: string, data?: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      stage: "info",
      event: message,
      timestamp: Date.now(),
      data,
    };
    this.events.push(event);
    console.log(`[Pipeline] ${message}`, data ? JSON.stringify(data) : "");
  }

  warn(message: string, data?: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      stage: "warn",
      event: message,
      timestamp: Date.now(),
      data,
    };
    this.events.push(event);
    console.warn(`[Pipeline] ⚠️ ${message}`, data ? JSON.stringify(data) : "");
  }

  error(message: string, data?: Record<string, unknown>): void {
    const event: TelemetryEvent = {
      stage: "error",
      event: message,
      timestamp: Date.now(),
      data,
    };
    this.events.push(event);
    console.error(`[Pipeline] ❌ ${message}`, data ? JSON.stringify(data) : "");
  }

  stageStart(stage: string): void {
    this.info(`Stage ${stage} started`);
  }

  stageComplete(stage: string, duration: number, success: boolean): void {
    this.info(`Stage ${stage} ${success ? "completed" : "failed"}`, { duration, success });
  }

  modelCall(provider: string, model: string, latencyMs: number, tokens?: number): void {
    this.info(`Model call: ${provider}/${model}`, { latencyMs, tokens });
  }

  getEvents(): TelemetryEvent[] {
    return this.events;
  }
}

// =============================================================================
// STAGE TRACER
// =============================================================================

export class StageTracer {
  private context: PipelineContext;
  private stages: Array<{
    name: string;
    startMs: number;
    endMs: number;
    success: boolean;
  }> = [];
  private modelCalls: Array<{
    provider: string;
    model: string;
    tokens?: number;
    latencyMs: number;
  }> = [];
  private currentStage: { name: string; startMs: number } | null = null;

  constructor(context: PipelineContext) {
    this.context = context;
  }

  startStage(name: string): void {
    this.currentStage = { name, startMs: Date.now() - this.context.startTime };
    console.log(`[Pipeline] 🚀 Stage: ${name}`);
  }

  endStage(success: boolean): void {
    if (this.currentStage) {
      const endMs = Date.now() - this.context.startTime;
      this.stages.push({
        name: this.currentStage.name,
        startMs: this.currentStage.startMs,
        endMs,
        success,
      });
      console.log(`[Pipeline] ${success ? "✓" : "✗"} Stage: ${this.currentStage.name} (${endMs - this.currentStage.startMs}ms)`);
      this.currentStage = null;
    }
  }

  recordModelCall(provider: string, model: string, latencyMs: number, tokens?: number): void {
    this.modelCalls.push({ provider, model, latencyMs, tokens });
    this.context.modelsUsed.push(`${provider}/${model}`);
  }

  validationResult(valid: boolean, errorCount: number, warningCount: number, score: number): void {
    console.log(`[Pipeline] Validation: ${valid ? "PASSED" : "FAILED"} (errors: ${errorCount}, warnings: ${warningCount}, score: ${score})`);
  }

  repairAttempt(attempt: number, errorsFixed: number, errorsRemaining: number): void {
    console.log(`[Pipeline] Repair attempt ${attempt}: fixed ${errorsFixed}, remaining ${errorsRemaining}`);
  }

  getSummary(): TelemetrySummary {
    return {
      stages: this.stages,
      modelCalls: this.modelCalls,
      repairAttempts: this.context.repairHistory.length,
      totalDuration: Date.now() - this.context.startTime,
      totalTokens: this.modelCalls.reduce((sum, call) => sum + (call.tokens || 0), 0),
    };
  }
}

// =============================================================================
// METRICS COLLECTOR
// =============================================================================

export function collectMetrics(context: PipelineContext): Record<string, unknown> {
  return {
    sessionId: context.sessionId,
    workspaceId: context.workspaceId,
    duration: Date.now() - context.startTime,
    filesGenerated: context.generatedFiles.length,
    repairAttempts: context.repairHistory.length,
    modelsUsed: context.modelsUsed,
    validationPassed: context.validationResults?.valid ?? false,
    errorCount: context.validationResults?.criticalErrors.length ?? 0,
  };
}
