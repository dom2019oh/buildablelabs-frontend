import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, Eye, Loader2, Database, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useProjectMessages } from '@/hooks/useProjectMessages';
import { useBuildableAI } from '@/hooks/useBuildableAI';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useFileVersions } from '@/hooks/useFileVersions';
import { useProjectFilesStore, generatePreviewHtml, compileComponentToHtml, stripCodeBlocksFromResponse } from '@/stores/projectFilesStore';
import WorkspaceTopBarV2 from './WorkspaceTopBarV2';
import ChatPanelV2 from './ChatPanelV2';
import LivePreview from './LivePreview';
import WebContainerPreview from './WebContainerPreview';
import FileExplorer from './FileExplorer';
import CodeViewer from './CodeViewer';
import VersionHistoryPanel from './VersionHistoryPanel';
import VersionHistoryView from './VersionHistoryView';
import ThinkingIndicatorV2 from './ThinkingIndicatorV2';
import PreviewShowcase from './PreviewShowcase';
import { Skeleton } from '@/components/ui/skeleton';

// Interface modes type
type InterfaceMode = 'preview' | 'database' | 'code' | 'performance';

export default function ProjectWorkspaceV3() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  // Project data
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  
  // Workspace hook - manages backend workspace and files
  const { 
    workspace,
    workspaceId,
    files: workspaceFiles, 
    isLoadingFiles,
    refetchFiles,
    isGenerating: wsIsGenerating,
    generationStatus,
    liveSession,
  } = useWorkspace(projectId);
  
  // Messages
  const {
    messages,
    isLoading: isMessagesLoading,
    sendMessage,
  } = useProjectMessages(projectId);

  // Buildable AI - streaming generation with file persistence
  const {
    isGenerating,
    streamingContent,
    phase,
    generatedFiles,
    metadata: aiMetadata,
    generate,
    cancel,
    error: aiError,
  } = useBuildableAI(projectId);
  
  // Version history
  const { 
    versions, 
    latestVersion, 
    createVersion, 
    getVersionByNumber 
  } = useFileVersions(projectId);
  
  // Update project mutation
  const updateProject = useUpdateProject();

  // Project files store (in-memory for UI)
  const {
    fileTree,
    selectedFile,
    setSelectedFile,
    getFile,
    addFile,
    setPreviewHtml,
    previewHtml,
    files,
    clearFiles,
  } = useProjectFilesStore();

  // UI State
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeMode, setActiveMode] = useState<InterfaceMode>('preview');
  const [previewMode, setPreviewMode] = useState<'static' | 'sandbox'>('static');
  const [webContainerSupported, setWebContainerSupported] = useState(true);
  const [currentRoute, setCurrentRoute] = useState('/');
  const [previewKey, setPreviewKey] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<string>('idle');
  const [deviceSize, setDeviceSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [currentActions, setCurrentActions] = useState<string[]>([]);
  const [showHistoryInPreview, setShowHistoryInPreview] = useState(false);

  // Compute available routes from page files dynamically
  const availableRoutes = useMemo(() => {
    const routes = new Set<string>(['/']);
    
    // Check workspace files for page components
    if (workspaceFiles && workspaceFiles.length > 0) {
      workspaceFiles.forEach(file => {
        const path = file.file_path;
        // Look for page files in common patterns
        if (path.includes('/pages/') || path.includes('/routes/')) {
          const match = path.match(/(?:pages|routes)\/([^.]+)/);
          if (match) {
            const routeName = match[1].toLowerCase();
            if (routeName !== 'index' && routeName !== '_app' && routeName !== '_document') {
              routes.add(`/${routeName}`);
            }
          }
        }
      });
    }
    
    // Also check in-memory files
    files.forEach((_, filePath) => {
      if (filePath.includes('/pages/') || filePath.includes('/routes/')) {
        const match = filePath.match(/(?:pages|routes)\/([^.]+)/);
        if (match) {
          const routeName = match[1].toLowerCase();
          if (routeName !== 'index' && routeName !== '_app' && routeName !== '_document') {
            routes.add(`/${routeName}`);
          }
        }
      }
    });
    
    return Array.from(routes).sort();
  }, [workspaceFiles, files]);

  // Prepare workspace files for export
  const exportableFiles = useMemo(() => {
    return Array.from(files.values()).map(f => ({
      path: f.path,
      content: f.content,
    }));
  }, [files]);
  
  // Sync workspace files to local store
  useEffect(() => {
    if (workspaceFiles && workspaceFiles.length > 0) {
      workspaceFiles.forEach(f => {
        addFile(f.file_path, f.content);
      });
      
      // Generate preview from main file
      const mainFile = workspaceFiles.find(f => 
        f.file_path.includes('Index.tsx') || 
        f.file_path.includes('App.tsx') ||
        f.file_path.includes('page.tsx')
      );
      
      if (mainFile && !previewHtml) {
        const html = compileComponentToHtml(mainFile.content);
        const fullHtml = generatePreviewHtml(html);
        setPreviewHtml(fullHtml);
      }
    }
  }, [workspaceFiles, addFile, setPreviewHtml, previewHtml]);

  // Load preview from project on mount
  useEffect(() => {
    if (project?.preview_html && !previewHtml) {
      setPreviewHtml(project.preview_html);
    }
  }, [project?.preview_html, previewHtml, setPreviewHtml]);
  
  // Update current version when versions change
  useEffect(() => {
    if (latestVersion > 0) {
      setCurrentVersionNumber(latestVersion);
    }
  }, [latestVersion]);

  // Update preview when generated files come in
  useEffect(() => {
    if (generatedFiles.length > 0) {
      // Add files to store
      generatedFiles.forEach(f => addFile(f.path, f.content));
      
      // Find main component and generate preview
      const mainFile = generatedFiles.find(f => 
        f.path.includes('Index.tsx') || 
        f.path.includes('App.tsx')
      ) || generatedFiles[0];
      
      if (mainFile) {
        const html = compileComponentToHtml(mainFile.content);
        const fullHtml = generatePreviewHtml(html);
        setPreviewHtml(fullHtml);
        setPreviewKey(prev => prev + 1);
      }
    }
  }, [generatedFiles, addFile, setPreviewHtml]);

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  // Main send message handler - uses buildable-generate
  const handleSendMessage = useCallback(async (content: string) => {
    if (!workspaceId) {
      toast({
        title: 'Workspace not ready',
        description: 'Please wait for the workspace to initialize',
        variant: 'destructive',
      });
      return;
    }

    // Send user message to store
    await sendMessage.mutateAsync({ content, role: 'user' });

    // Get conversation history
    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get existing files from workspace
    const existingFiles = workspaceFiles?.map(f => ({
      path: f.file_path,
      content: f.content,
    })) || [];

    // Generate with streaming
    await generate(
      content,
      workspaceId,
      history,
      existingFiles,
      // On chunk
      (chunk, fullContent) => {
        // Streaming content is automatically tracked in useBuildableAI
      },
      // On complete
      async (files, metadata) => {
        // Refetch workspace files to get the saved versions
        await refetchFiles();

        // Create version snapshot
        if (files.length > 0) {
          try {
            await createVersion.mutateAsync({
              files,
              previewHtml: previewHtml || undefined,
              label: `AI: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
            });
          } catch (e) {
            console.error('Version creation failed:', e);
          }

          // Save preview to project
          if (projectId && previewHtml) {
            updateProject.mutate({
              id: projectId,
              preview_html: previewHtml,
            });
          }
        }

        // Send assistant message with summary
        const fileNames = files.map(f => f.path);
        const displayContent = `✅ Created ${files.length} file(s):\n${fileNames.map(f => `• ${f}`).join('\n')}`;
        
        await sendMessage.mutateAsync({
          content: displayContent,
          role: 'assistant',
          metadata: {
            filesCreated: fileNames,
            sessionId: metadata?.sessionId,
          },
        });

        // Switch to preview mode
        if (files.length > 0) {
          setActiveMode('preview');
          setSelectedFile(files[0].path);
        }
      },
      // On error
      async (error) => {
        await sendMessage.mutateAsync({
          content: `❌ Error: ${error.message}`,
          role: 'assistant',
          metadata: { status: 'error' },
        });
      }
    );
  }, [workspaceId, messages, workspaceFiles, generate, sendMessage, refetchFiles, createVersion, previewHtml, projectId, updateProject, setSelectedFile, toast]);

  const handleFileSelect = useCallback((file: { path: string }) => {
    setSelectedFile(file.path);
    setActiveMode('code');
  }, [setSelectedFile]);

  const handleFileSave = useCallback((newCode: string) => {
    if (selectedFile) {
      const { updateFile, setPreviewHtml } = useProjectFilesStore.getState();
      updateFile(selectedFile, newCode);
      
      if (selectedFile.endsWith('.tsx') || selectedFile.endsWith('.jsx')) {
        const compiledHtml = compileComponentToHtml(newCode);
        const previewDoc = generatePreviewHtml(compiledHtml);
        setPreviewHtml(previewDoc);
        handleRefreshPreview();
      }
      
      toast({
        title: 'File Saved',
        description: `${selectedFile} has been updated`,
      });
    }
  }, [selectedFile, handleRefreshPreview, toast]);

  const handleUndo = useCallback(() => {
    if (currentVersionNumber > 1) {
      const prevVersion = getVersionByNumber(currentVersionNumber - 1);
      if (prevVersion) handleRestoreVersion(prevVersion);
    }
  }, [currentVersionNumber, getVersionByNumber]);

  const handleRedo = useCallback(() => {
    const nextVersion = getVersionByNumber(currentVersionNumber + 1);
    if (nextVersion) handleRestoreVersion(nextVersion);
  }, [currentVersionNumber, getVersionByNumber]);

  const handleRestoreVersion = useCallback(async (version: { 
    version_number: number; 
    files: Array<{ path: string; content: string }>; 
    preview_html: string | null;
  }) => {
    setIsRestoring(true);
    try {
      clearFiles();
      version.files.forEach(file => addFile(file.path, file.content));

      if (version.preview_html) {
        setPreviewHtml(version.preview_html);
        if (projectId) {
          await updateProject.mutateAsync({
            id: projectId,
            preview_html: version.preview_html,
          });
        }
      }

      setCurrentVersionNumber(version.version_number);
      handleRefreshPreview();
      setIsHistoryOpen(false);

      toast({
        title: '✅ Version Restored',
        description: `Restored to version ${version.version_number}`,
      });
    } catch (error) {
      toast({
        title: 'Restore Failed',
        description: 'Could not restore the selected version',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  }, [clearFiles, addFile, setPreviewHtml, projectId, updateProject, handleRefreshPreview, toast]);

  // Prepare files for WebContainer
  const sandboxFiles = useMemo(() => 
    Array.from(files.values()).map(f => ({
      path: f.path,
      content: f.content,
    })),
  [files]);

  const selectedFileData = selectedFile ? getFile(selectedFile) : null;

  // Combine messages with streaming
  const displayMessages = useMemo(() => {
    const allMessages = [...messages];
    if (streamingContent) {
      allMessages.push({
        id: 'streaming',
        project_id: projectId!,
        user_id: '',
        role: 'assistant' as const,
        content: stripCodeBlocksFromResponse(streamingContent) || `🔄 ${phase.message}`,
        metadata: aiMetadata ? { ...aiMetadata } : {},
        created_at: new Date().toISOString(),
      });
    }
    return allMessages;
  }, [messages, streamingContent, phase.message, projectId, aiMetadata]);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-900">
      {/* Top Bar - New V2 version */}
      <WorkspaceTopBarV2
        projectName={project.name}
        projectId={projectId!}
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        availableRoutes={availableRoutes}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        onRefreshPreview={handleRefreshPreview}
        onOpenInNewTab={() => {
          // Use the actual deployed URL or preview in blob
          if (project.deployed_url) {
            window.open(project.deployed_url, '_blank');
          } else if (previewHtml) {
            // Open preview HTML in a new tab
            const blob = new Blob([previewHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          } else {
            toast({
              title: 'No preview available',
              description: 'Generate some content first to preview.',
            });
          }
        }}
        onToggleHistory={() => setShowHistoryInPreview(!showHistoryInPreview)}
        onCollapseChat={() => setIsChatCollapsed(!isChatCollapsed)}
        isChatCollapsed={isChatCollapsed}
        deviceSize={deviceSize}
        onDeviceSizeChange={setDeviceSize}
        previewHtml={previewHtml || ''}
        workspaceFiles={exportableFiles}
      />

      {/* Version History Panel */}
      <VersionHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        versions={versions.map(v => ({
          id: v.id,
          version_number: v.version_number,
          label: v.label,
          files: v.files as Array<{ path: string; content: string }>,
          preview_html: v.preview_html,
          created_at: v.created_at,
        }))}
        currentVersion={currentVersionNumber}
        onPreviewVersion={(version) => {
          if (version.preview_html) {
            setPreviewHtml(version.preview_html);
            setActiveMode('preview');
            handleRefreshPreview();
          }
        }}
        onRestoreVersion={handleRestoreVersion}
        isRestoring={isRestoring}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - New V2 version */}
        <AnimatePresence initial={false}>
          {!isChatCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full overflow-hidden flex-shrink-0 border-r border-zinc-800"
            >
              <ChatPanelV2
                messages={displayMessages}
                isLoading={isMessagesLoading}
                isSending={isGenerating}
                isStreaming={isGenerating}
                streamingMetadata={aiMetadata ? { 
                  modelUsed: aiMetadata.model,
                  taskType: 'generation' 
                } : undefined}
                onSendMessage={handleSendMessage}
                projectName={project.name}
                projectId={projectId!}
                lastError={aiError}
                currentActions={currentActions}
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
        <div className="flex-1 h-full flex bg-zinc-900">
          {activeMode === 'code' ? (
            <>
              {/* File Explorer */}
              <div className="w-60 border-r border-zinc-800 bg-zinc-900">
                <div className="h-10 flex items-center px-3 border-b border-zinc-800">
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
          ) : activeMode === 'database' ? (
            <div className="flex-1 h-full flex items-center justify-center bg-zinc-900">
              <div className="text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Cloud Database</h3>
                <p className="text-muted-foreground text-sm">Database management coming soon</p>
              </div>
            </div>
          ) : activeMode === 'performance' ? (
            <div className="flex-1 h-full flex items-center justify-center bg-zinc-900">
              <div className="text-center">
                <Gauge className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Performance & Speed</h3>
                <p className="text-muted-foreground text-sm">Performance metrics coming soon</p>
              </div>
            </div>
          ) : showHistoryInPreview ? (
            /* Version History View in Preview Area */
            <VersionHistoryView
              versions={versions.map(v => ({
                id: v.id,
                version_number: v.version_number,
                label: v.label,
                files: v.files as Array<{ path: string; content: string }>,
                preview_html: v.preview_html,
                created_at: v.created_at,
              }))}
              currentVersion={currentVersionNumber}
              onPreviewVersion={(version) => {
                if (version.preview_html) {
                  setPreviewHtml(version.preview_html);
                  handleRefreshPreview();
                }
              }}
              onRestoreVersion={handleRestoreVersion}
              isRestoring={isRestoring}
              onClose={() => setShowHistoryInPreview(false)}
            />
          ) : (
            /* Preview Panel */
            <div className="flex-1 h-full flex flex-col bg-zinc-900">
              {/* Preview Header - Minimal */}
              <div className="h-10 flex items-center justify-between px-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Preview</span>
                </div>
                
                {/* Generation Status - Simple inline */}
                {isGenerating && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-3 w-3" />
                    </motion.div>
                    <span>Building...</span>
                  </div>
                )}
              </div>
              
              {/* Preview Content */}
              <div className="flex-1 overflow-hidden relative">
                {/* Simple Thinking Indicator - Bottom overlay */}
                {isGenerating && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-2xl shadow-lg px-4 py-2">
                      <ThinkingIndicatorV2 
                        isVisible={true}
                        taskType="generation"
                        currentActions={currentActions}
                      />
                    </div>
                  </div>
                )}

                {/* Show showcase when no messages (new chat/project state) */}
                {messages.length === 0 && !isGenerating ? (
                  <PreviewShowcase isVisible={true} />
                ) : previewMode === 'sandbox' ? (
                  <WebContainerPreview
                    projectId={projectId!}
                    files={sandboxFiles}
                    isFullWidth={isChatCollapsed}
                    onStatusChange={(status) => {
                      setSandboxStatus(status);
                      if (status === 'unsupported') {
                        setWebContainerSupported(false);
                        setPreviewMode('static');
                      }
                    }}
                  />
                ) : previewHtml ? (
                  <iframe
                    key={previewKey}
                    srcDoc={previewHtml}
                    title="Project Preview"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts"
                    style={{
                      maxWidth: deviceSize === 'mobile' ? '390px' : deviceSize === 'tablet' ? '768px' : '100%',
                      margin: deviceSize !== 'desktop' ? '0 auto' : undefined,
                    }}
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
