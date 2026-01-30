import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProject } from '@/hooks/useProjects';
import { useProjectMessages } from '@/hooks/useProjectMessages';
import { useStreamingAI } from '@/hooks/useStreamingAI';
import { useProjectFilesStore, parseCodeFromResponse, generatePreviewHtml, stripCodeBlocksFromResponse } from '@/stores/projectFilesStore';
import { useToast as useToastHook } from '@/hooks/use-toast';
import WorkspaceTopBar from './WorkspaceTopBar';
import ProjectChat from './ProjectChat';
import LivePreview from './LivePreview';
import FileExplorer from './FileExplorer';
import CodeViewer from './CodeViewer';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  // Project data
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  
  // Messages
  const {
    messages,
    isLoading: isMessagesLoading,
    sendMessage,
  } = useProjectMessages(projectId);

  // Streaming AI
  const {
    isStreaming,
    content: streamingContent,
    metadata: streamingMetadata,
    streamMessage,
    cancelStream,
  } = useStreamingAI();

  // Project files store
  const {
    fileTree,
    selectedFile,
    setSelectedFile,
    getFile,
    addFile,
    setPreviewHtml,
    previewHtml,
  } = useProjectFilesStore();

  // UI State
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'logs'>('preview');
  const [currentRoute, setCurrentRoute] = useState('/');
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [streamingMessage, setStreamingMessage] = useState<string>('');

  // Available routes
  const availableRoutes = ['/', '/about', '/contact', '/dashboard', '/settings'];

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    // Send user message to store
    await sendMessage.mutateAsync({ content, role: 'user' });
    
    // Reset streaming message
    setStreamingMessage('');

    // Get conversation history
    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Stream AI response
    await streamMessage(
      content,
      projectId!,
      history,
      // On each chunk
      (chunk, fullContent) => {
        setStreamingMessage(fullContent);
      },
      // On complete
      async (fullContent, metadata) => {
        setStreamingMessage('');
        
        // Parse code from response and add to files FIRST
        const parsedFiles = parseCodeFromResponse(fullContent);
        const fileNames = parsedFiles.map(f => f.path);
        
        if (parsedFiles.length > 0) {
          // Add all files to the store
          parsedFiles.forEach(file => {
            addFile(file.path, file.content);
          });

          // Generate preview HTML from the main component file
          const componentFile = parsedFiles.find(f => 
            f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
          );
          
          if (componentFile) {
            const previewHtml = generateAdvancedPreview(componentFile.content, parsedFiles);
            setPreviewHtml(previewHtml);
            handleRefreshPreview();
          }

          // Switch to code view to show the files
          setActiveView('code');
          if (parsedFiles.length > 0) {
            setSelectedFile(parsedFiles[0].path);
          }

          toast({
            title: '✅ Files Created',
            description: `Created ${parsedFiles.length} file(s): ${fileNames.slice(0, 3).join(', ')}${fileNames.length > 3 ? '...' : ''}`,
          });
        }
        
        // Strip code blocks from the message for clean chat display
        const cleanContent = stripCodeBlocksFromResponse(fullContent);
        const displayContent = cleanContent || `✅ Created ${parsedFiles.length} file(s):\n${fileNames.map(f => `• ${f}`).join('\n')}`;
        
        // Save cleaned AI response to messages (with metadata about files)
        await sendMessage.mutateAsync({
          content: displayContent,
          role: 'assistant',
          metadata: {
            ...metadata as any,
            filesCreated: fileNames,
          },
        });
      },
      // On error
      (error) => {
        setStreamingMessage('');
      }
    );
  }, [messages, projectId, streamMessage, sendMessage, addFile, setPreviewHtml, handleRefreshPreview, toast]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast({
        title: 'Published!',
        description: 'Your project is now live.',
      });
    } catch (error) {
      toast({
        title: 'Publish failed',
        description: 'There was an error publishing your project.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [toast]);

  const handleFileSelect = useCallback((file: { path: string }) => {
    setSelectedFile(file.path);
    setActiveView('code');
  }, [setSelectedFile]);

  const handleFileSave = useCallback((newCode: string) => {
    if (selectedFile) {
      const { updateFile, setPreviewHtml } = useProjectFilesStore.getState();
      updateFile(selectedFile, newCode);
      
      // Regenerate preview if it's a component file
      if (selectedFile.endsWith('.tsx') || selectedFile.endsWith('.jsx')) {
        const jsxMatch = newCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}$/);
        if (jsxMatch) {
          const jsx = jsxMatch[1];
          const html = convertJsxToHtml(jsx);
          const previewDoc = generatePreviewHtml(html);
          setPreviewHtml(previewDoc);
          handleRefreshPreview();
        }
      }
      
      toast({
        title: 'File Saved',
        description: `${selectedFile} has been updated`,
      });
    }
  }, [selectedFile, handleRefreshPreview, toast]);

  // Get selected file content
  const selectedFileData = selectedFile ? getFile(selectedFile) : null;

  if (isProjectLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-12 border-b border-border px-4 flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 flex-1 max-w-md" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 flex">
          <div className="w-[400px] border-r border-border p-4">
            <Skeleton className="h-full" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground">This project doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  // Combine stored messages with streaming message
  const displayMessages = [...messages];
  if (streamingMessage) {
    displayMessages.push({
      id: 'streaming',
      project_id: projectId!,
      user_id: '',
      role: 'assistant' as const,
      content: streamingMessage,
      metadata: streamingMetadata ? { ...streamingMetadata } : {},
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <WorkspaceTopBar
        projectName={project.name}
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        availableRoutes={availableRoutes}
        activeView={activeView}
        onViewChange={setActiveView}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        onRefreshPreview={handleRefreshPreview}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <AnimatePresence initial={false}>
          {!isChatCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full overflow-hidden flex-shrink-0"
            >
              <ProjectChat
                messages={displayMessages}
                isLoading={isMessagesLoading}
                isSending={isStreaming}
                onSendMessage={handleSendMessage}
                onCollapse={() => setIsChatCollapsed(true)}
                projectName={project.name}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Open Chat Button */}
        <AnimatePresence>
          {isChatCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute left-4 top-20 z-40"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shadow-lg"
                onClick={() => setIsChatCollapsed(false)}
              >
                <PanelLeft className="h-4 w-4" />
                Open Chat
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Panel */}
        <div className="flex-1 h-full flex">
          {activeView === 'code' ? (
            <>
              {/* File Explorer */}
              <div className="w-60 border-r border-border bg-muted/30">
                <div className="h-10 flex items-center px-3 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Explorer
                  </span>
                </div>
                <FileExplorer
                  files={fileTree}
                  selectedFile={selectedFile || undefined}
                  onFileSelect={handleFileSelect}
                  className="h-[calc(100%-40px)]"
                />
              </div>
              
              {/* Code Viewer */}
              <div className="flex-1 h-full">
                {selectedFileData ? (
                  <CodeViewer
                    code={selectedFileData.content}
                    language={selectedFileData.language}
                    filename={selectedFileData.path}
                    className="h-full"
                    onSave={handleFileSave}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>Select a file to view its contents</p>
                  </div>
                )}
              </div>
            </>
          ) : activeView === 'logs' ? (
            <div className="flex-1 h-full flex items-center justify-center text-muted-foreground bg-[#1e1e1e]">
              <p>Logs view coming soon...</p>
            </div>
          ) : (
            /* Preview Panel */
            <div className="flex-1 h-full">
              {previewHtml ? (
                <iframe
                  key={previewKey}
                  srcDoc={previewHtml}
                  title="Project Preview"
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts"
                />
              ) : (
                <LivePreview
                  key={previewKey}
                  projectId={projectId!}
                  deployedUrl={project.deployed_url}
                  currentRoute={currentRoute}
                  status={project.status}
                  isFullWidth={isChatCollapsed}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to convert JSX-like syntax to HTML for preview
function convertJsxToHtml(jsx: string): string {
  return jsx
    // Convert className to class
    .replace(/className=/g, 'class=')
    // Remove JSX expressions (keep text content)
    .replace(/\{[^{}]*\}/g, '')
    // Convert self-closing tags
    .replace(/<(\w+)([^>]*)\s*\/>/g, '<$1$2></$1>')
    // Remove event handlers
    .replace(/on\w+={[^}]*}/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate advanced preview from component code
function generateAdvancedPreview(
  componentCode: string, 
  allFiles: Array<{ path: string; content: string }>
): string {
  // Find CSS files for additional styles
  const cssFiles = allFiles.filter(f => f.path.endsWith('.css'));
  const additionalStyles = cssFiles.map(f => f.content).join('\n');
  
  // Try to extract JSX from the component
  let jsx = '';
  
  // Match return statement with JSX
  const returnMatch = componentCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*(?:\}|$)/);
  if (returnMatch) {
    jsx = returnMatch[1];
  } else {
    // Try arrow function with implicit return
    const arrowMatch = componentCode.match(/=>\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/);
    if (arrowMatch) {
      jsx = arrowMatch[1];
    }
  }
  
  if (!jsx) {
    // Fallback: just show a placeholder
    jsx = '<div class="flex items-center justify-center h-screen text-white"><p>Preview loading...</p></div>';
  }
  
  // Convert JSX to HTML
  const html = convertJsxToHtml(jsx);
  
  // Build complete HTML document
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
            border: 'hsl(240 3.7% 15.9%)',
            background: 'hsl(240 10% 3.9%)',
            foreground: 'hsl(0 0% 98%)',
            primary: { DEFAULT: 'hsl(0 72.2% 50.6%)', foreground: 'hsl(0 85.7% 97.3%)' },
            secondary: { DEFAULT: 'hsl(240 3.7% 15.9%)', foreground: 'hsl(0 0% 98%)' },
            muted: { DEFAULT: 'hsl(240 3.7% 15.9%)', foreground: 'hsl(240 5% 64.9%)' },
            accent: { DEFAULT: 'hsl(240 3.7% 15.9%)', foreground: 'hsl(0 0% 98%)' },
          }
        }
      }
    }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #000 0%, #1a0000 50%, #4a0000 100%);
      color: #e5e5e5;
      min-height: 100vh;
    }
    ${additionalStyles}
  </style>
</head>
<body>
  <div id="root">${html}</div>
</body>
</html>`;
}
