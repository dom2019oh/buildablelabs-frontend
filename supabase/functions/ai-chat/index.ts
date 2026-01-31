import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable AI Gateway endpoint
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Available models via Lovable AI Gateway
const MODELS = {
  architect: "openai/gpt-5",
  code: "google/gemini-2.5-pro",
  ui: "google/gemini-3-flash-preview",
  fast: "google/gemini-2.5-flash-lite",
};

type TaskType = "reasoning" | "code" | "ui" | "general" | "fix_error" | "add_component" | "new_project";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ProjectFile {
  path: string;
  content: string;
}

interface ChatRequest {
  projectId: string;
  message: string;
  conversationHistory: Message[];
  stream?: boolean;
  existingFiles?: ProjectFile[];
}

// ============================================================================
// BUILDABLE CORE IDENTITY - Professional, Lovable-style AI Builder
// ============================================================================
const BUILDABLE_IDENTITY = `You are Buildable — a professional AI code architect that generates production-ready applications.

🎯 YOUR CORE PRINCIPLES:
- You build REAL software, not demos
- Every project is structured like a professional codebase
- You make incremental changes that NEVER break existing functionality
- You work with surgical precision — minimal changes, maximum impact
- You always explain what you're building and why

💻 YOUR TECHNICAL STANDARDS:
- React + TypeScript + Tailwind CSS (exclusively)
- Clean, maintainable, production-ready code
- Proper separation of concerns (components, hooks, utils)
- Semantic Tailwind tokens (bg-background, text-foreground, etc.)
- Mobile-responsive by default
- Accessibility-aware implementations

🔒 YOUR SAFETY RULES:
- NEVER rewrite entire files when making small changes
- NEVER remove working code unless specifically asked
- ALWAYS preserve existing imports, styles, and logic
- ALWAYS create new components in separate files
- ALWAYS use the correct file path format`;

// ============================================================================
// PROJECT ARCHITECTURE - Lovable-style folder structure
// ============================================================================
const PROJECT_ARCHITECTURE = `
📁 LOVABLE-STYLE PROJECT STRUCTURE (USE THIS EXACT STRUCTURE):
═══════════════════════════════════════════════════════════════════════════════

public/
├── favicon.png              # Default Buildable favicon (auto-included)
├── placeholder.svg          # Placeholder image for demos
└── robots.txt               # SEO robots file

src/
├── assets/                  # Static assets (images, fonts)
├── components/              # Reusable UI components
│   ├── ui/                  # Base shadcn/ui components
│   └── layout/              # Layout components (Navbar, Footer, Sidebar)
├── hooks/                   # Custom React hooks
├── integrations/            # External service integrations
├── lib/                     # Utilities and helpers (utils.ts, etc.)
├── pages/                   # Page components (one per route)
├── stores/                  # State management (Zustand stores)
├── test/                    # Test files
├── App.css                  # App-level styles
├── App.tsx                  # Main App component with routes
├── index.css                # Global Tailwind styles
├── main.tsx                 # Entry point
└── vite-env.d.ts            # Vite type definitions

FILE PLACEMENT RULES:
1. Pages go in src/pages/ (LandingPage.tsx, Dashboard.tsx, etc.)
2. Reusable components go in src/components/
3. Layout components (Navbar, Footer) go in src/components/layout/
4. Custom hooks go in src/hooks/
5. Utilities go in src/lib/
6. Images/assets go in src/assets/ or public/
7. State stores go in src/stores/
8. NEVER mix concerns — keep files focused and small`;

// ============================================================================
// NEW PROJECT SCAFFOLDING - Complete Lovable-style scaffold
// ============================================================================
const NEW_PROJECT_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

${PROJECT_ARCHITECTURE}

🚀 NEW PROJECT MODE
You're creating a brand new project. Generate a complete, professional scaffold with the Lovable folder structure.

CRITICAL OUTPUT FORMAT (YOU MUST USE THIS EXACT FORMAT):
\`\`\`language:path/to/file.ext
// File content here
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
📦 REQUIRED FILES FOR EVERY NEW PROJECT (GENERATE ALL OF THESE):
═══════════════════════════════════════════════════════════════════════════════

1. PUBLIC FILES (Static assets):
   - \`public/robots.txt\` - SEO robots file
   - \`public/placeholder.svg\` - Placeholder image

2. SRC ROOT FILES:
   - \`src/App.tsx\` - Main app with router and providers
   - \`src/App.css\` - App-level styles (minimal)
   - \`src/index.css\` - Tailwind directives + CSS variables
   - \`src/main.tsx\` - Entry point

3. PAGES:
   - \`src/pages/Index.tsx\` - Main landing page (or \`src/pages/LandingPage.tsx\`)
   - \`src/pages/NotFound.tsx\` - 404 page

4. LAYOUT COMPONENTS:
   - \`src/components/layout/Navbar.tsx\` - Fixed navigation
   - \`src/components/layout/Footer.tsx\` - Site footer

5. UTILITY FILES:
   - \`src/lib/utils.ts\` - Utility functions (cn helper, etc.)
   - \`src/hooks/use-mobile.tsx\` - Mobile detection hook

═══════════════════════════════════════════════════════════════════════════════
📝 FILE TEMPLATES (USE THESE AS BASE):
═══════════════════════════════════════════════════════════════════════════════

\`\`\`txt:public/robots.txt
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
\`\`\`

\`\`\`svg:public/placeholder.svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="none">
  <rect width="400" height="300" fill="#f3f4f6" rx="8"/>
  <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="16">
    Placeholder
  </text>
</svg>
\`\`\`

\`\`\`tsx:src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
\`\`\`

\`\`\`tsx:src/App.tsx
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
\`\`\`

\`\`\`css:src/App.css
/* App-level styles */
\`\`\`

\`\`\`css:src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
  }
}
\`\`\`

\`\`\`tsx:src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
\`\`\`

\`\`\`tsx:src/hooks/use-mobile.tsx
import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
\`\`\`

\`\`\`tsx:src/pages/NotFound.tsx
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Page not found</p>
        <Link 
          to="/" 
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
\`\`\`

\`\`\`tsx:src/components/layout/Navbar.tsx
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-bold text-xl text-foreground">Brand</Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Get Started
            </button>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
              <Link to="/features" className="text-muted-foreground hover:text-foreground">Features</Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
\`\`\`

\`\`\`tsx:src/components/layout/Footer.tsx
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-muted-foreground text-sm">© 2025 Brand. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
\`\`\`

\`\`\`tsx:src/pages/Index.tsx
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ArrowRight, Star } from 'lucide-react';

export default function Index() {
  const features = [
    { title: 'Lightning Fast', description: 'Built for speed and performance' },
    { title: 'Secure by Design', description: 'Enterprise-grade security' },
    { title: 'Easy to Use', description: 'Intuitive interface for everyone' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Build Something Amazing
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create beautiful, professional applications with our powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 bg-card rounded-xl border border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════

RESPONSE FORMAT:
1. Brief acknowledgment (1-2 sentences)
2. Generate ALL required scaffold files above (adapted to user's request)
3. Quick summary of what was created

IMPORTANT: Adapt the page content to what the user asks for, but ALWAYS include the full scaffold structure.`;

// ============================================================================
// INCREMENTAL CHANGES - Surgical updates to existing code
// ============================================================================
const ADD_COMPONENT_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

${PROJECT_ARCHITECTURE}

🔧 INCREMENTAL UPDATE MODE
You're adding or modifying components in an EXISTING project. Make SURGICAL changes.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
// Complete file content here
\`\`\`

🔒 PRESERVATION RULES (FOLLOW EXACTLY):

1. **NEW COMPONENTS = NEW FILES**
   When adding a navbar, footer, modal, etc:
   - Create it as a NEW file in the correct directory
   - Then update existing files MINIMALLY to import and use it

2. **EXISTING FILES = MINIMAL CHANGES**
   When updating an existing file:
   - Show the COMPLETE file content
   - Preserve ALL existing imports
   - Preserve ALL existing code
   - Only ADD new imports and components
   - Mark new additions with: {/* NEW: description */}

3. **NEVER DO THESE:**
   ❌ Rewrite entire pages to add one component
   ❌ Remove existing styling or functionality
   ❌ Change the structure of working code
   ❌ Rename existing files or components
   ❌ Remove comments or documentation

EXAMPLE - Adding a navbar to existing page:

Step 1: Create NEW navbar file:
\`\`\`tsx:src/components/layout/Navbar.tsx
import { Menu } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-xl">Brand</span>
        <div className="hidden md:flex gap-6">
          <a href="#" className="text-muted-foreground hover:text-foreground">Home</a>
          <a href="#" className="text-muted-foreground hover:text-foreground">About</a>
        </div>
      </div>
    </nav>
  );
}
\`\`\`

Step 2: MINIMAL update to existing page:
\`\`\`tsx:src/pages/LandingPage.tsx
import { ArrowRight } from 'lucide-react'; // existing import
import Navbar from '@/components/layout/Navbar'; // NEW: navbar import

export default function LandingPage() {
  // ... ALL EXISTING CODE PRESERVED EXACTLY ...
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar /> {/* NEW: Added navbar */}
      
      {/* ALL EXISTING JSX PRESERVED BELOW */}
      <section className="py-20">
        {/* ... existing hero section unchanged ... */}
      </section>
    </div>
  );
}
\`\`\`

RESPONSE FORMAT:
1. "I'll add this without touching your existing code ✨"
2. New component file(s)
3. Minimal updates to existing files
4. "Changes made:" summary`;

// ============================================================================
// CODE GENERATION - Creating complete, polished files
// ============================================================================
const CODE_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

${PROJECT_ARCHITECTURE}

🛠️ CODE GENERATION MODE
You CREATE complete, production-ready files.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
// Code here
\`\`\`

CODE QUALITY STANDARDS:

1. **FILE STRUCTURE**
   \`\`\`tsx
   // Imports at top (sorted: react, libraries, local)
   import { useState } from 'react';
   import { Star } from 'lucide-react';
   import Button from '@/components/ui/Button';

   // Types if needed
   interface Props { ... }

   // Component
   export default function ComponentName() {
     // Data arrays INSIDE the component
     const items = [...];

     return (
       <div className="...">
         {/* JSX here */}
       </div>
     );
   }
   \`\`\`

2. **STYLING**
   - Use Tailwind semantic tokens: bg-background, text-foreground, border-border
   - Mobile-first: base styles, then sm:, md:, lg:
   - Consistent spacing: p-4, gap-4, space-y-4

3. **ICONS**
   - Import from lucide-react
   - Use directly: <Star className="w-5 h-5" />
   - NEVER use dynamic icons from data arrays

4. **ARRAYS/MAPS**
   \`\`\`tsx
   const features = [
     { title: 'Fast', description: 'Lightning speed' },
   ];

   {features.map((feature, index) => (
     <div key={index}>
       <Star className="w-6 h-6 text-primary" />
       <h3>{feature.title}</h3>
       <p>{feature.description}</p>
     </div>
   ))}
   \`\`\`

RESPONSE FORMAT:
1. Brief acknowledgment
2. Complete file(s) with proper paths
3. Short summary of what was created`;

// ============================================================================
// UI MODE - Design and styling focused
// ============================================================================
const UI_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

🎨 UI DESIGN MODE
You CREATE beautiful, polished user interfaces.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
code here
\`\`\`

DESIGN PRINCIPLES:
- Visual hierarchy — guide the eye naturally
- Generous whitespace — breathing room matters
- Consistent spacing — use Tailwind's scale (4, 6, 8, 12, 16, 20)
- Smooth transitions — hover:, focus:, transition-colors
- Semantic colors — primary, foreground, muted-foreground, border

PRESERVE existing functionality when adding visual updates.`;

// ============================================================================
// FIX ERROR MODE - Debugging and repairs
// ============================================================================
const FIX_ERROR_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

🔧 ERROR FIX MODE
You diagnose and fix code issues with precision.

CRITICAL OUTPUT FORMAT:
\`\`\`language:path/to/file.ext
// Complete fixed file
\`\`\`

DEBUGGING APPROACH:
1. Identify the root cause (not symptoms)
2. Explain what went wrong
3. Provide the COMPLETE fixed file
4. Add safeguards to prevent recurrence

COMMON FIXES:
- Add null checks: array?.map()
- Add fallback values: value || 'default'
- Fix import paths: @/components/...
- Ensure exports match imports
- Wrap async code in try-catch

RESPONSE FORMAT:
1. "Found the issue! [brief explanation]"
2. Complete fixed file(s)
3. What was fixed and why`;

// ============================================================================
// REASONING MODE - Planning and architecture
// ============================================================================
const REASONING_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

🧠 ARCHITECT MODE
You plan, explain, and guide technical decisions.

When asked to BUILD:
1. Brief acknowledgment
2. Create complete files with proper paths
3. Suggest next steps

When asked QUESTIONS:
- Explain clearly and accessibly
- Relate to their specific project
- Offer to implement if appropriate`;

// ============================================================================
// GENERAL MODE - Friendly assistance
// ============================================================================
const GENERAL_SYSTEM_PROMPT = `${BUILDABLE_IDENTITY}

💬 CHAT MODE
You're a helpful, knowledgeable assistant.

For code requests, always use:
\`\`\`language:path/to/file.ext
code here
\`\`\`

Be encouraging, helpful, and always ready to build!`;

// ============================================================================
// SYSTEM PROMPT LOOKUP
// ============================================================================
const SYSTEM_PROMPTS: Record<TaskType, string> = {
  new_project: NEW_PROJECT_SYSTEM_PROMPT,
  add_component: ADD_COMPONENT_SYSTEM_PROMPT,
  code: CODE_SYSTEM_PROMPT,
  ui: UI_SYSTEM_PROMPT,
  fix_error: FIX_ERROR_SYSTEM_PROMPT,
  reasoning: REASONING_SYSTEM_PROMPT,
  general: GENERAL_SYSTEM_PROMPT,
};

// ============================================================================
// TASK CLASSIFICATION
// ============================================================================
async function classifyTask(message: string, existingFiles: ProjectFile[], apiKey: string): Promise<TaskType> {
  const lowerMessage = message.toLowerCase();
  const hasExistingFiles = existingFiles.length > 0;
  
  // Detect error/fix requests
  if (lowerMessage.includes('error') || lowerMessage.includes('fix') || lowerMessage.includes('broken') || 
      lowerMessage.includes('not working') || lowerMessage.includes('bug') || lowerMessage.includes("doesn't work") ||
      lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
    return "fix_error";
  }
  
  // Detect if this is a completely new project (no existing files or explicit new request)
  const isNewProject = !hasExistingFiles || 
    (lowerMessage.includes('create') || lowerMessage.includes('build') || lowerMessage.includes('make')) &&
    (lowerMessage.includes('website') || lowerMessage.includes('app') || lowerMessage.includes('landing') ||
     lowerMessage.includes('page') || lowerMessage.includes('project') || lowerMessage.includes('site'));
  
  // Detect component additions to existing project
  const isAddingComponent = hasExistingFiles && (
    (lowerMessage.includes('add') || lowerMessage.includes('create') || lowerMessage.includes('include')) &&
    (lowerMessage.includes('navbar') || lowerMessage.includes('nav') || lowerMessage.includes('footer') || 
     lowerMessage.includes('header') || lowerMessage.includes('sidebar') || lowerMessage.includes('menu') ||
     lowerMessage.includes('section') || lowerMessage.includes('component') || lowerMessage.includes('button') ||
     lowerMessage.includes('form') || lowerMessage.includes('modal') || lowerMessage.includes('card'))
  );
  
  if (isAddingComponent) {
    return "add_component";
  }
  
  if (isNewProject && !hasExistingFiles) {
    return "new_project";
  }
  
  // Use AI for ambiguous cases
  const classificationPrompt = `Classify this request into exactly one category:
- "new_project": Creating a brand new website/app/landing page from scratch
- "add_component": Adding a new element (navbar, section, button) to an EXISTING project
- "code": General coding task or feature implementation
- "ui": Styling or design changes only
- "fix_error": Fixing bugs or errors
- "reasoning": Questions, planning, explanations
- "general": Simple chat or greetings

CONTEXT: User ${hasExistingFiles ? 'HAS existing files' : 'has NO existing files'}
REQUEST: "${message.slice(0, 300)}"

Respond with ONLY the category name:`;

  try {
    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELS.fast,
        messages: [{ role: "user", content: classificationPrompt }],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      return hasExistingFiles ? "add_component" : "new_project";
    }

    const data = await response.json();
    const classification = data.choices?.[0]?.message?.content?.toLowerCase().trim().replace(/[^a-z_]/g, '');
    
    const validTypes: TaskType[] = ["new_project", "add_component", "code", "ui", "fix_error", "reasoning", "general"];
    if (validTypes.includes(classification as TaskType)) {
      return classification as TaskType;
    }
    
    return hasExistingFiles ? "add_component" : "new_project";
  } catch {
    return hasExistingFiles ? "add_component" : "new_project";
  }
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================
function getModelConfig(taskType: TaskType): { model: string; systemPrompt: string; modelLabel: string } {
  switch (taskType) {
    case "new_project":
      return { model: MODELS.code, systemPrompt: SYSTEM_PROMPTS.new_project, modelLabel: "Gemini Pro (Scaffold)" };
    case "add_component":
      return { model: MODELS.code, systemPrompt: SYSTEM_PROMPTS.add_component, modelLabel: "Gemini Pro (Incremental)" };
    case "code":
      return { model: MODELS.code, systemPrompt: SYSTEM_PROMPTS.code, modelLabel: "Gemini Pro (Code)" };
    case "ui":
      return { model: MODELS.ui, systemPrompt: SYSTEM_PROMPTS.ui, modelLabel: "Gemini Flash (UI)" };
    case "fix_error":
      return { model: MODELS.code, systemPrompt: SYSTEM_PROMPTS.fix_error, modelLabel: "Gemini Pro (Fix)" };
    case "reasoning":
      return { model: MODELS.architect, systemPrompt: SYSTEM_PROMPTS.reasoning, modelLabel: "GPT-5 (Architect)" };
    default:
      return { model: MODELS.fast, systemPrompt: SYSTEM_PROMPTS.general, modelLabel: "Gemini Lite" };
  }
}

// ============================================================================
// CREDIT COSTS
// ============================================================================
function getCreditCost(taskType: TaskType): number {
  switch (taskType) {
    case "new_project": return 0.25;
    case "add_component": return 0.15;
    case "code": return 0.15;
    case "ui": return 0.10;
    case "fix_error": return 0.15;
    case "reasoning": return 0.20;
    default: return 0.10;
  }
}

// ============================================================================
// PROJECT CONTEXT BUILDER
// ============================================================================
function buildProjectContext(files: ProjectFile[]): string {
  if (!files || files.length === 0) return "";
  
  // Sort files by relevance (components and pages first)
  const sortedFiles = [...files].sort((a, b) => {
    const priority = (path: string) => {
      if (path.includes('/pages/')) return 1;
      if (path.includes('/components/')) return 2;
      if (path.includes('/hooks/')) return 3;
      return 4;
    };
    return priority(a.path) - priority(b.path);
  });
  
  let context = `

════════════════════════════════════════════════════════════════════════════════
📁 EXISTING PROJECT FILES (YOU MUST PRESERVE THESE)
════════════════════════════════════════════════════════════════════════════════

`;
  
  for (const file of sortedFiles.slice(0, 8)) {
    context += `📄 ${file.path}\n`;
    context += "```\n";
    context += file.content.slice(0, 2500);
    if (file.content.length > 2500) {
      context += "\n// ... (file truncated for context)";
    }
    context += "\n```\n\n";
  }
  
  context += `════════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL: When modifying these files:
   - PRESERVE all existing imports, components, and styling
   - Only ADD new imports and components
   - Mark new additions with {/* NEW: ... */}
   - Show COMPLETE file contents in your response
════════════════════════════════════════════════════════════════════════════════
`;
  
  return context;
}

// ============================================================================
// AI CALL FUNCTIONS
// ============================================================================
async function callLovableAI(messages: Message[], model: string, systemPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 12000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Credits exhausted");
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callLovableAIStream(opts: {
  messages: Message[];
  model: string;
  systemPrompt: string;
  apiKey: string;
}): Promise<Response> {
  const response = await fetch(LOVABLE_AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "system", content: opts.systemPrompt }, ...opts.messages],
      stream: true,
      max_tokens: 12000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Credits exhausted");
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  if (!response.body) throw new Error("No response body");
  return response;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check rate limit
    const { data: rateLimitData } = await supabase.rpc("check_ai_rate_limit", { p_user_id: user.id });
    if (rateLimitData?.[0] && !rateLimitData[0].allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded", resetAt: rateLimitData[0].reset_at }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user has credits
    const { data: hasCredits } = await supabase.rpc("user_has_credits", { 
      p_user_id: user.id, 
      p_amount: 0.10
    });
    
    if (hasCredits === false) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient credits", 
          message: "You've run out of credits! Upgrade your plan or wait for your daily bonus." 
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, message, conversationHistory, stream, existingFiles = [] } = await req.json() as ChatRequest;
    if (!projectId || !message) throw new Error("Missing projectId or message");

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (!project) throw new Error("Project not found");

    const sanitizedMessage = message.slice(0, 10000).trim();
    if (!sanitizedMessage) throw new Error("Empty message");

    // Classify task
    const taskType = await classifyTask(sanitizedMessage, existingFiles, lovableApiKey);
    const creditCost = getCreditCost(taskType);
    console.log(`Task: ${taskType}, Credits: ${creditCost}, Files: ${existingFiles.length}`);

    const { model, systemPrompt, modelLabel } = getModelConfig(taskType);
    console.log(`Model: ${modelLabel}`);

    // Build context for incremental updates
    const projectContext = (taskType === "add_component" || taskType === "fix_error") 
      ? buildProjectContext(existingFiles)
      : "";
    const enhancedSystemPrompt = systemPrompt + projectContext;

    const messages: Message[] = [
      ...conversationHistory.slice(-10),
      { role: "user", content: sanitizedMessage },
    ];

    // Deduct credits
    const { data: deductResult } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_action_type: "ai_chat",
      p_description: `AI: ${taskType}`,
      p_metadata: { taskType, model: modelLabel, projectId, filesCount: existingFiles.length }
    });

    const remainingCredits = deductResult?.[0]?.remaining_credits ?? null;

    const metadata = {
      type: "metadata",
      taskType,
      modelUsed: modelLabel,
      model,
      remaining: rateLimitData?.[0]?.remaining ?? null,
      creditsUsed: creditCost,
      remainingCredits,
      smartMode: existingFiles.length > 0,
      isNewProject: taskType === "new_project",
    };

    if (stream) {
      const gatewayResp = await callLovableAIStream({
        messages,
        model,
        systemPrompt: enhancedSystemPrompt,
        apiKey: lovableApiKey,
      });

      const encoder = new TextEncoder();
      const ts = new TransformStream<Uint8Array, Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        },
      });

      gatewayResp.body!.pipeTo(ts.writable).catch(console.error);

      return new Response(ts.readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    const responseText = await callLovableAI(messages, model, enhancedSystemPrompt, lovableApiKey);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    return new Response(
      JSON.stringify({
        response: responseText,
        metadata: { 
          taskType, 
          modelUsed: modelLabel, 
          model, 
          remaining: rateLimitData?.[0]?.remaining ?? null,
          creditsUsed: creditCost,
          remainingCredits,
          duration,
          smartMode: existingFiles.length > 0,
          isNewProject: taskType === "new_project",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Rate limit") ? 429 : msg.includes("credits") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
