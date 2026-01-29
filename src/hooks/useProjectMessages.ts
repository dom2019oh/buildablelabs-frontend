import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { Json } from '@/integrations/supabase/types';

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AIResponse {
  response: string;
  metadata: {
    taskType: string;
    modelUsed: string;
    remaining: number | null;
  };
}

export function useProjectMessages(projectId: string | undefined) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages for the project
  const messagesQuery = useQuery({
    queryKey: ['project-messages', projectId],
    queryFn: async () => {
      if (!projectId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProjectMessage[];
    },
    enabled: !!projectId && !!user?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!projectId || !user?.id) return;

    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          queryClient.setQueryData<ProjectMessage[]>(
            ['project-messages', projectId],
            (old) => {
              if (!old) return [payload.new as ProjectMessage];
              // Avoid duplicates
              const exists = old.some((m) => m.id === payload.new.id);
              if (exists) return old;
              return [...old, payload.new as ProjectMessage];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user?.id, queryClient]);

  // Send a message to the database
  const sendMessage = useMutation({
    mutationFn: async ({ content, role = 'user', metadata = {} }: { 
      content: string; 
      role?: 'user' | 'assistant';
      metadata?: Json;
    }) => {
      if (!projectId || !user?.id) throw new Error('Missing project or user');

      const { data, error } = await supabase
        .from('project_messages')
        .insert([{
          project_id: projectId,
          user_id: user.id,
          role,
          content,
          metadata,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as ProjectMessage;
    },
    onSuccess: (newMessage) => {
      // Optimistically add to cache (realtime will also update)
      queryClient.setQueryData<ProjectMessage[]>(
        ['project-messages', projectId],
        (old) => {
          if (!old) return [newMessage];
          const exists = old.some((m) => m.id === newMessage.id);
          if (exists) return old;
          return [...old, newMessage];
        }
      );
    },
    onError: (error) => {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Call AI edge function
  const callAI = async (message: string, conversationHistory: Array<{ role: string; content: string }>): Promise<AIResponse> => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('ai-chat', {
      body: {
        projectId,
        message,
        conversationHistory,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'AI request failed');
    }

    // Check for rate limit error in response data
    if (response.data?.error) {
      throw new Error(response.data.message || response.data.error);
    }

    return response.data as AIResponse;
  };

  // Send message and get AI response
  const sendWithAIResponse = async (content: string) => {
    // Get current messages for context
    const currentMessages = messagesQuery.data || [];

    // Send user message
    await sendMessage.mutateAsync({ content, role: 'user' });

    try {
      // Call AI with conversation history
      const aiResponse = await callAI(content, currentMessages);

      // Store AI response with metadata
      await sendMessage.mutateAsync({ 
        content: aiResponse.response, 
        role: 'assistant',
        metadata: aiResponse.metadata as Json,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get AI response';
      
      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit') || errorMessage.includes('request limit')) {
        toast({
          title: 'Rate Limit Reached',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'AI Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      // Store error message as assistant response
      await sendMessage.mutateAsync({ 
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`, 
        role: 'assistant',
        metadata: { error: true },
      });
    }
  };

  // Clear all messages for a project
  const clearMessages = useMutation({
    mutationFn: async () => {
      if (!projectId || !user?.id) throw new Error('Missing project or user');

      const { error } = await supabase
        .from('project_messages')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(['project-messages', projectId], []);
      toast({ title: 'Chat cleared' });
    },
    onError: (error) => {
      toast({
        title: 'Error clearing chat',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage,
    sendWithAIResponse,
    clearMessages,
    isSending: sendMessage.isPending,
  };
}
