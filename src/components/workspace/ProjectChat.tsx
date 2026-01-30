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
  PanelLeftClose,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Brain,
  Code2,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectMessage } from '@/hooks/useProjectMessages';
import MarkdownRenderer from './MarkdownRenderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectChatProps {
  messages: ProjectMessage[];
  isLoading: boolean;
  isSending: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onCollapse: () => void;
  projectName: string;
}

// Model badge component to show which AI model responded
function ModelBadge({ model }: { model: string }) {
  const config = {
    openai: { 
      label: 'GPT-4o', 
      icon: Brain, 
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
    },
    claude: { 
      label: 'Claude', 
      icon: Code2, 
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' 
    },
    gemini: { 
      label: 'Gemini', 
      icon: Palette, 
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
    },
  }[model] || { label: model, icon: Sparkles, className: '' };

  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('text-[10px] px-1.5 py-0 h-4 gap-1 font-normal', config.className)}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
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
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{projectName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
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
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to your project!</h3>
            <p className="text-muted-foreground text-sm max-w-[280px]">
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
                  'rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-muted/50 ml-6'
                    : 'bg-transparent'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Buildify</span>
                    {message.metadata?.modelUsed && (
                      <ModelBadge model={message.metadata.modelUsed as string} />
                    )}
                  </div>
                )}
                {message.role === 'assistant' ? (
                  <MarkdownRenderer content={message.content} className="text-sm" />
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                )}
                
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-0.5 mt-3">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                      <MoreHorizontal className="h-3 w-3" />
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
            className="rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Buildify</span>
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
      <div className="p-3 border-t border-border">
        <div className="bg-muted/30 rounded-lg border border-border/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <div className="flex items-end gap-2 p-2">
            {/* Attachment buttons */}
            <div className="flex items-center gap-0.5 pb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach file
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload image
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI to build, change, or improve this project…"
              rows={1}
              disabled={isSending}
              className="flex-1 bg-transparent resize-none text-sm placeholder:text-muted-foreground focus:outline-none min-h-[28px] max-h-[150px] py-1.5"
            />
            
            {/* Send section */}
            <div className="flex items-center gap-1.5 pb-1">
              <span className="text-xs text-muted-foreground">Chat</span>
              <Button
                size="icon"
                className="h-7 w-7"
                onClick={handleSend}
                disabled={!input.trim() || isSending}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
