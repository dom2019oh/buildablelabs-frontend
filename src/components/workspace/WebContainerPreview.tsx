import { useState, useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw, Terminal, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useWebContainer } from "@/hooks/useWebContainer";

interface ProjectFile {
  path: string;
  content: string;
}

interface WebContainerPreviewProps {
  projectId: string;
  files: ProjectFile[];
  isFullWidth?: boolean;
  onStatusChange?: (status: string) => void;
}

export default function WebContainerPreview({
  projectId,
  files,
  isFullWidth = false,
  onStatusChange,
}: WebContainerPreviewProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const {
    status,
    previewUrl,
    error,
    logs,
    start,
    stop,
    restart,
    updateFiles,
    isRunning,
  } = useWebContainer(files, { autoStart: false });

  // Handlers for start/restart
  const handleStart = () => {
    if (files.length > 0) {
      start(files);
    }
  };

  const handleRestart = () => {
    if (files.length > 0) {
      restart(files);
    }
  };

  // Check WebContainer support and notify parent if not supported
  useEffect(() => {
    // WebContainer requires SharedArrayBuffer which needs cross-origin isolation
    if (typeof SharedArrayBuffer === "undefined") {
      setIsSupported(false);
      // Notify parent to switch back to static preview
      onStatusChange?.("unsupported");
    }
  }, [onStatusChange]);
  // Not supported - show message and suggest switching to static preview
  if (!isSupported) {
    return (
      <div className={cn("h-full flex items-center justify-center bg-muted/30", isFullWidth && "w-full")}>
        <div className="text-center px-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sandbox Not Available</h3>
          <p className="text-muted-foreground text-sm mb-4">
            The live sandbox requires browser features that aren't available in this environment. 
            Use the <strong>Static</strong> preview tab instead to see your generated code.
          </p>
        </div>
      </div>
    );
  }

  // Idle state - waiting to start
  if (status === "idle" && !previewUrl) {
    return (
      <div className={cn("h-full flex items-center justify-center bg-muted/30", isFullWidth && "w-full")}>
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ready to Preview</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-xs">
            {files.length > 0
              ? `${files.length} files ready. Start the sandbox to see your app.`
              : "Generate some code first to preview your app."}
          </p>
          {files.length > 0 && (
            <Button onClick={handleStart}>
              <Play className="h-4 w-4 mr-2" />
              Start Preview
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Booting/Installing state
  if (status === "booting" || status === "installing") {
    return (
      <div className={cn("h-full flex flex-col", isFullWidth && "w-full")}>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {status === "booting" ? "Starting Sandbox..." : "Installing Dependencies..."}
            </h3>
            <p className="text-muted-foreground text-sm">This may take a moment</p>
          </div>
        </div>

        {/* Logs panel */}
        <div className="h-48 border-t border-border bg-background">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Terminal
            </div>
            <Button variant="ghost" size="sm" onClick={stop}>
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-2.5rem)]">
            <pre className="p-3 text-xs font-mono text-muted-foreground">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </pre>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className={cn("h-full flex items-center justify-center bg-muted/30", isFullWidth && "w-full")}>
        <div className="text-center px-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Preview Failed</h3>
          <p className="text-muted-foreground text-sm mb-4">{error || "An error occurred"}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleRestart}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="ghost" onClick={() => setShowLogs(!showLogs)}>
              <Terminal className="h-4 w-4 mr-2" />
              {showLogs ? "Hide Logs" : "Show Logs"}
            </Button>
          </div>
          
          {showLogs && (
            <div className="mt-4 text-left border border-border rounded-lg overflow-hidden">
              <ScrollArea className="h-48 bg-muted/50">
                <pre className="p-3 text-xs font-mono text-muted-foreground">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Running with preview
  return (
    <div className={cn("h-full flex flex-col relative bg-background", isFullWidth && "w-full")}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Running</span>
          </div>
          {previewUrl && (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
              {previewUrl}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogs(!showLogs)}
            className="h-7"
          >
            <Terminal className="h-3 w-3 mr-1" />
            Logs
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRestart} className="h-7">
            <RefreshCw className="h-3 w-3 mr-1" />
            Restart
          </Button>
          <Button variant="ghost" size="sm" onClick={stop} className="h-7">
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className={cn("flex-1 relative", showLogs && "h-[calc(100%-12rem)]")}>
        {previewUrl ? (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="Project Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Logs panel (collapsible) */}
      {showLogs && (
        <div className="h-48 border-t border-border bg-background">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Terminal Output
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowLogs(false)}>
              Hide
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-2.5rem)]">
            <pre className="p-3 text-xs font-mono text-muted-foreground">
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
