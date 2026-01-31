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
// Enhanced version with better error handling and fallbacks
export function compileComponentToHtml(tsxCode: string): string {
  try {
    // First, try to find a clean JSX return statement
    let jsxContent = '';
    
    // Pattern 1: Standard return (...) pattern
    const returnMatch = tsxCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*(?:\}|$)/);
    if (returnMatch) {
      jsxContent = returnMatch[1];
    } else {
      // Pattern 2: Arrow function with implicit return
      const arrowMatch = tsxCode.match(/=>\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/);
      if (arrowMatch) {
        jsxContent = arrowMatch[1];
      } else {
        // Pattern 3: Direct JSX return without parentheses
        const directReturn = tsxCode.match(/return\s+(<[\s\S]*?>[\s\S]*?<\/\w+>)/);
        if (directReturn) {
          jsxContent = directReturn[1];
        }
      }
    }
    
    if (!jsxContent) {
      console.warn('Could not extract JSX from component');
      return generatePreviewFallback('Could not parse component JSX. The code may have syntax issues.');
    }
    
    return convertJsxToStaticHtml(jsxContent, tsxCode);
  } catch (error) {
    console.error('Failed to compile component:', error);
    return generatePreviewFallback('Preview compilation failed. Check the console for details.');
  }
}

// Generate a nice-looking fallback preview
function generatePreviewFallback(message: string): string {
  return `
    <div style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      text-align: center;
    ">
      <div style="
        background: rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 3rem;
        max-width: 500px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
      ">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1.5rem; opacity: 0.8;">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>
        <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Preview Building...</h2>
        <p style="opacity: 0.7; line-height: 1.6; margin-bottom: 1.5rem;">${message}</p>
        <p style="opacity: 0.5; font-size: 0.875rem;">Your code is saved. The preview will update when ready.</p>
      </div>
    </div>
  `;
}

// Convert JSX to static HTML with data expansion (Enhanced version)
function convertJsxToStaticHtml(jsx: string, fullCode: string): string {
  let html = jsx;
  
  try {
    // 1. Handle map patterns with proper expansion
    html = expandAllMapPatterns(html, fullCode);
    
    // 2. Handle simple conditional rendering {condition && <element>}
    // Convert to just the element (assume true for preview)
    html = html.replace(/\{[^{}]*&&\s*(<[^>]+>[^<]*<\/[^>]+>)\}/g, '$1');
    html = html.replace(/\{[^{}]*&&\s*(<[^/>]+\s*\/>)\}/g, '$1');
    
    // 3. Convert lucide-react icons to SVG placeholders
    const iconNames = ['Star', 'Zap', 'Shield', 'Check', 'ChevronRight', 'Menu', 'X', 'ArrowRight', 
                       'Heart', 'User', 'Settings', 'Home', 'Mail', 'Phone', 'MapPin', 'Calendar',
                       'Clock', 'Search', 'Plus', 'Minus', 'Edit', 'Trash', 'Download', 'Upload',
                       'Share', 'Link', 'ExternalLink', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key',
                       'Bell', 'MessageCircle', 'Send', 'Image', 'Video', 'Music', 'File', 'Folder',
                       'Code', 'Terminal', 'Database', 'Server', 'Cloud', 'Wifi', 'Bluetooth',
                       'Battery', 'Cpu', 'HardDrive', 'Monitor', 'Smartphone', 'Tablet', 'Laptop',
                       'Globe', 'Map', 'Navigation', 'Compass', 'Sun', 'Moon', 'CloudRain', 'Wind'];
    
    for (const iconName of iconNames) {
      const iconRegex = new RegExp(`<${iconName}\\s+className="([^"]*)"\\s*/>`, 'g');
      html = html.replace(iconRegex, (_, classes) => {
        return `<svg class="${classes}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${getIconPath(iconName)}"></path>
        </svg>`;
      });
    }
    
    // 4. Remove any remaining unhandled JSX expressions
    // But be careful not to break the structure
    html = html.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, ''); // Simple variables
    
    // 5. Convert JSX syntax to HTML
    html = html
      // Convert className to class
      .replace(/className=/g, 'class=')
      // Remove React-specific props
      .replace(/\s*key=\{[^}]+\}/g, '')
      .replace(/\s*onClick=\{[^}]+\}/g, '')
      .replace(/\s*onChange=\{[^}]+\}/g, '')
      .replace(/\s*onSubmit=\{[^}]+\}/g, '')
      .replace(/\s*onMouseEnter=\{[^}]+\}/g, '')
      .replace(/\s*onMouseLeave=\{[^}]+\}/g, '')
      .replace(/\s*ref=\{[^}]+\}/g, '')
      // Remove remaining unhandled JSX expressions (last resort)
      .replace(/\{[^{}]*\}/g, '')
      // Convert self-closing tags properly
      .replace(/<(img|input|br|hr|meta|link)([^>]*)\s*\/>/g, '<$1$2>')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    return html;
    
  } catch (error) {
    console.error('Error converting JSX to HTML:', error);
    // Return a cleaned but possibly imperfect version
    return html
      .replace(/className=/g, 'class=')
      .replace(/\{[^{}]*\}/g, '')
      .trim();
  }
}

// Get simple SVG path for common icons
function getIconPath(iconName: string): string {
  const iconPaths: Record<string, string> = {
    Star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    Zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    Shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    Check: 'M20 6L9 17l-5-5',
    ChevronRight: 'M9 18l6-6-6-6',
    Menu: 'M3 12h18M3 6h18M3 18h18',
    X: 'M18 6L6 18M6 6l12 12',
    ArrowRight: 'M5 12h14M12 5l7 7-7 7',
    Heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    User: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    Settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    Home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    Mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
    Phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  };
  
  return iconPaths[iconName] || 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5';
}

// Enhanced map pattern expander
function expandAllMapPatterns(htmlInput: string, fullCode: string): string {
  let result = htmlInput;
  
  // Regex to match .map() patterns
  const mapPattern = /\{(\w+)\.map\(\s*\((\w+)(?:,\s*(\w+))?\)\s*=>\s*\(/g;
  
  let match;
  while ((match = mapPattern.exec(htmlInput)) !== null) {
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
    
    // Consume the closing }
    while (endIndex < htmlInput.length && htmlInput[endIndex] !== '}') {
      endIndex++;
    }
    endIndex++; // Include the final }
    
    const fullMatch = htmlInput.substring(startIndex, endIndex);
    const templateStart = match[0].length;
    const templateEnd = fullMatch.length - 3; // Remove "))}"
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
            const propPattern = new RegExp(`\\{${itemName}\\.${key}\\}`, 'g');
            itemHtml = itemHtml.replace(propPattern, String(value));
          });
          
          // Replace index references
          if (indexName) {
            const indexPattern = new RegExp(`\\{${indexName}\\}`, 'g');
            itemHtml = itemHtml.replace(indexPattern, String(index));
          }
          
          // Handle key props
          itemHtml = itemHtml.replace(/\s*key=\{[^}]+\}/g, '');
          
          expandedHtml += itemHtml;
        });
        
        result = result.replace(fullMatch, expandedHtml);
      } catch (e) {
        console.error('Failed to expand map:', e);
        result = result.replace(fullMatch, '');
      }
    } else {
      result = result.replace(fullMatch, '');
    }
  }
  
  return result;
}

// Parse array items from string
function parseArrayItems(arrayContent: string): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  
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
  
  const content = objStr.slice(1, -1).trim();
  const pairRegex = /(\w+)\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`|(\w+))/g;
  
  let match;
  while ((match = pairRegex.exec(content)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? match[5];
    obj[key] = value;
  }
  
  return obj;
}
