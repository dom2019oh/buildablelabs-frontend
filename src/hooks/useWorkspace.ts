// =============================================================================
// useWorkspace - Hook for interacting with the workspace backend
// =============================================================================
// This is the primary interface between the read-only frontend and the backend.
// All AI operations, file reading, and workspace state are managed through this hook.
// Includes Supabase Realtime for instant updates during generation.

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

// =============================================================================
// TYPES
// =============================================================================

export interface Workspace {
  id: string;
  project_id: string;
  status: "initializing" | "ready" | "generating" | "error" | "archived";
  preview_url: string | null;
  preview_status: string | null;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile {
  id: string;
  file_path: string;
  content: string;
  file_type: string | null;
  is_generated: boolean;
  updated_at: string;
}

export interface GenerationSession {
  id: string;
  prompt: string;
  status: "pending" | "planning" | "scaffolding" | "generating" | "validating" | "completed" | "failed";
  files_planned: number;
  files_generated: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface FileOperation {
  id: string;
  operation: "create" | "update" | "delete" | "rename" | "move";
  file_path: string;
  ai_model: string | null;
  ai_reasoning: string | null;
  applied: boolean;
  created_at: string;
}

// =============================================================================
// API HELPER
// =============================================================================

async function workspaceAPI(
  action: string,
  accessToken: string,
  data?: Record<string, unknown>
) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-api`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ action, ...data }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

// =============================================================================
// HOOK
// =============================================================================

export function useWorkspace(projectId: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  
  // Real-time state
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<GenerationSession | null>(null);
  const [liveFilesCount, setLiveFilesCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const accessToken = session?.access_token;

  // =========================================================================
  // GET OR CREATE WORKSPACE
  // =========================================================================

  const {
    data: workspaceData,
    isLoading: isLoadingWorkspace,
    error: workspaceError,
    refetch: refetchWorkspace,
  } = useQuery({
    queryKey: ["workspace", projectId],
    queryFn: async () => {
      if (!accessToken || !projectId) return null;
      const result = await workspaceAPI("getOrCreateWorkspace", accessToken, { projectId });
      return result.workspace as Workspace;
    },
    enabled: !!accessToken && !!projectId,
    staleTime: 30000,
  });

  const workspace = workspaceData;
  const workspaceId = workspace?.id;

  // =========================================================================
  // REALTIME SUBSCRIPTIONS - Live updates during generation
  // =========================================================================

  useEffect(() => {
    if (!workspaceId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create a new channel for this workspace
    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      // Listen for generation session updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_sessions',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] Generation session update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = payload.new as GenerationSession;
            setLiveSession(session);
            setGenerationStatus(session.status);
            
            // Refetch data when generation completes
            if (session.status === 'completed' || session.status === 'failed') {
              queryClient.invalidateQueries({ queryKey: ["workspace-files", workspaceId] });
              queryClient.invalidateQueries({ queryKey: ["workspace-sessions", workspaceId] });
              queryClient.invalidateQueries({ queryKey: ["workspace", projectId] });
            }
          }
        }
      )
      // Listen for new files being created
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_files',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] New file created:', payload.new);
          setLiveFilesCount((prev) => prev + 1);
          // Invalidate files cache to show new file
          queryClient.invalidateQueries({ queryKey: ["workspace-files", workspaceId] });
        }
      )
      // Listen for file updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspace_files',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] File updated:', payload.new);
          queryClient.invalidateQueries({ queryKey: ["workspace-files", workspaceId] });
        }
      )
      // Listen for file operations (audit trail)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'file_operations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] File operation:', payload.new);
          queryClient.invalidateQueries({ queryKey: ["workspace-operations", workspaceId] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, projectId, queryClient]);

  // =========================================================================
  // GET FILES (READ-ONLY)
  // =========================================================================

  const {
    data: filesData,
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ["workspace-files", workspaceId],
    queryFn: async () => {
      if (!accessToken || !workspaceId) return [];
      const result = await workspaceAPI("getFiles", accessToken, { workspaceId });
      return result.files as WorkspaceFile[];
    },
    enabled: !!accessToken && !!workspaceId,
    staleTime: 10000,
  });

  const files = filesData || [];

  // =========================================================================
  // GET SINGLE FILE
  // =========================================================================

  const getFile = useCallback(
    async (filePath: string): Promise<WorkspaceFile | null> => {
      if (!accessToken || !workspaceId) return null;
      const result = await workspaceAPI("getFile", accessToken, {
        workspaceId,
        data: { filePath },
      });
      return result.file;
    },
    [accessToken, workspaceId]
  );

  // =========================================================================
  // GET GENERATION SESSIONS
  // =========================================================================

  const {
    data: sessionsData,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["workspace-sessions", workspaceId],
    queryFn: async () => {
      if (!accessToken || !workspaceId) return [];
      const result = await workspaceAPI("getSessions", accessToken, { workspaceId });
      return result.sessions as GenerationSession[];
    },
    enabled: !!accessToken && !!workspaceId,
    staleTime: 5000,
  });

  const sessions = sessionsData || [];

  // =========================================================================
  // GET OPERATION HISTORY
  // =========================================================================

  const {
    data: operationsData,
    refetch: refetchOperations,
  } = useQuery({
    queryKey: ["workspace-operations", workspaceId],
    queryFn: async () => {
      if (!accessToken || !workspaceId) return [];
      const result = await workspaceAPI("getOperationHistory", accessToken, { workspaceId });
      return result.operations as FileOperation[];
    },
    enabled: !!accessToken && !!workspaceId,
    staleTime: 5000,
  });

  const operations = operationsData || [];

  // =========================================================================
  // GENERATE (SEND PROMPT TO BACKEND AI)
  // =========================================================================

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<Error | null>(null);

  const generate = useCallback(
    async (prompt: string) => {
      if (!accessToken || !workspaceId) {
        throw new Error("Not authenticated or no workspace");
      }

      setIsGenerating(true);
      setGenerationError(null);
      setGenerationStatus("starting");
      setLiveFilesCount(0);

      try {
        const result = await workspaceAPI("generate", accessToken, {
          workspaceId,
          data: { prompt },
        });

        setGenerationStatus("complete");
        
        // Refresh all data after generation
        await Promise.all([
          refetchFiles(),
          refetchSessions(),
          refetchOperations(),
          refetchWorkspace(),
        ]);

        return result;
      } catch (error) {
        setGenerationError(error as Error);
        setGenerationStatus("error");
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [accessToken, workspaceId, refetchFiles, refetchSessions, refetchOperations, refetchWorkspace]
  );

  // =========================================================================
  // REFRESH ALL DATA
  // =========================================================================

  const refresh = useCallback(() => {
    refetchFiles();
    refetchSessions();
    refetchOperations();
    refetchWorkspace();
  }, [refetchFiles, refetchSessions, refetchOperations, refetchWorkspace]);

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // Workspace state
    workspace,
    workspaceId,
    isLoading: isLoadingWorkspace,
    error: workspaceError,

    // Files (read-only)
    files,
    isLoadingFiles,
    getFile,
    refetchFiles,

    // Generation with realtime
    generate,
    isGenerating: isGenerating || workspace?.status === "generating",
    generationStatus,
    generationError,
    liveSession,
    liveFilesCount,

    // History
    sessions,
    operations,

    // Actions
    refresh,
  };
}
