// =============================================================================
// CONTEXT - Project context builder and file classification
// =============================================================================

import type { 
  DB, 
  PipelineContext, 
  ProjectContext, 
  FileOperation,
  FileClassification 
} from "./types";

// =============================================================================
// FILE CLASSIFICATION RULES
// =============================================================================

const CLASSIFICATION_RULES: Array<{
  pattern: RegExp;
  classification: FileClassification;
  writeable: boolean;
}> = [
  // Internal platform files - NEVER modify
  { pattern: /^src\/integrations\//, classification: "internal", writeable: false },
  { pattern: /^src\/main\.tsx$/, classification: "system", writeable: false },
  { pattern: /^package\.json$/, classification: "system", writeable: false },
  { pattern: /^package-lock\.json$/, classification: "system", writeable: false },
  { pattern: /^bun\.lockb$/, classification: "system", writeable: false },
  { pattern: /^\.gitignore$/, classification: "system", writeable: false },
  { pattern: /^tsconfig/, classification: "system", writeable: false },
  { pattern: /^vite\.config/, classification: "system", writeable: false },
  { pattern: /^tailwind\.config/, classification: "system", writeable: false },
  
  // Runtime/temporary files - NEVER modify
  { pattern: /^node_modules\//, classification: "runtime", writeable: false },
  { pattern: /^\.cache\//, classification: "runtime", writeable: false },
  { pattern: /^dist\//, classification: "runtime", writeable: false },
  { pattern: /^\.vite\//, classification: "runtime", writeable: false },
  
  // Generated/user files - OK to modify
  { pattern: /^src\/pages\//, classification: "generated", writeable: true },
  { pattern: /^src\/components\//, classification: "generated", writeable: true },
  { pattern: /^src\/hooks\//, classification: "generated", writeable: true },
  { pattern: /^src\/lib\//, classification: "generated", writeable: true },
  { pattern: /^src\/stores\//, classification: "generated", writeable: true },
  { pattern: /^src\/utils\//, classification: "generated", writeable: true },
  { pattern: /^src\/types\//, classification: "generated", writeable: true },
  { pattern: /^src\/assets\//, classification: "generated", writeable: true },
  { pattern: /^src\/styles\//, classification: "generated", writeable: true },
  { pattern: /^src\/index\.css$/, classification: "generated", writeable: true },
  { pattern: /^src\/App\.tsx$/, classification: "generated", writeable: true },
  { pattern: /^src\/App\.css$/, classification: "generated", writeable: true },
  { pattern: /^public\//, classification: "generated", writeable: true },
];

// =============================================================================
// FILE CLASSIFICATION
// =============================================================================

export function classifyFile(path: string): FileClassification {
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(path)) {
      return rule.classification;
    }
  }
  return "user";
}

export function isPathWriteable(path: string): boolean {
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(path)) {
      return rule.writeable;
    }
  }
  return true; // Default to writeable for unknown paths
}

export function validateFilePath(path: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for path traversal
  if (path.includes("..")) {
    errors.push("Path traversal (..) not allowed");
  }
  
  // Check for absolute paths
  if (path.startsWith("/")) {
    errors.push("Absolute paths not allowed");
  }
  
  // Check classification
  if (!isPathWriteable(path)) {
    errors.push(`Cannot write to protected path: ${path}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// PROJECT CONTEXT BUILDER
// =============================================================================

export async function buildProjectContext(
  supabase: DB,
  workspaceId: string,
  existingFiles: FileOperation[]
): Promise<ProjectContext> {
  // Build file tree from existing files
  const fileTree = existingFiles.map(f => f.path);
  
  // Detect framework
  let framework = "react";
  let styling = "tailwind";
  const patterns: string[] = [];
  const dependencies: string[] = [];
  
  // Scan files for patterns
  for (const file of existingFiles) {
    const content = file.content.toLowerCase();
    const path = file.path.toLowerCase();
    
    // Detect patterns
    if (content.includes("usestate") || content.includes("useeffect")) {
      if (!patterns.includes("hooks")) patterns.push("hooks");
    }
    if (content.includes("react-router") || content.includes("<link") || content.includes("<route")) {
      if (!patterns.includes("react-router")) patterns.push("react-router");
    }
    if (content.includes("@/components/ui/")) {
      if (!patterns.includes("shadcn")) patterns.push("shadcn");
    }
    if (content.includes("lucide-react")) {
      if (!dependencies.includes("lucide-react")) dependencies.push("lucide-react");
    }
    if (content.includes("framer-motion")) {
      if (!dependencies.includes("framer-motion")) dependencies.push("framer-motion");
    }
    
    // Check for package.json
    if (path === "package.json") {
      try {
        const pkg = JSON.parse(file.content);
        if (pkg.dependencies) {
          Object.keys(pkg.dependencies).forEach(dep => {
            if (!dependencies.includes(dep)) dependencies.push(dep);
          });
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Check for tailwind config
    if (path.includes("tailwind")) {
      styling = "tailwind";
    }
  }
  
  // Count components and pages
  const componentCount = existingFiles.filter(f => 
    f.path.includes("/components/") && f.path.endsWith(".tsx")
  ).length;
  
  const pageCount = existingFiles.filter(f => 
    f.path.includes("/pages/") && f.path.endsWith(".tsx")
  ).length;
  
  return {
    framework,
    styling,
    patterns,
    dependencies,
    componentCount,
    pageCount,
    fileTree,
    configs: {},
  };
}

// =============================================================================
// CONTEXT PERSISTENCE
// =============================================================================

export async function saveContextToSession(
  supabase: DB,
  sessionId: string | null,
  context: ProjectContext
): Promise<void> {
  if (!sessionId) return;
  
  try {
    await supabase
      .from("generation_sessions")
      .update({
        metadata: {
          context: {
            framework: context.framework,
            styling: context.styling,
            patterns: context.patterns,
            dependencies: context.dependencies.slice(0, 20), // Limit size
            componentCount: context.componentCount,
            pageCount: context.pageCount,
          },
        },
      })
      .eq("id", sessionId);
  } catch (err) {
    console.error("[Context] Failed to save context:", err);
  }
}

// =============================================================================
// ROLLBACK SUPPORT
// =============================================================================

export function createRollbackPoint(
  context: PipelineContext,
  stage: string
): void {
  context.rollbackPoints.push({
    stage,
    files: [...context.generatedFiles],
    timestamp: Date.now(),
  });
}

export function rollbackToStage(
  context: PipelineContext,
  stage: string
): boolean {
  const point = context.rollbackPoints.find(p => p.stage === stage);
  if (point) {
    context.generatedFiles = [...point.files];
    return true;
  }
  return false;
}
