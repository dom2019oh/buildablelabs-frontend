import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RouteCommandBar from './RouteCommandBar';
import buildifyLogo from '@/assets/buildify-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkspaceTopBarProps {
  projectName: string;
  currentRoute: string;
  onRouteChange: (route: string) => void;
  availableRoutes: string[];
  activeView: 'preview' | 'code' | 'logs';
  onViewChange: (view: 'preview' | 'code' | 'logs') => void;
  onPublish: () => Promise<void>;
  isPublishing?: boolean;
  onRefreshPreview?: () => void;
}

export default function WorkspaceTopBar({
  projectName,
  currentRoute,
  onRouteChange,
  availableRoutes,
  activeView,
  onViewChange,
  onPublish,
  isPublishing = false,
  onRefreshPreview,
}: WorkspaceTopBarProps) {
  const viewButtons = [
    { id: 'preview' as const, icon: Globe, label: 'Preview' },
    { id: 'code' as const, icon: Code2, label: 'Code' },
    { id: 'logs' as const, icon: Terminal, label: 'Logs', disabled: true },
  ];

  return (
    <div className="h-12 border-b border-border bg-background flex items-center px-3 gap-2 sticky top-0 z-50">
      {/* Left Zone - Project Name & History Controls */}
      <div className="flex items-center gap-2">
        {/* Project dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2">
              <img src={buildifyLogo} alt="Buildify" className="h-5 w-5" />
              <span className="font-medium text-sm max-w-[140px] truncate">{projectName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Undo/Redo buttons */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* View toggle group */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {viewButtons.map((btn) => (
            <Button
              key={btn.id}
              variant="ghost"
              size="sm"
              disabled={btn.disabled}
              className={cn(
                'h-7 px-2.5 gap-1.5 rounded-sm text-xs font-medium',
                activeView === btn.id && 'bg-background shadow-sm text-foreground',
                activeView !== btn.id && 'text-muted-foreground hover:text-foreground',
                btn.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !btn.disabled && onViewChange(btn.id)}
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
