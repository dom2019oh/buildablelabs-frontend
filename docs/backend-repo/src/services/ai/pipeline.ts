// =============================================================================
// Generation Pipeline - Multi-Agent Orchestration
// =============================================================================
// Coordinates Architect → Coder → Reviewer → Refiner flow using Buildable AI.
// Updates Supabase in real-time for frontend observation.

import { z } from 'zod';
import * as db from '../../db/queries';
import { aiLogger as logger } from '../../utils/logger';
import { Architect } from './architect';
import { Coder } from './coder';
import { Validator } from './validator';
import { getBuildableAI, suggest } from './buildable-ai';
import { TaskType } from './models';
import { env } from '../../config/env';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectPlan {
  projectType: string;
  description: string;
  files: Array<{
    path: string;
    purpose: string;
    dependencies: string[];
    priority?: number;
  }>;
  dependencies: string[];
  routes?: string[];
  framework?: 'react' | 'vue' | 'svelte' | 'node' | 'django' | 'react-native' | 'flutter';
  styling?: 'tailwind' | 'css' | 'scss' | 'styled-components';
}

export interface GeneratedFile {
  path: string;
  content: string;
  validated: boolean;
  errors?: string[];
}

export interface PipelineOptions {
  workspaceId: string;
  userId: string;
  sessionId: string;
  prompt: string;
  options?: {
    template?: string;
    model?: string;
    framework?: string;
    maxValidationRetries?: number;
  };
}

export interface PipelineResult {
  success: boolean;
  plan?: ProjectPlan;
  files: GeneratedFile[];
  totalTokens: number;
  totalCost: number;
  suggestions?: Array<{ title: string; description: string; priority: string }>;
  error?: string;
}

// =============================================================================
// PIPELINE STATUS UPDATES
// =============================================================================

type SessionStatus = 'pending' | 'planning' | 'scaffolding' | 'generating' | 'validating' | 'completed' | 'failed';

async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  data?: Partial<{
    plan: ProjectPlan | object;
    files_planned: number;
    files_generated: number;
    error_message: string;
    tokens_used: number;
    credits_used: number;
  }>
) {
  await db.updateSession(sessionId, {
    status,
    ...data,
    ...(status === 'completed' || status === 'failed'
      ? { completed_at: new Date().toISOString() }
      : {}),
  });
}

// =============================================================================
// GENERATION PIPELINE
// =============================================================================

export class GenerationPipeline {
  private workspaceId: string;
  private userId: string;
  private sessionId: string;
  private prompt: string;
  private options: PipelineOptions['options'];
  private maxValidationRetries: number;

  constructor(config: PipelineOptions) {
    this.workspaceId = config.workspaceId;
    this.userId = config.userId;
    this.sessionId = config.sessionId;
    this.prompt = config.prompt;
    this.options = config.options;
    this.maxValidationRetries = config.options?.maxValidationRetries ?? 3;
  }

  async run(): Promise<PipelineResult> {
    const startTime = Date.now();
    let totalTokens = 0;
    let totalCost = 0;
    const generatedFiles: GeneratedFile[] = [];

    logger.info({ sessionId: this.sessionId, workspaceId: this.workspaceId }, 'Pipeline starting');

    try {
      // =======================================================================
      // PHASE 1: PLANNING (Gemini via Buildable AI)
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 1: Architect - Planning');
      await updateSessionStatus(this.sessionId, 'planning');

      const architect = new Architect();
      const existingFiles = await db.getWorkspaceFiles(this.workspaceId);
      
      const planResult = await architect.createPlan(this.prompt, existingFiles);

      totalTokens += planResult.tokensUsed || 0;
      totalCost += planResult.cost || 0;

      const plan = planResult.plan;

      await updateSessionStatus(this.sessionId, 'scaffolding', {
        plan: plan as unknown as object,
        files_planned: plan.files.length,
      });

      logger.info(
        { sessionId: this.sessionId, filesPlanned: plan.files.length, projectType: plan.projectType },
        'Plan created'
      );

      // =======================================================================
      // PHASE 2: SCAFFOLDING
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 2: Scaffolding');

      // Apply template if specified
      if (this.options?.template) {
        await this.applyTemplate(this.options.template);
      }

      // =======================================================================
      // PHASE 3: CODE GENERATION (Grok primary via Buildable AI)
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 3: Generating files');
      await updateSessionStatus(this.sessionId, 'generating');

      const coder = new Coder();
      
      // Sort files by priority (dependencies first)
      const sortedFiles = this.sortFilesByDependency(plan.files);

      for (const fileSpec of sortedFiles) {
        try {
          logger.info({ sessionId: this.sessionId, file: fileSpec.path }, 'Generating file');

          // Get current project context
          const currentFiles = await db.getWorkspaceFiles(this.workspaceId);

          // Generate file content
          const result = await coder.generateFile(
            fileSpec,
            plan,
            currentFiles,
            this.prompt
          );

          totalTokens += result.tokensUsed || 0;
          totalCost += result.cost || 0;

          // Record operation (for undo/audit)
          const existingFile = currentFiles.find(f => f.file_path === fileSpec.path);
          await db.recordFileOperation(
            this.workspaceId,
            this.userId,
            this.sessionId,
            existingFile ? 'update' : 'create',
            fileSpec.path,
            {
              previousContent: existingFile?.content,
              newContent: result.content,
              aiModel: result.model || 'buildable-ai',
              aiReasoning: fileSpec.purpose,
            }
          );

          // Write file to database (triggers Realtime)
          await db.upsertFile(
            this.workspaceId,
            this.userId,
            fileSpec.path,
            result.content
          );

          generatedFiles.push({
            path: fileSpec.path,
            content: result.content,
            validated: false,
          });

          // Update progress
          await updateSessionStatus(this.sessionId, 'generating', {
            files_generated: generatedFiles.length,
          });

          logger.info({
            sessionId: this.sessionId,
            file: fileSpec.path,
            progress: `${generatedFiles.length}/${plan.files.length}`,
          }, 'File generated');

        } catch (fileError) {
          logger.error({
            error: fileError,
            file: fileSpec.path,
            sessionId: this.sessionId,
          }, 'Failed to generate file');
          // Continue with other files
        }
      }

      // =======================================================================
      // PHASE 4: VALIDATION & AUTO-FIX (Grok + OpenAI fallback)
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 4: Validating');
      await updateSessionStatus(this.sessionId, 'validating');

      const validator = new Validator();

      for (const file of generatedFiles) {
        let validationAttempts = 0;
        let isValid = false;

        while (!isValid && validationAttempts < this.maxValidationRetries) {
          validationAttempts++;

          const validation = await validator.validateFile(file.path, file.content);
          totalTokens += validation.tokensUsed || 0;
          totalCost += validation.cost || 0;

          if (validation.valid) {
            file.validated = true;
            isValid = true;
            logger.info({ file: file.path }, 'File validated successfully');
          } else {
            logger.warn(
              { file: file.path, attempt: validationAttempts, errors: validation.issues },
              'Validation failed, attempting fix'
            );

            // Attempt auto-fix
            const fixResult = await validator.fix(
              file.path,
              file.content,
              validation.issues
            );

            totalTokens += fixResult.tokensUsed || 0;
            totalCost += fixResult.cost || 0;

            file.content = fixResult.content;
            file.errors = validation.issues;

            // Update file in database
            await db.upsertFile(
              this.workspaceId,
              this.userId,
              file.path,
              fixResult.content
            );
          }
        }

        if (!isValid) {
          logger.error(
            { file: file.path, attempts: validationAttempts },
            'File validation failed after max retries'
          );
        }
      }

      // =======================================================================
      // PHASE 5: SUGGESTIONS (Post-generation, OpenAI reasoning)
      // =======================================================================
      let suggestions: Array<{ title: string; description: string; priority: string }> = [];

      try {
        const suggestResult = await suggest(
          generatedFiles.map((f) => f.path),
          plan.projectType
        );

        const parsed = JSON.parse(suggestResult.content);
        suggestions = parsed.suggestions || [];

        totalTokens += suggestResult.usage.totalTokens;
        totalCost += suggestResult.cost;
      } catch (error) {
        logger.warn({ error }, 'Failed to generate suggestions');
      }

      // =======================================================================
      // COMPLETE
      // =======================================================================
      const durationMs = Date.now() - startTime;

      await updateSessionStatus(this.sessionId, 'completed', {
        files_generated: generatedFiles.length,
        tokens_used: totalTokens,
        credits_used: Math.ceil(totalCost * 100), // Convert to credits
      });

      await db.updateWorkspaceStatus(this.workspaceId, 'ready');

      logger.info(
        {
          sessionId: this.sessionId,
          filesGenerated: generatedFiles.length,
          totalTokens,
          totalCost,
          durationMs,
        },
        'Pipeline completed successfully'
      );

      return {
        success: true,
        plan,
        files: generatedFiles,
        totalTokens,
        totalCost,
        suggestions,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({ error, sessionId: this.sessionId }, 'Pipeline failed');

      await updateSessionStatus(this.sessionId, 'failed', {
        error_message: errorMessage,
        tokens_used: totalTokens,
        credits_used: Math.ceil(totalCost * 100),
      });

      await db.updateWorkspaceStatus(this.workspaceId, 'error');

      return {
        success: false,
        files: generatedFiles,
        totalTokens,
        totalCost,
        error: errorMessage,
      };
    }
  }

  /**
   * Sort files by dependency order (files with no deps first)
   */
  private sortFilesByDependency(
    files: Array<{ path: string; purpose: string; dependencies: string[]; priority?: number }>
  ) {
    return [...files].sort((a, b) => {
      // Priority first if specified
      if (a.priority !== undefined && b.priority !== undefined) {
        return a.priority - b.priority;
      }
      // Then by dependency count
      return a.dependencies.length - b.dependencies.length;
    });
  }

  /**
   * Apply a template to the workspace
   */
  private async applyTemplate(templateName: string): Promise<void> {
    logger.info({ templateName, sessionId: this.sessionId }, 'Applying template');
    // Template application logic - copy files from templates/ directory
  }

  /**
   * Get file type from path
   */
  private getFileType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript-react',
      js: 'javascript',
      jsx: 'javascript-react',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      md: 'markdown',
      py: 'python',
      vue: 'vue',
      svelte: 'svelte',
    };
    return typeMap[ext || ''] || 'text';
  }
}

// =============================================================================
// REFINEMENT PIPELINE
// =============================================================================

export class RefinementPipeline {
  private ai = getBuildableAI();

  async refine(
    sessionId: string,
    workspaceId: string,
    userId: string,
    refinementPrompt: string,
    previousContext: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    let totalTokens = 0;
    let totalCost = 0;

    try {
      // Get current files
      const existingFiles = await db.getWorkspaceFiles(workspaceId);

      // Use reasoning to determine what changes are needed
      const analysisResult = await this.ai.execute({
        task: TaskType.REASONING,
        systemPrompt: `You are analyzing a refinement request. Determine what files need to be modified.
Return JSON: { "filesToModify": [{ "path": string, "changes": string }], "newFiles": [{ "path": string, "purpose": string }] }`,
        userPrompt: `Previous context: ${previousContext}

Current files: ${existingFiles.map((f) => f.file_path).join(', ')}

Refinement request: ${refinementPrompt}`,
        jsonMode: true,
      });

      totalTokens += analysisResult.usage.totalTokens;
      totalCost += analysisResult.cost;

      const analysis = JSON.parse(analysisResult.content);
      const generatedFiles: GeneratedFile[] = [];

      // Modify existing files
      for (const fileToModify of analysis.filesToModify || []) {
        const existingFile = existingFiles.find((f) => f.file_path === fileToModify.path);
        if (!existingFile) continue;

        const modifyResult = await this.ai.execute({
          task: TaskType.CODING,
          systemPrompt: `You are modifying an existing file. Apply the requested changes while preserving working code.
Output ONLY the complete modified file content - no explanations.`,
          userPrompt: `File: ${fileToModify.path}
Current content:
\`\`\`
${existingFile.content}
\`\`\`

Changes to apply: ${fileToModify.changes}`,
        });

        totalTokens += modifyResult.usage.totalTokens;
        totalCost += modifyResult.cost;

        generatedFiles.push({
          path: fileToModify.path,
          content: modifyResult.content,
          validated: false,
        });

        await db.upsertFile(workspaceId, userId, fileToModify.path, modifyResult.content);
      }

      // Create new files
      for (const newFile of analysis.newFiles || []) {
        const createResult = await this.ai.execute({
          task: TaskType.CODING,
          systemPrompt: `Generate a new file for a React/TypeScript project.
Output ONLY the file content - no explanations.`,
          userPrompt: `Create file: ${newFile.path}
Purpose: ${newFile.purpose}
Context: ${refinementPrompt}`,
        });

        totalTokens += createResult.usage.totalTokens;
        totalCost += createResult.cost;

        generatedFiles.push({
          path: newFile.path,
          content: createResult.content,
          validated: false,
        });

        await db.upsertFile(workspaceId, userId, newFile.path, createResult.content);
      }

      await db.updateSession(sessionId, {
        status: 'completed',
        tokens_used: totalTokens,
        credits_used: Math.ceil(totalCost * 100),
        completed_at: new Date().toISOString(),
      });

      return {
        success: true,
        files: generatedFiles,
        totalTokens,
        totalCost,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, sessionId }, 'Refinement failed');

      await db.updateSession(sessionId, {
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });

      return {
        success: false,
        files: [],
        totalTokens,
        totalCost,
        error: errorMessage,
      };
    }
  }
}
