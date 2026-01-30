import { create } from 'zustand';
import { FileNode, buildFileTree } from '@/components/workspace/FileExplorer';

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface ProjectFilesState {
  files: Map<string, ProjectFile>;
  fileTree: FileNode[];
  selectedFile: string | null;
  previewHtml: string | null;
  
  // Actions
  addFile: (path: string, content: string) => void;
  updateFile: (path: string, content: string) => void;
  removeFile: (path: string) => void;
  setSelectedFile: (path: string | null) => void;
  getFile: (path: string) => ProjectFile | undefined;
  setPreviewHtml: (html: string | null) => void;
  clearFiles: () => void;
  
  // Build preview from files
  buildPreview: () => string;
}

// Default project files that every project should have
const DEFAULT_FILES: ProjectFile[] = [
  {
    path: 'public/favicon.png',
    content: '<!-- favicon placeholder -->',
    language: 'text',
  },
  {
    path: 'public/robots.txt',
    content: `User-agent: *
Allow: /`,
    language: 'text',
  },
  {
    path: 'public/placeholder.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="none">
  <rect width="400" height="300" fill="#f3f4f6" rx="8"/>
  <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="16">
    Placeholder
  </text>
</svg>`,
    language: 'xml',
  },
];

export const useProjectFilesStore = create<ProjectFilesState>((set, get) => ({
  files: new Map(),
  fileTree: [],
  selectedFile: null,
  previewHtml: null,

  addFile: (path, content) => {
    set((state) => {
      const newFiles = new Map(state.files);
      const language = getLanguageFromPath(path);
      newFiles.set(path, { path, content, language });
      
      const fileTree = buildFileTree(
        Array.from(newFiles.values()).map(f => ({ path: f.path, content: f.content }))
      );
      
      return { files: newFiles, fileTree };
    });
  },

  updateFile: (path, content) => {
    set((state) => {
      const newFiles = new Map(state.files);
      const existing = newFiles.get(path);
      if (existing) {
        newFiles.set(path, { ...existing, content });
      } else {
        newFiles.set(path, { path, content, language: getLanguageFromPath(path) });
      }
      
      const fileTree = buildFileTree(
        Array.from(newFiles.values()).map(f => ({ path: f.path, content: f.content }))
      );
      
      return { files: newFiles, fileTree };
    });
  },

  removeFile: (path) => {
    set((state) => {
      const newFiles = new Map(state.files);
      newFiles.delete(path);
      
      const fileTree = buildFileTree(
        Array.from(newFiles.values()).map(f => ({ path: f.path, content: f.content }))
      );
      
      return { 
        files: newFiles, 
        fileTree,
        selectedFile: state.selectedFile === path ? null : state.selectedFile,
      };
    });
  },

  setSelectedFile: (path) => set({ selectedFile: path }),

  getFile: (path) => get().files.get(path),

  setPreviewHtml: (html) => set({ previewHtml: html }),

  clearFiles: () => {
    const newFiles = new Map<string, ProjectFile>();
    DEFAULT_FILES.forEach(f => newFiles.set(f.path, f));
    
    const fileTree = buildFileTree(
      Array.from(newFiles.values()).map(f => ({ path: f.path, content: f.content }))
    );
    
    set({ files: newFiles, fileTree, selectedFile: null, previewHtml: null });
  },

  buildPreview: () => {
    const state = get();
    const files = Array.from(state.files.values());
    
    // Find the main App or index component
    const appFile = files.find(f => 
      f.path.includes('App.tsx') || 
      f.path.includes('index.tsx') ||
      f.path.includes('page.tsx')
    );
    
    if (!appFile) {
      return state.previewHtml || '';
    }
    
    // For now, return the stored preview HTML
    // In a real implementation, we'd compile the React code
    return state.previewHtml || '';
  },
}));

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'js':
      return 'javascript';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}

// Parse AI response to extract code blocks and file paths
export function parseCodeFromResponse(response: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  
  // Match code blocks with file paths
  // Pattern: ```language:path or ```language path or file: path before code block
  const codeBlockRegex = /(?:(?:file|path)?:\s*`?([^\s`\n]+)`?\s*\n)?```(\w+)?\n([\s\S]*?)```/g;
  
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    let path = match[1];
    const language = match[2] || 'typescript';
    const content = match[3].trim();
    
    // Try to extract path from the code block header
    if (!path) {
      // Look for patterns like "// src/components/Button.tsx" at the start
      const pathMatch = content.match(/^\/\/\s*([^\s]+\.[a-z]+)/i);
      if (pathMatch) {
        path = pathMatch[1];
      }
    }
    
    // Try to infer path from content
    if (!path) {
      // Look for export default function ComponentName
      const componentMatch = content.match(/export\s+(?:default\s+)?function\s+(\w+)/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        if (language === 'tsx' || language === 'jsx' || language === 'typescript') {
          path = `src/components/${componentName}.tsx`;
        }
      }
    }
    
    // Default path based on language
    if (!path) {
      const ext = language === 'css' ? 'css' : 
                  language === 'html' ? 'html' : 
                  language === 'json' ? 'json' : 'tsx';
      path = `src/generated/code.${ext}`;
    }
    
    files.push({ path, content });
  }
  
  return files;
}

// Generate preview HTML from React component code
export function generatePreviewHtml(componentCode: string, cssCode?: string): string {
  // Create a self-contained HTML document that renders the component
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            border: 'hsl(var(--border))',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            primary: {
              DEFAULT: 'hsl(var(--primary))',
              foreground: 'hsl(var(--primary-foreground))',
            },
            secondary: {
              DEFAULT: 'hsl(var(--secondary))',
              foreground: 'hsl(var(--secondary-foreground))',
            },
            muted: {
              DEFAULT: 'hsl(var(--muted))',
              foreground: 'hsl(var(--muted-foreground))',
            },
            accent: {
              DEFAULT: 'hsl(var(--accent))',
              foreground: 'hsl(var(--accent-foreground))',
            },
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --accent: 210 40% 96.1%;
      --accent-foreground: 222.2 47.4% 11.2%;
      --border: 214.3 31.8% 91.4%;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      min-height: 100vh;
    }
    
    ${cssCode || ''}
  </style>
</head>
<body>
  <div id="root">
    ${componentCode}
  </div>
</body>
</html>`;
}
