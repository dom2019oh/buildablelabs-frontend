// =============================================================================
// Validator Service - BEAST MODE Code Validation & Auto-Fix
// =============================================================================
// Ruthless code validation with local syntax checks + AI-powered review.
// Uses Grok for validation with OpenAI fallback for complex reasoning.

import { aiLogger as logger } from '../../utils/logger';
import { getBuildableAI } from './buildable-ai';
import { TaskType } from './models';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationError {
  type: 'syntax' | 'import' | 'jsx' | 'logic' | 'security' | 'react';
  message: string;
  file?: string;
  line?: number;
  severity: 'error' | 'warning' | 'critical';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number; // 0-100
  tokensUsed?: number;
  cost?: number;
}

export interface FixResult {
  content: string;
  changesApplied: string[];
  tokensUsed: number;
  cost: number;
}

// =============================================================================
// BEAST MODE LOCAL VALIDATION (Fast, no AI)
// =============================================================================

export function validateCodeLocally(code: string, filePath?: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Check for orphaned JSX expressions (common AI error)
  const orphanedJsxPatterns = [
    { pattern: /\{[^}]*&&\s*\(\s*$/m, msg: 'Orphaned JSX conditional - incomplete {condition && (' },
    { pattern: /\{\s*\w+\s*\?\s*\(\s*$/m, msg: 'Orphaned JSX ternary - incomplete {condition ? (' },
    { pattern: /return\s*\(\s*$/m, msg: 'Orphaned return statement - incomplete return (' },
    { pattern: /<\w+[^>]*>\s*$/m, msg: 'Unclosed JSX tag at end of file' },
  ];
  
  for (const { pattern, msg } of orphanedJsxPatterns) {
    if (pattern.test(code)) {
      errors.push({
        type: 'jsx',
        message: msg,
        file: filePath,
        severity: 'critical',
      });
    }
  }

  // 2. Check brace balance
  const braceBalance = checkBraceBalance(code);
  if (braceBalance.curly !== 0) {
    errors.push({
      type: 'syntax',
      message: `Unbalanced curly braces: ${braceBalance.curly > 0 ? 'missing ' + braceBalance.curly + ' closing' : 'extra ' + Math.abs(braceBalance.curly) + ' closing'} brace(s)`,
      file: filePath,
      severity: 'critical',
    });
  }
  if (braceBalance.paren !== 0) {
    errors.push({
      type: 'syntax',
      message: `Unbalanced parentheses: ${braceBalance.paren > 0 ? 'missing ' + braceBalance.paren + ' closing' : 'extra ' + Math.abs(braceBalance.paren) + ' closing'} paren(s)`,
      file: filePath,
      severity: 'critical',
    });
  }
  if (braceBalance.bracket !== 0) {
    errors.push({
      type: 'syntax',
      message: `Unbalanced brackets: ${braceBalance.bracket > 0 ? 'missing' : 'extra'} bracket(s)`,
      file: filePath,
      severity: 'error',
    });
  }
  if (braceBalance.angle !== 0 && filePath?.endsWith('.tsx')) {
    // Only check angle brackets in TSX files for JSX
    warnings.push({
      type: 'jsx',
      message: `Potentially unbalanced JSX tags`,
      file: filePath,
      severity: 'warning',
    });
  }

  // 3. Check for React-specific errors
  const reactErrors = checkReactPatterns(code, filePath);
  errors.push(...reactErrors.filter(e => e.severity !== 'warning'));
  warnings.push(...reactErrors.filter(e => e.severity === 'warning'));

  // 4. Check for incomplete code markers
  const incompleteMarkers = [
    { marker: '// TODO:', msg: 'Contains TODO marker' },
    { marker: '// FIXME:', msg: 'Contains FIXME marker' },
    { marker: '/* ... */', msg: 'Contains placeholder comment' },
    { marker: '// ...', msg: 'Contains ellipsis comment' },
    { marker: 'throw new Error("Not implemented")', msg: 'Contains unimplemented function' },
    { marker: '// Add more', msg: 'Contains incomplete implementation marker' },
  ];
  
  for (const { marker, msg } of incompleteMarkers) {
    if (code.includes(marker)) {
      warnings.push({
        type: 'logic',
        message: msg,
        file: filePath,
        severity: 'warning',
      });
    }
  }

  // 5. Check for missing imports
  const importErrors = checkMissingImports(code, filePath);
  errors.push(...importErrors);

  // 6. Security checks
  const securityErrors = checkSecurityIssues(code, filePath);
  errors.push(...securityErrors);

  // 7. Check for export
  if (filePath?.includes('/components/') || filePath?.includes('/pages/')) {
    if (!code.includes('export default') && !code.includes('export {') && !code.includes('export const')) {
      errors.push({
        type: 'syntax',
        message: 'Component/page file has no exports',
        file: filePath,
        severity: 'error',
      });
    }
  }

  // Calculate score
  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = warnings.length;
  
  let score = 100;
  score -= criticalCount * 30;
  score -= errorCount * 15;
  score -= warningCount * 3;
  score = Math.max(0, Math.min(100, score));

  return {
    valid: criticalCount === 0 && errorCount === 0,
    errors,
    warnings,
    score,
  };
}

function checkBraceBalance(code: string): { curly: number; paren: number; bracket: number; angle: number } {
  let curly = 0, paren = 0, bracket = 0, angle = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;
  let inJsx = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const next = code[i + 1];
    const prev = code[i - 1];
    
    // Handle line comments
    if (!inString && !inComment && char === '/' && next === '/') {
      inLineComment = true;
      continue;
    }
    if (inLineComment && char === '\n') {
      inLineComment = false;
      continue;
    }
    if (inLineComment) continue;
    
    // Handle block comments
    if (!inString && char === '/' && next === '*') {
      inComment = true;
      continue;
    }
    if (inComment && char === '*' && next === '/') {
      inComment = false;
      i++;
      continue;
    }
    if (inComment) continue;
    
    // Handle strings (skip template literal interpolations)
    if ((char === '"' || char === "'" || char === '`') && prev !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    if (inString) {
      // Handle template literal interpolations
      if (stringChar === '`' && char === '$' && next === '{') {
        // Count the brace
        i++;
        curly++;
      }
      continue;
    }
    
    // Count braces
    if (char === '{') curly++;
    if (char === '}') curly--;
    if (char === '(') paren++;
    if (char === ')') paren--;
    if (char === '[') bracket++;
    if (char === ']') bracket--;
    
    // JSX angle brackets (simplified)
    if (char === '<' && /[A-Za-z\/]/.test(next || '')) {
      angle++;
      inJsx = true;
    }
    if (char === '>' && inJsx) {
      angle--;
      if (prev === '/') angle--; // Self-closing
    }
    if (char === '/' && next === '>') {
      // Will be handled above
    }
  }
  
  return { curly, paren, bracket, angle };
}

function checkReactPatterns(code: string, filePath?: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for hooks outside component (basic check)
  const hookNames = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'useReducer'];
  for (const hook of hookNames) {
    if (code.includes(hook)) {
      // Check if hook is used but component function isn't defined
      const hasComponent = /(?:function|const)\s+[A-Z]\w*\s*(?:=\s*)?(?:\([^)]*\)|)\s*(?:=>|{)/g.test(code);
      if (!hasComponent && !filePath?.includes('/hooks/')) {
        errors.push({
          type: 'react',
          message: `React hook '${hook}' may be used outside a component`,
          file: filePath,
          severity: 'warning',
        });
        break;
      }
    }
  }
  
  // Check for missing key prop in maps
  const mapMatch = code.match(/\.map\s*\([^)]*\)\s*=>\s*(?:\(|)\s*<[A-Z]/g);
  if (mapMatch) {
    // Check if any mapped JSX has a key
    const hasKey = /\.map\s*\([^)]*\)[^{]*key\s*=/g.test(code);
    if (!hasKey) {
      errors.push({
        type: 'react',
        message: 'Mapped JSX elements may be missing key prop',
        file: filePath,
        severity: 'warning',
      });
    }
  }

  // Check for useState with complex initial value that should use lazy init
  if (/useState\(\s*\w+\s*\(\)/.test(code)) {
    errors.push({
      type: 'react',
      message: 'useState with function call - consider lazy initialization: useState(() => fn())',
      file: filePath,
      severity: 'warning',
    });
  }
  
  return errors;
}

function checkMissingImports(code: string, filePath?: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Common patterns that need imports
  const importChecks: Array<{ usage: RegExp; import: RegExp; name: string; from: string }> = [
    { usage: /\buseState\b/, import: /import.*\{[^}]*useState[^}]*\}.*from\s+['"]react['"]/, name: 'useState', from: 'react' },
    { usage: /\buseEffect\b/, import: /import.*\{[^}]*useEffect[^}]*\}.*from\s+['"]react['"]/, name: 'useEffect', from: 'react' },
    { usage: /\buseRef\b/, import: /import.*\{[^}]*useRef[^}]*\}.*from\s+['"]react['"]/, name: 'useRef', from: 'react' },
    { usage: /\buseMemo\b/, import: /import.*\{[^}]*useMemo[^}]*\}.*from\s+['"]react['"]/, name: 'useMemo', from: 'react' },
    { usage: /\buseCallback\b/, import: /import.*\{[^}]*useCallback[^}]*\}.*from\s+['"]react['"]/, name: 'useCallback', from: 'react' },
    { usage: /\bcn\s*\(/, import: /import.*\{[^}]*cn[^}]*\}.*from\s+['"]@\/lib\/utils['"]/, name: 'cn', from: '@/lib/utils' },
    { usage: /<Button\b/, import: /import.*Button.*from\s+['"]@\/components\/ui\/button['"]/, name: 'Button', from: '@/components/ui/button' },
    { usage: /<Input\b/, import: /import.*Input.*from\s+['"]@\/components\/ui\/input['"]/, name: 'Input', from: '@/components/ui/input' },
    { usage: /<Card\b/, import: /import.*Card.*from\s+['"]@\/components\/ui\/card['"]/, name: 'Card', from: '@/components/ui/card' },
  ];
  
  for (const check of importChecks) {
    if (check.usage.test(code) && !check.import.test(code)) {
      errors.push({
        type: 'import',
        message: `'${check.name}' is used but may not be imported from '${check.from}'`,
        file: filePath,
        severity: 'error',
      });
    }
  }
  
  return errors;
}

function checkSecurityIssues(code: string, filePath?: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Dangerous patterns
  const dangerous = [
    { pattern: /dangerouslySetInnerHTML/g, msg: 'Using dangerouslySetInnerHTML - XSS risk', severity: 'warning' as const },
    { pattern: /eval\s*\(/g, msg: 'Using eval() - security risk', severity: 'error' as const },
    { pattern: /innerHTML\s*=/g, msg: 'Direct innerHTML assignment - XSS risk', severity: 'warning' as const },
    { pattern: /document\.write/g, msg: 'Using document.write - security risk', severity: 'error' as const },
    { pattern: /new\s+Function\s*\(/g, msg: 'Using Function constructor - security risk', severity: 'error' as const },
  ];
  
  for (const { pattern, msg, severity } of dangerous) {
    if (pattern.test(code)) {
      errors.push({
        type: 'security',
        message: msg,
        file: filePath,
        severity,
      });
    }
  }
  
  // Exposed secrets (basic check)
  const secretPatterns = [
    /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']{20,}["']/i,
    /(?:secret|password)\s*[:=]\s*["'][^"']{8,}["']/i,
    /sk[-_](?:live|test)[-_][a-zA-Z0-9]{20,}/,
    /ghp_[a-zA-Z0-9]{36}/,
  ];
  
  for (const pattern of secretPatterns) {
    if (pattern.test(code)) {
      errors.push({
        type: 'security',
        message: 'Potential hardcoded secret/API key detected',
        file: filePath,
        severity: 'critical',
      });
      break;
    }
  }
  
  return errors;
}

// =============================================================================
// AI-POWERED VALIDATION (Thorough, uses AI)
// =============================================================================

const BEAST_VALIDATOR_PROMPT = `You are a RUTHLESS code validator. Your job is to find EVERY issue.

Check for:
1. SYNTAX ERRORS - Missing brackets, braces, semicolons, incomplete statements
2. LOGIC ERRORS - Incorrect conditionals, infinite loops, null access, race conditions
3. REACT ERRORS - Hook rules violations, missing keys, incorrect prop types, stale closures
4. IMPORT ERRORS - Missing imports, circular dependencies, incorrect paths
5. TYPESCRIPT ERRORS - Type mismatches, missing types, implicit any
6. SECURITY ISSUES - XSS, injection, exposed secrets, unsafe patterns
7. COMPLETENESS - Placeholder code, TODOs, incomplete implementations, mock data

Be extremely thorough. Missing even one error means broken production code.
Return your analysis as JSON.`;

export async function validateWithAI(
  code: string,
  filePath: string,
  context?: string
): Promise<ValidationResult> {
  try {
    const ai = getBuildableAI();
    
    const response = await ai.execute({
      task: TaskType.VALIDATION,
      systemPrompt: BEAST_VALIDATOR_PROMPT,
      userPrompt: `Validate this code thoroughly:

File: ${filePath}
\`\`\`typescript
${code}
\`\`\`

${context ? `Context: ${context}` : ''}

Return JSON:
{
  "valid": boolean,
  "errors": [{ "type": string, "message": string, "line": number, "severity": "error" | "critical" }],
  "warnings": [{ "type": string, "message": string, "severity": "warning" }],
  "score": number
}`,
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 2000,
    });
    
    const result = JSON.parse(response.content);
    
    return {
      valid: result.valid,
      errors: result.errors || [],
      warnings: result.warnings || [],
      score: result.score || (result.valid ? 100 : 50),
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  } catch (error) {
    logger.error({ error }, 'AI validation failed, falling back to local');
    return validateCodeLocally(code, filePath);
  }
}

// =============================================================================
// COMBINED VALIDATION
// =============================================================================

export async function validateCode(
  code: string,
  filePath: string,
  options?: {
    useAI?: boolean;
    context?: string;
  }
): Promise<ValidationResult> {
  const { useAI = false, context } = options || {};
  
  // Always run local validation first (fast)
  const localResult = validateCodeLocally(code, filePath);
  
  // If local validation found critical errors, return immediately
  if (localResult.errors.some(e => e.severity === 'critical')) {
    logger.warn({ filePath, criticalErrors: localResult.errors.filter(e => e.severity === 'critical') }, 'Critical errors found in local validation');
    return localResult;
  }
  
  // Optionally run AI validation for deeper analysis
  if (useAI) {
    try {
      const aiResult = await validateWithAI(code, filePath, context);
      
      // Merge results, preferring AI for non-syntax issues
      const mergedErrors = [
        ...localResult.errors,
        ...aiResult.errors.filter(e => !localResult.errors.some(le => le.message === e.message)),
      ];
      
      const mergedWarnings = [
        ...localResult.warnings,
        ...aiResult.warnings.filter(w => !localResult.warnings.some(lw => lw.message === w.message)),
      ];
      
      return {
        valid: mergedErrors.filter(e => e.severity !== 'warning').length === 0,
        errors: mergedErrors,
        warnings: mergedWarnings,
        score: Math.min(localResult.score, aiResult.score),
        tokensUsed: aiResult.tokensUsed,
        cost: aiResult.cost,
      };
    } catch (error) {
      logger.warn({ error }, 'AI validation failed, using local only');
    }
  }
  
  return localResult;
}

// =============================================================================
// VALIDATOR CLASS (For pipeline integration)
// =============================================================================

export class Validator {
  private ai = getBuildableAI();

  async validateFile(filePath: string, content: string): Promise<ValidationResult> {
    return validateCode(content, filePath, { useAI: true });
  }

  async fix(filePath: string, content: string, issues: string[]): Promise<FixResult> {
    const systemPrompt = `You are fixing code issues. Apply the minimum changes needed to resolve all issues.
Output ONLY the corrected file content - no explanations, no markdown code fences.
Preserve all working code that doesn't need changes.`;

    const userPrompt = `File: ${filePath}

Issues to fix:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Current content:
\`\`\`
${content}
\`\`\`

Output the corrected file content (no markdown, just code).`;

    logger.info({ file: filePath, issueCount: issues.length }, 'Fixing issues with AI');

    const response = await this.ai.execute({
      task: TaskType.REPAIR,
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

  async quickCheck(filePath: string, content: string): Promise<{ valid: boolean; error?: string }> {
    const result = validateCodeLocally(content, filePath);
    if (!result.valid) {
      const criticalError = result.errors.find(e => e.severity === 'critical');
      return { valid: false, error: criticalError?.message || result.errors[0]?.message };
    }
    return { valid: true };
  }
}
