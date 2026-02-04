// =============================================================================
// VALIDATION - Local code validation and error classification
// =============================================================================

import type { FileOperation, ValidationResult, ErrorCategory } from "./types";

// =============================================================================
// LOCAL VALIDATION
// =============================================================================

export function validateCodeLocally(files: FileOperation[]): ValidationResult {
  const criticalErrors: ValidationResult["criticalErrors"] = [];
  const warnings: ValidationResult["warnings"] = [];
  let score = 100;

  for (const file of files) {
    const content = file.content;
    const path = file.path;

    // Skip non-code files
    if (!path.endsWith(".tsx") && !path.endsWith(".ts") && !path.endsWith(".jsx") && !path.endsWith(".js")) {
      continue;
    }

    // =========================================================================
    // SYNTAX CHECKS
    // =========================================================================

    // Check for orphaned JSX expressions
    const orphanedExpressions = content.match(/\{[a-zA-Z]+\s*&&\s*\(\s*$/gm);
    if (orphanedExpressions) {
      criticalErrors.push({
        file: path,
        error: "Orphaned JSX expression: `{condition && (` without closing `)}`",
        fix: "Complete the conditional rendering with proper closing tags",
        category: "SYNTAX",
      });
      score -= 15;
    }

    // Check braces balance
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      criticalErrors.push({
        file: path,
        error: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
        fix: "Check for missing opening or closing braces",
        category: "SYNTAX",
      });
      score -= 20;
    }

    // Check parentheses balance
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      criticalErrors.push({
        file: path,
        error: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
        fix: "Check for missing opening or closing parentheses",
        category: "SYNTAX",
      });
      score -= 20;
    }

    // Check brackets balance
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      criticalErrors.push({
        file: path,
        error: `Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`,
        fix: "Check for missing opening or closing brackets",
        category: "SYNTAX",
      });
      score -= 15;
    }

    // =========================================================================
    // IMPORT CHECKS
    // =========================================================================

    // Check for React hooks without import
    const usesHooks = /\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer)\b/.test(content);
    const hasReactHooksImport = /import\s+.*\{[^}]*(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer)[^}]*\}.*from\s+['"]react['"]/.test(content);
    if (usesHooks && !hasReactHooksImport) {
      criticalErrors.push({
        file: path,
        error: "React hooks used but not imported from 'react'",
        fix: "Add: import { useState, useEffect, ... } from 'react';",
        category: "IMPORT",
      });
      score -= 10;
    }

    // Check for lucide-react icons without import
    const lucideIcons = content.match(/\b(Menu|X|ArrowRight|ArrowLeft|Check|Plus|Minus|Search|Settings|User|Home|ChevronDown|ChevronUp|ChevronLeft|ChevronRight|Star|Heart|Trash|Edit|Copy|Download|Upload|Save|Mail|Phone|MapPin|Calendar|Clock|Zap|Shield|Globe|Layers|Code|Palette|Sparkles)\b/g);
    if (lucideIcons && lucideIcons.length > 0) {
      const hasLucideImport = /import\s+.*\{[^}]*\}.*from\s+['"]lucide-react['"]/.test(content);
      if (!hasLucideImport) {
        warnings.push({
          file: path,
          message: `Possible missing lucide-react import for: ${[...new Set(lucideIcons)].join(", ")}`,
        });
        score -= 5;
      }
    }

    // =========================================================================
    // REACT-SPECIFIC CHECKS
    // =========================================================================

    // Check for .map() without key prop
    const mapWithoutKey = /\.map\s*\([^)]*=>\s*[({](?![^]*key[=:])/;
    if (mapWithoutKey.test(content)) {
      warnings.push({
        file: path,
        message: "Possible missing 'key' prop in .map() iteration",
      });
      score -= 3;
    }

    // =========================================================================
    // INCOMPLETE CODE CHECKS
    // =========================================================================

    // Check for placeholder comments
    if (content.includes("// ...") || content.includes("// rest of") || content.includes("// more code") || content.includes("// TODO")) {
      criticalErrors.push({
        file: path,
        error: "Placeholder/TODO comment found - incomplete code",
        fix: "Replace placeholder with actual implementation",
        category: "SYNTAX",
      });
      score -= 15;
    }

    // Check for empty component returns
    if (/return\s*\(\s*\)/.test(content) || /return\s*null\s*;?\s*\}/.test(content)) {
      warnings.push({
        file: path,
        message: "Possibly empty or incomplete component return",
      });
      score -= 5;
    }

    // =========================================================================
    // JSX STRUCTURE CHECKS
    // =========================================================================

    // Check for unclosed self-closing tags
    const selfClosingTags = content.match(/<[A-Z][a-zA-Z]*\s+[^>]*[^/]>/g);
    if (selfClosingTags) {
      for (const tag of selfClosingTags) {
        // If it's a component that might need children, skip
        if (!tag.includes("className") && !tag.includes("onClick")) continue;
        
        const tagName = tag.match(/<([A-Z][a-zA-Z]*)/)?.[1];
        if (tagName) {
          // Check if there's a closing tag
          const hasClosingTag = content.includes(`</${tagName}>`);
          if (!hasClosingTag) {
            // It might be self-closing or fragment - just warn
            warnings.push({
              file: path,
              message: `Tag <${tagName}> might be missing closing tag or self-closing syntax`,
            });
          }
        }
      }
    }
  }

  return {
    valid: criticalErrors.length === 0,
    criticalErrors,
    warnings,
    score: Math.max(0, score),
  };
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

export function classifyError(errorMessage: string): ErrorCategory {
  const msg = errorMessage.toLowerCase();

  if (msg.includes("brace") || msg.includes("parenthes") || msg.includes("bracket") || msg.includes("orphan") || msg.includes("unclosed") || msg.includes("unexpected token")) {
    return "SYNTAX";
  }

  if (msg.includes("import") || msg.includes("module") || msg.includes("cannot find") || msg.includes("not exported")) {
    return "IMPORT";
  }

  if (msg.includes("type") || msg.includes("typescript") || msg.includes("is not assignable") || msg.includes("property") && msg.includes("does not exist")) {
    return "TYPE";
  }

  if (msg.includes("hook") || msg.includes("usestate") || msg.includes("useeffect") || msg.includes("rendered more hooks")) {
    return "REACT";
  }

  if (msg.includes("undefined") || msg.includes("null") || msg.includes("is not a function") || msg.includes("runtime")) {
    return "RUNTIME";
  }

  if (msg.includes("package") || msg.includes("dependency") || msg.includes("not found in node_modules")) {
    return "DEPENDENCY";
  }

  if (msg.includes("security") || msg.includes("xss") || msg.includes("injection") || msg.includes("sanitize")) {
    return "SECURITY";
  }

  return "SYNTAX"; // Default fallback
}

// =============================================================================
// AUTO-FIX HELPERS
// =============================================================================

export function canAutoFix(category: ErrorCategory): boolean {
  return category === "IMPORT" || category === "SYNTAX";
}

export function generateAutoFix(error: ValidationResult["criticalErrors"][0], fileContent: string): string | null {
  switch (error.category) {
    case "IMPORT":
      // Try to add missing React import
      if (error.error.includes("React hooks")) {
        const hooks = fileContent.match(/\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer)\b/g);
        if (hooks) {
          const uniqueHooks = [...new Set(hooks)];
          const importLine = `import { ${uniqueHooks.join(", ")} } from 'react';\n`;
          
          // Add import at the top
          if (fileContent.startsWith("import")) {
            return importLine + fileContent;
          } else {
            return importLine + "\n" + fileContent;
          }
        }
      }
      break;

    case "SYNTAX":
      // Try to fix unbalanced braces (limited capability)
      if (error.error.includes("Unbalanced braces")) {
        const openBraces = (fileContent.match(/\{/g) || []).length;
        const closeBraces = (fileContent.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          // Add missing closing braces at end
          const missing = openBraces - closeBraces;
          return fileContent + "\n" + "}".repeat(missing);
        }
      }
      break;
  }

  return null;
}
