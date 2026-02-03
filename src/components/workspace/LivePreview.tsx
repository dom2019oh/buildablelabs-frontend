import { useState } from 'react';
import { Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LivePreviewProps {
  projectId: string;
  deployedUrl?: string | null;
  currentRoute: string;
  status: 'building' | 'ready' | 'failed';
  isFullWidth?: boolean;
}

export default function LivePreview({
  projectId,
  deployedUrl,
  currentRoute,
  status,
  isFullWidth = false,
}: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    // Force iframe refresh by updating key
  };

  // Build the preview URL
  const previewUrl = deployedUrl 
    ? `${deployedUrl}${currentRoute === '/' ? '' : currentRoute}`
    : null;

  if (status === 'building') {
    return (
      <div className={cn('h-full flex items-center justify-center bg-muted/30', isFullWidth && 'w-full')}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Building your project...</h3>
          <p className="text-muted-foreground text-sm">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={cn('h-full flex items-center justify-center bg-muted/30', isFullWidth && 'w-full')}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Build failed</h3>
          <p className="text-muted-foreground text-sm mb-4">There was an error building your project</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Build
          </Button>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-zinc-900', isFullWidth && 'w-full')}>
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-zinc-200">Preview Area</h3>
          <p className="text-zinc-500 text-sm max-w-xs">
            Your generated website will appear here. Start by describing what you want to build in the chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full relative bg-background', isFullWidth && 'w-full')}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">Failed to load preview</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        key={previewUrl}
        src={previewUrl}
        title="Project Preview"
        className="w-full h-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
