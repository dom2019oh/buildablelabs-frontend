import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Check, Copy, Sparkles } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showThinkingIndicator?: boolean;
  currentActions?: string[];
}

// Code block component with copy functionality
function CodeBlock({ 
  children, 
  className,
  node,
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string;
  node?: unknown;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  // Check if this is inline code by looking at the parent node
  const isInline = !className;

  // Inline code
  if (isInline) {
    return (
      <code 
        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Extract language from className (e.g., "language-tsx")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  return (
    <div className="relative group my-3">
      {/* Language badge & copy button */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        {language && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/80 px-2 py-0.5 rounded">
            {language}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 hover:bg-muted"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      
      {/* Code content */}
      <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed border border-border/50">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// Thinking indicator component for inline display
function ThinkingIndicatorInline({ actions = [] }: { actions?: string[] }) {
  return (
    <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-purple-500/10 border border-purple-500/20">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative">
          <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
          <div className="absolute inset-0 h-4 w-4 bg-purple-400/30 rounded-full blur-md animate-ping" />
        </div>
        <span className="text-sm font-medium text-purple-300">Building...</span>
      </div>
      {actions.length > 0 && (
        <div className="space-y-1 mt-2">
          {actions.slice(-4).map((action, i) => (
            <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
              <Check className="h-3 w-3 text-green-500" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarkdownRenderer({ 
  content, 
  className,
  showThinkingIndicator = false,
  currentActions = []
}: MarkdownRendererProps) {
  // Replace {THINKING_INDICATOR} with a special marker for splitting
  const THINKING_MARKER = '___THINKING_INDICATOR___';
  const processedContent = content.replace(/\{THINKING_INDICATOR\}/g, THINKING_MARKER);
  const parts = processedContent.split(THINKING_MARKER);

  return (
    <div className={cn('markdown-content', className)}>
      {parts.map((part, index) => (
        <div key={index}>
          {part && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold mt-3 mb-2 text-foreground">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h4>
                ),
                
                // Paragraphs
                p: ({ children }) => (
                  <p className="mb-2 leading-relaxed text-foreground/90">{children}</p>
                ),
                
                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 space-y-1 text-foreground/90">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1 text-foreground/90">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                
                // Code - handle both inline and block
                code: ({ className, children, node, ...props }) => (
                  <CodeBlock className={className} node={node} {...props}>
                    {children}
                  </CodeBlock>
                ),
                
                // Pre wrapper - just pass through
                pre: ({ children }) => <>{children}</>,
                
                // Links - handle internal vs external
                a: ({ href, children }) => {
                  // Check if it's an internal link (starts with /)
                  if (href?.startsWith('/')) {
                    return (
                      <Link 
                        to={href}
                        className="text-primary hover:underline font-medium"
                      >
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  );
                },
                
                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/50 pl-4 my-2 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                
                // Tables
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse border border-border rounded-lg">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 text-left text-sm font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-sm">{children}</td>
                ),
                
                // Horizontal rule
                hr: () => <hr className="my-4 border-border" />,
                
                // Strong & emphasis
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic">{children}</em>
                ),
              }}
            >
              {part}
            </ReactMarkdown>
          )}
          {/* Show thinking indicator after each split (except the last one) */}
          {index < parts.length - 1 && showThinkingIndicator && (
            <ThinkingIndicatorInline actions={currentActions} />
          )}
        </div>
      ))}
    </div>
  );
}
