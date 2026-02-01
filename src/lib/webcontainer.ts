// =============================================================================
// WebContainer Integration - Real Vite/React Preview Sandbox
// =============================================================================

import { WebContainer } from "@webcontainer/api";

export interface WebContainerFile {
  file: {
    contents: string;
  };
}

export interface WebContainerDirectory {
  directory: Record<string, WebContainerFile | WebContainerDirectory>;
}

export type FileSystemTree = Record<string, WebContainerFile | WebContainerDirectory>;

export interface SandboxState {
  status: "idle" | "booting" | "installing" | "running" | "error";
  previewUrl: string | null;
  error: string | null;
  logs: string[];
}

// Singleton WebContainer instance
let webContainerInstance: WebContainer | null = null;
let isBooting = false;

// =============================================================================
// VITE REACT TEMPLATE - Base files for every project
// =============================================================================

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 3000,
  },
})`;

const PACKAGE_JSON = `{
  "name": "buildable-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "@tanstack/react-query": "^5.83.0",
    "lucide-react": "^0.462.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.6.2",
    "vite": "^6.0.5"
  }
}`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;

const TSCONFIG_NODE = `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Buildable Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}`;

const POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

// =============================================================================
// WEBCONTAINER MANAGER
// =============================================================================

export async function getWebContainer(): Promise<WebContainer> {
  if (webContainerInstance) {
    return webContainerInstance;
  }

  if (isBooting) {
    // Wait for existing boot to complete
    while (isBooting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (webContainerInstance) {
      return webContainerInstance;
    }
  }

  isBooting = true;

  try {
    console.log("🚀 Booting WebContainer...");
    webContainerInstance = await WebContainer.boot();
    console.log("✅ WebContainer booted successfully");
    return webContainerInstance;
  } catch (error) {
    console.error("❌ Failed to boot WebContainer:", error);
    throw error;
  } finally {
    isBooting = false;
  }
}

export function teardownWebContainer(): void {
  if (webContainerInstance) {
    webContainerInstance.teardown();
    webContainerInstance = null;
  }
}

// =============================================================================
// PROJECT FILE CONVERTER
// =============================================================================

interface ProjectFile {
  path: string;
  content: string;
}

export function convertToFileSystemTree(files: ProjectFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  // Add base template files
  const baseFiles: Record<string, string> = {
    "package.json": PACKAGE_JSON,
    "vite.config.ts": VITE_CONFIG,
    "tsconfig.json": TSCONFIG,
    "tsconfig.node.json": TSCONFIG_NODE,
    "index.html": INDEX_HTML,
    "tailwind.config.js": TAILWIND_CONFIG,
    "postcss.config.js": POSTCSS_CONFIG,
  };

  for (const [path, content] of Object.entries(baseFiles)) {
    tree[path] = { file: { contents: content } };
  }

  // Add project files
  for (const file of files) {
    const parts = file.path.split("/");
    let current: FileSystemTree | WebContainerDirectory["directory"] = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = { directory: {} };
      }
      const node = current[part];
      if ("directory" in node) {
        current = node.directory;
      }
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: file.content } };
  }

  return tree;
}

// =============================================================================
// SANDBOX RUNNER
// =============================================================================

export interface SandboxCallbacks {
  onStatusChange: (status: SandboxState["status"]) => void;
  onLog: (log: string) => void;
  onPreviewReady: (url: string) => void;
  onError: (error: string) => void;
}

export async function runProjectInSandbox(
  files: ProjectFile[],
  callbacks: SandboxCallbacks
): Promise<{ stop: () => void }> {
  const { onStatusChange, onLog, onPreviewReady, onError } = callbacks;

  try {
    onStatusChange("booting");
    onLog("🚀 Starting WebContainer...");

    const container = await getWebContainer();

    onStatusChange("installing");
    onLog("📦 Mounting project files...");

    // Convert and mount files
    const fileTree = convertToFileSystemTree(files);
    await container.mount(fileTree);

    onLog("📦 Installing dependencies...");

    // Install dependencies
    const installProcess = await container.spawn("npm", ["install"]);
    
    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          onLog(data);
        },
      })
    );

    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      throw new Error(`npm install failed with exit code ${installExitCode}`);
    }

    onLog("✅ Dependencies installed");
    onStatusChange("running");
    onLog("🚀 Starting dev server...");

    // Start dev server
    const devProcess = await container.spawn("npm", ["run", "dev"]);

    devProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          onLog(data);
        },
      })
    );

    // Wait for server to be ready
    container.on("server-ready", (port, url) => {
      onLog(`✅ Server ready at ${url}`);
      onPreviewReady(url);
    });

    // Handle errors
    container.on("error", (error) => {
      onError(`WebContainer error: ${error.message}`);
    });

    return {
      stop: () => {
        devProcess.kill();
      },
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    onError(message);
    onStatusChange("error");
    throw error;
  }
}

// =============================================================================
// FILE OPERATIONS IN RUNNING CONTAINER
// =============================================================================

export async function writeFileToContainer(
  path: string,
  content: string
): Promise<void> {
  const container = await getWebContainer();
  
  // Ensure directory exists
  const parts = path.split("/");
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join("/");
    await container.fs.mkdir(dir, { recursive: true });
  }

  await container.fs.writeFile(path, content);
}

export async function readFileFromContainer(path: string): Promise<string> {
  const container = await getWebContainer();
  return await container.fs.readFile(path, "utf-8");
}

export async function deleteFileFromContainer(path: string): Promise<void> {
  const container = await getWebContainer();
  await container.fs.rm(path, { recursive: true });
}

// =============================================================================
// HOT RELOAD SUPPORT
// =============================================================================

export async function updateProjectFile(
  path: string,
  content: string
): Promise<void> {
  try {
    await writeFileToContainer(path, content);
    console.log(`✅ Updated ${path} in WebContainer`);
  } catch (error) {
    console.error(`❌ Failed to update ${path}:`, error);
    throw error;
  }
}

export async function batchUpdateFiles(
  files: ProjectFile[]
): Promise<void> {
  for (const file of files) {
    await writeFileToContainer(file.path, file.content);
  }
  console.log(`✅ Batch updated ${files.length} files in WebContainer`);
}
