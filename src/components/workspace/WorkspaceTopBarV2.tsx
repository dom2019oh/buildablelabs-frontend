import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Database, 
  Code2, 
  Gauge, 
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  History,
  PanelRightClose,
  Github,
  Link as LinkIcon,
  ChevronDown,
  User,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RouteCommandBar from './RouteCommandBar';
import ProjectDropdown from './ProjectDropdown';
import PublishDropdown from './PublishDropdown';
import GitHubExportDialog from './GitHubExportDialog';
import { useAuth } from '@/hooks/useAuth';

// Interface mode types
type InterfaceMode = 'preview' | 'database' | 'code' | 'performance';

interface WorkspaceTopBarV2Props {
  projectName: string;
  projectId: string;
  currentRoute: string;
  onRouteChange: (route: string) => void;
  availableRoutes: string[];
  activeMode: InterfaceMode;
  onModeChange: (mode: InterfaceMode) => void;
  onRefreshPreview?: () => void;
  onOpenInNewTab?: () => void;
  onToggleHistory?: () => void;
  onCollapseChat?: () => void;
  isChatCollapsed?: boolean;
  deviceSize: 'desktop' | 'tablet' | 'mobile';
  onDeviceSizeChange: (size: 'desktop' | 'tablet' | 'mobile') => void;
  previewHtml?: string;
  workspaceFiles?: Array<{ path: string; content: string }>;
}

// Mode configuration
const MODES: { id: InterfaceMode; icon: typeof Globe; label: string }[] = [
  { id: 'preview', icon: Globe, label: 'Preview' },
  { id: 'database', icon: Database, label: 'Cloud Database' },
  { id: 'code', icon: Code2, label: 'Code Files' },
  { id: 'performance', icon: Gauge, label: 'Performance' },
];

// Device configuration
const DEVICES = [
  { id: 'desktop' as const, icon: Monitor },
  { id: 'tablet' as const, icon: Tablet },
  { id: 'mobile' as const, icon: Smartphone },
];

export default function WorkspaceTopBarV2({
  projectName,
  projectId,
  currentRoute,
  onRouteChange,
  availableRoutes,
  activeMode,
  onModeChange,
  onRefreshPreview,
  onOpenInNewTab,
  onToggleHistory,
  onCollapseChat,
  isChatCollapsed = false,
  deviceSize,
  onDeviceSizeChange,
  previewHtml = '',
  workspaceFiles = [],
}: WorkspaceTopBarV2Props) {
  const { user } = useAuth();
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isGitHubExportOpen, setIsGitHubExportOpen] = useState(false);

  // Cycle through device sizes on click
  const handleDeviceClick = () => {
    const order: ('desktop' | 'tablet' | 'mobile')[] = ['desktop', 'tablet', 'mobile'];
    const currentIndex = order.indexOf(deviceSize);
    const nextIndex = (currentIndex + 1) % order.length;
    onDeviceSizeChange(order[nextIndex]);
  };

  // Get current device icon
  const CurrentDeviceIcon = DEVICES.find(d => d.id === deviceSize)?.icon || Monitor;

  return (
    <div className="h-12 border-b border-border bg-zinc-900 flex items-center px-3 gap-2 sticky top-0 z-50">
      {/* Left Zone - Project Name & Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Project dropdown */}
        <ProjectDropdown projectName={projectName} projectId={projectId} />
        
        {/* Arrow dropdown indicator is already in ProjectDropdown */}
        
        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* History toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground" 
              onClick={onToggleHistory}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Version History</p>
          </TooltipContent>
        </Tooltip>

        {/* Collapse chat toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground" 
              onClick={onCollapseChat}
            >
              <PanelRightClose className={cn(
                "h-4 w-4 transition-transform",
                isChatCollapsed && "rotate-180"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isChatCollapsed ? 'Show Chat' : 'Hide Chat'}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Interface Mode Icons */}
      <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          const Icon = mode.icon;
          return (
            <Button
              key={mode.id}
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 rounded-md transition-all duration-200',
                isActive 
                  ? 'bg-primary text-primary-foreground px-3 gap-1.5' 
                  : 'px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-700'
              )}
              onClick={() => onModeChange(mode.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {isActive && <span className="text-xs font-medium">{mode.label}</span>}
            </Button>
          );
        })}
      </div>

      {/* Center Zone - Route Command Bar */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg border border-zinc-700 px-2 py-1 min-w-[280px] max-w-[380px]">
          {/* Device Size Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleDeviceClick}
              >
                <CurrentDeviceIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch device: {deviceSize}</p>
            </TooltipContent>
          </Tooltip>

          {/* Route Input */}
          <RouteCommandBar
            currentRoute={currentRoute}
            onRouteChange={onRouteChange}
            availableRoutes={availableRoutes}
          />
          
          {/* Refresh Preview */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onRefreshPreview}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          
          {/* Open in New Tab */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onOpenInNewTab}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open preview in new tab</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Right Zone - User & Actions */}
      <div className="flex items-center gap-2">
        {/* User Avatar */}
        <Avatar className="h-7 w-7 border border-zinc-700">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-zinc-800 text-xs">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Share Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          <span>Share</span>
        </Button>
        
        {/* GitHub Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
            >
              <svg 
                viewBox="0 0 24 24" 
                className="h-4 w-4 fill-current"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              className="gap-2 cursor-pointer"
              onClick={() => setIsGitHubExportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Export to GitHub
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Publish Button */}
        <PublishDropdown
          projectId={projectId}
          projectName={projectName}
          previewHtml={previewHtml}
          isOpen={isPublishOpen}
          onOpenChange={setIsPublishOpen}
        />
      </div>

      {/* GitHub Export Dialog */}
      <GitHubExportDialog
        isOpen={isGitHubExportOpen}
        onClose={() => setIsGitHubExportOpen(false)}
        projectId={projectId}
        projectName={projectName}
        files={workspaceFiles}
      />
    </div>
  );
}
