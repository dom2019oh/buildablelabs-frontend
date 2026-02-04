// =============================================================================
// PIPELINE TYPES - Shared type definitions for the deterministic agent pipeline
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

// Database client type
// deno-lint-ignore no-explicit-any
export type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// FILE OPERATIONS
// =============================================================================

export interface FileOperation {
  path: string;
  content: string;
  operation: "create" | "update" | "delete" | "rename";
  previousPath?: string;
  metadata?: {
    classification?: FileClassification;
    createdBy?: string;
    modifyingAgent?: string;
    regenerationCount?: number;
  };
}

export type FileClassification = "internal" | "system" | "generated" | "runtime" | "user";

// =============================================================================
// INTENT TYPES
// =============================================================================

export interface IntentResult {
  type: "create" | "modify" | "question" | "debug" | "refactor";
  confidence: number;
  primaryAction: string;
  entities: {
    projectType?: string;
    components?: string[];
    features?: string[];
    modifications?: string[];
  };
  requiresNewFiles: boolean;
  requiresExistingFiles: boolean;
}

// =============================================================================
// PLAN TYPES
// =============================================================================

export interface ArchitecturePlan {
  projectType: string;
  theme: {
    primary: string;
    style: string;
  };
  pages: Array<{
    path: string;
    purpose: string;
    sections: string[];
  }>;
  components: Array<{
    path: string;
    features: string[];
  }>;
  routes: string[];
  images: Array<{
    usage: string;
    url: string;
  }>;
  specialInstructions?: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  criticalErrors: Array<{
    file: string;
    line?: number;
    error: string;
    fix: string;
    category: ErrorCategory;
  }>;
  warnings: Array<{
    file: string;
    message: string;
  }>;
  score: number; // 0-100 quality score
}

export type ErrorCategory = 
  | "SYNTAX"
  | "IMPORT"
  | "TYPE"
  | "RUNTIME"
  | "REACT"
  | "DEPENDENCY"
  | "SECURITY";

// =============================================================================
// PIPELINE CONTEXT
// =============================================================================

export interface PipelineContext {
  // Database client
  supabase: DB;
  
  // Session identifiers
  sessionId: string | null;
  workspaceId: string;
  userId: string;
  projectId: string;
  
  // Input data
  originalPrompt: string;
  conversationHistory: Array<{ role: string; content: string }>;
  existingFiles: FileOperation[];
  
  // Stage outputs
  intent?: IntentResult;
  plan?: ArchitecturePlan;
  generatedFiles: FileOperation[];
  validationResults?: ValidationResult;
  
  // Execution tracking
  executionLogs: string[];
  repairHistory: Array<{
    attempt: number;
    errors: Array<{ type: string; file: string; message: string }>;
    patchesApplied: string[];
    resolved: boolean;
  }>;
  
  // Rollback support
  rollbackPoints: Array<{
    stage: string;
    files: FileOperation[];
    timestamp: number;
  }>;
  
  // Project context (built in stage 0)
  projectContext?: ProjectContext;
  
  // Telemetry
  telemetry: TelemetryEvent[];
  startTime: number;
  modelsUsed: string[];
}

// =============================================================================
// PROJECT CONTEXT
// =============================================================================

export interface ProjectContext {
  framework: string;
  styling: string;
  patterns: string[];
  dependencies: string[];
  componentCount: number;
  pageCount: number;
  fileTree: string[];
  configs: Record<string, unknown>;
}

// =============================================================================
// TELEMETRY TYPES
// =============================================================================

export interface TelemetryEvent {
  stage: string;
  event: string;
  timestamp: number;
  duration?: number;
  data?: Record<string, unknown>;
}

export interface TelemetrySummary {
  stages: Array<{
    name: string;
    startMs: number;
    endMs: number;
    success: boolean;
  }>;
  modelCalls: Array<{
    provider: string;
    model: string;
    tokens?: number;
    latencyMs: number;
  }>;
  repairAttempts: number;
  totalDuration: number;
  totalTokens: number;
}

// =============================================================================
// STAGE RESULT
// =============================================================================

export interface StageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  modelUsed?: string;
}

// =============================================================================
// PIPELINE RESULT
// =============================================================================

export interface PipelineResult {
  success: boolean;
  files: FileOperation[];
  modelsUsed: string[];
  validationPassed: boolean;
  repairAttempts: number;
  errors?: string[];
  aiMessage: string;
  routes: string[];
  suggestions: string[];
  telemetry?: TelemetrySummary;
}

// =============================================================================
// AI TASK TYPES
// =============================================================================

export type AITaskType = 
  | "intent"
  | "planning"
  | "coding"
  | "validation"
  | "repair"
  | "persona";

// =============================================================================
// SAFETY LIMITS
// =============================================================================

export const SAFETY_LIMITS = {
  maxRetries: 3,
  maxRepairAttempts: 3,
  generationTimeout: 120_000,
  stageTimeout: 30_000,
  maxFilesPerGeneration: 20,
  maxFileSizeBytes: 100_000,
  maxTotalContentBytes: 500_000,
  previewHealthCheckInterval: 10_000,
  previewMaxRecoveryAttempts: 3,
  sessionIdleTimeout: 300_000,
} as const;
