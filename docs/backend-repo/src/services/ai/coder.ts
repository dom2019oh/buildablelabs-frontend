// =============================================================================
// Coder Service - File Generation Phase (Grok Primary)
// =============================================================================
// Generates individual files based on the project plan using Buildable AI.
// Uses Grok for primary code generation with OpenAI fallback.

import { aiLogger as logger } from '../../utils/logger';
import { getBuildableAI, type BuildableAIResponse } from './buildable-ai';
import { TaskType } from './models';
import type { ProjectPlan } from './pipeline';

// =============================================================================
// TYPES
// =============================================================================

interface FileSpec {
  path: string;
  purpose: string;
  dependencies: string[];
  priority?: number;
}

interface ExistingFile {
  file_path: string;
  content: string;
}

export interface CoderResult {
  content: string;
  tokensUsed: number;
  cost: number;
  model: string;
}

// =============================================================================
// FRAMEWORK CONFIGS
// =============================================================================

const FrameworkConfigs: Record<string, {
  language: string;
  extension: string;
  importStyle: string;
  componentStyle: string;
}> = {
  react: {
    language: 'TypeScript',
    extension: 'tsx',
    importStyle: `import X from '@/components/X'`,
    componentStyle: 'functional components with hooks',
  },
  vue: {
    language: 'TypeScript',
    extension: 'vue',
    importStyle: `import X from '@/components/X.vue'`,
    componentStyle: 'Composition API with <script setup>',
  },
  svelte: {
    language: 'TypeScript',
    extension: 'svelte',
    importStyle: `import X from '$lib/components/X.svelte'`,
    componentStyle: 'Svelte components with TypeScript',
  },
  node: {
    language: 'TypeScript',
    extension: 'ts',
    importStyle: `import { x } from './module'`,
    componentStyle: 'ES modules with async/await',
  },
  django: {
    language: 'Python',
    extension: 'py',
    importStyle: `from app.models import X`,
    componentStyle: 'Django class-based views',
  },
  'react-native': {
    language: 'TypeScript',
    extension: 'tsx',
    importStyle: `import X from '@/components/X'`,
    componentStyle: 'React Native functional components',
  },
  flutter: {
    language: 'Dart',
    extension: 'dart',
    importStyle: `import 'package:app/widgets/x.dart'`,
    componentStyle: 'Flutter StatelessWidget/StatefulWidget',
  },
};

// =============================================================================
// CODER CLASS
// =============================================================================

export class Coder {
  private ai = getBuildableAI();

  /**
   * Generate a single file based on the plan and context
   * Uses Grok (via Buildable AI) for code generation tasks
   */
  async generateFile(
    fileSpec: FileSpec,
    plan: ProjectPlan,
    existingFiles: ExistingFile[],
    originalPrompt: string
  ): Promise<CoderResult> {
    // Determine framework config
    const framework = plan.framework || 'react';
    const config = FrameworkConfigs[framework] || FrameworkConfigs.react;

    // Build context from dependencies
    const dependencyContents = fileSpec.dependencies
      .map(dep => {
        const file = existingFiles.find(f => f.file_path === dep);
        if (file) {
          // Truncate large files
          const content = file.content.length > 2000 
            ? file.content.slice(0, 2000) + '\n// ... truncated'
            : file.content;
          return `### ${dep}\n\`\`\`${config.language.toLowerCase()}\n${content}\n\`\`\``;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n\n');

    const systemPrompt = `You are an expert ${config.language} developer specializing in ${framework}.
Generate clean, production-ready code.

Stack: ${this.getStackDescription(plan)}

Rules:
1. Output ONLY the file content - no markdown, no explanation, no code fences
2. Use ${config.language} with proper types
3. Use ${config.importStyle} for imports
4. Use ${config.componentStyle}
5. Keep components under 200 lines
6. Include helpful comments for complex logic
7. Handle loading/error states where appropriate
8. Make it production-ready with proper error handling
9. Use semantic tokens for colors (bg-background, text-foreground, etc.)
10. Follow best practices for ${framework}

DO NOT include \`\`\`${config.language.toLowerCase()} or any markdown - output raw code only.`;

    const userPrompt = `Generate the file: ${fileSpec.path}

Purpose: ${fileSpec.purpose}

Original user request:
${originalPrompt}

Project plan context:
- Type: ${plan.projectType}
- Description: ${plan.description}
- Framework: ${framework}
- Styling: ${plan.styling || 'tailwind'}
- Related files: ${plan.files.map(f => f.path).join(', ')}

${dependencyContents ? `Dependency files for context:\n\n${dependencyContents}` : ''}

Generate the complete file content now.`;

    logger.info({
      file: fileSpec.path,
      dependencies: fileSpec.dependencies.length,
      framework,
    }, 'Generating file');

    const response = await this.ai.execute({
      task: TaskType.CODING,
      systemPrompt,
      userPrompt,
      temperature: 0.2, // Lower temperature for consistent code
      maxTokens: 8000,
    });

    // Clean up any accidental markdown wrapping
    let cleanContent = response.content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }

    logger.info({
      file: fileSpec.path,
      contentLength: cleanContent.length,
      provider: response.provider,
      model: response.model,
    }, 'File generated');

    return {
      content: cleanContent,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
      model: response.model,
    };
  }

  /**
   * Generate a diff/patch for an existing file
   */
  async generateDiff(
    filePath: string,
    existingContent: string,
    changeRequest: string,
    context?: string
  ): Promise<CoderResult> {
    const systemPrompt = `You are modifying an existing file. Apply the requested changes precisely.
Output ONLY the complete modified file content - no explanations, no markdown.
Preserve all working code that doesn't need to change.`;

    const userPrompt = `File: ${filePath}

Current content:
\`\`\`
${existingContent}
\`\`\`

Changes to apply: ${changeRequest}

${context ? `Additional context: ${context}` : ''}

Output the complete modified file content.`;

    const response = await this.ai.execute({
      task: TaskType.CODING,
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 8000,
    });

    let cleanContent = response.content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }

    return {
      content: cleanContent,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
      model: response.model,
    };
  }

  /**
   * Generate multiple related files in batch
   */
  async generateBatch(
    files: FileSpec[],
    plan: ProjectPlan,
    existingFiles: ExistingFile[],
    originalPrompt: string
  ): Promise<Map<string, CoderResult>> {
    const results = new Map<string, CoderResult>();

    // Generate files in dependency order
    const sortedFiles = [...files].sort((a, b) => 
      (a.priority ?? 99) - (b.priority ?? 99)
    );

    for (const fileSpec of sortedFiles) {
      const result = await this.generateFile(
        fileSpec,
        plan,
        existingFiles,
        originalPrompt
      );

      results.set(fileSpec.path, result);

      // Add to existing files for context in subsequent generations
      existingFiles.push({
        file_path: fileSpec.path,
        content: result.content,
      });
    }

    return results;
  }

  /**
   * Get stack description for prompts
   */
  private getStackDescription(plan: ProjectPlan): string {
    const framework = plan.framework || 'react';
    const styling = plan.styling || 'tailwind';

    const stacks: Record<string, string> = {
      react: `React 18, TypeScript, Vite, ${styling === 'tailwind' ? 'Tailwind CSS, shadcn/ui' : styling}`,
      vue: `Vue 3, TypeScript, Vite, ${styling === 'tailwind' ? 'Tailwind CSS' : styling}`,
      svelte: `SvelteKit, TypeScript, ${styling === 'tailwind' ? 'Tailwind CSS' : styling}`,
      node: 'Node.js, TypeScript, Hono/Express, Zod',
      django: 'Django 5, Python 3.12, Django REST Framework',
      'react-native': 'React Native, TypeScript, Expo, NativeWind',
      flutter: 'Flutter 3, Dart, Material Design 3',
    };

    return stacks[framework] || stacks.react;
  }
}
