// =============================================================================
// CONTEXT BUILDER - Project context extraction and persistence
// =============================================================================

import type { 
  DB,
  FileOperation, 
  PipelineContext, 
  ProjectContext,
  RollbackPoint,
  StageName,
  FileClassification
} from "./types.ts";
import { TelemetryLogger } from "./telemetry.ts";

// =============================================================================
// FILE CLASSIFICATION RULES
// =============================================================================

const CLASSIFICATION_RULES: Array<{
  pattern: RegExp;
  classification: FileClassification;
  writeable: boolean;
}> = [
  // Internal - Platform code (never modify)
  { pattern: /^src\/integrations\//, classification: "internal", writeable: false },
  { pattern: /^src\/main\.tsx$/, classification: "system", writeable: false },
  
  // System - Config files (careful)
  { pattern: /^package\.json$/, classification: "system", writeable: false },
  { pattern: /^tsconfig.*\.json$/, classification: "system", writeable: false },
  { pattern: /^vite\.config\.ts$/, classification: "system", writeable: false },
  { pattern: /^tailwind\.config\.ts$/, classification: "system", writeable: true },
  
  // Runtime - Never touch
  { pattern: /^\.cache\//, classification: "runtime", writeable: false },
  { pattern: /^node_modules\//, classification: "runtime", writeable: false },
  { pattern: /^dist\//, classification: "runtime", writeable: false },
  
  // Generated - AI can write
  { pattern: /^src\/pages\//, classification: "generated", writeable: true },
  { pattern: /^src\/components\//, classification: "generated", writeable: true },
  { pattern: /^src\/hooks\//, classification: "generated", writeable: true },
  { pattern: /^src\/lib\//, classification: "generated", writeable: true },
  { pattern: /^src\/assets\//, classification: "generated", writeable: true },
  { pattern: /^src\/styles\//, classification: "generated", writeable: true },
  { pattern: /^src\/index\.css$/, classification: "generated", writeable: true },
  { pattern: /^src\/App\.tsx$/, classification: "generated", writeable: true },
  { pattern: /^public\//, classification: "generated", writeable: true },
];

export function classifyFile(path: string): { classification: FileClassification; writeable: boolean } {
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(path)) {
      return { classification: rule.classification, writeable: rule.writeable };
    }
  }
  // Default: generated and writeable
  return { classification: "generated", writeable: true };
}

export function isPathWriteable(path: string): boolean {
  return classifyFile(path).writeable;
}

// =============================================================================
// FILE SCANNER
// =============================================================================

interface FileTreeNode {
  path: string;
  type: "file" | "directory";
  extension?: string;
  size?: number;
  children?: FileTreeNode[];
}

export function buildFileTree(files: FileOperation[]): FileTreeNode[] {
  const tree: FileTreeNode[] = [];
  const directories = new Map<string, FileTreeNode>();

  for (const file of files) {
    const parts = file.path.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        // It's a file
        const fileNode: FileTreeNode = {
          path: file.path,
          type: "file",
          extension: part.includes(".") ? part.split(".").pop() : undefined,
          size: file.content.length,
        };

        const parentPath = parts.slice(0, -1).join("/");
        const parent = directories.get(parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(fileNode);
        } else {
          tree.push(fileNode);
        }
      } else {
        // It's a directory
        if (!directories.has(currentPath)) {
          const dirNode: FileTreeNode = {
            path: currentPath,
            type: "directory",
            children: [],
          };
          directories.set(currentPath, dirNode);

          const parentPath = parts.slice(0, i).join("/");
          const parent = directories.get(parentPath);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(dirNode);
          } else if (i === 0) {
            tree.push(dirNode);
          }
        }
      }
    }
  }

  return tree;
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

interface DetectedPatterns {
  framework: string;
  styling: string;
  patterns: string[];
  dependencies: string[];
  routes: string[];
}

export function detectPatterns(files: FileOperation[]): DetectedPatterns {
  const patterns: string[] = [];
  const dependencies: string[] = [];
  const routes: string[] = ["/"];

  let framework = "react";
  let styling = "tailwind";

  for (const file of files) {
    const content = file.content;
    const path = file.path;

    // Detect styling
    if (content.includes("@tailwind") || content.includes("tailwind")) {
      styling = "tailwind";
    }
    if (content.includes("styled-components") || content.includes("styled.")) {
      styling = "styled-components";
    }
    if (content.includes("@emotion")) {
      styling = "emotion";
    }

    // Detect patterns from imports
    if (content.includes("from 'react-router-dom'") || content.includes('from "react-router-dom"')) {
      patterns.push("react-router");
    }
    if (content.includes("from '@/components/ui/") || content.includes('from "@/components/ui/')) {
      patterns.push("shadcn");
    }
    if (content.includes("from 'lucide-react'") || content.includes('from "lucide-react"')) {
      dependencies.push("lucide-react");
    }
    if (content.includes("from 'framer-motion'") || content.includes('from "framer-motion"')) {
      dependencies.push("framer-motion");
    }
    if (content.includes("useState") || content.includes("useEffect")) {
      if (!patterns.includes("hooks")) patterns.push("hooks");
    }
    if (content.includes("useQuery") || content.includes("useMutation")) {
      patterns.push("react-query");
      dependencies.push("@tanstack/react-query");
    }
    if (content.includes("from 'zustand'") || content.includes('from "zustand"')) {
      patterns.push("zustand");
      dependencies.push("zustand");
    }

    // Extract routes from page files
    if (path.startsWith("src/pages/") && path.endsWith(".tsx")) {
      const pageName = path.replace("src/pages/", "").replace(".tsx", "").toLowerCase();
      if (pageName === "index") {
        // Already have "/"
      } else {
        routes.push(`/${pageName}`);
      }
    }
  }

  return {
    framework,
    styling,
    patterns: [...new Set(patterns)],
    dependencies: [...new Set(dependencies)],
    routes: [...new Set(routes)],
  };
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export async function buildProjectContext(
  supabase: DB,
  workspaceId: string,
  existingFiles: FileOperation[]
): Promise<ProjectContext> {
  const logger = new TelemetryLogger(null, workspaceId);
  
  // If no existing files provided, load from database
  let files = existingFiles;
  if (files.length === 0) {
    try {
      const { data } = await supabase
        .from("workspace_files")
        .select("file_path, content")
        .eq("workspace_id", workspaceId);

      if (data) {
        files = data.map(f => ({
          path: f.file_path,
          content: f.content,
          operation: "create" as const,
        }));
      }
    } catch (error) {
      logger.warn("Failed to load workspace files", { error: String(error) });
    }
  }

  // Detect patterns
  const detected = detectPatterns(files);

  // Count components and pages
  const componentCount = files.filter(f => 
    f.path.startsWith("src/components/") && f.path.endsWith(".tsx")
  ).length;

  const pageCount = files.filter(f => 
    f.path.startsWith("src/pages/") && f.path.endsWith(".tsx")
  ).length;

  // Build last modified map
  const lastModified: Record<string, string> = {};
  for (const file of files) {
    lastModified[file.path] = new Date().toISOString();
  }

  const context: ProjectContext = {
    framework: detected.framework,
    styling: detected.styling,
    componentCount,
    pageCount,
    patterns: detected.patterns,
    dependencies: detected.dependencies,
    routes: detected.routes,
    lastModified,
  };

  logger.info("Built project context", {
    framework: context.framework,
    componentCount: context.componentCount,
    pageCount: context.pageCount,
    patterns: context.patterns.join(", "),
  });

  return context;
}

// =============================================================================
// CONTEXT MEMORY - Persist and retrieve context
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
        metadata: { context },
      })
      .eq("id", sessionId);
  } catch (error) {
    console.warn("Failed to save context to session:", error);
  }
}

export async function loadContextFromSession(
  supabase: DB,
  sessionId: string
): Promise<ProjectContext | null> {
  try {
    const { data } = await supabase
      .from("generation_sessions")
      .select("metadata")
      .eq("id", sessionId)
      .single();

    if (data?.metadata && typeof data.metadata === "object") {
      const metadata = data.metadata as { context?: ProjectContext };
      return metadata.context || null;
    }
  } catch (error) {
    console.warn("Failed to load context from session:", error);
  }
  return null;
}

// =============================================================================
// ROLLBACK POINT MANAGEMENT
// =============================================================================

export function createRollbackPoint(
  context: PipelineContext,
  stage: StageName
): RollbackPoint {
  const point: RollbackPoint = {
    id: crypto.randomUUID(),
    files: [...context.generatedFiles],
    timestamp: Date.now(),
    stage,
  };

  context.rollbackPoints.push(point);
  return point;
}

export function rollbackToPoint(
  context: PipelineContext,
  pointId: string
): boolean {
  const pointIndex = context.rollbackPoints.findIndex(p => p.id === pointId);
  if (pointIndex === -1) return false;

  const point = context.rollbackPoints[pointIndex];
  context.generatedFiles = [...point.files];
  
  // Remove all rollback points after this one
  context.rollbackPoints = context.rollbackPoints.slice(0, pointIndex + 1);
  
  return true;
}

export function getLatestRollbackPoint(context: PipelineContext): RollbackPoint | null {
  if (context.rollbackPoints.length === 0) return null;
  return context.rollbackPoints[context.rollbackPoints.length - 1];
}

// =============================================================================
// CONTEXT SUMMARY FOR LLM
// =============================================================================

export function buildContextSummary(context: ProjectContext, maxLength = 2000): string {
  const lines: string[] = [
    `## Project Context`,
    `- Framework: ${context.framework}`,
    `- Styling: ${context.styling}`,
    `- Components: ${context.componentCount}`,
    `- Pages: ${context.pageCount}`,
    `- Routes: ${context.routes.join(", ")}`,
  ];

  if (context.patterns.length > 0) {
    lines.push(`- Patterns: ${context.patterns.join(", ")}`);
  }

  if (context.dependencies.length > 0) {
    lines.push(`- Key Dependencies: ${context.dependencies.join(", ")}`);
  }

  let summary = lines.join("\n");
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength - 3) + "...";
  }

  return summary;
}
