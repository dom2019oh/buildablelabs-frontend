// =============================================================================
// Coder Service - File Generation Phase
// =============================================================================
// Generates individual files based on the project plan.
// Has full context of existing files and the overall plan.

import OpenAI from 'openai';
import { aiLogger as logger } from '../../utils/logger';
import { env } from '../../config/env';
import type { ProjectPlan } from './pipeline';

// =============================================================================
// TYPES
// =============================================================================

interface FileSpec {
  path: string;
  purpose: string;
  dependencies: string[];
}

interface ExistingFile {
  file_path: string;
  content: string;
}

// =============================================================================
// CODER
// =============================================================================

export class Coder {
  private client: OpenAI;
  private model: string;

  constructor(model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = model;
  }

  async generateFile(
    fileSpec: FileSpec,
    plan: ProjectPlan,
    existingFiles: ExistingFile[],
    originalPrompt: string
  ): Promise<string> {
    // Build context from dependencies
    const dependencyContents = fileSpec.dependencies
      .map(dep => {
        const file = existingFiles.find(f => f.file_path === dep);
        if (file) {
          return `### ${dep}\n\`\`\`typescript\n${file.content}\n\`\`\``;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n\n');

    const systemPrompt = `You are an expert React/TypeScript developer. Generate clean, production-ready code.

Stack: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui

Rules:
1. Output ONLY the file content - no markdown, no explanation
2. Use TypeScript with proper types
3. Import shadcn components from @/components/ui/*
4. Use Tailwind for styling (semantic tokens: bg-background, text-foreground, etc.)
5. Keep components under 200 lines
6. Include helpful comments for complex logic
7. Handle loading/error states where appropriate
8. Make it production-ready

DO NOT include \`\`\`typescript or any markdown - output raw code only.`;

    const userPrompt = `Generate the file: ${fileSpec.path}

Purpose: ${fileSpec.purpose}

Original user request:
${originalPrompt}

Project plan context:
- Type: ${plan.projectType}
- Description: ${plan.description}
- Related files: ${plan.files.map(f => f.path).join(', ')}

${dependencyContents ? `Dependency files for context:\n\n${dependencyContents}` : ''}

Generate the complete file content now.`;

    logger.info({ 
      model: this.model, 
      file: fileSpec.path,
      dependencies: fileSpec.dependencies.length,
    }, 'Generating file');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent code
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`No response for file: ${fileSpec.path}`);
    }

    // Clean up any accidental markdown wrapping
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }

    logger.info({ 
      file: fileSpec.path,
      contentLength: cleanContent.length,
    }, 'File generated');

    return cleanContent;
  }
}
