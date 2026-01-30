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
// Supports format: ```language:path/to/file.ext
export function parseCodeFromResponse(response: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  
  // Primary pattern: ```language:path/to/file.ext
  // This is the format we instruct the AI to use
  const primaryRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
  
  let match;
  while ((match = primaryRegex.exec(response)) !== null) {
    const language = match[1];
    const path = match[2].trim();
    const content = match[3].trim();
    
    if (path && content) {
      files.push({ path, content });
    }
  }
  
  // If no files found with primary pattern, try fallback patterns
  if (files.length === 0) {
    // Fallback: Look for "File: path" or "**path**" before code blocks
    const fallbackRegex = /(?:(?:File|Path):\s*`?([^\s`\n]+)`?|(?:\*\*([^\*\n]+)\*\*))\s*\n```(\w+)?\n([\s\S]*?)```/gi;
    
    while ((match = fallbackRegex.exec(response)) !== null) {
      const path = (match[1] || match[2] || '').trim();
      const content = match[4].trim();
      
      if (path && content && path.includes('/')) {
        files.push({ path, content });
      }
    }
  }
  
  // Last resort: Try to infer from component exports
  if (files.length === 0) {
    const simpleRegex = /```(tsx?|jsx?)\n([\s\S]*?)```/g;
    let fileIndex = 0;
    
    while ((match = simpleRegex.exec(response)) !== null) {
      const content = match[2].trim();
      
      // Try to extract component name
      const componentMatch = content.match(/(?:export\s+default\s+function|function|const)\s+(\w+)/);
      const componentName = componentMatch?.[1] || `Component${fileIndex}`;
      
      // Check if it looks like a main page/landing component
      const isPage = /(?:Page|Landing|Home|App)/i.test(componentName);
      const path = isPage 
        ? `src/components/${componentName}.tsx`
        : `src/components/${componentName}.tsx`;
      
      files.push({ path, content });
      fileIndex++;
    }
  }
  
  return files;
}

// Strip code blocks from response for clean chat display
export function stripCodeBlocksFromResponse(response: string): string {
  // Remove code blocks but keep the introductory text
  let cleaned = response
    // Remove ```language:path blocks
    .replace(/```\w+:[^\n]+\n[\s\S]*?```/g, '')
    // Remove regular code blocks
    .replace(/```\w*\n[\s\S]*?```/g, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // If almost nothing left, provide a default message
  if (cleaned.length < 20) {
    return '';
  }
  
  return cleaned;
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
    
    /* Hide scrollbar for preview */
    html, body {
      scrollbar-width: none;
      -ms-overflow-style: none;
      overflow-x: hidden;
    }
    
    html::-webkit-scrollbar,
    body::-webkit-scrollbar {
      display: none;
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

// Compile TSX component to static HTML for preview
export function compileComponentToHtml(tsxCode: string): string {
  try {
    // Extract the component's JSX return statement
    const returnMatch = tsxCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*(?:\}|$)/);
    if (!returnMatch) {
      // Try arrow function with implicit return
      const arrowMatch = tsxCode.match(/=>\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/);
      if (!arrowMatch) {
        return '<div class="flex items-center justify-center h-screen text-white"><p>Preview loading...</p></div>';
      }
      return convertJsxToStaticHtml(arrowMatch[1], tsxCode);
    }
    
    return convertJsxToStaticHtml(returnMatch[1], tsxCode);
  } catch (error) {
    console.error('Failed to compile component:', error);
    return '<div class="flex items-center justify-center h-screen text-white"><p>Preview error</p></div>';
  }
}

// Convert JSX to static HTML with data expansion
function convertJsxToStaticHtml(jsx: string, fullCode: string): string {
  let html = jsx;
  
  // 1. Find and expand ALL map patterns more robustly
  // Handle: {array.map((item, index) => ( ... ))}
  // Handle: {array.map((item) => ( ... ))}
  // Handle nested parentheses properly
  
  const expandMaps = (htmlInput: string): string => {
    // Regex to match .map() patterns with balanced parentheses
    const mapPattern = /\{(\w+)\.map\(\s*\((\w+)(?:,\s*(\w+))?\)\s*=>\s*\(/g;
    
    let result = htmlInput;
    let match;
    const mapPatternCopy = new RegExp(mapPattern);
    
    while ((match = mapPatternCopy.exec(htmlInput)) !== null) {
      const startIndex = match.index;
      const arrayName = match[1];
      const itemName = match[2];
      const indexName = match[3];
      
      // Find the matching closing ))} by counting parentheses
      let depth = 2; // We start after "=> ("
      let endIndex = startIndex + match[0].length;
      
      while (depth > 0 && endIndex < htmlInput.length) {
        const char = htmlInput[endIndex];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        endIndex++;
      }
      
      // Need to also consume the closing }
      while (endIndex < htmlInput.length && htmlInput[endIndex] !== '}') {
        endIndex++;
      }
      endIndex++; // Include the final }
      
      const fullMatch = htmlInput.substring(startIndex, endIndex);
      const templateStart = match[0].length;
      const templateEnd = fullMatch.length - 3; // Remove "))}""
      const template = fullMatch.substring(templateStart, templateEnd);
      
      // Find the array definition in the code
      const arrayRegex = new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
      const arrayMatch = fullCode.match(arrayRegex);
      
      if (arrayMatch) {
        try {
          const items = parseArrayItems(arrayMatch[1]);
          
          // Expand the map into static HTML
          let expandedHtml = '';
          items.forEach((item, index) => {
            let itemHtml = template;
            
            // Replace item property references
            Object.entries(item).forEach(([key, value]) => {
              // Replace {item.property} patterns
              const propPattern = new RegExp(`\\{${itemName}\\.${key}\\}`, 'g');
              itemHtml = itemHtml.replace(propPattern, String(value));
            });
            
            // Replace index references
            if (indexName) {
              const indexPattern = new RegExp(`\\{${indexName}\\}`, 'g');
              itemHtml = itemHtml.replace(indexPattern, String(index));
            }
            
            // Handle key={...} props - remove them as they're React-specific
            itemHtml = itemHtml.replace(/\s*key=\{[^}]+\}/g, '');
            
            // Handle icon components - convert to SVG placeholder
            itemHtml = itemHtml.replace(/<(\w+)\.icon\s+className="([^"]+)"\s*\/>/g, 
              '<svg class="$2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>');
            itemHtml = itemHtml.replace(/<feature\.icon\s+className="([^"]+)"\s*\/>/gi,
              '<svg class="$1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>');
            itemHtml = itemHtml.replace(/<item\.icon\s+className="([^"]+)"\s*\/>/gi,
              '<svg class="$1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>');
            
            expandedHtml += itemHtml;
          });
          
          result = result.replace(fullMatch, expandedHtml);
        } catch (e) {
          console.error('Failed to expand map:', e);
          // Remove the failed map expression to avoid showing raw JSX
          result = result.replace(fullMatch, '');
        }
      } else {
        // If array not found, remove the map expression
        result = result.replace(fullMatch, '');
      }
    }
    
    return result;
  };
  
  html = expandMaps(html);
  
  // 2. Remove any remaining JSX expressions that weren't handled (like {variable})
  // But preserve the content structure
  html = html.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, '');
  
  // 3. Convert JSX syntax to HTML
  html = html
    // Convert className to class
    .replace(/className=/g, 'class=')
    // Remove React-specific props
    .replace(/\s*key=\{[^}]+\}/g, '')
    .replace(/\s*onClick=\{[^}]+\}/g, '')
    .replace(/\s*onChange=\{[^}]+\}/g, '')
    .replace(/\s*onSubmit=\{[^}]+\}/g, '')
    // Remove remaining unhandled JSX expressions
    .replace(/\{[^{}]*\}/g, '')
    // Convert self-closing tags properly
    .replace(/<(\w+)([^>]*)\s*\/>/g, '<$1$2></$1>')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  return html;
}

// Parse array items from string (improved parser)
function parseArrayItems(arrayContent: string): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  
  // Split by top-level objects using balanced brace matching
  let depth = 0;
  let currentItem = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < arrayContent.length; i++) {
    const char = arrayContent[i];
    const prevChar = i > 0 ? arrayContent[i - 1] : '';
    
    // Handle string boundaries
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') {
        if (depth === 0) currentItem = '';
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          currentItem += char;
          const obj = parseObjectLiteral(currentItem);
          if (Object.keys(obj).length > 0) {
            items.push(obj);
          }
          currentItem = '';
          continue;
        }
      }
    }
    
    if (depth > 0) {
      currentItem += char;
    }
  }
  
  return items;
}

// Parse a single object literal
function parseObjectLiteral(objStr: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  
  // Remove outer braces
  const content = objStr.slice(1, -1).trim();
  
  // Match key-value pairs, handling strings and identifiers
  const pairRegex = /(\w+)\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`|(\w+))/g;
  
  let match;
  while ((match = pairRegex.exec(content)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? match[5];
    obj[key] = value;
  }
  
  return obj;
}
