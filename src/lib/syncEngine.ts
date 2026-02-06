// =============================================================================
// SYNC ENGINE - Command protocol, patch engine, tree resolver, context builder
// =============================================================================
// This is the bridge between AI output and application state.
// All file mutations flow through this engine.

// =============================================================================
// COMMAND PROTOCOL TYPES
// =============================================================================

export type CommandType = "CREATE_FILE" | "UPDATE_FILE" | "DELETE_FILE" | "PATCH_FILE";

export interface SearchReplacePatch {
  search: string;
  replace: string;
  context?: string; // optional surrounding context for disambiguation
}

export interface FileCommand {
  command: CommandType;
  path: string;
  content?: string;             // full content for CREATE/UPDATE
  patches?: SearchReplacePatch[]; // for PATCH_FILE
  metadata?: {
    language?: string;
    purpose?: string;
  };
}

// =============================================================================
// SSE EVENT TYPES
// =============================================================================

export type SyncEventType = "stage" | "file" | "complete" | "error";

export interface StageEvent {
  type: "stage";
  stage: string;
  status: "start" | "complete" | "error";
  message?: string;
  data?: Record<string, unknown>;
}

export interface FileEvent {
  type: "file";
  command: CommandType;
  path: string;
  content?: string;
  patches?: SearchReplacePatch[];
}

export interface CompleteEvent {
  type: "complete";
  filesGenerated: number;
  filePaths: string[];
  aiMessage: string;
  routes: string[];
  suggestions: string[];
  modelsUsed: string[];
  validationPassed: boolean;
  repairAttempts: number;
  telemetry?: Record<string, unknown>;
}

export interface ErrorEvent {
  type: "error";
  message: string;
  stage?: string;
}

export type SyncEvent = StageEvent | FileEvent | CompleteEvent | ErrorEvent;

// =============================================================================
// PATCH ENGINE - Search-and-Replace diffing
// =============================================================================

/**
 * Apply a single search-and-replace patch to file content.
 * Returns the patched content, or null if the search string wasn't found.
 */
export function applyPatch(content: string, patch: SearchReplacePatch): string | null {
  const index = content.indexOf(patch.search);
  if (index === -1) {
    // Try with whitespace normalization as fallback
    const normalizedContent = content.replace(/\s+/g, ' ');
    const normalizedSearch = patch.search.replace(/\s+/g, ' ');
    const normalizedIndex = normalizedContent.indexOf(normalizedSearch);
    
    if (normalizedIndex === -1) {
      return null; // Search string not found
    }
    
    // Find the original boundaries in the non-normalized content
    // Fall back to full replacement
    return content.replace(patch.search.trim(), patch.replace.trim());
  }
  
  return content.slice(0, index) + patch.replace + content.slice(index + patch.search.length);
}

/**
 * Apply multiple patches sequentially to file content.
 * If any patch fails, falls back to returning null (caller should use full replacement).
 */
export function applyPatches(content: string, patches: SearchReplacePatch[]): string | null {
  let result = content;
  
  for (const patch of patches) {
    const patched = applyPatch(result, patch);
    if (patched === null) {
      console.warn(`[SyncEngine] Patch failed - search string not found in file`);
      return null; // Signal that patches couldn't be applied
    }
    result = patched;
  }
  
  return result;
}

// =============================================================================
// TREE RESOLVER - Ensures parent folders exist before file insertion
// =============================================================================

export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
}

/**
 * Ensure all parent directories exist for a given file path in a tree structure.
 * Returns the tree with any missing intermediate folders created.
 */
export function resolveOrCreatePath(tree: TreeNode[], filePath: string): TreeNode[] {
  const parts = filePath.split('/');
  let currentLevel = tree;
  let currentPath = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const isFile = i === parts.length - 1;
    
    let existing = currentLevel.find(n => n.name === part && n.type === (isFile ? 'file' : 'folder'));
    
    if (!existing) {
      // Also check if there's a same-name node of different type (edge case)
      existing = currentLevel.find(n => n.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }
    }
    
    if (!isFile && existing.children) {
      currentLevel = existing.children;
    }
  }
  
  return tree;
}

// =============================================================================
// CONTEXT SUMMARY BUILDER - Injects file tree into AI context
// =============================================================================

/**
 * Build a concise file tree summary string for injection into AI prompts.
 * This ensures the AI always works with the latest code state.
 */
export function buildContextSummary(files: Map<string, { path: string; content: string }>): string {
  if (files.size === 0) return "No existing files.";
  
  const paths = Array.from(files.keys()).sort();
  
  // Build tree-like summary
  let summary = `## Current Project Files (${paths.length} files)\n\n`;
  summary += paths.map(p => `- ${p}`).join('\n');
  
  // Add brief content summaries for key files
  const keyPatterns = ['/pages/', '/components/layout/', 'index.css', 'App.tsx'];
  const keyFiles = paths.filter(p => keyPatterns.some(pattern => p.includes(pattern)));
  
  if (keyFiles.length > 0) {
    summary += '\n\n### Key File Summaries:\n';
    for (const path of keyFiles.slice(0, 5)) {
      const file = files.get(path);
      if (file) {
        // First 200 chars of content
        const preview = file.content.slice(0, 200).replace(/\n/g, ' ').trim();
        summary += `\n**${path}**: ${preview}...`;
      }
    }
  }
  
  return summary;
}

// =============================================================================
// PARSE SSE LINE
// =============================================================================

/**
 * Parse a single SSE data line into a SyncEvent.
 */
export function parseSSEEvent(line: string): SyncEvent | null {
  if (!line.startsWith('data: ')) return null;
  
  const jsonStr = line.slice(6).trim();
  if (jsonStr === '[DONE]') return null;
  
  try {
    return JSON.parse(jsonStr) as SyncEvent;
  } catch {
    return null;
  }
}

// =============================================================================
// PROTECTED PATH VALIDATION
// =============================================================================

const PROTECTED_PATTERNS = [
  /^src\/integrations\//,
  /^src\/main\.tsx$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^bun\.lockb$/,
  /^\.gitignore$/,
  /^tsconfig/,
  /^vite\.config/,
  /^tailwind\.config/,
  /^node_modules\//,
  /^\.cache\//,
  /^dist\//,
];

export function isPathWriteable(path: string): boolean {
  return !PROTECTED_PATTERNS.some(p => p.test(path));
}

export function validateFilePath(path: string): { valid: boolean; error?: string } {
  if (path.includes('..')) return { valid: false, error: 'Path traversal not allowed' };
  if (path.startsWith('/')) return { valid: false, error: 'Absolute paths not allowed' };
  if (!isPathWriteable(path)) return { valid: false, error: `Protected path: ${path}` };
  return { valid: true };
}
