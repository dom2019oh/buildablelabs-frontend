// =============================================================================
// useBuildableAI - Streaming AI hook that persists files to workspace
// =============================================================================
// This hook connects to the buildable-generate edge function which:
// 1. Streams AI responses in real-time
// 2. Automatically saves generated files to workspace_files
// 3. Updates generation_sessions for history tracking

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationMetadata {
  sessionId: string | null;
  workspaceId: string;
  status: string;
  model: string;
  filesGenerated?: number;
  filePaths?: string[];
  // NEW: Persona response from Beast Mode
  aiMessage?: string;
  routes?: string[];
  suggestions?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationPhase {
  phase: 'idle' | 'starting' | 'generating' | 'saving' | 'complete' | 'error';
  message: string;
  progress?: number;
}

interface UseBuildableAIState {
  isGenerating: boolean;
  streamingContent: string;
  metadata: GenerationMetadata | null;
  phase: GenerationPhase;
  generatedFiles: GeneratedFile[];
  error: string | null;
  // NEW: Persona response for display
  aiMessage: string;
  routes: string[];
  suggestions: string[];
}

// =============================================================================
// FILE EXTRACTION
// =============================================================================

function extractFilesFromContent(content: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const path = match[2].trim().replace(/^\/+/, "");
    const fileContent = match[3];

    if (path && fileContent && path.includes("/")) {
      files.push({ path, content: fileContent });
    }
  }

  return files;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBuildableAI(projectId: string | undefined) {
  const { session } = useAuth();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [state, setState] = useState<UseBuildableAIState>({
    isGenerating: false,
    streamingContent: '',
    metadata: null,
    phase: { phase: 'idle', message: '' },
    generatedFiles: [],
    error: null,
    aiMessage: '',
    routes: ['/'],
    suggestions: [],
  });

  // Subscribe to workspace file changes for real-time updates
  const subscribeToWorkspace = useCallback((workspaceId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`buildable-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_files',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] New file:', payload.new);
          // File was saved by the edge function
          const file = payload.new as { file_path: string; content: string };
          setState(prev => ({
            ...prev,
            generatedFiles: [
              ...prev.generatedFiles.filter(f => f.path !== file.file_path),
              { path: file.file_path, content: file.content }
            ]
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Main generation function
  const generate = useCallback(async (
    prompt: string,
    workspaceId: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    existingFiles: Array<{ path: string; content: string }> = [],
    onChunk?: (chunk: string, fullContent: string) => void,
    onComplete?: (files: GeneratedFile[], metadata: GenerationMetadata | null) => void,
    onError?: (error: Error) => void,
  ) => {
    if (!session?.access_token || !projectId) {
      const error = new Error('Not authenticated');
      onError?.(error);
      return;
    }

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Reset state
    setState({
      isGenerating: true,
      streamingContent: '',
      metadata: null,
      phase: { phase: 'starting', message: 'Starting generation...' },
      generatedFiles: [],
      error: null,
      aiMessage: '',
      routes: ['/'],
      suggestions: [],
    });

    // Subscribe to workspace updates
    subscribeToWorkspace(workspaceId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buildable-generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            workspaceId,
            prompt,
            conversationHistory,
            existingFiles,
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let metadata: GenerationMetadata | null = null;

      setState(prev => ({
        ...prev,
        phase: { phase: 'generating', message: 'AI is generating code...', progress: 10 }
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle metadata event
            if (parsed.type === 'metadata') {
              metadata = {
                sessionId: parsed.sessionId,
                workspaceId: parsed.workspaceId,
                status: parsed.status,
                model: parsed.model,
              };
              setState(prev => ({ ...prev, metadata }));
              continue;
            }

            // Handle completion event
            if (parsed.type === 'completion') {
              setState(prev => ({
                ...prev,
                phase: { phase: 'complete', message: `Generated ${parsed.filesGenerated} files`, progress: 100 },
                metadata: {
                  ...prev.metadata!,
                  filesGenerated: parsed.filesGenerated,
                  filePaths: parsed.filePaths,
                },
              }));
              continue;
            }

            // Handle content delta
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              
              // Extract files as they come in
              const files = extractFilesFromContent(fullContent);
              
              setState(prev => ({
                ...prev,
                streamingContent: fullContent,
                generatedFiles: files,
                phase: {
                  phase: 'generating',
                  message: files.length > 0 ? `Generating ${files.length} file(s)...` : 'Generating code...',
                  progress: Math.min(90, 20 + files.length * 10),
                },
              }));
              
              onChunk?.(content, fullContent);
            }
          } catch {
            // Incomplete JSON, put back
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final extraction
      const finalFiles = extractFilesFromContent(fullContent);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        streamingContent: fullContent,
        generatedFiles: finalFiles,
        phase: { phase: 'complete', message: `Generated ${finalFiles.length} files`, progress: 100 },
      }));

      onComplete?.(finalFiles, metadata);

      if (finalFiles.length > 0) {
        toast({
          title: '✅ Generation Complete',
          description: `Created ${finalFiles.length} file(s)`,
        });
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, isGenerating: false, phase: { phase: 'idle', message: '' } }));
        return;
      }

      console.error('Buildable AI Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
        phase: { phase: 'error', message: errorMessage },
      }));

      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast({
          title: 'Rate Limit Reached',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast({
          title: 'Insufficient Credits',
          description: 'Please add credits to continue.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Generation Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [session?.access_token, projectId, subscribeToWorkspace, toast]);

  // Cancel generation
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isGenerating: false,
      phase: { phase: 'idle', message: '' },
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      streamingContent: '',
      metadata: null,
      phase: { phase: 'idle', message: '' },
      generatedFiles: [],
      error: null,
      aiMessage: '',
      routes: ['/'],
      suggestions: [],
    });
  }, []);

  return {
    ...state,
    generate,
    cancel,
    reset,
  };
}
