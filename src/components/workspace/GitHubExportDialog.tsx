import { useState } from 'react';
import { 
  Github, 
  ExternalLink, 
  Check, 
  Copy,
  AlertCircle,
  Loader2,
  FolderGit2,
  GitBranch
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GitHubExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  files: Array<{ path: string; content: string }>;
}

type ExportStep = 'connect' | 'configure' | 'exporting' | 'success' | 'error';

export default function GitHubExportDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  files,
}: GitHubExportDialogProps) {
  const [step, setStep] = useState<ExportStep>('connect');
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  const [repoDescription, setRepoDescription] = useState(`Created with Buildable Labs`);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState('');
  const [error, setError] = useState('');

  const handleConnect = async () => {
    // In a real implementation, this would initiate GitHub OAuth
    toast({
      title: 'GitHub Connection',
      description: 'GitHub OAuth integration coming soon. For now, you can manually create a repo.',
    });
    setStep('configure');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    
    try {
      // Call export edge function
      const { data, error: exportError } = await supabase.functions.invoke('github-export', {
        body: {
          projectId,
          repoName,
          repoDescription,
          isPrivate,
          files,
        },
      });

      if (exportError) throw exportError;

      if (data?.success) {
        setExportedUrl(data.repoUrl || `https://github.com/user/${repoName}`);
        setStep('success');
      } else {
        throw new Error(data?.error || 'Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export to GitHub');
      setStep('error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyFiles = () => {
    const fileList = files.map(f => `${f.path}`).join('\n');
    navigator.clipboard.writeText(fileList);
    toast({
      title: 'Files copied',
      description: 'File list copied to clipboard',
    });
  };

  const resetDialog = () => {
    setStep('connect');
    setError('');
    setExportedUrl('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setTimeout(resetDialog, 300);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Export to GitHub
          </DialogTitle>
          <DialogDescription>
            {step === 'connect' && 'Connect your GitHub account to export your project'}
            {step === 'configure' && 'Configure your new repository'}
            {step === 'exporting' && 'Exporting your project...'}
            {step === 'success' && 'Your project has been exported!'}
            {step === 'error' && 'Something went wrong'}
          </DialogDescription>
        </DialogHeader>

        {step === 'connect' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <FolderGit2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Create a new repository</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Export your {files.length} file{files.length !== 1 ? 's' : ''} to a new GitHub repository
                  </p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleConnect} className="w-full gap-2">
              <Github className="h-4 w-4" />
              Connect GitHub Account
            </Button>
            
            <div className="text-center">
              <span className="text-xs text-muted-foreground">
                Or <button onClick={() => setStep('configure')} className="text-primary hover:underline">
                  configure manually
                </button>
              </span>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo-name">Repository Name</Label>
              <Input
                id="repo-name"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-awesome-project"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repo-desc">Description</Label>
              <Input
                id="repo-desc"
                value={repoDescription}
                onChange={(e) => setRepoDescription(e.target.value)}
                placeholder="Project description"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private-repo"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="private-repo" className="text-sm cursor-pointer">
                Private repository
              </Label>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">{files.length} files to export</span>
                <Button size="sm" variant="ghost" onClick={handleCopyFiles}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy list
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('connect')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleExport} disabled={!repoName} className="flex-1 gap-2">
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
                Export
              </Button>
            </div>
          </div>
        )}

        {step === 'exporting' && (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Exporting {files.length} files to GitHub...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <Check className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="font-medium text-green-500">Export Successful!</p>
            </div>
            
            {exportedUrl && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(exportedUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Open Repository
              </Button>
            )}
            
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
              <p className="font-medium text-destructive">Export Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetDialog} className="flex-1">
                Try Again
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
