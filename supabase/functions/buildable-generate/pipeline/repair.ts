// =============================================================================
// REPAIR - Error-aware self-repair loop with targeted patching
// =============================================================================

import type { 
  FileOperation, 
  ValidationResult, 
  RepairAttempt,
  PipelineContext
} from "./types.ts";
import { SAFETY_LIMITS } from "./types.ts";
import { validateCodeLocally, classifyErrors, type ClassifiedError } from "./validation.ts";
import { callAI } from "./routing.ts";
import { StageTracer } from "./telemetry.ts";

// =============================================================================
// REPAIR PROMPTS
// =============================================================================

const REPAIR_SYSTEM_PROMPT = `You are Buildable's Repair AI — a code surgeon who fixes errors perfectly.

## YOUR MISSION:
You receive code with specific errors. You MUST fix them and return COMPLETE, WORKING files.

## REPAIR RULES:

### 1. JSX Syntax Fixes:
BAD:  \`{menuOpen && (\`  (orphaned expression)
GOOD: \`{menuOpen && (<div>...</div>)}\`

### 2. Missing Import Fixes:
- Add missing React hook imports at the top
- Add missing icon imports from lucide-react
- Add missing router imports from react-router-dom

### 3. Brace/Parenthesis Fixes:
- Count all opening and closing braces
- Ensure every { has a matching }
- Ensure every ( has a matching )

### 4. Structure Fixes:
- Remove placeholder comments like "// ..."
- Implement any TODO items
- Complete any empty function bodies

## OUTPUT FORMAT:
Return ONLY the fixed files in this format:
\`\`\`tsx:src/path/to/File.tsx
// Complete fixed code here
\`\`\`

## CRITICAL:
- Return the ENTIRE file content, not just the fixed part
- Do NOT add any explanation text
- Do NOT use placeholders or "..."
- Ensure all imports are at the top of the file`;

// =============================================================================
// REPAIR UTILITIES
// =============================================================================

function buildRepairPrompt(
  errors: ClassifiedError[],
  files: FileOperation[]
): string {
  // Group errors by file
  const errorsByFile = new Map<string, ClassifiedError[]>();
  for (const error of errors) {
    for (const file of error.affectedFiles) {
      const existing = errorsByFile.get(file) || [];
      existing.push(error);
      errorsByFile.set(file, existing);
    }
  }

  // Build error summary
  const errorSummary = errors
    .slice(0, 10) // Limit to first 10 errors
    .map(e => `- [${e.original.category}] ${e.original.file}: ${e.original.message}\n  Fix: ${e.repairStrategy}`)
    .join("\n");

  // Get files to fix
  const filesToFix = files.filter(f => errorsByFile.has(f.path));
  
  const fileContents = filesToFix
    .slice(0, 5) // Limit to first 5 files
    .map(f => `\`\`\`tsx:${f.path}\n${f.content}\n\`\`\``)
    .join("\n\n");

  return `## ERRORS TO FIX:
${errorSummary}

## FILES TO REPAIR:
${fileContents}

Fix ALL errors listed above. Return COMPLETE, WORKING files.`;
}

function extractRepairedFiles(response: string): FileOperation[] {
  const files: FileOperation[] = [];
  const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const path = match[2].trim().replace(/^\/+/, "");
    const content = match[3];

    if (path && content && path.includes("/")) {
      files.push({ path, content: content.trim(), operation: "update" });
    }
  }

  return files;
}

function mergeRepairedFiles(
  original: FileOperation[],
  repaired: FileOperation[]
): FileOperation[] {
  const merged = [...original];

  for (const repairedFile of repaired) {
    const index = merged.findIndex(f => f.path === repairedFile.path);
    if (index >= 0) {
      merged[index] = repairedFile;
    } else {
      merged.push(repairedFile);
    }
  }

  return merged;
}

// =============================================================================
// AUTO-FIX FOR SIMPLE ERRORS
// =============================================================================

function autoFixSimpleErrors(files: FileOperation[]): FileOperation[] {
  return files.map(file => {
    if (!file.path.endsWith(".tsx") && !file.path.endsWith(".ts")) {
      return file;
    }

    let content = file.content;

    // Auto-fix 1: Add missing React hook imports
    const usedHooks = ["useState", "useEffect", "useRef", "useMemo", "useCallback", "useContext", "useReducer"]
      .filter(hook => new RegExp(`\\b${hook}\\s*\\(`).test(content));

    if (usedHooks.length > 0) {
      const reactImportMatch = content.match(/import\s+\{([^}]*)\}\s+from\s+['"]react['"]/);
      
      if (reactImportMatch) {
        const existingImports = reactImportMatch[1].split(",").map(i => i.trim());
        const missingHooks = usedHooks.filter(h => !existingImports.includes(h));
        
        if (missingHooks.length > 0) {
          const newImports = [...existingImports, ...missingHooks].join(", ");
          content = content.replace(
            /import\s+\{[^}]*\}\s+from\s+['"]react['"]/,
            `import { ${newImports} } from 'react'`
          );
        }
      } else if (!content.includes("from 'react'") && !content.includes('from "react"')) {
        // No React import at all, add one
        content = `import { ${usedHooks.join(", ")} } from 'react';\n${content}`;
      }
    }

    // Auto-fix 2: Add missing lucide-react imports
    const iconPattern = /<(Menu|X|ArrowRight|ArrowLeft|Check|ChevronDown|ChevronUp|Plus|Minus|Star|Heart|Search|Home|Settings|User|Mail|Phone|Calendar|Clock|Edit|Trash|Download|Upload|Share|Copy|Eye|EyeOff|Lock|Unlock|Bell|Sun|Moon|Sparkles|Zap|Shield|Globe|Layers|Code|Palette|Send|MessageCircle)[\s/>]/g;
    const usedIcons: string[] = [];
    let iconMatch;
    while ((iconMatch = iconPattern.exec(content)) !== null) {
      if (!usedIcons.includes(iconMatch[1])) {
        usedIcons.push(iconMatch[1]);
      }
    }

    if (usedIcons.length > 0 && !content.includes("from 'lucide-react'") && !content.includes('from "lucide-react"')) {
      // Add lucide-react import after other imports
      const lastImportIndex = content.lastIndexOf("import ");
      if (lastImportIndex >= 0) {
        const endOfLine = content.indexOf("\n", lastImportIndex);
        if (endOfLine >= 0) {
          content = content.slice(0, endOfLine + 1) + 
            `import { ${usedIcons.join(", ")} } from 'lucide-react';\n` + 
            content.slice(endOfLine + 1);
        }
      } else {
        content = `import { ${usedIcons.join(", ")} } from 'lucide-react';\n${content}`;
      }
    }

    // Auto-fix 3: Add missing react-router-dom imports
    const routerComponents = ["Link", "useNavigate", "useParams", "useLocation", "useSearchParams"]
      .filter(comp => new RegExp(`\\b${comp}\\b`).test(content));

    if (routerComponents.length > 0 && !content.includes("from 'react-router-dom'") && !content.includes('from "react-router-dom"')) {
      const lastImportIndex = content.lastIndexOf("import ");
      if (lastImportIndex >= 0) {
        const endOfLine = content.indexOf("\n", lastImportIndex);
        if (endOfLine >= 0) {
          content = content.slice(0, endOfLine + 1) + 
            `import { ${routerComponents.join(", ")} } from 'react-router-dom';\n` + 
            content.slice(endOfLine + 1);
        }
      } else {
        content = `import { ${routerComponents.join(", ")} } from 'react-router-dom';\n${content}`;
      }
    }

    return { ...file, content };
  });
}

// =============================================================================
// MAIN REPAIR LOOP
// =============================================================================

export async function runRepairLoop(
  context: PipelineContext,
  initialValidation: ValidationResult
): Promise<{
  files: FileOperation[];
  validation: ValidationResult;
  repairAttempts: number;
  success: boolean;
}> {
  const tracer = new StageTracer(context);
  let files = [...context.generatedFiles];
  let validation = initialValidation;
  let repairAttempts = 0;

  // First, try auto-fixing simple errors
  if (!validation.valid) {
    const autoFixedFiles = autoFixSimpleErrors(files);
    const autoFixValidation = validateCodeLocally(autoFixedFiles);
    
    if (autoFixValidation.criticalErrors.length < validation.criticalErrors.length) {
      console.log("[Repair] Auto-fix resolved some errors");
      files = autoFixedFiles;
      validation = autoFixValidation;
    }
  }

  // Run AI repair loop if still invalid
  while (!validation.valid && repairAttempts < SAFETY_LIMITS.maxRepairAttempts) {
    repairAttempts++;
    const startTime = Date.now();

    tracer.stageRetry("repair", repairAttempts, SAFETY_LIMITS.maxRepairAttempts);

    try {
      // Classify errors for targeted repair
      const classifiedErrors = classifyErrors(validation.criticalErrors);
      
      // Build repair prompt
      const repairPrompt = buildRepairPrompt(classifiedErrors, files);

      // Call repair AI
      const result = await callAI("repair", [
        { role: "system", content: REPAIR_SYSTEM_PROMPT },
        { role: "user", content: repairPrompt },
      ]);

      tracer.modelCall(result.provider, result.model, "repair", result.latencyMs, result.tokensUsed);

      // Extract repaired files
      const repairedFiles = extractRepairedFiles(result.content);
      
      if (repairedFiles.length === 0) {
        console.log("[Repair] No files extracted from repair response");
        continue;
      }

      // Merge repaired files
      files = mergeRepairedFiles(files, repairedFiles);

      // Re-validate
      validation = validateCodeLocally(files);

      const duration = Date.now() - startTime;
      const errorsFixed = validation.criticalErrors.length < classifiedErrors.length 
        ? classifiedErrors.length - validation.criticalErrors.length 
        : 0;

      // Record repair attempt
      const attempt: RepairAttempt = {
        attempt: repairAttempts,
        errors: classifiedErrors.map(e => ({
          type: e.original.category,
          file: e.original.file,
          message: e.original.message,
        })),
        patchesApplied: repairedFiles.map(f => f.path),
        resolved: validation.valid,
        duration,
      };

      context.repairHistory.push(attempt);
      tracer.repairAttempt(repairAttempts, errorsFixed, validation.criticalErrors.length);

      console.log(`[Repair] Attempt ${repairAttempts}: ${validation.valid ? "✓ PASSED" : "✗ FAILED"} (${validation.criticalErrors.length} errors remaining)`);

    } catch (error) {
      console.error(`[Repair] Attempt ${repairAttempts} failed:`, error);
      
      // Record failed attempt
      context.repairHistory.push({
        attempt: repairAttempts,
        errors: validation.criticalErrors.map(e => ({
          type: e.category,
          file: e.file,
          message: e.message,
        })),
        patchesApplied: [],
        resolved: false,
        duration: Date.now() - Date.now(),
      });
    }
  }

  return {
    files,
    validation,
    repairAttempts,
    success: validation.valid,
  };
}

// =============================================================================
// TARGETED PATCH GENERATION
// =============================================================================

export async function generateTargetedPatch(
  file: FileOperation,
  error: ClassifiedError
): Promise<string | null> {
  const prompt = `Fix this specific error in the file:

ERROR: [${error.original.category}] ${error.original.message}
FIX STRATEGY: ${error.repairStrategy}

FILE: ${file.path}
\`\`\`tsx
${file.content}
\`\`\`

Return ONLY the fixed file content, no explanation.`;

  try {
    const result = await callAI("repair", [
      { role: "system", content: "You are a code repair specialist. Fix the error and return the complete fixed file." },
      { role: "user", content: prompt },
    ]);

    const extracted = extractRepairedFiles(result.content);
    if (extracted.length > 0) {
      return extracted[0].content;
    }

    // Try to extract content without code block markers
    const content = result.content.trim();
    if (content.includes("import ") || content.includes("export ")) {
      return content;
    }

    return null;
  } catch (error) {
    console.error("[Repair] Targeted patch failed:", error);
    return null;
  }
}

// =============================================================================
// REPAIR HISTORY ANALYSIS
// =============================================================================

export function analyzeRepairHistory(history: RepairAttempt[]): {
  totalAttempts: number;
  successRate: number;
  commonErrors: Array<{ type: string; count: number }>;
  averageDuration: number;
} {
  if (history.length === 0) {
    return {
      totalAttempts: 0,
      successRate: 1.0,
      commonErrors: [],
      averageDuration: 0,
    };
  }

  const successCount = history.filter(a => a.resolved).length;
  const successRate = successCount / history.length;

  // Count error types
  const errorCounts = new Map<string, number>();
  for (const attempt of history) {
    for (const error of attempt.errors) {
      const count = errorCounts.get(error.type) || 0;
      errorCounts.set(error.type, count + 1);
    }
  }

  const commonErrors = Array.from(errorCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const totalDuration = history.reduce((sum, a) => sum + a.duration, 0);
  const averageDuration = totalDuration / history.length;

  return {
    totalAttempts: history.length,
    successRate,
    commonErrors,
    averageDuration,
  };
}
