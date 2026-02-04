// =============================================================================
// VALIDATION - Code validation, error classification, and quality scoring
// =============================================================================

import type { 
  FileOperation, 
  ValidationResult, 
  ValidationError, 
  ErrorCategory 
} from "./types.ts";

// =============================================================================
// ERROR PATTERNS
// =============================================================================

interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
  message: string;
  fix: string;
  severity: "error" | "warning";
  autoFixable: boolean;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // SYNTAX errors
  {
    pattern: /\{[a-zA-Z]+\s*&&\s*\(\s*$/gm,
    category: "SYNTAX",
    message: "Orphaned JSX expression: `{condition && (` without closing `)}`",
    fix: "Complete the conditional rendering with proper closing tags",
    severity: "error",
    autoFixable: false,
  },
  {
    pattern: /\{[a-zA-Z]+\s*&&\s*\([^)]*$/gm,
    category: "SYNTAX",
    message: "Unclosed conditional JSX block",
    fix: "Add closing parenthesis and brace: `)}`",
    severity: "error",
    autoFixable: false,
  },
  
  // IMPORT errors
  {
    pattern: /from\s+['"][^'"]+['"]\s*$/gm,
    category: "IMPORT",
    message: "Possible incomplete import statement",
    fix: "Ensure import statement is complete with semicolon",
    severity: "warning",
    autoFixable: true,
  },
  
  // REACT errors
  {
    pattern: /^(?!.*import.*from\s+['"]react['"]).*\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer)\b/gm,
    category: "REACT",
    message: "React hooks used but may not be imported from 'react'",
    fix: "Add: import { useState, useEffect } from 'react';",
    severity: "error",
    autoFixable: true,
  },
  
  // STRUCTURE errors
  {
    pattern: /\/\/\s*\.\.\./gm,
    category: "STRUCTURE",
    message: "Placeholder comment found - incomplete code",
    fix: "Replace placeholder with actual implementation",
    severity: "error",
    autoFixable: false,
  },
  {
    pattern: /\/\/\s*rest of/gmi,
    category: "STRUCTURE",
    message: "Placeholder comment found - incomplete code",
    fix: "Replace placeholder with actual implementation",
    severity: "error",
    autoFixable: false,
  },
  {
    pattern: /\/\/\s*more code/gmi,
    category: "STRUCTURE",
    message: "Placeholder comment found - incomplete code",
    fix: "Replace placeholder with actual implementation",
    severity: "error",
    autoFixable: false,
  },
  {
    pattern: /\/\/\s*TODO/gm,
    category: "STRUCTURE",
    message: "TODO comment found - incomplete implementation",
    fix: "Complete the TODO item or remove the comment",
    severity: "warning",
    autoFixable: false,
  },
];

// =============================================================================
// BALANCE CHECKING
// =============================================================================

interface BalanceResult {
  balanced: boolean;
  open: number;
  close: number;
  diff: number;
}

function checkBalance(content: string, openChar: string, closeChar: string): BalanceResult {
  const openRegex = new RegExp(`\\${openChar}`, "g");
  const closeRegex = new RegExp(`\\${closeChar}`, "g");
  const open = (content.match(openRegex) || []).length;
  const close = (content.match(closeRegex) || []).length;
  
  return {
    balanced: open === close,
    open,
    close,
    diff: open - close,
  };
}

// =============================================================================
// IMPORT VALIDATION
// =============================================================================

interface ImportAnalysis {
  hasReactImport: boolean;
  usesHooks: boolean;
  missingHookImports: string[];
  usesRouter: boolean;
  hasRouterImport: boolean;
  usesIcons: string[];
  hasIconImport: boolean;
}

const REACT_HOOKS = [
  "useState", "useEffect", "useRef", "useMemo", 
  "useCallback", "useContext", "useReducer", "useLayoutEffect"
];

const COMMON_ICONS = [
  "Menu", "X", "ArrowRight", "ArrowLeft", "Check", "ChevronDown",
  "ChevronUp", "Plus", "Minus", "Star", "Heart", "Search", "Home",
  "Settings", "User", "Mail", "Phone", "Calendar", "Clock", "Edit",
  "Trash", "Download", "Upload", "Share", "Copy", "Eye", "EyeOff",
  "Lock", "Unlock", "Bell", "Sun", "Moon", "Sparkles", "Zap", "Shield",
  "Globe", "Layers", "Code", "Palette", "Send", "MessageCircle"
];

function analyzeImports(content: string): ImportAnalysis {
  const usedHooks: string[] = [];
  const usedIcons: string[] = [];

  // Check for hook usage
  for (const hook of REACT_HOOKS) {
    const hookRegex = new RegExp(`\\b${hook}\\s*\\(`, "g");
    if (hookRegex.test(content)) {
      usedHooks.push(hook);
    }
  }

  // Check for React import with hooks
  const reactImportMatch = content.match(/import\s+.*\{([^}]*)\}.*from\s+['"]react['"]/);
  const importedHooks = reactImportMatch 
    ? reactImportMatch[1].split(",").map(h => h.trim())
    : [];

  const missingHookImports = usedHooks.filter(h => !importedHooks.includes(h));

  // Check for icon usage
  for (const icon of COMMON_ICONS) {
    const iconRegex = new RegExp(`<${icon}[\\s/>]`, "g");
    if (iconRegex.test(content)) {
      usedIcons.push(icon);
    }
  }

  // Check for lucide-react import
  const hasIconImport = /import\s+.*from\s+['"]lucide-react['"]/.test(content);

  // Check for router usage
  const usesRouter = /\b(Link|useNavigate|useParams|useLocation|useSearchParams)\b/.test(content);
  const hasRouterImport = /import\s+.*from\s+['"]react-router-dom['"]/.test(content);

  return {
    hasReactImport: /import\s+.*from\s+['"]react['"]/.test(content),
    usesHooks: usedHooks.length > 0,
    missingHookImports,
    usesRouter,
    hasRouterImport,
    usesIcons: usedIcons,
    hasIconImport,
  };
}

// =============================================================================
// LOCAL VALIDATOR
// =============================================================================

export function validateCodeLocally(files: FileOperation[]): ValidationResult {
  const criticalErrors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let totalScore = 0;
  let fileCount = 0;

  for (const file of files) {
    if (!file.path.endsWith(".tsx") && !file.path.endsWith(".ts") && !file.path.endsWith(".jsx") && !file.path.endsWith(".js")) {
      // Only validate code files in detail
      if (file.path.endsWith(".css")) {
        // Basic CSS validation
        const braces = checkBalance(file.content, "{", "}");
        if (!braces.balanced) {
          criticalErrors.push({
            category: "SYNTAX",
            file: file.path,
            message: `Unbalanced braces: ${braces.open} open, ${braces.close} close`,
            fix: "Check for missing opening or closing braces",
            severity: "error",
            autoFixable: false,
          });
        }
      }
      continue;
    }

    fileCount++;
    let fileScore = 1.0;
    const content = file.content;
    const path = file.path;

    // Check error patterns
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(content)) {
        const error: ValidationError = {
          category: pattern.category,
          file: path,
          message: pattern.message,
          fix: pattern.fix,
          severity: pattern.severity,
          autoFixable: pattern.autoFixable,
        };

        if (pattern.severity === "error") {
          criticalErrors.push(error);
          fileScore -= 0.2;
        } else {
          warnings.push(error);
          fileScore -= 0.05;
        }
      }
      // Reset lastIndex for global regexes
      pattern.pattern.lastIndex = 0;
    }

    // Check brace balance
    const braces = checkBalance(content, "{", "}");
    if (!braces.balanced) {
      criticalErrors.push({
        category: "SYNTAX",
        file: path,
        message: `Unbalanced braces: ${braces.open} open, ${braces.close} close`,
        fix: "Check for missing opening or closing braces",
        severity: "error",
        autoFixable: false,
      });
      fileScore -= 0.3;
    }

    // Check parenthesis balance
    const parens = checkBalance(content, "(", ")");
    if (!parens.balanced) {
      criticalErrors.push({
        category: "SYNTAX",
        file: path,
        message: `Unbalanced parentheses: ${parens.open} open, ${parens.close} close`,
        fix: "Check for missing opening or closing parentheses",
        severity: "error",
        autoFixable: false,
      });
      fileScore -= 0.3;
    }

    // Check bracket balance (for JSX)
    const brackets = checkBalance(content, "<", ">");
    // Only check for severe imbalance in TSX files
    if (path.endsWith(".tsx") && Math.abs(brackets.diff) > 5) {
      warnings.push({
        category: "SYNTAX",
        file: path,
        message: `Possible unbalanced JSX tags: ${brackets.diff} more ${brackets.diff > 0 ? "opening" : "closing"} brackets`,
        fix: "Check for unclosed JSX tags",
        severity: "warning",
        autoFixable: false,
      });
      fileScore -= 0.1;
    }

    // Check imports
    const imports = analyzeImports(content);
    
    if (imports.usesHooks && imports.missingHookImports.length > 0) {
      criticalErrors.push({
        category: "IMPORT",
        file: path,
        message: `Missing React hook imports: ${imports.missingHookImports.join(", ")}`,
        fix: `Add: import { ${imports.missingHookImports.join(", ")} } from 'react';`,
        severity: "error",
        autoFixable: true,
      });
      fileScore -= 0.2;
    }

    if (imports.usesRouter && !imports.hasRouterImport) {
      warnings.push({
        category: "IMPORT",
        file: path,
        message: "Router components used but react-router-dom not imported",
        fix: "Add: import { Link, useNavigate } from 'react-router-dom';",
        severity: "warning",
        autoFixable: true,
      });
      fileScore -= 0.05;
    }

    if (imports.usesIcons.length > 0 && !imports.hasIconImport) {
      warnings.push({
        category: "IMPORT",
        file: path,
        message: `Lucide icons used (${imports.usesIcons.slice(0, 3).join(", ")}${imports.usesIcons.length > 3 ? "..." : ""}) but not imported`,
        fix: `Add: import { ${imports.usesIcons.join(", ")} } from 'lucide-react';`,
        severity: "warning",
        autoFixable: true,
      });
      fileScore -= 0.05;
    }

    // Check for empty components
    if (/export\s+(default\s+)?function\s+\w+[^{]*\{\s*return\s*null\s*;?\s*\}/.test(content)) {
      warnings.push({
        category: "STRUCTURE",
        file: path,
        message: "Component returns null - possibly incomplete",
        fix: "Implement component rendering logic",
        severity: "warning",
        autoFixable: false,
      });
      fileScore -= 0.1;
    }

    totalScore += Math.max(0, fileScore);
  }

  const averageScore = fileCount > 0 ? totalScore / fileCount : 1.0;

  // Generate suggestions based on errors
  const suggestions: string[] = [];
  
  const importErrors = criticalErrors.filter(e => e.category === "IMPORT");
  if (importErrors.length > 0) {
    suggestions.push("Review import statements at the top of files");
  }

  const syntaxErrors = criticalErrors.filter(e => e.category === "SYNTAX");
  if (syntaxErrors.length > 0) {
    suggestions.push("Check JSX syntax and ensure all tags are properly closed");
  }

  const structureWarnings = warnings.filter(e => e.category === "STRUCTURE");
  if (structureWarnings.length > 0) {
    suggestions.push("Complete any placeholder or TODO items");
  }

  return {
    valid: criticalErrors.length === 0,
    score: averageScore,
    criticalErrors,
    warnings,
    suggestions,
  };
}

// =============================================================================
// ERROR CLASSIFIER
// =============================================================================

export interface ClassifiedError {
  original: ValidationError;
  rootCause: string;
  affectedFiles: string[];
  repairStrategy: string;
  priority: number;
}

export function classifyErrors(errors: ValidationError[]): ClassifiedError[] {
  const classified: ClassifiedError[] = [];

  // Group errors by file
  const errorsByFile = new Map<string, ValidationError[]>();
  for (const error of errors) {
    const existing = errorsByFile.get(error.file) || [];
    existing.push(error);
    errorsByFile.set(error.file, existing);
  }

  // Classify each error
  for (const error of errors) {
    let rootCause = error.message;
    let repairStrategy = error.fix;
    let priority = 1;

    switch (error.category) {
      case "SYNTAX":
        priority = 1; // Highest priority
        if (error.message.includes("brace")) {
          rootCause = "Unbalanced braces causing parse failure";
          repairStrategy = "Count and match all opening/closing braces";
        } else if (error.message.includes("parenthes")) {
          rootCause = "Unbalanced parentheses in expressions";
          repairStrategy = "Review conditional rendering and function calls";
        } else if (error.message.includes("JSX")) {
          rootCause = "Unclosed or malformed JSX expression";
          repairStrategy = "Ensure all JSX conditionals are properly closed with )}";
        }
        break;

      case "IMPORT":
        priority = 2;
        if (error.message.includes("hook")) {
          rootCause = "React hooks used without proper import";
          repairStrategy = "Add missing hook imports from 'react'";
        } else if (error.message.includes("router")) {
          rootCause = "Router components used without import";
          repairStrategy = "Add router imports from 'react-router-dom'";
        } else if (error.message.includes("icon")) {
          rootCause = "Icon components used without import";
          repairStrategy = "Add icon imports from 'lucide-react'";
        }
        break;

      case "REACT":
        priority = 2;
        rootCause = "React hook rules violation or missing import";
        repairStrategy = "Review hook usage and ensure proper imports";
        break;

      case "STRUCTURE":
        priority = 3;
        if (error.message.includes("placeholder") || error.message.includes("TODO")) {
          rootCause = "Incomplete implementation with placeholder code";
          repairStrategy = "Replace placeholder with full implementation";
        } else if (error.message.includes("null")) {
          rootCause = "Empty component with no rendered content";
          repairStrategy = "Implement component JSX return";
        }
        break;

      case "TYPE":
        priority = 4;
        rootCause = "TypeScript type mismatch or missing types";
        repairStrategy = "Add or fix type annotations";
        break;

      case "RUNTIME":
        priority = 3;
        rootCause = "Potential runtime error from undefined access";
        repairStrategy = "Add null checks and optional chaining";
        break;

      case "DEPENDENCY":
        priority = 5;
        rootCause = "Missing npm package dependency";
        repairStrategy = "Install required package or remove import";
        break;
    }

    classified.push({
      original: error,
      rootCause,
      affectedFiles: [error.file],
      repairStrategy,
      priority,
    });
  }

  // Sort by priority
  return classified.sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// QUALITY SCORE CALCULATION
// =============================================================================

export function calculateQualityScore(result: ValidationResult): number {
  let score = 1.0;

  // Deduct for critical errors
  score -= result.criticalErrors.length * 0.15;

  // Deduct for warnings (less severe)
  score -= result.warnings.length * 0.03;

  // Ensure score is in valid range
  return Math.max(0, Math.min(1, score));
}
