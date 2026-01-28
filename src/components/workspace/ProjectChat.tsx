import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Plus, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  MoreHorizontal,
  Sparkles,
  MessageSquare,
  PanelLeftClose,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectMessage } from '@/hooks/useProjectMessages';

interface ProjectChatProps {
  messages: ProjectMessage[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onCollapse: () => void;
  projectName: string;
}

export default function ProjectChat({
  messages,
  isLoading,
  isSending,
  onSendMessage,
  onCollapse,
  projectName,
}: ProjectChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput('');
    await onSendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">{projectName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCollapse}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to your project!</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              I'm Buildify, your AI-powered product builder. Describe what you want to build, and I'll help you create it.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'rounded-xl p-4',
                  message.role === 'user'
                    ? 'bg-primary/10 ml-8'
                    : 'bg-muted/50 mr-4'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Buildify</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {isSending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/50 rounded-xl p-4 mr-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Buildify</span>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted/30 rounded-xl border border-border/50 focus-within:border-border focus-within:ring-1 focus-within:ring-ring/20">
          <div className="flex items-center gap-1 px-3 pt-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-end gap-2 px-3 pb-3 pt-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI to build, change, or improve this project…"
              rows={1}
              disabled={isSending}
              className="flex-1 bg-transparent resize-none text-sm placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-[150px] py-1"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Chat</span>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={handleSend}
                disabled={!input.trim() || isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
