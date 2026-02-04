// =============================================================================
// Generation Pipeline - BEAST MODE Multi-Agent Orchestration
// =============================================================================
// 4-Stage Pipeline: Architect → Coder → Validator → Repair
// Updates Supabase in real-time for frontend observation.

import { z } from 'zod';
import * as db from '../../db/queries';
import { aiLogger as logger } from '../../utils/logger';
import { Architect } from './architect';
import { Coder } from './coder';
import { Validator, validateCodeLocally } from './validator';
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
  repairAttempts?: number;
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
    useAIValidation?: boolean;
  };
}

export interface PipelineResult {
  success: boolean;
  plan?: ProjectPlan;
  files: GeneratedFile[];
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  stages: StageResult[];
  suggestions?: Array<{ title: string; description: string; priority: string }>;
  error?: string;
  // NEW: Persona response for chat display
  aiMessage: string;
  routes: string[];
}

export interface StageResult {
  stage: 'architect' | 'coder' | 'validator' | 'repair';
  success: boolean;
  duration: number;
  model?: string;
  tokensUsed?: number;
  filesProcessed?: number;
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
    model_used: string;
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
// BEAST MODE PIPELINE
// =============================================================================

const MAX_REPAIR_ATTEMPTS = 3;

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
    this.maxValidationRetries = config.options?.maxValidationRetries ?? MAX_REPAIR_ATTEMPTS;
  }

  async run(): Promise<PipelineResult> {
    const startTime = Date.now();
    let totalTokens = 0;
    let totalCost = 0;
    const modelsUsed: string[] = [];
    const stages: StageResult[] = [];
    const generatedFiles: GeneratedFile[] = [];

    logger.info({ sessionId: this.sessionId, workspaceId: this.workspaceId }, 'BEAST Pipeline starting');

    try {
      // =======================================================================
      // STAGE 1: ARCHITECT (Gemini) - Planning
      // =======================================================================
      const architectStart = Date.now();
      logger.info({ sessionId: this.sessionId }, 'Stage 1: ARCHITECT - Creating project plan');
      await updateSessionStatus(this.sessionId, 'planning');

      const architect = new Architect();
      const existingFiles = await db.getWorkspaceFiles(this.workspaceId);
      
      const planResult = await architect.createPlan(this.prompt, existingFiles);

      totalTokens += planResult.tokensUsed || 0;
      totalCost += planResult.cost || 0;
      modelsUsed.push(planResult.model);

      const plan = planResult.plan;

      stages.push({
        stage: 'architect',
        success: true,
        duration: Date.now() - architectStart,
        model: planResult.model,
        tokensUsed: planResult.tokensUsed,
        filesProcessed: plan.files.length,
      });

      await updateSessionStatus(this.sessionId, 'scaffolding', {
        plan: plan as unknown as object,
        files_planned: plan.files.length,
        model_used: planResult.model,
      });

      logger.info({
        sessionId: this.sessionId,
        filesPlanned: plan.files.length,
        projectType: plan.projectType,
        model: planResult.model,
      }, 'ARCHITECT complete');

      // =======================================================================
      // STAGE 2: CODER (Grok) - Code Generation
      // =======================================================================
      const coderStart = Date.now();
      logger.info({ sessionId: this.sessionId }, 'Stage 2: CODER - Generating files');
      await updateSessionStatus(this.sessionId, 'generating');

      const coder = new Coder();
      const sortedFiles = this.sortFilesByDependency(plan.files);

      for (const fileSpec of sortedFiles) {
        try {
          logger.info({ sessionId: this.sessionId, file: fileSpec.path }, 'Generating file');

          const currentFiles = await db.getWorkspaceFiles(this.workspaceId);

          const result = await coder.generateFile(
            fileSpec,
            plan,
            currentFiles,
            this.prompt
          );

          totalTokens += result.tokensUsed || 0;
          totalCost += result.cost || 0;
          if (!modelsUsed.includes(result.model)) {
            modelsUsed.push(result.model);
          }

          // Record operation for audit
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
              aiModel: result.model,
              aiReasoning: fileSpec.purpose,
            }
          );

          // Write to database (triggers Realtime)
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

          await updateSessionStatus(this.sessionId, 'generating', {
            files_generated: generatedFiles.length,
          });

        } catch (fileError) {
          logger.error({
            error: fileError,
            file: fileSpec.path,
            sessionId: this.sessionId,
          }, 'Failed to generate file');
        }
      }

      stages.push({
        stage: 'coder',
        success: generatedFiles.length > 0,
        duration: Date.now() - coderStart,
        model: 'grok-3-fast',
        filesProcessed: generatedFiles.length,
      });

      logger.info({ sessionId: this.sessionId, filesGenerated: generatedFiles.length }, 'CODER complete');

      // =======================================================================
      // STAGE 3: VALIDATOR - Local + AI Validation
      // =======================================================================
      const validatorStart = Date.now();
      logger.info({ sessionId: this.sessionId }, 'Stage 3: VALIDATOR - Checking code quality');
      await updateSessionStatus(this.sessionId, 'validating');

      const validator = new Validator();
      let filesWithErrors = 0;

      for (const file of generatedFiles) {
        // First: fast local validation
        const localResult = validateCodeLocally(file.content, file.path);
        
        if (!localResult.valid) {
          filesWithErrors++;
          file.errors = localResult.errors.map(e => e.message);
          logger.warn({ file: file.path, errors: file.errors }, 'Local validation failed');
        } else {
          file.validated = true;
        }
      }

      stages.push({
        stage: 'validator',
        success: filesWithErrors === 0,
        duration: Date.now() - validatorStart,
        model: 'local',
        filesProcessed: generatedFiles.length,
      });

      // =======================================================================
      // STAGE 4: REPAIR (OpenAI) - Fix Invalid Files
      // =======================================================================
      if (filesWithErrors > 0) {
        const repairStart = Date.now();
        logger.info({ sessionId: this.sessionId, filesToRepair: filesWithErrors }, 'Stage 4: REPAIR - Fixing errors');

        for (const file of generatedFiles) {
          if (file.validated || !file.errors?.length) continue;

          let repairAttempts = 0;
          let isValid = false;

          while (!isValid && repairAttempts < this.maxValidationRetries) {
            repairAttempts++;
            file.repairAttempts = repairAttempts;

            try {
              logger.info({ file: file.path, attempt: repairAttempts }, 'Attempting repair');

              const fixResult = await validator.fix(file.path, file.content, file.errors);

              totalTokens += fixResult.tokensUsed || 0;
              totalCost += fixResult.cost || 0;

              file.content = fixResult.content;

              // Re-validate
              const revalidation = validateCodeLocally(file.content, file.path);
              
              if (revalidation.valid) {
                file.validated = true;
                file.errors = undefined;
                isValid = true;
                logger.info({ file: file.path, attempts: repairAttempts }, 'File repaired successfully');

                // Update in database
                await db.upsertFile(this.workspaceId, this.userId, file.path, file.content);
              } else {
                file.errors = revalidation.errors.map(e => e.message);
                logger.warn({ file: file.path, errors: file.errors }, 'Repair attempt failed');
              }
            } catch (repairError) {
              logger.error({ error: repairError, file: file.path }, 'Repair failed');
            }
          }

          if (!isValid) {
            logger.error({ file: file.path, attempts: repairAttempts }, 'File could not be repaired');
          }
        }

        stages.push({
          stage: 'repair',
          success: true,
          duration: Date.now() - repairStart,
          model: 'gpt-4o',
          filesProcessed: filesWithErrors,
        });
      }

      // =======================================================================
      // GENERATE SUGGESTIONS
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
      // STAGE 5: PERSONA - Generate friendly AI response
      // =======================================================================
      const isNewProject = (await db.getWorkspaceFiles(this.workspaceId)).length <= generatedFiles.length;
      const personaResult = generatePersonaResponse(this.prompt, generatedFiles, plan, isNewProject);

      // =======================================================================
      // COMPLETE
      // =======================================================================
      const durationMs = Date.now() - startTime;
      const validatedCount = generatedFiles.filter(f => f.validated).length;

      await updateSessionStatus(this.sessionId, 'completed', {
        files_generated: generatedFiles.length,
        tokens_used: totalTokens,
        credits_used: Math.ceil(totalCost * 100),
      });

      await db.updateWorkspaceStatus(this.workspaceId, 'ready');

      logger.info({
        sessionId: this.sessionId,
        filesGenerated: generatedFiles.length,
        filesValidated: validatedCount,
        totalTokens,
        totalCost,
        durationMs,
        modelsUsed,
      }, 'BEAST Pipeline completed successfully');

      return {
        success: true,
        plan,
        files: generatedFiles,
        totalTokens,
        totalCost,
        modelsUsed: [...new Set(modelsUsed)],
        stages,
        suggestions,
        aiMessage: personaResult.message,
        routes: personaResult.routes,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({ error, sessionId: this.sessionId }, 'BEAST Pipeline failed');

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
        modelsUsed,
        stages,
        error: errorMessage,
        aiMessage: "Oops! Something went wrong while building your project. Let me try again...",
        routes: ["/"],
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
      if (a.priority !== undefined) return -1;
      if (b.priority !== undefined) return 1;
      // Then by dependency count
      return a.dependencies.length - b.dependencies.length;
    });
  }
}

// =============================================================================
// QUICK GENERATION (Single-stage for simple requests)
// =============================================================================

export async function quickGenerate(
  prompt: string,
  type: 'component' | 'page' | 'hook'
): Promise<{ content: string; model: string }> {
  const ai = getBuildableAI();
  
  const systemPrompts = {
    component: 'Generate a complete React component with TypeScript and Tailwind CSS. Full implementation, no placeholders.',
    page: 'Generate a complete React page component with proper layout and routing. Full implementation.',
    hook: 'Generate a complete React custom hook with TypeScript. Include proper cleanup and error handling.',
  };
  
  const response = await ai.execute({
    task: TaskType.CODING,
    systemPrompt: systemPrompts[type],
    userPrompt: prompt,
    temperature: 0.2,
    maxTokens: 4000,
  });
  
  return {
    content: response.content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim(),
    model: response.model,
  };
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
    const modelsUsed: string[] = [];
    const stages: StageResult[] = [];

    try {
      const existingFiles = await db.getWorkspaceFiles(workspaceId);

      // Analyze what needs to change
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
      modelsUsed.push(analysisResult.model);

      const analysis = JSON.parse(analysisResult.content);
      const generatedFiles: GeneratedFile[] = [];

      // Modify existing files
      for (const fileToModify of analysis.filesToModify || []) {
        const existingFile = existingFiles.find((f) => f.file_path === fileToModify.path);
        if (!existingFile) continue;

        const modifyResult = await this.ai.execute({
          task: TaskType.CODING,
          systemPrompt: `You are modifying an existing file. Apply the requested changes while preserving working code.
Output ONLY the complete modified file content - no explanations, no markdown.`,
          userPrompt: `File: ${fileToModify.path}
Current content:
\`\`\`
${existingFile.content}
\`\`\`

Changes to apply: ${fileToModify.changes}`,
        });

        totalTokens += modifyResult.usage.totalTokens;
        totalCost += modifyResult.cost;

        const cleanContent = modifyResult.content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim();

        generatedFiles.push({
          path: fileToModify.path,
          content: cleanContent,
          validated: true,
        });

        await db.upsertFile(workspaceId, userId, fileToModify.path, cleanContent);
      }

      // Create new files
      for (const newFile of analysis.newFiles || []) {
        const createResult = await this.ai.execute({
          task: TaskType.CODING,
          systemPrompt: `Generate a complete React/TypeScript file. No placeholders, full implementation.
Output ONLY the file content - no explanations, no markdown.`,
          userPrompt: `Create file: ${newFile.path}
Purpose: ${newFile.purpose}
Context: Part of refinement request "${refinementPrompt}"`,
        });

        totalTokens += createResult.usage.totalTokens;
        totalCost += createResult.cost;

        const cleanContent = createResult.content.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim();

        generatedFiles.push({
          path: newFile.path,
          content: cleanContent,
          validated: true,
        });

        await db.upsertFile(workspaceId, userId, newFile.path, cleanContent);
      }

      return {
        success: true,
        files: generatedFiles,
        totalTokens,
        totalCost,
        modelsUsed,
        stages,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, sessionId }, 'Refinement pipeline failed');

      return {
        success: false,
        files: [],
        totalTokens,
        totalCost,
        modelsUsed,
        stages,
        error: errorMessage,
        aiMessage: "Oops! Something went wrong. Let me try again...",
        routes: ["/"],
      };
    }
  }
}

// =============================================================================
// PERSONA RESPONSE GENERATOR
// =============================================================================

function generatePersonaResponse(
  prompt: string,
  files: GeneratedFile[],
  plan: ProjectPlan,
  isNewProject: boolean
): { message: string; routes: string[]; suggestions: string[] } {
  // Extract routes from plan
  const routes = plan.routes || ["/"];

  // Detect niche for personalized response
  const nicheType = detectNicheType(prompt);

  // Generate contextual suggestions
  const suggestions: string[] = [];
  const hasNavbar = files.some(f => f.path.toLowerCase().includes("navbar"));
  const hasHero = files.some(f => f.path.toLowerCase().includes("hero"));
  const hasGallery = files.some(f => f.path.toLowerCase().includes("gallery"));
  const hasContact = files.some(f => f.path.toLowerCase().includes("contact"));

  if (!hasContact) suggestions.push("Add a contact form");
  if (!hasGallery) suggestions.push("Add a photo gallery section");
  if (hasHero) suggestions.push("Change the hero background image");
  suggestions.push("Browse the [Components Library](/dashboard/components) for more sections");
  suggestions.push("Try a different style from the [Backgrounds Library](/dashboard/backgrounds)");

  // Generate friendly message
  const fileList = files.map(f => f.path.split("/").pop()).slice(0, 5).join(", ");
  const projectType = detectProjectType(prompt);
  const emoji = getProjectEmoji(projectType);

  let message: string;
  if (isNewProject) {
    message = `${emoji} Creating your ${projectType}...\n\n{THINKING_INDICATOR}\n\nDone! I created ${files.length} files including ${fileList}. I've added stunning images that match your ${nicheType} theme!\n\n💡 **Next steps:**\n${suggestions.slice(0, 3).map(s => `- ${s}`).join("\n")}`;
  } else {
    message = `Making those changes now...\n\n{THINKING_INDICATOR}\n\nDone! I updated ${files.length} file(s). Take a look at the preview!\n\n💡 **Want more?**\n${suggestions.slice(0, 2).map(s => `- ${s}`).join("\n")}`;
  }

  return { message, routes, suggestions: suggestions.slice(0, 3) };
}

function detectNicheType(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("bakery") || p.includes("bread") || p.includes("pastry")) return "bakery";
  if (p.includes("cafe") || p.includes("coffee")) return "cafe";
  if (p.includes("restaurant") || p.includes("food")) return "restaurant";
  if (p.includes("fitness") || p.includes("gym") || p.includes("workout")) return "fitness";
  if (p.includes("tech") || p.includes("saas") || p.includes("software")) return "tech";
  if (p.includes("shop") || p.includes("store") || p.includes("ecommerce")) return "ecommerce";
  if (p.includes("portfolio") || p.includes("creative")) return "portfolio";
  if (p.includes("real estate") || p.includes("property")) return "realestate";
  if (p.includes("travel") || p.includes("tourism")) return "travel";
  return "general";
}

function detectProjectType(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("bakery") || p.includes("cafe") || p.includes("restaurant")) return "bakery landing page";
  if (p.includes("portfolio")) return "portfolio site";
  if (p.includes("e-commerce") || p.includes("shop") || p.includes("store")) return "e-commerce site";
  if (p.includes("dashboard")) return "dashboard";
  if (p.includes("blog")) return "blog";
  if (p.includes("saas")) return "SaaS landing page";
  if (p.includes("landing")) return "landing page";
  return "website";
}

function getProjectEmoji(type: string): string {
  if (type.includes("bakery")) return "🥐";
  if (type.includes("portfolio")) return "✨";
  if (type.includes("e-commerce") || type.includes("shop")) return "🛒";
  if (type.includes("dashboard")) return "📊";
  if (type.includes("blog")) return "📝";
  if (type.includes("saas")) return "🚀";
  return "🎨";
}
