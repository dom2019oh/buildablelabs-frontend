import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Loader2, 
  ExternalLink, 
  Check, 
  AlertTriangle,
  Sparkles,
  Lock,
  Copy,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePublishSystem } from '@/hooks/usePublishSystem';
import { toast } from '@/hooks/use-toast';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  previewHtml: string;
}

export default function PublishDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  previewHtml,
}: PublishDialogProps) {
  const {
    publish,
    unpublish,
    isPublishing,
    isUnpublishing,
    deployedUrl,
    isFreeplan,
  } = usePublishSystem(projectId);
  
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handlePublish = async () => {
    try {
      const result = await publish(previewHtml);
      if (result.success) {
        setPublishSuccess(true);
      }
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublish();
      setPublishSuccess(false);
    } catch (error) {
      console.error('Unpublish error:', error);
    }
  };

  const copyUrl = () => {
    if (deployedUrl) {
      navigator.clipboard.writeText(deployedUrl);
      toast({
        title: 'Copied!',
        description: 'URL copied to clipboard',
      });
    }
  };

  const expectedUrl = `https://${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.buildablelabs.dev`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Publish Project
          </DialogTitle>
          <DialogDescription>
            Deploy your project to make it live on the web
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Demo Notice */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm mb-1 text-amber-700">Demo Mode</div>
                <p className="text-xs text-amber-600/80">
                  Publishing is simulated in this demo. Real deployment requires connecting to a hosting platform. 
                  The URL shown is for demonstration purposes only.
                </p>
              </div>
            </div>
          </motion.div>

          {/* URL Preview */}
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">Your project would be live at:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-foreground truncate opacity-60">
                {deployedUrl || expectedUrl}
              </code>
              {deployedUrl && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyUrl}>
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Free Plan Notice */}
          {isFreeplan && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-primary/5 border border-primary/20 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1">Free Plan</div>
                  <p className="text-xs text-muted-foreground">
                    Published sites include a "Built with Buildable Labs" badge.
                    Upgrade to remove branding.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
              <span className="text-sm">Draft State</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <Check className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30">
              <span className="text-sm">Live Status</span>
              {deployedUrl ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Info className="h-3 w-3 mr-1" />
                  Simulated
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1" />
                  Not Published
                </Badge>
              )}
            </div>
          </div>

          {/* Success State */}
          {publishSuccess && deployedUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="font-medium text-emerald-600 mb-1">Publish Simulated!</div>
              <p className="text-xs text-muted-foreground mb-2">
                In production, your site would be live at:
              </p>
              <code className="text-sm text-primary">{deployedUrl}</code>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {deployedUrl ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleUnpublish}
                disabled={isUnpublishing}
              >
                {isUnpublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unpublishing...
                  </>
                ) : (
                  'Unpublish'
                )}
              </Button>
              <Button
                className="flex-1"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Update
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Simulate Publish
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}