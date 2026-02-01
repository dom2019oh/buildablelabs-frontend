// =============================================================================
// Validator Service - Validation & Repair Phase
// =============================================================================
// Validates generated code and attempts auto-repair of common issues.

import { aiLogger as logger } from '../../utils/logger';

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

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  repairs: Repair[];
}

// =============================================================================
// VALIDATOR
// =============================================================================

export class Validator {
  async validate(files: ValidationFile[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const repairs: Repair[] = [];

    for (const file of files) {
      // Skip non-code files
      if (!this.isCodeFile(file.file_path)) continue;

      // Check for common issues
      const fileErrors = this.validateFile(file);
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

  private isCodeFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx|css|json)$/.test(filePath);
  }

  private validateFile(file: ValidationFile): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for basic syntax issues
    if (file.file_path.endsWith('.tsx') || file.file_path.endsWith('.ts')) {
      // Check for unmatched brackets
      const openBrackets = (file.content.match(/{/g) || []).length;
      const closeBrackets = (file.content.match(/}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push({
          file: file.file_path,
          message: `Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`,
          severity: 'error',
        });
      }

      // Check for console.log (warning)
      if (file.content.includes('console.log')) {
        errors.push({
          file: file.file_path,
          message: 'Contains console.log statements',
          severity: 'warning',
        });
      }

      // Check for 'any' type (warning)
      if (file.content.includes(': any')) {
        errors.push({
          file: file.file_path,
          message: 'Contains explicit any type',
          severity: 'warning',
        });
      }

      // Check for missing export
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
      
      // Skip node_modules imports
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
      
      // Check if local import exists
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
            severity: 'warning', // Warning since it might be external
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

    // Add missing React import for TSX files
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
}
