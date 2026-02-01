// =============================================================================
// TOOL/MCP SYSTEM - Structured tools for AI orchestration
// =============================================================================

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  items?: { type: string };
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface FileOperation {
  action: "create" | "update" | "delete";
  path: string;
  content?: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// =============================================================================
// TOOL DEFINITIONS - MCP-style tool registry
// =============================================================================

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or update a file in the project. Use for creating new components, pages, or modifying existing files.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path relative to project root (e.g., 'src/components/Button.tsx')"
          },
          content: {
            type: "string",
            description: "Complete file content to write"
          },
          reason: {
            type: "string",
            description: "Brief explanation of why this file is being created/modified"
          }
        },
        required: ["path", "content", "reason"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Remove a file from the project. Only use when explicitly requested.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to delete"
          },
          reason: {
            type: "string",
            description: "Reason for deletion"
          }
        },
        required: ["path", "reason"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "validate_code",
      description: "Validate code syntax and structure before applying changes.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Code to validate"
          },
          language: {
            type: "string",
            description: "Programming language (tsx, ts, jsx, js, css)"
          }
        },
        required: ["code", "language"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the current contents of a project file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to read"
          }
        },
        required: ["path"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files in the project or a specific directory.",
      parameters: {
        type: "object",
        properties: {
          directory: {
            type: "string",
            description: "Directory path to list (default: root)"
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "think",
      description: "Use for complex reasoning before taking actions. Output your analysis but don't modify files.",
      parameters: {
        type: "object",
        properties: {
          analysis: {
            type: "string",
            description: "Your reasoning and analysis about the task"
          },
          plan: {
            type: "array",
            items: { type: "string" },
            description: "Ordered list of steps to accomplish the task"
          }
        },
        required: ["analysis", "plan"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete",
      description: "Signal that the task is complete and provide a summary.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Summary of what was accomplished"
          },
          filesCreated: {
            type: "array",
            items: { type: "string" },
            description: "List of files created"
          },
          filesModified: {
            type: "array",
            items: { type: "string" },
            description: "List of files modified"
          },
          nextSteps: {
            type: "array",
            items: { type: "string" },
            description: "Suggested next steps for the user"
          }
        },
        required: ["summary"],
        additionalProperties: false
      }
    }
  }
];

// =============================================================================
// CODE VALIDATION
// =============================================================================

export function validateCode(code: string, language: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push("Empty code content");
    return { isValid: false, errors, warnings, suggestions };
  }

  if (language === "tsx" || language === "jsx") {
    // Check for balanced JSX
    const jsxTagPattern = /<(\w+)([^>]*?)(?:\/)?>/g;
    const closeTagPattern = /<\/(\w+)>/g;
    const selfClosingPattern = /<\w+[^>]*\/>/g;

    const openTags: string[] = [];
    let match;

    // Find all opening tags (non-self-closing)
    const allTags = code.match(jsxTagPattern) || [];
    const closeTags = code.match(closeTagPattern) || [];
    const selfClosing = code.match(selfClosingPattern) || [];

    // Simple balance check
    const openCount = allTags.length - selfClosing.length;
    const closeCount = closeTags.length;

    if (Math.abs(openCount - closeCount) > 2) {
      warnings.push(`Possible unbalanced JSX tags (${openCount} open, ${closeCount} close)`);
    }

    // Check for missing React import
    if (code.includes("useState") || code.includes("useEffect") || code.includes("useRef")) {
      if (!code.includes("import") || !code.includes("react")) {
        warnings.push("React hooks used but React import may be missing");
      }
    }

    // Check for export
    if (!code.includes("export default") && !code.includes("export {") && !code.includes("export const")) {
      warnings.push("No export statement found - component may not be importable");
    }

    // Check for component function
    if (!code.includes("function ") && !code.includes("const ") && !code.includes("=>")) {
      errors.push("No function or arrow function found - not a valid React component");
    }

    // Check for return statement
    if (code.includes("export default function") || code.includes("export function")) {
      if (!code.includes("return") && !code.includes("=>")) {
        errors.push("Component function missing return statement");
      }
    }
  }

  // Check for balanced brackets (all languages)
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced curly braces: ${openBraces} open, ${closeBraces} close`);
  }

  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }

  const openBrackets = (code.match(/\[/g) || []).length;
  const closeBrackets = (code.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(`Unbalanced square brackets: ${openBrackets} open, ${closeBrackets} close`);
  }

  // Suggestions
  if (language === "tsx" || language === "ts") {
    if (!code.includes(": ") && !code.includes("interface") && !code.includes("type ")) {
      suggestions.push("Consider adding TypeScript types for better type safety");
    }
  }

  if (code.includes("any")) {
    suggestions.push("Avoid using 'any' type - consider more specific types");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

// =============================================================================
// FILE PATH VALIDATION
// =============================================================================

export function validateFilePath(path: string): { valid: boolean; normalized: string; error?: string } {
  if (!path || path.trim().length === 0) {
    return { valid: false, normalized: "", error: "Empty file path" };
  }

  // Remove leading slash if present
  let normalized = path.replace(/^\/+/, "");
  
  // Ensure proper extension
  const validExtensions = [".tsx", ".ts", ".jsx", ".js", ".css", ".json", ".svg", ".txt", ".md", ".html"];
  const hasValidExtension = validExtensions.some(ext => normalized.endsWith(ext));
  
  if (!hasValidExtension) {
    return { valid: false, normalized, error: `Invalid file extension. Allowed: ${validExtensions.join(", ")}` };
  }

  // Check for dangerous paths
  if (normalized.includes("..") || normalized.includes("~")) {
    return { valid: false, normalized, error: "Path traversal not allowed" };
  }

  // Normalize slashes
  normalized = normalized.replace(/\\/g, "/");

  return { valid: true, normalized };
}

// =============================================================================
// TOOL CALL PARSER
// =============================================================================

export interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export function parseToolCalls(response: string): ParsedToolCall[] {
  const toolCalls: ParsedToolCall[] = [];
  
  // Look for tool_calls in the response (OpenAI format)
  try {
    const parsed = JSON.parse(response);
    if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
      for (const call of parsed.tool_calls) {
        toolCalls.push({
          id: call.id || `tool_${Date.now()}`,
          name: call.function?.name || "",
          arguments: typeof call.function?.arguments === "string" 
            ? JSON.parse(call.function.arguments)
            : call.function?.arguments || {}
        });
      }
    }
  } catch {
    // Response is not JSON, try to extract from streaming format
  }

  return toolCalls;
}

// =============================================================================
// EXTRACT FILE OPERATIONS FROM AI RESPONSE
// =============================================================================

export function extractFileOperations(response: string): FileOperation[] {
  const operations: FileOperation[] = [];
  
  // Pattern: ```language:path/to/file.ext
  const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || "";
    const path = match[2].trim();
    const content = match[3];

    const pathValidation = validateFilePath(path);
    if (pathValidation.valid) {
      operations.push({
        action: "create",
        path: pathValidation.normalized,
        content,
        reason: `Generated ${language} file`
      });
    }
  }

  return operations;
}
