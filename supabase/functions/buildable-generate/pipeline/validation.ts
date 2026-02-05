// =============================================================================
// VALIDATION - Enhanced Code Validation with Polish Checks
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
  // SYNTAX errors - Incomplete ternary expressions (CRITICAL)
  {
    pattern: /\{\s*\w+\s*\?\s*:\s*\}/g,
    category: "SYNTAX",
    message: "Incomplete ternary expression - missing true AND false branches: {condition ? : }",
    fix: "Add content for BOTH branches: {condition ? <TrueContent /> : <FalseContent />}",
    severity: "error",
    autoFixable: false,
  },
  {
    pattern: /\{\s*\w+\s*\?\s*<[^>]+\/?>\s*:\s*\}/g,
    category: "SYNTAX",
    message: "Incomplete ternary - missing false branch after colon",
    fix: "Add content after the colon: {condition ? <TrueContent /> : <FalseContent />}",
    severity: "error",
    autoFixable: false,
  },
  {
    pattern: /\{\s*\w+\s*\?\s*:\s*<[^>]+\/?>\s*\}/g,
    category: "SYNTAX",
    message: "Incomplete ternary - missing true branch before colon",
    fix: "Add content before the colon: {condition ? <TrueContent /> : <FalseContent />}",
    severity: "error",
    autoFixable: false,
  },
  // STRUCTURE errors (placeholder patterns)
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
  // Empty/null exports
  {
    pattern: /export\s+default\s+null\s*;?/gm,
    category: "STRUCTURE",
    message: "Component exports null - incomplete implementation",
    fix: "Implement the component with proper JSX return",
    severity: "error",
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

  for (const hook of REACT_HOOKS) {
    const hookRegex = new RegExp(`\\b${hook}\\s*\\(`, "g");
    if (hookRegex.test(content)) {
      usedHooks.push(hook);
    }
  }

  const reactImportMatch = content.match(/import\s+.*\{([^}]*)\}.*from\s+['"]react['"]/);
  const importedHooks = reactImportMatch 
    ? reactImportMatch[1].split(",").map(h => h.trim())
    : [];

  const missingHookImports = usedHooks.filter(h => !importedHooks.includes(h));

  for (const icon of COMMON_ICONS) {
    const iconRegex = new RegExp(`<${icon}[\\s/>]`, "g");
    if (iconRegex.test(content)) {
      usedIcons.push(icon);
    }
  }

  const hasIconImport = /import\s+.*from\s+['"]lucide-react['"]/.test(content);
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
// POLISH VALIDATION (NEW!)
// =============================================================================

interface PolishAnalysis {
  hasHeroImage: boolean;
  hasGradientOverlay: boolean;
  hasGradientText: boolean;
  hasHoverEffects: boolean;
  hasUnsplashImages: boolean;
  imageCount: number;
  hasMobileMenu: boolean;
  hasFooter: boolean;
  hasCTA: boolean;
  score: number;
}

function analyzePolish(files: FileOperation[]): PolishAnalysis {
  let hasHeroImage = false;
  let hasGradientOverlay = false;
  let hasGradientText = false;
  let hasHoverEffects = false;
  let hasUnsplashImages = false;
  let imageCount = 0;
  let hasMobileMenu = false;
  let hasFooter = false;
  let hasCTA = false;

  for (const file of files) {
    const content = file.content;
    const path = file.path.toLowerCase();

    // Check for Unsplash images
    const unsplashMatches = content.match(/images\.unsplash\.com/g);
    if (unsplashMatches) {
      hasUnsplashImages = true;
      imageCount += unsplashMatches.length;
    }

    // Check Hero component
    if (path.includes("hero")) {
      hasHeroImage = /img\s+src=/.test(content) && /unsplash/.test(content);
      hasGradientOverlay = /bg-gradient-to/.test(content) && /from-black/.test(content);
      hasGradientText = /bg-gradient-to.*bg-clip-text.*text-transparent/.test(content);
    }

    // Check for hover effects anywhere
    if (/hover:/.test(content)) {
      hasHoverEffects = true;
    }

    // Check Navbar for mobile menu
    if (path.includes("navbar") || path.includes("nav")) {
      hasMobileMenu = /menuOpen|isOpen|mobileMenu/.test(content) && /<Menu|<X|hamburger/i.test(content);
    }

    // Check for Footer
    if (path.includes("footer")) {
      hasFooter = true;
    }

    // Check for CTA
    if (path.includes("cta")) {
      hasCTA = true;
    }
  }

  // Calculate polish score (0-100)
  let score = 0;
  if (hasHeroImage) score += 15;
  if (hasGradientOverlay) score += 10;
  if (hasGradientText) score += 10;
  if (hasHoverEffects) score += 15;
  if (hasUnsplashImages) score += 10;
  if (imageCount >= 4) score += 10;
  if (imageCount >= 8) score += 10;
  if (hasMobileMenu) score += 10;
  if (hasFooter) score += 5;
  if (hasCTA) score += 5;

  return {
    hasHeroImage,
    hasGradientOverlay,
    hasGradientText,
    hasHoverEffects,
    hasUnsplashImages,
    imageCount,
    hasMobileMenu,
    hasFooter,
    hasCTA,
    score,
  };
}

// =============================================================================
// FILE COUNT VALIDATION (NEW!)
// =============================================================================

function validateFileCount(files: FileOperation[], isNewProject: boolean): ValidationError[] {
  const warnings: ValidationError[] = [];
  
  if (isNewProject && files.length < 8) {
    warnings.push({
      category: "STRUCTURE",
      file: "project",
      message: `Only ${files.length} files generated - new projects should have 8-12 files minimum`,
      fix: "Add Gallery, Testimonials, CTA, and additional sections",
      severity: "warning",
      autoFixable: false,
    });
  }

  // Check for essential files
  const paths = files.map(f => f.path.toLowerCase());
  
  if (isNewProject) {
    if (!paths.some(p => p.includes("navbar"))) {
      warnings.push({
        category: "STRUCTURE",
        file: "project",
        message: "Missing Navbar component",
        fix: "Add src/components/layout/Navbar.tsx",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (!paths.some(p => p.includes("hero"))) {
      warnings.push({
        category: "STRUCTURE",
        file: "project",
        message: "Missing Hero component",
        fix: "Add src/components/Hero.tsx",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (!paths.some(p => p.includes("footer"))) {
      warnings.push({
        category: "STRUCTURE",
        file: "project",
        message: "Missing Footer component",
        fix: "Add src/components/layout/Footer.tsx",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (!paths.some(p => p.includes("cta"))) {
      warnings.push({
        category: "STRUCTURE",
        file: "project",
        message: "Missing CTA component",
        fix: "Add src/components/CTA.tsx",
        severity: "warning",
        autoFixable: false,
      });
    }
  }

  return warnings;
}

// =============================================================================
// LOCAL VALIDATOR
// =============================================================================

export function validateCodeLocally(files: FileOperation[], isNewProject: boolean = true): ValidationResult {
  const criticalErrors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let totalScore = 0;
  let fileCount = 0;

  // File count validation
  const fileCountWarnings = validateFileCount(files, isNewProject);
  warnings.push(...fileCountWarnings);

  for (const file of files) {
    if (!file.path.endsWith(".tsx") && !file.path.endsWith(".ts") && !file.path.endsWith(".jsx") && !file.path.endsWith(".js")) {
      if (file.path.endsWith(".css")) {
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

    // Check bracket balance for TSX
    const brackets = checkBalance(content, "<", ">");
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

  // Polish analysis for new projects
  const polish = analyzePolish(files);
  
  if (isNewProject) {
    if (!polish.hasHeroImage) {
      warnings.push({
        category: "POLISH",
        file: "Hero.tsx",
        message: "Hero section missing background image",
        fix: "Add Unsplash hero background image",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (!polish.hasGradientText) {
      warnings.push({
        category: "POLISH",
        file: "project",
        message: "No gradient text effects detected",
        fix: "Add gradient text to headings: bg-gradient-to-r ... bg-clip-text text-transparent",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (!polish.hasHoverEffects) {
      warnings.push({
        category: "POLISH",
        file: "project",
        message: "No hover effects detected",
        fix: "Add hover: classes to interactive elements",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (polish.imageCount < 4) {
      warnings.push({
        category: "POLISH",
        file: "project",
        message: `Only ${polish.imageCount} images detected - projects should have 6-12 images`,
        fix: "Add more Unsplash images to Gallery and sections",
        severity: "warning",
        autoFixable: false,
      });
    }
    
    if (!polish.hasMobileMenu) {
      warnings.push({
        category: "POLISH",
        file: "Navbar.tsx",
        message: "Mobile menu not detected",
        fix: "Add hamburger menu for mobile devices",
        severity: "warning",
        autoFixable: false,
      });
    }
  }

  const averageScore = fileCount > 0 ? totalScore / fileCount : 1.0;

  // Generate suggestions
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
    suggestions.push("Complete any missing components or sections");
  }

  const polishWarnings = warnings.filter(e => e.category === "POLISH");
  if (polishWarnings.length > 0) {
    suggestions.push("Enhance visual polish with gradients, hover effects, and more images");
  }

  return {
    valid: criticalErrors.length === 0,
    score: averageScore,
    polishScore: polish.score,
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

  for (const error of errors) {
    let rootCause = error.message;
    let repairStrategy = error.fix;
    let priority = 1;

    switch (error.category) {
      case "SYNTAX":
        priority = 1;
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

      case "POLISH":
        priority = 4;
        rootCause = "Missing visual polish elements";
        repairStrategy = "Add gradients, hover effects, and images";
        break;

      case "TYPE":
        priority = 5;
        rootCause = "TypeScript type mismatch or missing types";
        repairStrategy = "Add or fix type annotations";
        break;

      case "RUNTIME":
        priority = 3;
        rootCause = "Potential runtime error from undefined access";
        repairStrategy = "Add null checks and optional chaining";
        break;

      case "DEPENDENCY":
        priority = 6;
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

  return classified.sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// QUALITY SCORE CALCULATION
// =============================================================================

export function calculateQualityScore(result: ValidationResult): number {
  let score = 1.0;

  score -= result.criticalErrors.length * 0.15;
  score -= result.warnings.length * 0.03;

  return Math.max(0, Math.min(1, score));
}

// =============================================================================
// AUTO-FIX HELPERS
// =============================================================================

export function canAutoFix(category: ErrorCategory): boolean {
  return category === "IMPORT";
}

export function generateAutoFix(error: ValidationError, content: string): string | null {
  if (error.category !== "IMPORT") return null;
  
  // Auto-fix missing React hook imports
  if (error.message.includes("hook")) {
    const hookMatch = error.message.match(/Missing React hook imports: (.+)/);
    if (hookMatch) {
      const hooks = hookMatch[1].split(", ");
      const existingImport = content.match(/import\s+\{([^}]*)\}\s+from\s+['"]react['"]/);
      
      if (existingImport) {
        const existingHooks = existingImport[1].split(",").map(h => h.trim());
        const allHooks = [...new Set([...existingHooks, ...hooks])].join(", ");
        return content.replace(existingImport[0], `import { ${allHooks} } from 'react'`);
      } else {
        return `import { ${hooks.join(", ")} } from 'react';\n${content}`;
      }
    }
  }
  
  return null;
}

export function classifyError(category: string): ErrorCategory {
  const validCategories: ErrorCategory[] = ["SYNTAX", "IMPORT", "TYPE", "RUNTIME", "STRUCTURE", "DEPENDENCY", "REACT", "POLISH"];
  return validCategories.includes(category as ErrorCategory) ? (category as ErrorCategory) : "STRUCTURE";
}
