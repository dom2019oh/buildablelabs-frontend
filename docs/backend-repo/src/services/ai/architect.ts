// =============================================================================
// Architect Service - BEAST MODE Project Planning (Gemini Primary)
// =============================================================================
// Converts user prompts into exhaustive, production-ready project plans.
// Uses Gemini for intent parsing and planning - NO code generated at this stage.

import { z } from 'zod';
import { aiLogger as logger } from '../../utils/logger';
import { getBuildableAI, type BuildableAIResponse } from './buildable-ai';
import { TaskType } from './models';
import type { ProjectPlan } from './pipeline';

// =============================================================================
// SCHEMA
// =============================================================================

const projectPlanSchema = z.object({
  projectType: z.enum([
    'landing-page',
    'dashboard',
    'e-commerce',
    'blog',
    'app',
    'mobile-app',
    'api',
    'fullstack',
    'saas',
    'portfolio',
  ]),
  description: z.string(),
  files: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    dependencies: z.array(z.string()),
    priority: z.number().optional(),
  })),
  dependencies: z.array(z.string()),
  routes: z.array(z.string()).optional(),
  framework: z.enum(['react', 'vue', 'svelte', 'node', 'django', 'react-native', 'flutter']).optional(),
  styling: z.enum(['tailwind', 'css', 'scss', 'styled-components']).optional(),
});

// =============================================================================
// BEAST MODE PROMPT
// =============================================================================

const BEAST_ARCHITECT_PROMPT = `You are the ARCHITECT - a world-class software architect who creates FLAWLESS project plans.

YOUR MISSION: Transform user requirements into a precise, exhaustive, production-ready implementation plan.

ANALYSIS FRAMEWORK:
1. INTENT PARSING - What exactly does the user want? Extract EVERY requirement, explicit and implied.
2. SCOPE DEFINITION - What features are needed? What's the MVP vs nice-to-have?
3. ARCHITECTURE DESIGN - How should the code be organized for maintainability?
4. COMPONENT BREAKDOWN - What components, pages, hooks, utilities are needed?
5. DATA FLOW - How does data move through the application?
6. EDGE CASES - What could go wrong? Plan error states, loading states, empty states.
7. MOBILE RESPONSIVENESS - Every page must work on mobile.

MANDATORY FILE INCLUSIONS:
For ANY project, you MUST include:
- src/components/ui/button.tsx (if using buttons)
- src/components/ui/input.tsx (if using forms)
- src/components/ui/card.tsx (if using cards)
- src/lib/utils.ts (for cn() function)
- src/index.css (Tailwind setup)
- src/App.tsx (main app with routing)

For landing pages, ALWAYS include:
- Navbar with mobile menu
- Hero section
- Features/benefits section
- Call-to-action section
- Footer

For dashboards, ALWAYS include:
- Sidebar navigation
- Header with user menu
- Main content area
- At least 2-3 dashboard widgets

OUTPUT REQUIREMENTS:
- Be EXHAUSTIVE - cover every feature mentioned or implied
- Be SPECIFIC - no vague descriptions, only concrete implementations  
- Be ORGANIZED - group related components, maintain clear hierarchy
- Be REALISTIC - assign accurate priorities and dependencies

TECHNOLOGY STACK (Default):
- React 18+ with TypeScript (strict mode)
- Tailwind CSS with semantic tokens
- Shadcn/ui components (already installed)
- React Router v6 for navigation
- Lucide React for icons

NEVER:
- Skip features mentioned by user
- Use placeholder descriptions like "add functionality here"
- Underestimate complexity
- Forget error states and loading states
- Create files without clear purpose`;

// =============================================================================
// ARCHITECT RESULT
// =============================================================================

export interface ArchitectResult {
  plan: ProjectPlan;
  tokensUsed: number;
  cost: number;
  model: string;
}

// =============================================================================
// ARCHITECT CLASS
// =============================================================================

export class Architect {
  private ai = getBuildableAI();

  /**
   * Create a structured project plan from a user prompt
   * Uses Gemini (via Buildable AI) for planning tasks
   */
  async createPlan(
    prompt: string,
    existingFiles: Array<{ file_path: string; content: string }>
  ): Promise<ArchitectResult> {
    const existingFileList = existingFiles.length > 0
      ? existingFiles.map(f => `- ${f.file_path}`).join('\n')
      : 'None (new project)';

    const userPrompt = `Create a comprehensive project plan for:

"${prompt}"

EXISTING FILES (integrate with, don't recreate):
${existingFileList}

Output ONLY valid JSON with this structure:
{
  "projectType": "landing-page" | "dashboard" | "e-commerce" | "blog" | "app" | "saas" | "portfolio" | "fullstack",
  "description": "One sentence describing what will be built",
  "files": [
    {
      "path": "src/components/Navbar.tsx",
      "purpose": "Navigation bar with mobile hamburger menu, logo, and nav links",
      "dependencies": ["src/components/ui/button.tsx"],
      "priority": 1
    }
  ],
  "dependencies": ["lucide-react"],
  "routes": ["/", "/about", "/contact"],
  "framework": "react",
  "styling": "tailwind"
}

RULES:
1. Priority 1 = build first (no dependencies or only external deps)
2. Each file must have a SPECIFIC purpose (what it does, not what it is)
3. Include ALL necessary UI components
4. Plan for mobile responsiveness
5. Include proper error and loading states in descriptions`;

    logger.info({ promptLength: prompt.length, existingFiles: existingFiles.length }, 'Creating BEAST project plan');

    const response = await this.ai.execute({
      task: TaskType.PLANNING,
      systemPrompt: BEAST_ARCHITECT_PROMPT,
      userPrompt,
      temperature: 0.5,
      maxTokens: 6000,
      jsonMode: true,
    });

    // Parse and validate
    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch (e) {
      // Try to extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse project plan JSON');
      }
    }
    
    const validated = projectPlanSchema.parse(parsed);

    // Ensure minimum file requirements
    const ensuredPlan = this.ensureMinimumFiles(validated);

    logger.info({
      filesPlanned: ensuredPlan.files.length,
      projectType: ensuredPlan.projectType,
      framework: ensuredPlan.framework || 'react',
      provider: response.provider,
      model: response.model,
    }, 'BEAST plan created successfully');

    return {
      plan: ensuredPlan,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
      model: response.model,
    };
  }

  /**
   * Ensure minimum required files are included
   */
  private ensureMinimumFiles(plan: ProjectPlan): ProjectPlan {
    const requiredFiles = [
      { path: 'src/App.tsx', purpose: 'Main application component with React Router', dependencies: [], priority: 1 },
      { path: 'src/index.css', purpose: 'Global styles with Tailwind directives and CSS variables', dependencies: [], priority: 1 },
      { path: 'src/lib/utils.ts', purpose: 'Utility functions including cn() for className merging', dependencies: [], priority: 1 },
    ];

    const existingPaths = new Set(plan.files.map(f => f.path));
    
    for (const required of requiredFiles) {
      if (!existingPaths.has(required.path)) {
        plan.files.unshift(required);
      }
    }

    return plan;
  }

  /**
   * Analyze an existing project to understand its structure
   */
  async analyzeProject(
    files: Array<{ file_path: string; content: string }>
  ): Promise<{
    framework: string;
    styling: string;
    structure: string;
    suggestions: string[];
    tokensUsed: number;
    cost: number;
  }> {
    const fileList = files.map(f => `- ${f.file_path}`).join('\n');
    const sampleContents = files
      .filter(f => f.file_path.endsWith('.tsx') || f.file_path.endsWith('.ts'))
      .slice(0, 5)
      .map(f => `### ${f.file_path}\n\`\`\`\n${f.content.slice(0, 500)}\n\`\`\``)
      .join('\n\n');

    const response = await this.ai.execute({
      task: TaskType.PLANNING,
      systemPrompt: `You are analyzing an existing project structure. Identify the framework, styling approach, and architecture.
Return JSON: { "framework": string, "styling": string, "structure": string, "suggestions": string[] }`,
      userPrompt: `Project files:\n${fileList}\n\nSample contents:\n${sampleContents}`,
      jsonMode: true,
    });

    const result = JSON.parse(response.content);

    return {
      ...result,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }

  /**
   * Expand a brief prompt into a detailed specification
   */
  async expandPrompt(
    briefPrompt: string
  ): Promise<{ expandedPrompt: string; tokensUsed: number; cost: number }> {
    const response = await this.ai.execute({
      task: TaskType.REASONING,
      systemPrompt: `You are expanding a brief project idea into a detailed specification.
Include: 
- All implied features (e.g., "landing page" implies navbar, hero, footer)
- User interactions and flows
- Data requirements
- Mobile considerations
- Error and edge cases

Keep it structured and actionable.`,
      userPrompt: `Expand this project idea into a detailed specification:\n\n${briefPrompt}`,
    });

    return {
      expandedPrompt: response.content,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost,
    };
  }
}
