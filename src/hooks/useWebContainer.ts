import { useState, useEffect, useCallback, useRef } from "react";
import {
  runProjectInSandbox,
  teardownWebContainer,
  updateProjectFile,
  batchUpdateFiles,
  type SandboxState,
} from "@/lib/webcontainer";

interface ProjectFile {
  path: string;
  content: string;
}

interface UseWebContainerOptions {
  autoStart?: boolean;
}

export function useWebContainer(
  initialFiles: ProjectFile[],
  options: UseWebContainerOptions = {}
) {
  const { autoStart = true } = options;

  const [state, setState] = useState<SandboxState>({
    status: "idle",
    previewUrl: null,
    error: null,
    logs: [],
  });

  const stopRef = useRef<(() => void) | null>(null);
  const isRunningRef = useRef(false);

  const addLog = useCallback((log: string) => {
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs.slice(-100), log], // Keep last 100 logs
    }));
  }, []);

  const start = useCallback(async (files: ProjectFile[]) => {
    if (isRunningRef.current) {
      console.warn("WebContainer is already running");
      return;
    }

    isRunningRef.current = true;
    setState((prev) => ({
      ...prev,
      status: "booting",
      error: null,
      logs: [],
    }));

    try {
      const { stop } = await runProjectInSandbox(files, {
        onStatusChange: (status) => {
          setState((prev) => ({ ...prev, status }));
        },
        onLog: addLog,
        onPreviewReady: (url) => {
          setState((prev) => ({ ...prev, previewUrl: url, status: "running" }));
        },
        onError: (error) => {
          setState((prev) => ({ ...prev, error, status: "error" }));
          isRunningRef.current = false;
        },
      });

      stopRef.current = stop;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start";
      setState((prev) => ({ ...prev, error: message, status: "error" }));
      isRunningRef.current = false;
    }
  }, [addLog]);

  const stop = useCallback(() => {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    isRunningRef.current = false;
    setState((prev) => ({ ...prev, status: "idle", previewUrl: null }));
  }, []);

  const restart = useCallback(async (files: ProjectFile[]) => {
    stop();
    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
    await start(files);
  }, [stop, start]);

  const updateFile = useCallback(async (path: string, content: string) => {
    if (!isRunningRef.current) {
      console.warn("WebContainer not running, cannot update file");
      return;
    }

    try {
      await updateProjectFile(path, content);
      addLog(`📝 Updated: ${path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      addLog(`❌ Failed to update ${path}: ${message}`);
    }
  }, [addLog]);

  const updateFiles = useCallback(async (files: ProjectFile[]) => {
    if (!isRunningRef.current) {
      console.warn("WebContainer not running, cannot update files");
      return;
    }

    try {
      await batchUpdateFiles(files);
      addLog(`📝 Updated ${files.length} files`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      addLog(`❌ Failed to update files: ${message}`);
    }
  }, [addLog]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart && initialFiles.length > 0) {
      start(initialFiles);
    }

    return () => {
      if (isRunningRef.current) {
        stop();
      }
    };
  }, []); // Only run on mount/unmount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardownWebContainer();
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    restart,
    updateFile,
    updateFiles,
    isRunning: isRunningRef.current,
  };
}
