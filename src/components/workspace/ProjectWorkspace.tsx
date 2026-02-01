import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, Box, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useProjectMessages } from '@/hooks/useProjectMessages';
import { useStreamingAI } from '@/hooks/useStreamingAI';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useFileVersions } from '@/hooks/useFileVersions';
import { useProjectFilesStore, parseCodeFromResponse, generatePreviewHtml, stripCodeBlocksFromResponse, compileComponentToHtml } from '@/stores/projectFilesStore';
import WorkspaceTopBar from './WorkspaceTopBar';
import ProjectChat from './ProjectChat';
import LivePreview from './LivePreview';
import WebContainerPreview from './WebContainerPreview';
import FileExplorer from './FileExplorer';
import CodeViewer from './CodeViewer';
import VersionHistoryPanel from './VersionHistoryPanel';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import LogsPanel from './LogsPanel';
import PublishDialog from './PublishDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // Project files - with database persistence
  const { saveFiles, isLoading: isFilesLoading } = useProjectFiles(projectId);
  
  // Version history
  const { 
    versions, 
    latestVersion, 
    createVersion, 
    getVersionByNumber 
  } = useFileVersions(projectId);
  
  // Update project mutation for saving preview
  const updateProject = useUpdateProject();

  // Project files store (in-memory)
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
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'logs'>('preview');
  const [previewMode, setPreviewMode] = useState<'static' | 'sandbox'>('static');
  const [webContainerSupported, setWebContainerSupported] = useState(true);
  const [currentRoute, setCurrentRoute] = useState('/');
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [lastFilesCreated, setLastFilesCreated] = useState<string[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastMessageContent, setLastMessageContent] = useState<string>('');
  const [sandboxStatus, setSandboxStatus] = useState<string>('idle');

  // Available routes
  const availableRoutes = ['/', '/about', '/contact', '/dashboard', '/settings'];
  
  // Prepare files for WebContainer
  const sandboxFiles = Array.from(files.values()).map(f => ({
    path: f.path,
    content: f.content,
  }));
  
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

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    // Clear previous error state
    setLastError(null);
    setLastMessageContent(content);
    
    // Send user message to store
    await sendMessage.mutateAsync({ content, role: 'user' });
    
    // Reset streaming message
    setStreamingMessage('');

    // Get conversation history
    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get existing files for smart coding context
    const existingFiles = Array.from(files.values())
      .slice(0, 5) // Limit to 5 most relevant files to avoid token limits
      .map(f => ({
        path: f.path,
        content: f.content,
      }));

    // Stream AI response with existing files context
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
        
        // Track files created for UI notification
        setLastFilesCreated(fileNames);
        
        if (parsedFiles.length > 0) {
          // Add all files to the store
          parsedFiles.forEach(file => {
            addFile(file.path, file.content);
          });

          // AUTO-SAVE: Persist files to database
          try {
            await saveFiles.mutateAsync(parsedFiles);
            console.log('Files auto-saved to database:', fileNames);
          } catch (saveError) {
            console.error('Failed to auto-save files:', saveError);
          }

          // Generate preview HTML from the main component file using improved compiler
          const componentFile = parsedFiles.find(f => 
            f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
          );
          
          if (componentFile) {
            // Use the new compiler that properly handles arrays/maps
            const compiledHtml = compileComponentToHtml(componentFile.content);
            const cssFile = parsedFiles.find(f => f.path.endsWith('.css'));
            const newPreviewHtml = generatePreviewHtml(compiledHtml, cssFile?.content);
            setPreviewHtml(newPreviewHtml);
            handleRefreshPreview();
            
            // SAVE PREVIEW TO DATABASE
            if (projectId) {
              updateProject.mutate({
                id: projectId,
                preview_html: newPreviewHtml,
              });
            }
          }

          // CREATE VERSION SNAPSHOT
          try {
            await createVersion.mutateAsync({
              files: parsedFiles,
              previewHtml: previewHtml || undefined,
              label: `AI Generation: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
            });
            console.log('Version snapshot created');
          } catch (versionError) {
            console.error('Failed to create version:', versionError);
          }

          // Switch to code view to show the files
          setActiveView('code');
          if (parsedFiles.length > 0) {
            setSelectedFile(parsedFiles[0].path);
          }

          toast({
            title: '✅ Files Created & Saved',
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
        setLastError(error.message || 'An unexpected error occurred');
      },
      // Pass existing files for smart coding
      existingFiles
    );
  }, [messages, projectId, streamMessage, sendMessage, addFile, setPreviewHtml, handleRefreshPreview, toast, saveFiles, updateProject, createVersion, previewHtml, setSelectedFile, files]);

  // Retry handler for failed messages
  const handleRetry = useCallback(async () => {
    if (!lastMessageContent) return;
    setIsRetrying(true);
    setLastError(null);
    try {
      await handleSendMessage(lastMessageContent);
    } finally {
      setIsRetrying(false);
    }
  }, [lastMessageContent, handleSendMessage]);

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

  // Version history handlers
  const handleUndo = useCallback(() => {
    if (currentVersionNumber > 1) {
      const prevVersion = getVersionByNumber(currentVersionNumber - 1);
      if (prevVersion) {
        handleRestoreVersion(prevVersion);
      }
    }
  }, [currentVersionNumber, getVersionByNumber]);

  const handleRedo = useCallback(() => {
    const nextVersion = getVersionByNumber(currentVersionNumber + 1);
    if (nextVersion) {
      handleRestoreVersion(nextVersion);
    }
  }, [currentVersionNumber, getVersionByNumber]);

  const handlePreviewVersion = useCallback((version: { preview_html: string | null }) => {
    if (version.preview_html) {
      setPreviewHtml(version.preview_html);
      setActiveView('preview');
      handleRefreshPreview();
    }
  }, [setPreviewHtml, handleRefreshPreview]);

  const handleRestoreVersion = useCallback(async (version: { 
    version_number: number; 
    files: Array<{ path: string; content: string }>; 
    preview_html: string | null;
  }) => {
    setIsRestoring(true);
    try {
      // First, save current state as a new version (backup)
      const currentFiles = Array.from(files.values()).map(f => ({ path: f.path, content: f.content }));
      if (currentFiles.length > 0) {
        await createVersion.mutateAsync({
          files: currentFiles,
          previewHtml: previewHtml || undefined,
          label: `Backup before restoring to v${version.version_number}`,
        });
      }

      // Clear and restore files
      clearFiles();
      version.files.forEach(file => {
        addFile(file.path, file.content);
      });

      // Restore preview
      if (version.preview_html) {
        setPreviewHtml(version.preview_html);
        
        // Save to database
        if (projectId) {
          await updateProject.mutateAsync({
            id: projectId,
            preview_html: version.preview_html,
          });
        }
      }

      // Save restored files to database
      await saveFiles.mutateAsync(version.files);

      setCurrentVersionNumber(version.version_number);
      handleRefreshPreview();
      setIsHistoryOpen(false);

      toast({
        title: '✅ Version Restored',
        description: `Restored to version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast({
        title: 'Restore Failed',
        description: 'Could not restore the selected version',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  }, [files, previewHtml, createVersion, clearFiles, addFile, setPreviewHtml, projectId, updateProject, saveFiles, handleRefreshPreview, toast]);

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
        projectId={projectId!}
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        availableRoutes={availableRoutes}
        activeView={activeView}
        onViewChange={setActiveView}
        onPublish={() => setIsPublishDialogOpen(true)}
        isPublishing={isPublishing}
        onRefreshPreview={handleRefreshPreview}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenHistory={() => setIsHistoryOpen(true)}
        canUndo={currentVersionNumber > 1}
        canRedo={currentVersionNumber < latestVersion}
        currentVersion={currentVersionNumber}
        totalVersions={versions.length}
      />

      {/* Publish Dialog */}
      <PublishDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        projectId={projectId!}
        projectName={project.name}
        previewHtml={previewHtml || ''}
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
        onPreviewVersion={handlePreviewVersion}
        onRestoreVersion={handleRestoreVersion}
        isRestoring={isRestoring}
      />

      {/* Component Library Panel */}
      <ComponentLibraryPanel
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        currentPage={currentRoute === '/' ? 'landing page' : currentRoute.replace('/', '')}
        onInsertComponent={async (component) => {
          // Close the library panel
          setIsLibraryOpen(false);
          
          // Show the chat message from the AI
          const assistantMessage = component.chatMessage;
          
          // Add the AI message to the chat
          await sendMessage.mutateAsync({
            content: assistantMessage,
            role: 'assistant',
            metadata: { componentInsertion: true, componentName: component.name },
          });
          
          // Wait a moment for UX, then auto-insert
          setTimeout(async () => {
            // Convert component name to file path
            const fileName = component.name.replace(/\s+/g, '') + '.tsx';
            const filePath = `components/${fileName}`;
            
            // Add file to store
            addFile(filePath, component.code);
            
            // Compile and generate preview
            const compiledHtml = compileComponentToHtml(component.code);
            const newPreviewHtml = generatePreviewHtml(compiledHtml);
            setPreviewHtml(newPreviewHtml);
            handleRefreshPreview();
            
            // Save to database
            try {
              await saveFiles.mutateAsync([{ path: filePath, content: component.code }]);
              
              // Save preview to database
              if (projectId) {
                updateProject.mutate({
                  id: projectId,
                  preview_html: newPreviewHtml,
                });
              }
              
              // Create a version snapshot
              await createVersion.mutateAsync({
                files: [{ path: filePath, content: component.code }],
                previewHtml: newPreviewHtml,
                label: `Added ${component.name} from library`,
              });
              
              // Add a confirmation message
              await sendMessage.mutateAsync({
                content: `✅ Done! I've added **${component.name}** to your project. Check out the preview or view the code in \`${filePath}\`. Everything's looking good! 🎉`,
                role: 'assistant',
                metadata: { filesCreated: [filePath] },
              });
              
              setLastFilesCreated([filePath]);
              
              toast({
                title: '✅ Component Added',
                description: `${component.name} has been added to your project`,
              });
              
              // Switch to preview view to show the component
              setActiveView('preview');
            } catch (error) {
              await sendMessage.mutateAsync({
                content: `❌ Oops! Something went wrong while adding the component. Let's try again - just ask me to add a ${component.name}!`,
                role: 'assistant',
              });
              
              toast({
                title: 'Failed to add component',
                description: 'There was an error adding the component',
                variant: 'destructive',
              });
            }
          }, 1500); // Slight delay for UX
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
                isLoading={isMessagesLoading}
                isSending={isStreaming}
                isStreaming={isStreaming}
                streamingMetadata={streamingMetadata ? { 
                  modelUsed: streamingMetadata.modelUsed as string,
                  taskType: streamingMetadata.taskType as string 
                } : undefined}
                onSendMessage={handleSendMessage}
                onCollapse={() => setIsChatCollapsed(true)}
                projectName={project.name}
                filesCreated={lastFilesCreated}
                lastError={lastError}
                onRetry={handleRetry}
                isRetrying={isRetrying}
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
            <LogsPanel className="flex-1 h-full" />
          ) : (
            /* Preview Panel */
            <div className="flex-1 h-full flex flex-col">
              {/* Preview Mode Tabs */}
              <div className="h-10 flex items-center justify-between px-3 border-b border-border bg-muted/30">
                <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'static' | 'sandbox')}>
                  <TabsList className="h-7">
                    <TabsTrigger value="static" className="text-xs px-3 h-6 gap-1.5">
                      <Eye className="h-3 w-3" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sandbox" 
                      className="text-xs px-3 h-6 gap-1.5"
                      disabled={!webContainerSupported}
                      title={!webContainerSupported ? "Sandbox requires cross-origin isolation" : undefined}
                    >
                      <Box className="h-3 w-3" />
                      Sandbox
                      {!webContainerSupported && <span className="text-[10px] opacity-60">(N/A)</span>}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {previewMode === 'sandbox' && (
                  <span className="text-xs text-muted-foreground">
                    {sandboxStatus === 'running' ? '🟢 Running' : sandboxStatus === 'installing' ? '📦 Installing...' : sandboxStatus}
                  </span>
                )}
              </div>
              
              {/* Preview Content */}
              <div className="flex-1 overflow-hidden">
                {previewMode === 'sandbox' ? (
                  <WebContainerPreview
                    projectId={projectId!}
                    files={sandboxFiles}
                    isFullWidth={isChatCollapsed}
                    onStatusChange={(status) => {
                      setSandboxStatus(status);
                      // Auto-switch to static if WebContainer isn't supported
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
// Note: Preview generation functions moved to projectFilesStore.ts
