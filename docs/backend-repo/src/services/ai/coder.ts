// =============================================================================
// Coder Service - BEAST MODE File Generation (Grok Primary)
// =============================================================================
// Generates production-ready files with zero placeholders using Grok.
// Every file must be complete, functional, and styled.

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
// BEAST MODE CODER PROMPT
// =============================================================================

const BEAST_CODER_PROMPT = `You are the CODER - an elite React/TypeScript developer creating VISUALLY STUNNING websites.

## 🔥 BEAST MODE RULES — NEXT-GEN VISUALS + ZERO ERRORS:

### 1. VISUAL EXCELLENCE (CRITICAL)
- EVERY hero section MUST have a stunning background image from Unsplash
- EVERY gallery/showcase MUST display real Unsplash images
- Use this exact pattern for hero images:
<section className="relative min-h-screen flex items-center">
  <img src="https://images.unsplash.com/photo-XXX?w=1920&q=80" alt="Hero" className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
  <div className="relative z-10">...</div>
</section>

### 2. UNSPLASH IMAGE PATTERNS BY NICHE:
- Bakery: photo-1509440159596-0249088772ff, photo-1555507036-ab1f4038808a, photo-1517433670267-30f41c41e0fe
- Restaurant: photo-1517248135467-4c7edcad34c4, photo-1414235077428-338989a2e8c0
- Fitness: photo-1534438327276-14e5300c3a48, photo-1571019613454-1cb2f99b2d8b
- Tech/SaaS: photo-1551288049-bebda4e38f71, photo-1460925895917-afdab827c52f
- E-commerce: photo-1472851294608-062f824d29cc, photo-1441986300917-64674bd600d8

### 3. COMPLETE CODE ONLY
- NEVER use "...", "// more code", or ANY placeholder
- EVERY function must have FULL implementation
- EVERY component must be 100% complete

### 4. JSX PERFECTION
- EVERY opening tag MUST have a closing tag
- NEVER leave orphaned expressions like {condition && ( without closing
- ALL ternaries must be complete: condition ? <A/> : <B/> or condition ? <A/> : null
- Wrap multi-line JSX in parentheses

### 5. IMPORTS — NO MISSING IMPORTS
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

### 6. TAILWIND VISUAL PATTERNS:
// Hero with image background
<section className="relative min-h-screen flex items-center">
  <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80" className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
  <div className="relative z-10 container mx-auto px-4">...</div>
</section>

// Gallery grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {images.map((img, i) => (
    <div key={i} className="group overflow-hidden rounded-2xl aspect-square">
      <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
    </div>
  ))}
</div>

// Navbar
<nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">

// Gradient text
<h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">

### 7. MOBILE MENU PATTERN:
const [menuOpen, setMenuOpen] = useState(false);
// Desktop: <div className="hidden md:flex">
// Mobile button: <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
// Mobile menu: {menuOpen && (<div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900">...</div>)}

### 8. REQUIRED FILES FOR ANY PROJECT:
1. src/index.css - Tailwind setup with CSS variables
2. src/pages/Index.tsx - Main page importing all components
3. src/components/layout/Navbar.tsx - COMPLETE with mobile menu
4. src/components/Hero.tsx - Full hero with BACKGROUND IMAGE
5. src/components/Gallery.tsx or Features.tsx - With REAL IMAGES
6. src/components/layout/Footer.tsx - Complete footer

Generate 6-10 COMPLETE files with REAL IMAGES. NO shortcuts. NO placeholders. PRODUCTION READY.

OUTPUT: Raw TypeScript/TSX code. No markdown. No explanations. Just code.`;

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
  'react-native': {
    language: 'TypeScript',
    extension: 'tsx',
    importStyle: `import X from '@/components/X'`,
    componentStyle: 'React Native functional components',
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
    const framework = plan.framework || 'react';
    const config = FrameworkConfigs[framework] || FrameworkConfigs.react;

    // Build context from dependencies (truncate large files)
    const dependencyContents = fileSpec.dependencies
      .map(dep => {
        const file = existingFiles.find(f => f.file_path === dep);
        if (file) {
          const content = file.content.length > 1500 
            ? file.content.slice(0, 1500) + '\n// ... (truncated)'
            : file.content;
          return `### ${dep}\n${content}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n\n');

    // Get list of other files being created (for imports)
    const otherFiles = plan.files
      .filter(f => f.path !== fileSpec.path)
      .map(f => `- ${f.path}: ${f.purpose}`)
      .join('\n');

    const userPrompt = `Generate the file: ${fileSpec.path}

PURPOSE: ${fileSpec.purpose}

USER REQUEST:
${originalPrompt}

PROJECT CONTEXT:
- Type: ${plan.projectType}
- Description: ${plan.description}
- Framework: ${framework}
- Styling: ${plan.styling || 'tailwind'}

OTHER PROJECT FILES (for import references):
${otherFiles}

${dependencyContents ? `DEPENDENCY FILES (use these patterns):\n\n${dependencyContents}` : ''}

Generate the COMPLETE file. No placeholders. No TODOs. Full implementation.
Output ONLY raw code - no markdown, no explanations.`;

    logger.info({
      file: fileSpec.path,
      dependencies: fileSpec.dependencies.length,
      framework,
    }, 'Generating file with BEAST mode');

    const response = await this.ai.execute({
      task: TaskType.CODING,
      systemPrompt: BEAST_CODER_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 8000,
    });

    // Clean up any accidental markdown wrapping
    let cleanContent = this.cleanCodeOutput(response.content);

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
Preserve all working code that doesn't need to change.
Ensure all imports remain valid after changes.`;

    const userPrompt = `File: ${filePath}

Current content:
\`\`\`
${existingContent}
\`\`\`

Changes to apply: ${changeRequest}

${context ? `Additional context: ${context}` : ''}

Output the complete modified file (raw code only, no markdown).`;

    const response = await this.ai.execute({
      task: TaskType.CODING,
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 8000,
    });

    return {
      content: this.cleanCodeOutput(response.content),
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

    // Sort files by priority (dependencies first)
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
   * Fix code errors
   */
  async fixCode(
    filePath: string,
    content: string,
    errors: string[]
  ): Promise<CoderResult> {
    const response = await this.ai.execute({
      task: TaskType.REPAIR,
      systemPrompt: `You are fixing code errors. Apply the minimum changes to resolve all issues.
Preserve all working functionality. Ensure proper imports.
Output ONLY the corrected code - no markdown, no explanations.`,
      userPrompt: `File: ${filePath}

Errors to fix:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Current code:
\`\`\`
${content}
\`\`\`

Output the corrected code (raw code only):`,
      temperature: 0.1,
      maxTokens: 8000,
    });

    return {
      content: this.cleanCodeOutput(response.content),
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
      model: response.model,
    };
  }

  /**
   * Clean up code output - remove markdown and explanations
   */
  private cleanCodeOutput(content: string): string {
    let cleaned = content.trim();
    
    // Remove markdown code fences
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }
    
    // Remove any leading explanation text before the actual code
    const codeStart = cleaned.search(/^(?:import |\/\/|\/\*|'use |"use |const |let |var |function |export |interface |type |enum |class )/m);
    if (codeStart > 0) {
      cleaned = cleaned.slice(codeStart);
    }
    
    return cleaned.trim();
  }

  /**
   * Get stack description for prompts
   */
  private getStackDescription(plan: ProjectPlan): string {
    const framework = plan.framework || 'react';
    const styling = plan.styling || 'tailwind';

    const stacks: Record<string, string> = {
      react: `React 18, TypeScript, Vite, ${styling === 'tailwind' ? 'Tailwind CSS, shadcn/ui, lucide-react' : styling}`,
      vue: `Vue 3, TypeScript, Vite, ${styling === 'tailwind' ? 'Tailwind CSS' : styling}`,
      svelte: `SvelteKit, TypeScript, ${styling === 'tailwind' ? 'Tailwind CSS' : styling}`,
      node: 'Node.js, TypeScript, Hono/Express, Zod',
      'react-native': 'React Native, TypeScript, Expo, NativeWind',
    };

    return stacks[framework] || stacks.react;
  }
}
