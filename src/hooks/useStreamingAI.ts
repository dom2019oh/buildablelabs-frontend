import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AIMetadata {
  taskType: string;
  modelUsed: string;
  remaining: number | null;
}

interface StreamingState {
  isStreaming: boolean;
  content: string;
  metadata: AIMetadata | null;
}

export function useStreamingAI() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    metadata: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamMessage = useCallback(async (
    message: string,
    projectId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    onChunk?: (chunk: string, fullContent: string) => void,
    onComplete?: (fullContent: string, metadata: AIMetadata | null) => void,
    onError?: (error: Error) => void,
  ) => {
    if (!session?.access_token) {
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

    setState({ isStreaming: true, content: '', metadata: null });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            message,
            conversationHistory,
            stream: true,
          }),
          signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Stream failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let metadata: AIMetadata | null = null;

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

            // Check for metadata event
            if (parsed.type === 'metadata') {
              metadata = {
                taskType: parsed.taskType,
                modelUsed: parsed.modelUsed,
                remaining: parsed.remaining,
              };
              setState(prev => ({ ...prev, metadata }));
              continue;
            }

            // Check for content delta
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setState(prev => ({ ...prev, content: fullContent }));
              onChunk?.(content, fullContent);
            }
          } catch {
            // Incomplete JSON, put back and wait
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
            }
          } catch {}
        }
      }

      setState({ isStreaming: false, content: fullContent, metadata });
      onComplete?.(fullContent, metadata);

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, isStreaming: false }));
        return;
      }

      console.error('Streaming error:', error);
      setState({ isStreaming: false, content: '', metadata: null });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast({
          title: 'Rate Limit Reached',
          description: errorMessage,
          variant: 'destructive',
        });
      } else if (errorMessage.includes('Usage limit') || errorMessage.includes('402')) {
        toast({
          title: 'Usage Limit Reached',
          description: 'Please add credits to continue using AI features.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'AI Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [session?.access_token, toast]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  return {
    ...state,
    streamMessage,
    cancelStream,
  };
}
