import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProject } from '@/hooks/useProjects';
import { useProjectMessages } from '@/hooks/useProjectMessages';
import WorkspaceTopBar from './WorkspaceTopBar';
import ProjectChat from './ProjectChat';
import LivePreview from './LivePreview';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  // Project data
  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  
  // Messages
  const {
    messages,
    isLoading: isMessagesLoading,
    isSending,
    sendWithAIResponse,
  } = useProjectMessages(projectId);

  // UI State
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'code' | 'logs'>('preview');
  const [currentRoute, setCurrentRoute] = useState('/');
  const [isPublishing, setIsPublishing] = useState(false);

  // Available routes (dynamic - would be fetched from project structure in real app)
  const availableRoutes = ['/', '/about', '/contact', '/dashboard', '/settings'];

  const handleSendMessage = useCallback(async (content: string) => {
    await sendWithAIResponse(content);
  }, [sendWithAIResponse]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      // Simulate publish
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

  if (isProjectLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="h-14 border-b border-border px-4 flex items-center gap-4">
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
                messages={messages}
                isLoading={isMessagesLoading}
                isSending={isSending}
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

        {/* Preview Panel */}
        <div className="flex-1 h-full">
          <LivePreview
            projectId={projectId!}
            deployedUrl={project.deployed_url}
            currentRoute={currentRoute}
            status={project.status}
            isFullWidth={isChatCollapsed}
          />
        </div>
      </div>
    </div>
  );
}
