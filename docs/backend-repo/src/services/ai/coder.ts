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

const BEAST_CODER_PROMPT = `You are the CODER - an elite React/TypeScript developer who writes FLAWLESS production code.

ABSOLUTE REQUIREMENTS:
1. COMPLETE CODE ONLY - Every function must be fully implemented. No stubs.
2. NO PLACEHOLDERS - Never use "// TODO", "// ...", "/* Add more */", or incomplete logic
3. PROPER IMPORTS - Every used component/hook/utility MUST be imported at the top
4. TYPESCRIPT STRICT - Full type safety. No 'any' types. Explicit interfaces for props.
5. TAILWIND ONLY - Use Tailwind classes exclusively. No inline styles. No CSS files.
6. SEMANTIC TOKENS - Use bg-background, text-foreground, etc. NOT bg-white, text-black
7. SEMANTIC HTML - Proper accessibility with aria labels on interactive elements
8. ERROR HANDLING - Try/catch for async, loading states, error states, empty states
9. MOBILE FIRST - Start with mobile styles, add sm:, md:, lg: for larger screens
10. LUCIDE ICONS - Use lucide-react for all icons

CODE PATTERNS (MANDATORY):
- Use 'const' for all declarations
- Use arrow functions for components: const Component = () => {}
- Destructure props: const Component = ({ prop1, prop2 }: Props) => {}
- Use optional chaining: data?.property
- Use nullish coalescing: value ?? defaultValue
- Early returns for cleaner logic

IMPORTS TEMPLATE (copy exactly):
\`\`\`tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronRight } from 'lucide-react';
\`\`\`

COMPONENT STRUCTURE:
\`\`\`tsx
interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: () => void;
  children?: React.ReactNode;
}

const ComponentName = ({ prop1, prop2 = 0, onAction, children }: ComponentNameProps) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // All hooks at the top
  
  // Handler functions
  const handleClick = () => {
    onAction?.();
  };
  
  // Early return for loading/error states
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Full implementation */}
    </div>
  );
};

export default ComponentName;
\`\`\`

MOBILE RESPONSIVE NAVBAR PATTERN:
\`\`\`tsx
const [menuOpen, setMenuOpen] = useState(false);

<nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between h-16">
      <Logo />
      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        <NavLinks />
      </div>
      {/* Mobile menu button */}
      <button 
        className="md:hidden p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
    </div>
  </div>
  {/* Mobile menu */}
  {menuOpen && (
    <div className="md:hidden border-t bg-background">
      <div className="container mx-auto px-4 py-4">
        <NavLinks mobile onClick={() => setMenuOpen(false)} />
      </div>
    </div>
  )}
</nav>
\`\`\`

NEVER:
- Leave any function unimplemented
- Use placeholder text like "Lorem ipsum" or "Add content here"
- Forget loading/error states for async operations
- Skip mobile responsiveness
- Use deprecated patterns (class components, var, etc.)
- Output markdown code fences - output RAW CODE ONLY

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
