import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  MoreHorizontal,
  PanelLeftClose,
  Loader2,
  Brain,
  Code2,
  Palette,
  FileCode,
  Link,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectMessage } from '@/hooks/useProjectMessages';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingIndicator from './ThinkingIndicator';
import AIErrorMessage from './AIErrorMessage';
import buildableLogo from '@/assets/buildify-logo.png';
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
  isStreaming?: boolean;
  streamingMetadata?: { modelUsed?: string; taskType?: string };
  onSendMessage: (content: string) => Promise<void>;
  onCollapse: () => void;
  projectName: string;
  filesCreated?: string[];
  lastError?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
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
  }[model] || { label: model, icon: Brain, className: '' };

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
  isStreaming = false,
  streamingMetadata,
  onSendMessage,
  onCollapse,
  projectName,
  filesCreated = [],
  lastError = null,
  onRetry,
  isRetrying = false,
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
    <div className="h-full flex flex-col bg-zinc-900/95 border-r border-border">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <img src={buildableLogo} alt="Buildable" className="h-5 w-5" />
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-900/50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src={buildableLogo} alt="Buildable" className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to your project!</h3>
            <p className="text-muted-foreground text-sm max-w-[280px]">
              I'm Buildable, your AI-powered product builder. Describe what you want to build, and I'll help you create it.
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
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <img src={buildableLogo} alt="Buildable" className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">Buildable</span>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => copyToClipboard(window.location.href + '#message-' + message.id)}>
                          <Link className="h-4 w-4 mr-2" />
                          Copy message link
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground border-t border-border mt-1 pt-1">
                          <div className="flex justify-between items-center">
                            <span>Worked for</span>
                            <span className="font-medium text-foreground">
                              {message.metadata?.duration 
                                ? Number(message.metadata.duration) >= 60 
                                  ? `${Math.floor(Number(message.metadata.duration) / 60)}m ${Number(message.metadata.duration) % 60}s` 
                                  : `${Number(message.metadata.duration)}s`
                                : '~15s'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span>Credits used</span>
                            <span className="font-medium text-foreground">
                              {message.metadata?.creditsUsed 
                                ? Number(message.metadata.creditsUsed).toFixed(2)
                                : '0.10'}
                            </span>
                          </div>
                          {message.metadata?.remainingCredits !== undefined && (
                            <div className="flex justify-between items-center mt-1">
                              <span>Balance</span>
                              <span className="font-medium text-foreground">
                                {Number(message.metadata.remainingCredits).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {/* Thinking Indicator - replaces basic spinner */}
        <ThinkingIndicator 
          isVisible={isSending || isStreaming} 
          taskType={streamingMetadata?.taskType}
          modelUsed={streamingMetadata?.modelUsed}
        />

        {/* Error Message Display */}
        <AnimatePresence>
          {lastError && !isSending && !isStreaming && (
            <AIErrorMessage 
              error={lastError} 
              onRetry={onRetry}
              isRetrying={isRetrying}
            />
          )}
        </AnimatePresence>

        {/* Files Created Notification */}
        <AnimatePresence>
          {filesCreated.length > 0 && !isSending && !isStreaming && !lastError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg p-3 bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-400">
                  {filesCreated.length} file{filesCreated.length > 1 ? 's' : ''} created
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {filesCreated.slice(0, 5).map((file) => (
                  <span
                    key={file}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono"
                  >
                    {file.split('/').pop()}
                  </span>
                ))}
                {filesCreated.length > 5 && (
                  <span className="text-[10px] px-2 py-0.5 text-muted-foreground">
                    +{filesCreated.length - 5} more
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Simplified Input Area - Like Lovable */}
      <div className="p-3 border-t border-border/50 bg-zinc-900/80">
        <div className="relative bg-zinc-800/80 rounded-xl border border-zinc-700/50 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600/50 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Buildable anything..."
            rows={1}
            disabled={isSending}
            className="w-full bg-transparent resize-none text-sm placeholder:text-muted-foreground focus:outline-none min-h-[44px] max-h-[150px] py-3 px-4 pr-12"
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
