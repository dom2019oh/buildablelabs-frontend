// =============================================================================
// SEQUENTIAL AI PIPELINE: Architect → Code → Validate
// =============================================================================

import { TOOL_DEFINITIONS, validateCode, extractFileOperations, type FileOperation, type ValidationResult } from "./tools.ts";

// Lovable AI Gateway
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Model configuration
const MODELS = {
  architect: "google/gemini-2.5-pro",    // Reasoning & planning
  code: "google/gemini-2.5-pro",         // Code generation
  validate: "google/gemini-2.5-flash",   // Fast validation
  ui: "google/gemini-3-flash-preview",   // UI/design tasks
};

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface PipelineResult {
  success: boolean;
  response: string;
  fileOperations: FileOperation[];
  validation: ValidationResult;
  metadata: PipelineMetadata;
}

export interface PipelineMetadata {
  taskType: string;
  phases: PhaseResult[];
  totalDuration: number;
  modelsUsed: string[];
  creditsUsed: number;
}

export interface PhaseResult {
  phase: "architect" | "code" | "validate";
  duration: number;
  model: string;
  success: boolean;
  summary?: string;
}

// =============================================================================
// SYSTEM PROMPTS FOR EACH PHASE
// =============================================================================

const ARCHITECT_PROMPT = `You are the Architect phase of a multi-stage AI pipeline.

YOUR ROLE:
1. Analyze the user's request thoroughly
2. Identify what files need to be created or modified
3. Plan the component structure and data flow
4. Output a structured plan for the Code phase

OUTPUT FORMAT (JSON):
{
  "understanding": "Brief summary of what the user wants",
  "plan": [
    {
      "step": 1,
      "action": "create",
      "path": "src/components/MyComponent.tsx",
      "description": "Main component that handles X",
      "dependencies": [],
      "considerations": ["Must import Y", "Should use Tailwind semantic tokens"]
    }
  ],
  "architecture": {
    "components": ["ComponentA", "ComponentB"],
    "dataFlow": "User input -> ComponentA -> API -> ComponentB -> Display",
    "stateManagement": "Local state with useState"
  },
  "risks": ["Potential issue X", "Need to handle Y"]
}

RULES:
- Be thorough but concise
- Consider edge cases
- Plan for mobile responsiveness
- Use Tailwind semantic tokens (bg-background, text-foreground, etc.)
- Follow React/TypeScript best practices`;

const CODE_PROMPT = `You are the Code phase of a multi-stage AI pipeline.

YOUR ROLE:
1. Follow the Architect's plan exactly
2. Generate complete, production-ready code
3. Use the write_file tool for each file
4. Ensure all code is syntactically correct

You have access to these tools:
${JSON.stringify(TOOL_DEFINITIONS.slice(0, 4), null, 2)}

OUTPUT RULES:
1. Use tool calls to write files
2. Include ALL necessary imports
3. Use TypeScript with proper types
4. Use Tailwind semantic tokens
5. Make components mobile-responsive
6. Add helpful comments

EXAMPLE TOOL CALL:
{
  "tool_calls": [{
    "function": {
      "name": "write_file",
      "arguments": {
        "path": "src/components/Button.tsx",
        "content": "import React from 'react';\\n\\nexport default function Button() { ... }",
        "reason": "Primary button component"
      }
    }
  }]
}`;

const VALIDATE_PROMPT = `You are the Validation phase of a multi-stage AI pipeline.

YOUR ROLE:
1. Review the generated code for errors
2. Check for syntax issues
3. Verify all imports are correct
4. Ensure TypeScript types are valid
5. Check for potential runtime errors

OUTPUT FORMAT (JSON):
{
  "isValid": true/false,
  "issues": [
    {
      "file": "path/to/file.tsx",
      "line": 10,
      "severity": "error" | "warning",
      "message": "Description of issue",
      "fix": "Suggested fix"
    }
  ],
  "suggestions": ["Improvement suggestion"],
  "approved": true/false
}

VALIDATION CHECKS:
- Balanced brackets and parentheses
- Valid JSX syntax
- Correct import statements
- Proper TypeScript types
- React hooks rules
- No unused variables`;

// =============================================================================
// PHASE EXECUTORS
// =============================================================================

async function executeArchitectPhase(
  messages: Message[],
  existingFiles: ProjectFile[],
  apiKey: string
): Promise<{ plan: unknown; duration: number }> {
  const startTime = Date.now();

  // Build context from existing files
  let fileContext = "";
  if (existingFiles.length > 0) {
    fileContext = "\n\nEXISTING PROJECT FILES:\n";
    for (const file of existingFiles.slice(0, 8)) {
      fileContext += `\n📄 ${file.path}:\n\`\`\`\n${file.content.slice(0, 2000)}\n\`\`\`\n`;
    }
  }

  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.architect,
      messages: [
        { role: "system", content: ARCHITECT_PROMPT + fileContext },
        ...messages
      ],
      max_tokens: 4000,
      temperature: 0.3, // Lower for more deterministic planning
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Architect phase failed: ${error}`);
  }

  const data = await response.json();
  const planText = data.choices?.[0]?.message?.content || "{}";
  
  let plan;
  try {
    plan = JSON.parse(planText);
  } catch {
    plan = { understanding: planText, plan: [] };
  }

  return {
    plan,
    duration: Date.now() - startTime
  };
}

async function executeCodePhase(
  plan: unknown,
  messages: Message[],
  existingFiles: ProjectFile[],
  apiKey: string
): Promise<{ code: string; fileOperations: FileOperation[]; duration: number }> {
  const startTime = Date.now();

  // Include plan in context
  const planContext = `
ARCHITECT'S PLAN (FOLLOW EXACTLY):
${JSON.stringify(plan, null, 2)}

Now generate the code following this plan. Use write_file tool calls for each file.`;

  // Build file context
  let fileContext = "";
  if (existingFiles.length > 0) {
    fileContext = "\n\nEXISTING FILES TO PRESERVE:\n";
    for (const file of existingFiles.slice(0, 5)) {
      fileContext += `📄 ${file.path}\n`;
    }
  }

  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.code,
      messages: [
        { role: "system", content: CODE_PROMPT + fileContext },
        ...messages,
        { role: "user", content: planContext }
      ],
      max_tokens: 12000,
      temperature: 0.5,
      tools: TOOL_DEFINITIONS.slice(0, 4),
      tool_choice: "auto"
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Code phase failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const toolCalls = data.choices?.[0]?.message?.tool_calls || [];

  // Extract file operations from tool calls
  const fileOperations: FileOperation[] = [];
  
  for (const call of toolCalls) {
    if (call.function?.name === "write_file") {
      try {
        const args = typeof call.function.arguments === "string"
          ? JSON.parse(call.function.arguments)
          : call.function.arguments;
        
        fileOperations.push({
          action: "create",
          path: args.path,
          content: args.content,
          reason: args.reason || "Generated file"
        });
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }
  }

  // Also extract from traditional code blocks if no tool calls
  if (fileOperations.length === 0) {
    const extracted = extractFileOperations(content);
    fileOperations.push(...extracted);
  }

  return {
    code: content,
    fileOperations,
    duration: Date.now() - startTime
  };
}

async function executeValidatePhase(
  fileOperations: FileOperation[],
  apiKey: string
): Promise<{ validation: ValidationResult; duration: number }> {
  const startTime = Date.now();

  // First, do local validation
  const localValidation: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  for (const op of fileOperations) {
    if (op.content) {
      const ext = op.path.split(".").pop() || "";
      const result = validateCode(op.content, ext);
      
      if (!result.isValid) {
        localValidation.isValid = false;
      }
      localValidation.errors.push(...result.errors.map(e => `${op.path}: ${e}`));
      localValidation.warnings.push(...result.warnings.map(w => `${op.path}: ${w}`));
      localValidation.suggestions.push(...result.suggestions);
    }
  }

  // If local validation found critical errors, do AI validation
  if (!localValidation.isValid) {
    const codeSnippets = fileOperations
      .filter(op => op.content)
      .map(op => `📄 ${op.path}:\n\`\`\`\n${op.content?.slice(0, 3000)}\n\`\`\``)
      .join("\n\n");

    try {
      const response = await fetch(LOVABLE_AI_GATEWAY, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELS.validate,
          messages: [
            { role: "system", content: VALIDATE_PROMPT },
            { role: "user", content: `Validate this code:\n\n${codeSnippets}` }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiValidation = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        
        // Merge AI suggestions
        if (aiValidation.issues) {
          for (const issue of aiValidation.issues) {
            if (issue.severity === "error") {
              localValidation.errors.push(`${issue.file}: ${issue.message}`);
            } else {
              localValidation.warnings.push(`${issue.file}: ${issue.message}`);
            }
          }
        }
      }
    } catch (e) {
      console.error("AI validation failed:", e);
    }
  }

  return {
    validation: localValidation,
    duration: Date.now() - startTime
  };
}

// =============================================================================
// MAIN PIPELINE EXECUTOR
// =============================================================================

export async function executePipeline(
  message: string,
  conversationHistory: Message[],
  existingFiles: ProjectFile[],
  apiKey: string
): Promise<PipelineResult> {
  const startTime = Date.now();
  const phases: PhaseResult[] = [];
  let modelsUsed: string[] = [];

  const messages: Message[] = [
    ...conversationHistory.slice(-10),
    { role: "user", content: message }
  ];

  try {
    // Phase 1: Architect
    console.log("🏗️ Starting Architect phase...");
    const architectResult = await executeArchitectPhase(messages, existingFiles, apiKey);
    phases.push({
      phase: "architect",
      duration: architectResult.duration,
      model: MODELS.architect,
      success: true,
      summary: (architectResult.plan as Record<string, string>)?.understanding || "Plan created"
    });
    modelsUsed.push(MODELS.architect);

    // Phase 2: Code
    console.log("💻 Starting Code phase...");
    const codeResult = await executeCodePhase(
      architectResult.plan,
      messages,
      existingFiles,
      apiKey
    );
    phases.push({
      phase: "code",
      duration: codeResult.duration,
      model: MODELS.code,
      success: codeResult.fileOperations.length > 0,
      summary: `Generated ${codeResult.fileOperations.length} files`
    });
    modelsUsed.push(MODELS.code);

    // Phase 3: Validate
    console.log("✅ Starting Validation phase...");
    const validateResult = await executeValidatePhase(codeResult.fileOperations, apiKey);
    phases.push({
      phase: "validate",
      duration: validateResult.duration,
      model: MODELS.validate,
      success: validateResult.validation.isValid,
      summary: validateResult.validation.isValid 
        ? "All validations passed"
        : `${validateResult.validation.errors.length} errors found`
    });
    modelsUsed.push(MODELS.validate);

    // Build response
    const totalDuration = Date.now() - startTime;
    
    // Format the response for the user
    let response = "";
    
    const plan = architectResult.plan as Record<string, unknown>;
    if (plan.understanding) {
      response += `## Understanding\n${plan.understanding}\n\n`;
    }

    if (codeResult.fileOperations.length > 0) {
      response += `## Generated Files\n`;
      for (const op of codeResult.fileOperations) {
        response += `\n\`\`\`${op.path.split('.').pop()}:${op.path}\n${op.content}\n\`\`\`\n`;
      }
    }

    if (!validateResult.validation.isValid) {
      response += `\n## Validation Notes\n`;
      response += validateResult.validation.warnings.map(w => `⚠️ ${w}`).join("\n");
    }

    return {
      success: validateResult.validation.isValid,
      response,
      fileOperations: codeResult.fileOperations,
      validation: validateResult.validation,
      metadata: {
        taskType: "pipeline",
        phases,
        totalDuration,
        modelsUsed: [...new Set(modelsUsed)],
        creditsUsed: 0.30 // Architect + Code + Validate
      }
    };

  } catch (error) {
    console.error("Pipeline error:", error);
    return {
      success: false,
      response: `Pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      fileOperations: [],
      validation: { isValid: false, errors: [(error as Error).message], warnings: [], suggestions: [] },
      metadata: {
        taskType: "pipeline",
        phases,
        totalDuration: Date.now() - startTime,
        modelsUsed,
        creditsUsed: 0.10
      }
    };
  }
}

// =============================================================================
// STREAMING PIPELINE
// =============================================================================

export async function executePipelineStream(
  message: string,
  conversationHistory: Message[],
  existingFiles: ProjectFile[],
  apiKey: string
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send initial metadata
        sendEvent({ type: "phase_start", phase: "architect" });

        const messages: Message[] = [
          ...conversationHistory.slice(-10),
          { role: "user", content: message }
        ];

        // Phase 1: Architect
        const architectResult = await executeArchitectPhase(messages, existingFiles, apiKey);
        sendEvent({ 
          type: "phase_complete", 
          phase: "architect", 
          duration: architectResult.duration,
          summary: (architectResult.plan as Record<string, string>)?.understanding 
        });

        // Phase 2: Code (stream the actual code generation)
        sendEvent({ type: "phase_start", phase: "code" });
        
        const codeResult = await executeCodePhase(
          architectResult.plan,
          messages,
          existingFiles,
          apiKey
        );

        // Stream each file operation
        for (const op of codeResult.fileOperations) {
          sendEvent({ type: "file_created", path: op.path, reason: op.reason });
          // Stream the content in chunks for large files
          if (op.content) {
            const chunkSize = 500;
            for (let i = 0; i < op.content.length; i += chunkSize) {
              sendEvent({ 
                type: "content_chunk", 
                path: op.path, 
                chunk: op.content.slice(i, i + chunkSize) 
              });
            }
          }
        }

        sendEvent({ 
          type: "phase_complete", 
          phase: "code", 
          duration: codeResult.duration,
          filesCreated: codeResult.fileOperations.map(op => op.path)
        });

        // Phase 3: Validate
        sendEvent({ type: "phase_start", phase: "validate" });
        const validateResult = await executeValidatePhase(codeResult.fileOperations, apiKey);
        sendEvent({ 
          type: "phase_complete", 
          phase: "validate", 
          duration: validateResult.duration,
          isValid: validateResult.validation.isValid,
          errors: validateResult.validation.errors,
          warnings: validateResult.validation.warnings
        });

        // Send completion
        sendEvent({ type: "complete", success: validateResult.validation.isValid });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

      } catch (error) {
        sendEvent({ 
          type: "error", 
          message: error instanceof Error ? error.message : "Pipeline failed" 
        });
      } finally {
        controller.close();
      }
    }
  });
}
