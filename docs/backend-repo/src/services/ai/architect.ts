// =============================================================================
// Architect Service - Project Planning Phase
// =============================================================================
// Converts user prompts into structured project plans.
// NO code is generated at this stage - only planning.

import OpenAI from 'openai';
import { z } from 'zod';
import { aiLogger as logger } from '../../utils/logger';
import { env } from '../../config/env';
import type { ProjectPlan } from './pipeline';

// =============================================================================
// SCHEMA
// =============================================================================

const projectPlanSchema = z.object({
  projectType: z.string(),
  description: z.string(),
  files: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    dependencies: z.array(z.string()),
  })),
  dependencies: z.array(z.string()),
  routes: z.array(z.string()).optional(),
});

// =============================================================================
// ARCHITECT
// =============================================================================

export class Architect {
  private client: OpenAI;
  private model: string;

  constructor(model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = model;
  }

  async createPlan(
    prompt: string,
    existingFiles: Array<{ file_path: string; content: string }>
  ): Promise<ProjectPlan> {
    const systemPrompt = `You are an expert software architect. Your job is to analyze user requirements and create a structured project plan.

You must output a JSON object with this structure:
{
  "projectType": "landing-page" | "dashboard" | "e-commerce" | "blog" | "app",
  "description": "Brief description of what will be built",
  "files": [
    {
      "path": "src/components/Hero.tsx",
      "purpose": "Hero section with headline and CTA",
      "dependencies": ["src/components/ui/button.tsx"]
    }
  ],
  "dependencies": ["package-name"],
  "routes": ["/", "/about", "/contact"]
}

Rules:
1. Use React + Vite + TypeScript + Tailwind CSS stack
2. Prefer shadcn/ui components (already installed)
3. Keep files small and focused (under 200 lines each)
4. Use proper component organization: pages, components, hooks, lib
5. Consider existing files and avoid conflicts
6. Plan for incremental builds - each file should be independently valid

Existing files in project:
${existingFiles.map(f => f.file_path).join('\n') || 'None (new project)'}`;

    const userPrompt = `Create a project plan for:

${prompt}

Output ONLY valid JSON, no markdown or explanation.`;

    logger.info({ model: this.model, promptLength: prompt.length }, 'Creating project plan');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse and validate
    const parsed = JSON.parse(content);
    const validated = projectPlanSchema.parse(parsed);

    logger.info({ 
      filesPlanned: validated.files.length,
      projectType: validated.projectType,
    }, 'Plan created successfully');

    return validated;
  }
}
