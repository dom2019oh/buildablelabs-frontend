// =============================================================================
// PIPELINE TYPES - Core types for the deterministic agent pipeline
// =============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// DATABASE TYPE
// =============================================================================

// deno-lint-ignore no-explicit-any
export type DB = SupabaseClient<any, "public", any>;

// =============================================================================
// FILE OPERATIONS
// =============================================================================

export type FileOperation = {
  path: string;
  content: string;
  operation: "create" | "update" | "delete";
};

export type FileClassification = 
  | "internal"    // Platform code (never modify)
  | "system"      // Config files (careful modification)
  | "generated"   // AI-created files
  | "runtime"     // Temporary/preview files
  | "user";       // User-edited files

export interface ClassifiedFile extends FileOperation {
  classification: FileClassification;
  isWriteable: boolean;
}

// =============================================================================
// PIPELINE STAGES
// =============================================================================

export type StageName = 
  | "intent"      // Stage 1: Intent extraction
  | "decompose"   // Stage 2: Task decomposition  
  | "plan"        // Stage 3: Architecture planning
  | "generate"    // Stage 4: Code generation
  | "validate"    // Stage 5: Validation + normalization
  | "execute"     // Stage 6: Preview execution
  | "interpret"   // Stage 7: Log interpretation
  | "repair";     // Stage 8: Targeted repair

export interface StageResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  tokensUsed?: number;
  modelUsed?: string;
  canRetry: boolean;
}

export interface PipelineStage<TInput = unknown, TOutput = unknown> {
  name: StageName;
  execute(input: TInput, context: PipelineContext): Promise<StageResult<TOutput>>;
  canRetry: boolean;
  maxRetries: number;
  timeout: number;
  rollback?(context: PipelineContext): Promise<void>;
}

// =============================================================================
// PIPELINE CONTEXT
// =============================================================================

export interface ProjectContext {
  framework: string;
  styling: string;
  componentCount: number;
  pageCount: number;
  patterns: string[];
  dependencies: string[];
  routes: string[];
  lastModified: Record<string, string>;
}

export interface TelemetryEvent {
  stage: StageName;
  event: "start" | "complete" | "error" | "retry";
  timestamp: number;
  duration?: number;
  success?: boolean;
  tokensUsed?: number;
  modelUsed?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface RepairAttempt {
  attempt: number;
  errors: Array<{ type: ErrorCategory; file: string; message: string }>;
  patchesApplied: string[];
  resolved: boolean;
  duration: number;
}

export interface RollbackPoint {
  id: string;
  files: FileOperation[];
  timestamp: number;
  stage: StageName;
}

export interface PipelineContext {
  // Core identifiers
  sessionId: string | null;
  workspaceId: string;
  userId: string;
  projectId: string;

  // Database client
  supabase: DB;

  // Input data
  originalPrompt: string;
  conversationHistory: Array<{ role: string; content: string }>;
  existingFiles: FileOperation[];

  // Pipeline state
  intent?: IntentResult;
  taskList?: TaskDecomposition[];
  plan?: ArchitecturePlan;
  generatedFiles: FileOperation[];
  validationResults?: ValidationResult;
  executionLogs: string[];
  repairHistory: RepairAttempt[];
  rollbackPoints: RollbackPoint[];

  // Context memory
  projectContext?: ProjectContext;

  // Telemetry
  telemetry: TelemetryEvent[];
  startTime: number;

  // Models used during execution
  modelsUsed: string[];
}

// =============================================================================
// INTENT EXTRACTION
// =============================================================================

export type IntentType = 
  | "create_project"     // New project from scratch
  | "add_page"           // Add new page to existing project
  | "add_component"      // Add component to existing page
  | "modify_component"   // Modify existing component
  | "fix_error"          // Fix a bug or error
  | "style_change"       // Change styling/design
  | "refactor"           // Restructure code
  | "question";          // User asking a question (no code change)

export interface IntentResult {
  type: IntentType;
  confidence: number;
  summary: string;
  targetFiles: string[];
  requiresNewFiles: boolean;
  isDestructive: boolean;
}

// =============================================================================
// TASK DECOMPOSITION
// =============================================================================

export type TaskType = 
  | "create_file"
  | "update_file"
  | "delete_file"
  | "add_import"
  | "add_component"
  | "modify_component"
  | "add_route"
  | "add_style";

export interface TaskDecomposition {
  id: string;
  type: TaskType;
  description: string;
  targetPath: string;
  dependencies: string[];
  priority: number;
  estimatedComplexity: "low" | "medium" | "high";
}

// =============================================================================
// ARCHITECTURE PLAN
// =============================================================================

export interface PlannedFile {
  path: string;
  purpose?: string;
  sections?: string[];
  features?: string[];
}

// Re-export from validation for convenience
export interface ClassifiedError {
  original: ValidationError;
  rootCause: string;
  affectedFiles: string[];
  repairStrategy: string;
  priority: number;
}

export interface ArchitecturePlan {
  projectType: string;
  theme: {
    primary: string;
    style: string;
  };
  pages: PlannedFile[];
  components: PlannedFile[];
  routes: string[];
  images?: Array<{ usage: string; url: string }>;
  specialInstructions?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

export type ErrorCategory = 
  | "SYNTAX"      // Missing brace, unclosed tag
  | "IMPORT"      // Missing import, wrong path
  | "TYPE"        // TypeScript error
  | "RUNTIME"     // Undefined variable, null access
  | "REACT"       // Hook rules violation
  | "DEPENDENCY"  // Missing package
  | "STRUCTURE";  // Invalid file structure

export interface ValidationError {
  category: ErrorCategory;
  file: string;
  line?: number;
  message: string;
  fix: string;
  severity: "error" | "warning";
  autoFixable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  score: number;  // 0.0 - 1.0 quality score
  criticalErrors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

// =============================================================================
// MODEL ROUTING
// =============================================================================

export type ProviderKey = "grok" | "gemini" | "openai";

export type AITaskType = 
  | "intent"
  | "decompose"
  | "planning"
  | "coding"
  | "validation"
  | "repair"
  | "persona"
  | "root_cause";

export interface ModelConfig {
  name: string;
  baseUrl: string;
  models: Record<string, string>;
  maxTokens: number;
}

export interface TaskRouting {
  provider: ProviderKey;
  model: string;
  confidenceThreshold: number;
  fallback?: {
    provider: ProviderKey;
    model: string;
  };
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
  
  // Persona response for chat display
  aiMessage: string;
  routes: string[];
  suggestions: string[];
  
  // Telemetry summary
  telemetry?: {
    stages: Array<{ name: StageName; duration: number; success: boolean }>;
    totalDuration: number;
    totalTokens: number;
  };
}

// =============================================================================
// SAFETY LIMITS
// =============================================================================

export const SAFETY_LIMITS = {
  maxRetries: 3,
  maxRepairAttempts: 3,
  generationTimeout: 120_000,    // 2 minutes
  stageTimeout: 30_000,          // 30 seconds per stage
  maxFilesPerGeneration: 20,
  maxFileSizeBytes: 100_000,     // 100KB per file
  maxTotalContentBytes: 500_000, // 500KB total
  previewHealthCheckInterval: 10_000,
  previewMaxRecoveryAttempts: 3,
  sessionIdleTimeout: 300_000,   // 5 minutes
} as const;

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  consecutiveFailures: number;
  lastFailure: number;
  cooldownUntil: number;
}

export const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,
  cooldownPeriod: 60_000, // 1 minute
} as const;

// =============================================================================
// SYNC ENGINE TYPES - Command Protocol & SSE Events
// =============================================================================

export type CommandType = "CREATE_FILE" | "UPDATE_FILE" | "DELETE_FILE" | "PATCH_FILE";

export interface SearchReplacePatch {
  search: string;
  replace: string;
  context?: string;
}

export interface FileCommand {
  command: CommandType;
  path: string;
  content?: string;
  patches?: SearchReplacePatch[];
  metadata?: { language?: string; purpose?: string };
}

export type SyncEventType = "stage" | "file" | "complete" | "error";

export interface SyncEvent {
  type: SyncEventType;
  [key: string]: unknown;
}

export type OnSyncEvent = (event: SyncEvent) => void;
