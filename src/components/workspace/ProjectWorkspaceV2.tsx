// =============================================================================
// ProjectWorkspace - Read-Only Control Plane Interface
// =============================================================================
// This component serves as the read-only UI for Buildable. All intelligence
// and file operations happen on the backend. The frontend only:
// - Displays state from the backend
// - Collects user input
// - Shows previews via iframe
// - Never modifies files directly

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, Box, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProject } from '@/hooks/useProjects';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWorkspaceChat } from '@/hooks/useWorkspaceChat';
import WorkspaceTopBar from './WorkspaceTopBar';
import ProjectChat from './ProjectChat';
import LivePreview from './LivePreview';
import FileExplorer from './FileExplorer';
import CodeViewer from './CodeViewer';
import VersionHistoryPanel from './VersionHistoryPanel';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import LogsPanel from './LogsPanel';
import PublishDialog from './PublishDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generatePreviewHtml, compileComponentToHtml } from '@/stores/projectFilesStore';

// =============================================================================
// FILE TREE BUILDER
// =============================================================================

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
}

function buildFileTree(files: Array<{ file_path: string; content: string }>): FileTreeItem[] {
  const root: FileTreeItem[] = [];
  const folderMap = new Map<string, FileTreeItem>();

  for (const file of files) {
    const parts = file.file_path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        // It's a file
        const item: FileTreeItem = {
          name: part,
          path: file.file_path,
          type: 'file',
        };

        if (i === 0) {
          root.push(item);
        } else {
          const parentPath = parts.slice(0, i).join('/');
          const parent = folderMap.get(parentPath);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(item);
          }
        }
      } else {
        // It's a folder
        if (!folderMap.has(currentPath)) {
          const folder: FileTreeItem = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          };
          folderMap.set(currentPath, folder);

          if (i === 0) {
            root.push(folder);
          } else {
            const parentPath = parts.slice(0, i).join('/');
            const parent = folderMap.get(parentPath);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(folder);
            }
          }
        }
      }
    }
  }

  return root;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  // Project data from database
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  
  // Backend workspace hook - all data comes from here
  const {
    workspace,
    workspaceId,
    isLoading: isWorkspaceLoading,
    files,
    isLoadingFiles,
    isGenerating,
    sessions,
    operations,
    refresh,
  } = useWorkspace(projectId);

  // Chat with backend AI
  const {
    messages,
    isLoadingMessages,
    sendMessage,
    isSending,
    pendingMessage,
    error: chatError,
  } = useWorkspaceChat(projectId);

  // UI State (local only)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'logs'>('preview');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState('/');
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [lastFilesCreated, setLastFilesCreated] = useState<string[]>([]);

  // Extract available routes from page files dynamically
  const availableRoutes = useMemo(() => {
    const routes = new Set<string>(['/']);
    
    for (const file of files) {
      // Match files in src/pages/ directory
      if (file.file_path.startsWith('src/pages/')) {
        const filename = file.file_path.replace('src/pages/', '').replace(/\.(tsx|ts|jsx|js)$/, '');
        if (filename.toLowerCase() === 'index') {
          routes.add('/');
        } else {
          // Convert PascalCase to kebab-case for route
          const routeName = filename
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
          routes.add(`/${routeName}`);
        }
      }
    }
    
    return Array.from(routes).sort();
  }, [files]);

  // Build file tree from backend files
  const fileTree = buildFileTree(files.map(f => ({ file_path: f.file_path, content: f.content })));

  // Generate preview HTML from files
  const generatePreview = useCallback(() => {
    // Find main component file
    const componentFile = files.find(f => 
      f.file_path.endsWith('Index.tsx') || 
      f.file_path.endsWith('App.tsx') ||
      (f.file_path.endsWith('.tsx') && !f.file_path.includes('main'))
    );
    
    if (componentFile) {
      const compiledHtml = compileComponentToHtml(componentFile.content);
      const cssFile = files.find(f => f.file_path.endsWith('.css'));
      return generatePreviewHtml(compiledHtml, cssFile?.content);
    }
    
    return null;
  }, [files]);

  const previewHtml = generatePreview();

  // Refresh preview
  const handleRefreshPreview = useCallback(() => {
    setPreviewKey(prev => prev + 1);
  }, []);

  // Send message to backend AI
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      const result = await sendMessage(content);
      
      if (result?.filesGenerated) {
        setLastFilesCreated([`${result.filesGenerated} files generated`]);
        
        toast({
          title: '✅ Files Generated',
          description: `Created ${result.filesGenerated} file(s)`,
        });

        // Refresh files from backend
        refresh();
        
        // Switch to code view
        setActiveView('code');
        handleRefreshPreview();
      }
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [sendMessage, toast, refresh, handleRefreshPreview]);

  // File selection handler
  const handleFileSelect = useCallback((file: { path: string }) => {
    setSelectedFile(file.path);
    setActiveView('code');
  }, []);

  // Get selected file data
  const selectedFileData = selectedFile 
    ? files.find(f => f.file_path === selectedFile)
    : null;

  // Poll for updates when generating
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        refresh();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isGenerating, refresh]);

  // Loading state
  if (isProjectLoading || isWorkspaceLoading) {
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

  // Project not found
  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground">This project doesn't exist or you don't have access.</p>
        </div>
      </div>
    );
  }

  // Build display messages
  const displayMessages = messages.map(m => ({
    id: m.id,
    project_id: projectId!,
    user_id: '',
    role: m.role as 'user' | 'assistant',
    content: m.content,
    metadata: m.metadata || {},
    created_at: m.created_at,
  }));

  // Add pending message if streaming
  if (pendingMessage) {
    displayMessages.push({
      id: 'pending',
      project_id: projectId!,
      user_id: '',
      role: 'assistant',
      content: '🔄 Generating...',
      metadata: {},
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <WorkspaceTopBar
        projectName={project.name}
        projectId={projectId!}
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        availableRoutes={availableRoutes}
        activeView={activeView}
        onViewChange={setActiveView}
        onPublish={() => setIsPublishDialogOpen(true)}
        isPublishing={false}
        onRefreshPreview={handleRefreshPreview}
        onUndo={() => {}}
        onRedo={() => {}}
        onOpenHistory={() => setIsHistoryOpen(true)}
        canUndo={false}
        canRedo={false}
        currentVersion={sessions.length}
        totalVersions={sessions.length}
      />

      {/* Generation Status Banner */}
      {isGenerating && (
        <div className="h-10 bg-primary/10 border-b border-primary/20 flex items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-primary font-medium">
            AI is generating code... ({workspace?.status})
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={refresh}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      )}

      {/* Publish Dialog */}
      <PublishDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        projectId={projectId!}
        projectName={project.name}
        previewHtml={previewHtml || ''}
      />

      {/* Version History Panel (Shows Generation Sessions) */}
      <VersionHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        versions={sessions.map((s, i) => ({
          id: s.id,
          version_number: i + 1,
          label: s.prompt.slice(0, 50),
          files: [],
          preview_html: null,
          created_at: s.created_at,
        }))}
        currentVersion={sessions.length}
        onPreviewVersion={() => {}}
        onRestoreVersion={() => {}}
        isRestoring={false}
      />

      {/* Component Library Panel */}
      <ComponentLibraryPanel
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        currentPage={currentRoute === '/' ? 'landing page' : currentRoute.replace('/', '')}
        onInsertComponent={async (component) => {
          setIsLibraryOpen(false);
          await handleSendMessage(`Add a ${component.name} component`);
        }}
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
                isLoading={isLoadingMessages}
                isSending={isSending || isGenerating}
                isStreaming={isGenerating}
                streamingMetadata={undefined}
                onSendMessage={handleSendMessage}
                onCollapse={() => setIsChatCollapsed(true)}
                projectName={project.name}
                filesCreated={lastFilesCreated}
                lastError={chatError?.message || null}
                onRetry={() => {}}
                isRetrying={false}
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
              {/* File Explorer (Read-Only) */}
              <div className="w-60 border-r border-border bg-muted/30">
                <div className="h-10 flex items-center justify-between px-3 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Explorer
                  </span>
                  {isLoadingFiles && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <FileExplorer
                  files={fileTree}
                  selectedFile={selectedFile || undefined}
                  onFileSelect={handleFileSelect}
                  className="h-[calc(100%-40px)]"
                />
              </div>
              
              {/* Code Viewer (Read-Only) */}
              <div className="flex-1 h-full">
                {selectedFileData ? (
                  <CodeViewer
                    code={selectedFileData.content}
                    language={selectedFileData.file_type || 'tsx'}
                    filename={selectedFileData.file_path}
                    className="h-full"
                    // No onSave - code is read-only from backend
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p className="mb-2">Select a file to view its contents</p>
                      {files.length === 0 && !isLoadingFiles && (
                        <p className="text-sm">No files yet. Start by describing what you want to build!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeView === 'logs' ? (
            <LogsPanel 
              className="flex-1 h-full"
              // Pass operations as logs
            />
          ) : (
            /* Preview Panel */
            <div className="flex-1 h-full flex flex-col">
              {/* Preview Header */}
              <div className="h-10 flex items-center justify-between px-3 border-b border-border bg-muted/30">
                <Tabs value="static">
                  <TabsList className="h-7">
                    <TabsTrigger value="static" className="text-xs px-3 h-6 gap-1.5">
                      <Eye className="h-3 w-3" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sandbox" 
                      className="text-xs px-3 h-6 gap-1.5"
                      disabled
                      title="Live sandbox requires external preview server"
                    >
                      <Box className="h-3 w-3" />
                      Sandbox
                      <span className="text-[10px] opacity-60">(Coming Soon)</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleRefreshPreview}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              
              {/* Preview Content */}
              <div className="flex-1 overflow-hidden">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
