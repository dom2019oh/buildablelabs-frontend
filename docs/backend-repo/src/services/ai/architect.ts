// =============================================================================
// Architect Service - Project Planning Phase (Gemini Primary)
// =============================================================================
// Converts user prompts into structured project plans using Buildable AI.
// Uses Gemini for intent parsing and planning - NO code generated at this stage.

import { z } from 'zod';
import { aiLogger as logger } from '../../utils/logger';
import { getBuildableAI, type BuildableAIResponse } from './buildable-ai';
import { TaskType } from './models';
import type { ProjectPlan } from './pipeline';

// =============================================================================
// SCHEMA
// =============================================================================

const projectPlanSchema = z.object({
  projectType: z.enum([
    'landing-page',
    'dashboard',
    'e-commerce',
    'blog',
    'app',
    'mobile-app',
    'api',
    'fullstack',
  ]),
  description: z.string(),
  files: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    dependencies: z.array(z.string()),
    priority: z.number().optional(),
  })),
  dependencies: z.array(z.string()),
  routes: z.array(z.string()).optional(),
  framework: z.enum(['react', 'vue', 'svelte', 'node', 'django', 'react-native', 'flutter']).optional(),
  styling: z.enum(['tailwind', 'css', 'scss', 'styled-components']).optional(),
});

// =============================================================================
// ARCHITECT RESULT
// =============================================================================

export interface ArchitectResult {
  plan: ProjectPlan;
  tokensUsed: number;
  cost: number;
}

// =============================================================================
// ARCHITECT CLASS
// =============================================================================

export class Architect {
  private ai = getBuildableAI();

  /**
   * Create a structured project plan from a user prompt
   * Uses Gemini (via Buildable AI) for planning tasks
   */
  async createPlan(
    prompt: string,
    existingFiles: Array<{ file_path: string; content: string }>
  ): Promise<ArchitectResult> {
    const systemPrompt = `You are an expert software architect. Your job is to analyze user requirements and create a structured project plan.

You must output a JSON object with this structure:
{
  "projectType": "landing-page" | "dashboard" | "e-commerce" | "blog" | "app" | "mobile-app" | "api" | "fullstack",
  "description": "Brief description of what will be built",
  "files": [
    {
      "path": "src/components/Hero.tsx",
      "purpose": "Hero section with headline and CTA",
      "dependencies": ["src/components/ui/button.tsx"],
      "priority": 1
    }
  ],
  "dependencies": ["package-name"],
  "routes": ["/", "/about", "/contact"],
  "framework": "react" | "vue" | "svelte" | "node" | "django" | "react-native" | "flutter",
  "styling": "tailwind" | "css" | "scss" | "styled-components"
}

Rules:
1. Support multiple stacks: React, Vue, Svelte (frontend), Node, Django (backend), React Native, Flutter (mobile)
2. Default to React + Vite + TypeScript + Tailwind CSS if not specified
3. Prefer shadcn/ui components for React projects (already installed)
4. Keep files small and focused (under 200 lines each)
5. Use proper component organization: pages, components, hooks, lib, utils
6. Consider existing files and avoid conflicts
7. Plan for incremental builds - each file should be independently valid
8. Assign priority numbers (1 = highest) based on dependency order
9. For mobile hints, suggest React Native or Flutter patterns

Existing files in project:
${existingFiles.map(f => f.file_path).join('\n') || 'None (new project)'}`;

    const userPrompt = `Create a project plan for:

${prompt}

Output ONLY valid JSON, no markdown or explanation.`;

    logger.info({ promptLength: prompt.length, existingFiles: existingFiles.length }, 'Creating project plan');

    const response = await this.ai.execute({
      task: TaskType.PLANNING,
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 4000,
      jsonMode: true,
    });

    // Parse and validate
    const parsed = JSON.parse(response.content);
    const validated = projectPlanSchema.parse(parsed);

    logger.info({
      filesPlanned: validated.files.length,
      projectType: validated.projectType,
      framework: validated.framework || 'react',
      provider: response.provider,
      model: response.model,
    }, 'Plan created successfully');

    return {
      plan: validated,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }

  /**
   * Analyze an existing project to understand its structure
   */
  async analyzeProject(
    files: Array<{ file_path: string; content: string }>
  ): Promise<{
    framework: string;
    styling: string;
    structure: string;
    suggestions: string[];
    tokensUsed: number;
    cost: number;
  }> {
    const fileList = files.map(f => `- ${f.file_path}`).join('\n');
    const sampleContents = files
      .slice(0, 5)
      .map(f => `### ${f.file_path}\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``)
      .join('\n\n');

    const response = await this.ai.execute({
      task: TaskType.PLANNING,
      systemPrompt: `You are analyzing an existing project structure. Identify the framework, styling approach, and architecture.
Return JSON: { "framework": string, "styling": string, "structure": string, "suggestions": string[] }`,
      userPrompt: `Project files:\n${fileList}\n\nSample contents:\n${sampleContents}`,
      jsonMode: true,
    });

    const result = JSON.parse(response.content);

    return {
      ...result,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }

  /**
   * Expand a brief prompt into a detailed specification
   */
  async expandPrompt(
    briefPrompt: string
  ): Promise<{ expandedPrompt: string; tokensUsed: number; cost: number }> {
    const response = await this.ai.execute({
      task: TaskType.REASONING,
      systemPrompt: `You are expanding a brief project idea into a detailed specification.
Include: features, pages, components, data models, and user flows.
Keep it concise but comprehensive.`,
      userPrompt: `Expand this project idea:\n\n${briefPrompt}`,
    });

    return {
      expandedPrompt: response.content,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }
}
