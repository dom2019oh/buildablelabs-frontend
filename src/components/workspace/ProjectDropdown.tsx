import { Link } from 'react-router-dom';
import { 
  ChevronLeft,
  Settings,
  Gift,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCredits } from '@/hooks/useCredits';
import buildableLogo from '@/assets/buildify-logo.png';

interface ProjectDropdownProps {
  projectName: string;
  projectId: string;
}

export default function ProjectDropdown({ projectName, projectId }: ProjectDropdownProps) {
  const { totalCredits, subscription, credits } = useCredits();
  
  // Calculate credit percentage for progress bar
  const maxCredits = subscription?.selected_credits || 100;
  const creditPercentage = Math.min((totalCredits / maxCredits) * 100, 100);
  
  // Determine credit source
  const creditSource = credits?.monthly_credits && credits.monthly_credits > 0 
    ? 'monthly credits' 
    : credits?.bonus_credits && credits.bonus_credits > 0 
      ? 'bonus credits' 
      : 'daily credits';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2">
          <img src={buildableLogo} alt="Buildable" className="h-5 w-5" />
          <span className="font-medium text-sm max-w-[140px] truncate">{projectName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover border-border">
        {/* Back to Dashboard */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to="/dashboard">
            <ChevronLeft className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Project Name */}
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {projectName}
        </div>
        
        {/* Credits Section */}
        <div className="px-2 py-3 mx-2 mb-2 rounded-md bg-muted/50 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Credits</span>
            <Link to="/dashboard/billing" className="flex items-center gap-1 text-sm text-primary hover:underline">
              {totalCredits.toFixed(1)} left
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <Progress value={creditPercentage} className="h-1.5 mb-1.5" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Using {creditSource}
          </div>
        </div>
        
        {/* Get Free Credits */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer text-primary">
          <Link to="/dashboard/billing">
            <Zap className="h-4 w-4" />
            Get free credits
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Settings */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to={`/dashboard/project/${projectId}/settings`}>
            <Settings className="h-4 w-4" />
            Settings
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+,</span>
          </Link>
        </DropdownMenuItem>
        
        {/* Rename */}
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          Rename project
        </DropdownMenuItem>
        
        {/* Bonuses */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to="/dashboard/billing">
            <Gift className="h-4 w-4" />
            Bonuses
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">New</Badge>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Help */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href="https://docs.buildablelabs.dev" target="_blank" rel="noopener noreferrer">
            <HelpCircle className="h-4 w-4" />
            Help
            <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
