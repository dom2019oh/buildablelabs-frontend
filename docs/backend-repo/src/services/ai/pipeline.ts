// =============================================================================
// AI Generation Pipeline
// =============================================================================
// Orchestrates the full generation flow:
// 1. ARCHITECT - Parse intent and create structured plan
// 2. SCAFFOLD - Set up project structure from templates
// 3. GENERATE - Create files iteratively with full context
// 4. VALIDATE - Check for errors and fix issues

import { aiLogger as logger } from '../../utils/logger';
import * as db from '../../db/queries';
import { Architect } from './architect';
import { Coder } from './coder';
import { Validator } from './validator';
import { env } from '../../config/env';

// =============================================================================
// TYPES
// =============================================================================

export interface PipelineOptions {
  workspaceId: string;
  userId: string;
  sessionId: string;
  prompt: string;
  options?: {
    template?: string;
    model?: string;
  };
}

export interface ProjectPlan {
  projectType: string;
  description: string;
  files: Array<{
    path: string;
    purpose: string;
    dependencies: string[];
  }>;
  dependencies: string[];
  routes?: string[];
}

// =============================================================================
// PIPELINE
// =============================================================================

export class GenerationPipeline {
  private workspaceId: string;
  private userId: string;
  private sessionId: string;
  private prompt: string;
  private options: PipelineOptions['options'];

  constructor(config: PipelineOptions) {
    this.workspaceId = config.workspaceId;
    this.userId = config.userId;
    this.sessionId = config.sessionId;
    this.prompt = config.prompt;
    this.options = config.options;
  }

  async run(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // =======================================================================
      // PHASE 1: ARCHITECT
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 1: Architect - Planning');
      
      await db.updateSession(this.sessionId, { status: 'planning' });

      const architect = new Architect(env.DEFAULT_ARCHITECT_MODEL);
      const existingFiles = await db.getWorkspaceFiles(this.workspaceId);
      
      const plan = await architect.createPlan(this.prompt, existingFiles);
      
      await db.updateSession(this.sessionId, {
        plan: plan as unknown as object,
        files_planned: plan.files.length,
      });

      logger.info({ sessionId: this.sessionId, filesPlanned: plan.files.length }, 'Plan created');

      // =======================================================================
      // PHASE 2: SCAFFOLDING
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 2: Scaffolding');
      
      await db.updateSession(this.sessionId, { status: 'scaffolding' });

      // Apply template if specified
      if (this.options?.template) {
        await this.applyTemplate(this.options.template);
      }

      // =======================================================================
      // PHASE 3: GENERATION
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 3: Generating files');
      
      await db.updateSession(this.sessionId, { status: 'generating' });

      const coder = new Coder(env.DEFAULT_CODER_MODEL);
      let filesGenerated = 0;

      for (const fileSpec of plan.files) {
        try {
          // Get current project context
          const currentFiles = await db.getWorkspaceFiles(this.workspaceId);
          
          // Generate file content
          const content = await coder.generateFile(
            fileSpec,
            plan,
            currentFiles,
            this.prompt
          );

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
              newContent: content,
              aiModel: env.DEFAULT_CODER_MODEL,
              aiReasoning: fileSpec.purpose,
            }
          );

          // Write file to database
          await db.upsertFile(
            this.workspaceId,
            this.userId,
            fileSpec.path,
            content
          );

          filesGenerated++;
          
          // Update progress (triggers Realtime update)
          await db.updateSession(this.sessionId, { files_generated: filesGenerated });
          
          logger.info({ 
            sessionId: this.sessionId, 
            file: fileSpec.path,
            progress: `${filesGenerated}/${plan.files.length}`,
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
      // PHASE 4: VALIDATION
      // =======================================================================
      logger.info({ sessionId: this.sessionId }, 'Phase 4: Validating');
      
      await db.updateSession(this.sessionId, { status: 'validating' });

      const validator = new Validator();
      const allFiles = await db.getWorkspaceFiles(this.workspaceId);
      
      const validationResult = await validator.validate(allFiles);
      
      if (validationResult.errors.length > 0) {
        logger.warn({ 
          sessionId: this.sessionId,
          errors: validationResult.errors,
        }, 'Validation found issues, attempting auto-repair');

        // Attempt auto-repair
        for (const repair of validationResult.repairs) {
          await db.upsertFile(
            this.workspaceId,
            this.userId,
            repair.filePath,
            repair.content
          );
        }
      }

      // =======================================================================
      // COMPLETE
      // =======================================================================
      const duration = Date.now() - startTime;
      
      await db.updateSession(this.sessionId, {
        status: 'completed',
        files_generated: filesGenerated,
        completed_at: new Date().toISOString(),
      });

      await db.updateWorkspaceStatus(this.workspaceId, 'ready');

      logger.info({ 
        sessionId: this.sessionId,
        filesGenerated,
        durationMs: duration,
      }, 'Generation completed');

    } catch (error) {
      logger.error({ error, sessionId: this.sessionId }, 'Pipeline failed');
      
      await db.updateSession(this.sessionId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      });

      await db.updateWorkspaceStatus(this.workspaceId, 'error');
      
      throw error;
    }
  }

  private async applyTemplate(templateName: string): Promise<void> {
    // Template application logic
    // This would copy files from templates/ directory
    logger.info({ templateName, sessionId: this.sessionId }, 'Applying template');
  }
}
