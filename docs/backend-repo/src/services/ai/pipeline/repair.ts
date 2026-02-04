// =============================================================================
// REPAIR - Error-aware self-repair loop with targeted patching
// =============================================================================

import type { 
  PipelineContext, 
  FileOperation, 
  ValidationResult 
} from "./types";
import { SAFETY_LIMITS } from "./types";
import { validateCodeLocally, canAutoFix, generateAutoFix, classifyError } from "./validation";
import { callAIWithFallback } from "./routing";

// =============================================================================
// REPAIR PROMPT
// =============================================================================

const REPAIR_PROMPT = `You are a code repair specialist. Fix the errors in the provided files.

## RULES:
1. Fix ALL reported errors
2. Return COMPLETE files (no placeholders)
3. Preserve existing functionality
4. Only modify what's necessary to fix errors

## COMMON FIXES:

### Missing React Hooks Import:
Add: import { useState, useEffect } from 'react';

### Unbalanced Braces:
Ensure every { has a matching }

### Orphaned JSX:
BAD:  {menuOpen && (
GOOD: {menuOpen && (<div>...</div>)}

### Missing Key Prop:
BAD:  {items.map(item => <div>{item}</div>)}
GOOD: {items.map((item, i) => <div key={i}>{item}</div>)}

## OUTPUT FORMAT:
Return fixed files in this exact format:
\`\`\`tsx:src/path/to/File.tsx
// Complete fixed code
\`\`\`

Fix ALL errors. Return COMPLETE files.`;

// =============================================================================
// REPAIR LOOP
// =============================================================================

export interface RepairResult {
  files: FileOperation[];
  validation: ValidationResult;
  repairAttempts: number;
  success: boolean;
}

export async function runRepairLoop(
  context: PipelineContext,
  initialValidation: ValidationResult
): Promise<RepairResult> {
  let files = [...context.generatedFiles];
  let validation = initialValidation;
  let repairAttempts = 0;

  while (!validation.valid && repairAttempts < SAFETY_LIMITS.maxRepairAttempts) {
    repairAttempts++;
    console.log(`[Repair] Attempt ${repairAttempts}/${SAFETY_LIMITS.maxRepairAttempts}...`);

    // Track this repair attempt
    const attemptRecord = {
      attempt: repairAttempts,
      errors: validation.criticalErrors.map(e => ({
        type: e.category,
        file: e.file,
        message: e.error,
      })),
      patchesApplied: [] as string[],
      resolved: false,
    };

    // Try auto-fixes first
    let autoFixedCount = 0;
    for (const error of validation.criticalErrors) {
      if (canAutoFix(error.category)) {
        const fileIndex = files.findIndex(f => f.path === error.file);
        if (fileIndex >= 0) {
          const fixedContent = generateAutoFix(error, files[fileIndex].content);
          if (fixedContent) {
            files[fileIndex] = { ...files[fileIndex], content: fixedContent };
            attemptRecord.patchesApplied.push(`Auto-fix: ${error.category} in ${error.file}`);
            autoFixedCount++;
          }
        }
      }
    }

    // Re-validate after auto-fixes
    validation = validateCodeLocally(files);
    
    if (validation.valid) {
      attemptRecord.resolved = true;
      context.repairHistory.push(attemptRecord);
      console.log(`[Repair] ✓ Auto-fixes resolved all errors`);
      break;
    }

    // If auto-fixes weren't enough, use AI repair
    if (validation.criticalErrors.length > 0) {
      console.log(`[Repair] ${autoFixedCount} auto-fixes applied, ${validation.criticalErrors.length} errors remain. Using AI...`);

      const filesToFix = files.filter(f => 
        validation.criticalErrors.some(e => e.file === f.path)
      );

      const errorSummary = validation.criticalErrors
        .map(e => `${e.file}: [${e.category}] ${e.error}`)
        .join("\n");

      const repairMessages = [
        { role: "system", content: REPAIR_PROMPT },
        { 
          role: "user", 
          content: `ERRORS FOUND:\n${errorSummary}\n\nFILES TO FIX:\n${filesToFix.map(f => `\`\`\`tsx:${f.path}\n${f.content}\n\`\`\``).join("\n\n")}\n\nFix ALL errors and return COMPLETE files.` 
        },
      ];

      try {
        const result = await callAIWithFallback("repair", repairMessages);
        const repairedFiles = extractFiles(result.response);

        // Merge repaired files
        for (const repaired of repairedFiles) {
          const index = files.findIndex(f => f.path === repaired.path);
          if (index >= 0) {
            files[index] = repaired;
            attemptRecord.patchesApplied.push(`AI repair: ${repaired.path}`);
          } else {
            files.push(repaired);
          }
        }

        context.modelsUsed.push(`Repair: ${result.provider}/${result.model}`);

      } catch (err) {
        console.error(`[Repair] AI repair failed:`, err);
      }
    }

    // Re-validate
    validation = validateCodeLocally(files);
    attemptRecord.resolved = validation.valid;
    context.repairHistory.push(attemptRecord);

    console.log(`[Repair] After attempt ${repairAttempts}: ${validation.valid ? "✓ PASSED" : "✗ FAILED"} (${validation.criticalErrors.length} errors)`);
  }

  return {
    files,
    validation,
    repairAttempts,
    success: validation.valid,
  };
}

// =============================================================================
// FILE EXTRACTION
// =============================================================================

function extractFiles(response: string): FileOperation[] {
  const operations: FileOperation[] = [];
  const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const path = match[2].trim().replace(/^\/+/, "");
    const content = match[3];

    if (path && content && path.includes("/")) {
      operations.push({
        path,
        content: content.trim(),
        operation: "update",
      });
    }
  }

  return operations;
}
