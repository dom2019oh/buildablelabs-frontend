import { 
  Globe, 
  Code2, 
  Terminal, 
  Plus, 
  Link as LinkIcon, 
  Github,
  Loader2,
  Undo2,
  Redo2,
  Monitor,
  RefreshCw,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import RouteCommandBar from './RouteCommandBar';
import ProjectDropdown from './ProjectDropdown';
import { UserCredits } from './UserCredits';

interface WorkspaceTopBarProps {
  projectName: string;
  projectId: string;
  currentRoute: string;
  onRouteChange: (route: string) => void;
  availableRoutes: string[];
  activeView: 'preview' | 'code' | 'logs';
  onViewChange: (view: 'preview' | 'code' | 'logs') => void;
  onPublish: () => void;
  isPublishing?: boolean;
  onRefreshPreview?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenHistory?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  currentVersion?: number;
  totalVersions?: number;
}

export default function WorkspaceTopBar({
  projectName,
  projectId,
  currentRoute,
  onRouteChange,
  availableRoutes,
  activeView,
  onViewChange,
  onPublish,
  isPublishing = false,
  onRefreshPreview,
  onUndo,
  onRedo,
  onOpenHistory,
  canUndo = false,
  canRedo = false,
  currentVersion = 0,
  totalVersions = 0,
}: WorkspaceTopBarProps) {
  const viewButtons = [
    { id: 'preview' as const, icon: Globe, label: 'Preview' },
    { id: 'code' as const, icon: Code2, label: 'Code' },
    { id: 'logs' as const, icon: Terminal, label: 'Logs' },
  ];

  return (
    <div className="h-12 border-b border-border bg-background flex items-center px-3 gap-2 sticky top-0 z-50">
      {/* Left Zone - Project Name & History Controls */}
      <div className="flex items-center gap-2">
        {/* Project dropdown with credits */}
        <ProjectDropdown projectName={projectName} projectId={projectId} />

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Undo/Redo buttons */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                disabled={!canUndo}
                onClick={onUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                disabled={!canRedo}
                onClick={onRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* History button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1.5 px-2"
              onClick={onOpenHistory}
            >
              <History className="h-4 w-4" />
              {totalVersions > 0 && (
                <span className="text-xs text-muted-foreground">
                  v{currentVersion}/{totalVersions}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Version History</p>
          </TooltipContent>
        </Tooltip>

        {/* View toggle group */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {viewButtons.map((btn) => (
            <Button
              key={btn.id}
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2.5 gap-1.5 rounded-sm text-xs font-medium',
                activeView === btn.id && 'bg-background shadow-sm text-foreground',
                activeView !== btn.id && 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewChange(btn.id)}
            >
              <btn.icon className="h-3.5 w-3.5" />
              <span>{btn.label}</span>
            </Button>
          ))}
        </div>

        {/* Plus button */}
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Center Zone - Route Command Bar */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-1 bg-muted/50 rounded-md border border-border/50 px-2 py-1 min-w-[300px] max-w-[400px]">
          <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <RouteCommandBar
            currentRoute={currentRoute}
            onRouteChange={onRouteChange}
            availableRoutes={availableRoutes}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 flex-shrink-0"
            onClick={onRefreshPreview}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Right Zone - Project Actions */}
      <div className="flex items-center gap-2">
        {/* User Credits */}
        <UserCredits />
        
        {/* Divider */}
        <div className="h-6 w-px bg-border" />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 h-8 text-xs"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span>Share</span>
        </Button>
        
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" disabled>
          <Github className="h-3.5 w-3.5" />
          <span>GitHub</span>
        </Button>
        
        <Button 
          size="sm" 
          className="h-8 px-4 text-xs font-medium"
          onClick={onPublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Publishing...
            </>
          ) : (
            'Publish'
          )}
        </Button>
      </div>
    </div>
  );
}
