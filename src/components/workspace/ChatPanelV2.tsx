import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectMessage } from '@/hooks/useProjectMessages';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingIndicatorV2 from './ThinkingIndicatorV2';
import ChatInputV2 from './ChatInputV2';

interface ChatPanelV2Props {
  messages: ProjectMessage[];
  isLoading: boolean;
  isSending: boolean;
  isStreaming?: boolean;
  streamingMetadata?: { modelUsed?: string; taskType?: string };
  onSendMessage: (content: string) => Promise<void>;
  projectName: string;
  projectId: string;
  lastError?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  currentActions?: string[];
}

export default function ChatPanelV2({
  messages,
  isLoading,
  isSending,
  isStreaming = false,
  streamingMetadata,
  onSendMessage,
  projectName,
  projectId,
  lastError = null,
  currentActions = [],
}: ChatPanelV2Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPlanMode, setIsPlanMode] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (isPlanMode) {
      // In plan mode, prefix message to indicate planning
      await onSendMessage(`[PLAN MODE] ${content}`);
    } else {
      await onSendMessage(content);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Messages Area - No glass, pure grey */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          /* Empty state - just shows nothing, user focuses on input */
          <div className="h-full" />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'max-w-[85%]',
                  // AI on left, user on right - NO profile pictures
                  message.role === 'user' 
                    ? 'ml-auto' 
                    : 'mr-auto'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-zinc-700 text-foreground'
                      : 'bg-zinc-800 text-foreground'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} className="text-sm" />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className={cn(
                  "text-[10px] text-muted-foreground mt-1 px-1",
                  message.role === 'user' ? 'text-right' : 'text-left'
                )}>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {/* Thinking Indicator */}
        <AnimatePresence>
          {(isSending || isStreaming) && (
            <ThinkingIndicatorV2 
              isVisible={true}
              currentActions={currentActions}
              taskType={streamingMetadata?.taskType}
            />
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {lastError && !isSending && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mr-auto max-w-[85%]"
            >
              <div className="rounded-2xl px-4 py-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {lastError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Grey theme */}
      <ChatInputV2
        onSend={handleSend}
        isSending={isSending}
        isPlanMode={isPlanMode}
        onPlanModeChange={setIsPlanMode}
        projectId={projectId}
      />
    </div>
  );
}
