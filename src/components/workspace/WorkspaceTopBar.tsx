import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Code2, 
  Terminal, 
  Plus, 
  Share2, 
  Github,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RouteCommandBar from './RouteCommandBar';
import buildifyLogo from '@/assets/buildify-logo.png';

interface WorkspaceTopBarProps {
  projectName: string;
  currentRoute: string;
  onRouteChange: (route: string) => void;
  availableRoutes: string[];
  activeView: 'preview' | 'code' | 'logs';
  onViewChange: (view: 'preview' | 'code' | 'logs') => void;
  onPublish: () => Promise<void>;
  isPublishing?: boolean;
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
}: WorkspaceTopBarProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const viewButtons = [
    { id: 'preview' as const, icon: Globe, label: 'Preview' },
    { id: 'code' as const, icon: Code2, label: 'Code', disabled: true },
    { id: 'logs' as const, icon: Terminal, label: 'Logs', disabled: true },
  ];

  return (
    <div className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4 sticky top-0 z-50">
      {/* Left Zone - Logo & View Controls */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 mr-2">
          <img src={buildifyLogo} alt="Buildify" className="h-6 w-6" />
        </Link>
        
        <div className="flex items-center bg-muted/50 rounded-lg p-1">
          {viewButtons.map((btn) => (
            <Button
              key={btn.id}
              variant="ghost"
              size="sm"
              disabled={btn.disabled}
              className={cn(
                'h-8 px-3 gap-2',
                activeView === btn.id && 'bg-background shadow-sm',
                btn.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !btn.disabled && onViewChange(btn.id)}
            >
              <btn.icon className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">{btn.label}</span>
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Center Zone - Route Command Bar */}
      <div className="flex-1 max-w-md mx-auto">
        <RouteCommandBar
          currentRoute={currentRoute}
          onRouteChange={onRouteChange}
          availableRoutes={availableRoutes}
        />
      </div>

      {/* Right Zone - Project Actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setIsShareOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </Button>
        
        <Button 
          size="sm" 
          className="gap-2"
          onClick={onPublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
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
