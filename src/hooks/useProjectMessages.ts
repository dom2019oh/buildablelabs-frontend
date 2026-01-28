import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useProjectMessages(projectId: string | undefined) {
  const { user } = useAuth();
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

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async ({ content, role = 'user' }: { content: string; role?: 'user' | 'assistant' }) => {
      if (!projectId || !user?.id) throw new Error('Missing project or user');

      const { data, error } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          user_id: user.id,
          role,
          content,
        })
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

  // Simulate AI response (placeholder for actual AI integration)
  const sendWithAIResponse = async (content: string) => {
    // Send user message
    await sendMessage.mutateAsync({ content, role: 'user' });

    // Simulate AI thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Send simulated AI response
    const aiResponse = `I understand you want to: "${content}". I'm analyzing your project and will help you implement this. This is a demo response—in the full version, I would generate the code and update your live preview!`;
    
    await sendMessage.mutateAsync({ content: aiResponse, role: 'assistant' });
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
