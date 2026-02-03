// =============================================================================
// Validator Service - Code Validation & Auto-Fix (Grok + OpenAI)
// =============================================================================
// Validates generated code for errors and attempts automatic fixes.
// Uses Grok for validation with OpenAI fallback for complex reasoning.

import { aiLogger as logger } from '../../utils/logger';
import { getBuildableAI } from './buildable-ai';
import { TaskType } from './models';

// =============================================================================
// TYPES
// =============================================================================

interface ValidationFile {
  file_path: string;
  content: string;
}

interface ValidationError {
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

interface Repair {
  filePath: string;
  content: string;
  reason: string;
}

interface LegacyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  repairs: Repair[];
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
  tokensUsed: number;
  cost: number;
}

export interface FixResult {
  content: string;
  changesApplied: string[];
  tokensUsed: number;
  cost: number;
}

export interface BatchValidationResult {
  errors: Array<{ file: string; issues: string[] }>;
  repairs: Array<{ filePath: string; content: string }>;
  tokensUsed: number;
  cost: number;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

const ValidationRules = {
  typescript: [
    'Check for TypeScript syntax errors',
    'Verify all imports are valid and accessible',
    'Ensure proper type annotations',
    'Check for unused variables and imports',
    'Verify async/await usage is correct',
  ],
  react: [
    'Verify JSX syntax is valid',
    'Check hook rules (no conditionals around hooks)',
    'Ensure proper component naming (PascalCase)',
    'Verify key props in lists',
    'Check for proper event handler types',
  ],
  security: [
    'No hardcoded API keys or secrets',
    'No dangerouslySetInnerHTML without sanitization',
    'No eval() or Function() with user input',
    'Proper input validation',
    'No exposed sensitive endpoints',
  ],
  bestPractices: [
    'Components should be under 200 lines',
    'Proper error handling with try/catch',
    'Loading and error states handled',
    'Accessible components (ARIA labels where needed)',
    'Semantic HTML elements used appropriately',
  ],
};

// =============================================================================
// VALIDATOR CLASS
// =============================================================================

export class Validator {
  private ai = getBuildableAI();

  /**
   * Legacy validate method for backward compatibility
   */
  async validate(files: ValidationFile[]): Promise<LegacyValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const repairs: Repair[] = [];

    for (const file of files) {
      // Skip non-code files
      if (!this.isCodeFile(file.file_path)) continue;

      // Check for common issues
      const fileErrors = this.validateFileSync(file);
      errors.push(...fileErrors.filter(e => e.severity === 'error'));
      warnings.push(...fileErrors.filter(e => e.severity === 'warning'));

      // Check imports
      const importIssues = this.validateImports(file, files);
      errors.push(...importIssues);

      // Attempt repairs
      const repair = this.attemptRepair(file, fileErrors, files);
      if (repair) {
        repairs.push(repair);
      }
    }

    logger.info({
      totalFiles: files.length,
      errors: errors.length,
      warnings: warnings.length,
      repairs: repairs.length,
    }, 'Validation complete');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      repairs,
    };
  }

  /**
   * Validate a single file using AI
   */
  async validateFile(
    filePath: string,
    content: string,
    rules?: string[]
  ): Promise<ValidationResult> {
    const fileType = this.getFileType(filePath);
    const applicableRules = rules || this.getRulesForFileType(fileType);

    const systemPrompt = `You are a code validator. Analyze the code for errors, security issues, and best practices.

Validation rules to check:
${applicableRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return JSON:
{
  "valid": boolean,
  "issues": ["list of problems found"],
  "suggestions": ["list of improvements"]
}

Be thorough but practical. Minor style issues are suggestions, not issues.`;

    const userPrompt = `Validate this ${fileType} file: ${filePath}

\`\`\`
${content}
\`\`\``;

    logger.info({ file: filePath, fileType }, 'Validating file with AI');

    const response = await this.ai.execute({
      task: TaskType.VALIDATION,
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 2000,
      jsonMode: true,
    });

    const result = JSON.parse(response.content);

    logger.info({
      file: filePath,
      valid: result.valid,
      issueCount: result.issues?.length || 0,
    }, 'AI validation complete');

    return {
      valid: result.valid,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }

  /**
   * Validate all files using AI
   */
  async validateAll(
    files: Array<{ file_path: string; content: string }>
  ): Promise<BatchValidationResult> {
    let totalTokens = 0;
    let totalCost = 0;
    const errors: Array<{ file: string; issues: string[] }> = [];
    const repairs: Array<{ filePath: string; content: string }> = [];

    for (const file of files) {
      if (!this.isCodeFile(file.file_path)) continue;

      const result = await this.validateFile(file.file_path, file.content);
      totalTokens += result.tokensUsed;
      totalCost += result.cost;

      if (!result.valid && result.issues.length > 0) {
        errors.push({ file: file.file_path, issues: result.issues });

        // Attempt auto-fix
        const fixResult = await this.fix(file.file_path, file.content, result.issues);
        totalTokens += fixResult.tokensUsed;
        totalCost += fixResult.cost;

        repairs.push({ filePath: file.file_path, content: fixResult.content });
      }
    }

    return { errors, repairs, tokensUsed: totalTokens, cost: totalCost };
  }

  /**
   * Fix issues in a file using AI
   */
  async fix(
    filePath: string,
    content: string,
    issues: string[]
  ): Promise<FixResult> {
    const systemPrompt = `You are fixing code issues. Apply the minimum changes needed to resolve all issues.
Output ONLY the corrected file content - no explanations, no markdown.
Preserve all working code that doesn't need changes.`;

    const userPrompt = `File: ${filePath}

Issues to fix:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Current content:
\`\`\`
${content}
\`\`\`

Output the corrected file content.`;

    logger.info({ file: filePath, issueCount: issues.length }, 'Fixing issues with AI');

    const response = await this.ai.execute({
      task: TaskType.DEBUGGING,
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 8000,
    });

    // Clean up markdown if present
    let cleanContent = response.content.trim();
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    }

    logger.info({ file: filePath }, 'Issues fixed');

    return {
      content: cleanContent,
      changesApplied: issues,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }

  /**
   * Quick syntax check (faster, no AI)
   */
  async quickCheck(
    filePath: string,
    content: string
  ): Promise<{ valid: boolean; error?: string }> {
    const fileType = this.getFileType(filePath);

    try {
      if (fileType === 'typescript' || fileType === 'javascript') {
        if (content.includes('import') && !content.includes('from')) {
          return { valid: false, error: 'Incomplete import statement' };
        }
        if ((content.match(/{/g) || []).length !== (content.match(/}/g) || []).length) {
          return { valid: false, error: 'Mismatched braces' };
        }
        if ((content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length) {
          return { valid: false, error: 'Mismatched parentheses' };
        }
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===========================================================================
  // LEGACY SYNC METHODS (for backward compatibility)
  // ===========================================================================

  private isCodeFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx|css|json)$/.test(filePath);
  }

  private validateFileSync(file: ValidationFile): ValidationError[] {
    const errors: ValidationError[] = [];

    if (file.file_path.endsWith('.tsx') || file.file_path.endsWith('.ts')) {
      const openBrackets = (file.content.match(/{/g) || []).length;
      const closeBrackets = (file.content.match(/}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push({
          file: file.file_path,
          message: `Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`,
          severity: 'error',
        });
      }

      if (file.content.includes('console.log')) {
        errors.push({
          file: file.file_path,
          message: 'Contains console.log statements',
          severity: 'warning',
        });
      }

      if (file.content.includes(': any')) {
        errors.push({
          file: file.file_path,
          message: 'Contains explicit any type',
          severity: 'warning',
        });
      }

      if (file.file_path.includes('/components/') && !file.content.includes('export')) {
        errors.push({
          file: file.file_path,
          message: 'Component file has no exports',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  private validateImports(file: ValidationFile, allFiles: ValidationFile[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];

      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;

      if (importPath.startsWith('@/')) {
        const relativePath = importPath.replace('@/', 'src/');
        const exists = allFiles.some(f =>
          f.file_path === relativePath ||
          f.file_path === `${relativePath}.ts` ||
          f.file_path === `${relativePath}.tsx` ||
          f.file_path === `${relativePath}/index.ts` ||
          f.file_path === `${relativePath}/index.tsx`
        );

        if (!exists) {
          errors.push({
            file: file.file_path,
            message: `Import not found: ${importPath}`,
            severity: 'warning',
          });
        }
      }
    }

    return errors;
  }

  private attemptRepair(
    file: ValidationFile,
    errors: ValidationError[],
    allFiles: ValidationFile[]
  ): Repair | null {
    if (errors.length === 0) return null;

    let content = file.content;
    let repaired = false;
    const reasons: string[] = [];

    if (file.file_path.endsWith('.tsx') && !content.includes("from 'react'")) {
      content = `import React from 'react';\n${content}`;
      repaired = true;
      reasons.push('Added missing React import');
    }

    if (repaired) {
      return {
        filePath: file.file_path,
        content,
        reason: reasons.join('; '),
      };
    }

    return null;
  }

  private getFileType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript-react',
      js: 'javascript',
      jsx: 'javascript-react',
      css: 'css',
      scss: 'scss',
      vue: 'vue',
      svelte: 'svelte',
      py: 'python',
      dart: 'dart',
    };
    return typeMap[ext || ''] || 'text';
  }

  private getRulesForFileType(fileType: string): string[] {
    const rules: string[] = [...ValidationRules.security, ...ValidationRules.bestPractices];

    if (fileType.includes('typescript')) {
      rules.push(...ValidationRules.typescript);
    }

    if (fileType.includes('react') || fileType === 'tsx' || fileType === 'jsx') {
      rules.push(...ValidationRules.react);
    }

    return rules;
  }
}
