import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}

// Simple syntax highlighting for TypeScript/React
function highlightCode(code: string, language: string): JSX.Element[] {
  const lines = code.split('\n');
  
  return lines.map((line, index) => {
    // Apply basic syntax highlighting
    let highlighted = line
      // Keywords
      .replace(
        /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|new|this|async|await|try|catch|throw|default|as)\b/g,
        '<span class="text-purple-400">$1</span>'
      )
      // Strings
      .replace(
        /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
        '<span class="text-green-400">$&</span>'
      )
      // JSX tags
      .replace(
        /(&lt;\/?[A-Z][a-zA-Z0-9]*)/g,
        '<span class="text-blue-400">$1</span>'
      )
      .replace(
        /(<\/?[A-Z][a-zA-Z0-9]*)/g,
        '<span class="text-blue-400">$1</span>'
      )
      // HTML tags
      .replace(
        /(<\/?(?:div|span|button|input|form|header|footer|main|section|nav|ul|li|a|p|h[1-6]))/gi,
        '<span class="text-red-400">$1</span>'
      )
      // Comments
      .replace(
        /(\/\/.*$)/gm,
        '<span class="text-gray-500">$1</span>'
      )
      // Numbers
      .replace(
        /\b(\d+)\b/g,
        '<span class="text-amber-400">$1</span>'
      )
      // Types
      .replace(
        /:\s*([A-Z][a-zA-Z0-9]*(?:<[^>]+>)?)/g,
        ': <span class="text-cyan-400">$1</span>'
      );

    return (
      <div key={index} className="table-row">
        <span className="table-cell pr-4 text-right text-muted-foreground/50 select-none text-xs w-10">
          {index + 1}
        </span>
        <span 
          className="table-cell whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
        />
      </div>
    );
  });
}

export default function CodeViewer({ code, language = 'typescript', filename, className }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden', className)}>
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
          <span className="text-sm text-muted-foreground font-mono">{filename}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Code content */}
      <ScrollArea className="flex-1">
        <pre className="p-4 text-sm font-mono text-gray-300">
          <code className="table w-full">
            {highlightCode(code, language)}
          </code>
        </pre>
      </ScrollArea>
    </div>
  );
}
