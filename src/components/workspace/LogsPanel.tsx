import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Trash2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Terminal,
  Code2,
  FileCode,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Log entry type
interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'system' | 'build' | 'ai' | 'preview' | 'network';
  message: string;
  details?: string;
  source?: string;
}

interface LogsPanelProps {
  className?: string;
}

// Generate sample logs for demonstration
function generateSampleLogs(): LogEntry[] {
  const now = new Date();
  return [
    {
      id: '1',
      timestamp: new Date(now.getTime() - 1000),
      level: 'success',
      category: 'build',
      message: 'Project compiled successfully',
      source: 'Compiler',
    },
    {
      id: '2',
      timestamp: new Date(now.getTime() - 2000),
      level: 'info',
      category: 'ai',
      message: 'AI response received',
      details: 'Model: Gemini Pro (Code) • Tokens: 1,247',
      source: 'AI Engine',
    },
    {
      id: '3',
      timestamp: new Date(now.getTime() - 5000),
      level: 'info',
      category: 'system',
      message: 'Preview updated',
      source: 'Preview',
    },
    {
      id: '4',
      timestamp: new Date(now.getTime() - 8000),
      level: 'info',
      category: 'build',
      message: 'Files saved to database',
      details: '3 files synchronized',
      source: 'Storage',
    },
    {
      id: '5',
      timestamp: new Date(now.getTime() - 12000),
      level: 'info',
      category: 'ai',
      message: 'Task classified: code generation',
      source: 'AI Router',
    },
    {
      id: '6',
      timestamp: new Date(now.getTime() - 15000),
      level: 'success',
      category: 'system',
      message: 'Version snapshot created',
      details: 'v2 saved with 3 files',
      source: 'Version Control',
    },
  ];
}

// Level icon component
function LevelIcon({ level }: { level: LogEntry['level'] }) {
  const icons = {
    info: <Info className="h-3.5 w-3.5 text-blue-400" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    error: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
    success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  };
  return icons[level];
}

// Category icon component
function CategoryIcon({ category }: { category: LogEntry['category'] }) {
  const icons = {
    system: <Terminal className="h-3 w-3" />,
    build: <Code2 className="h-3 w-3" />,
    ai: <Zap className="h-3 w-3" />,
    preview: <FileCode className="h-3 w-3" />,
    network: <RefreshCw className="h-3 w-3" />,
  };
  return icons[category];
}

// Format timestamp
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
  });
}

// Single log entry component
function LogEntryRow({ log, isExpanded, onToggle }: { 
  log: LogEntry; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const levelColors = {
    info: 'border-l-blue-500/50',
    warn: 'border-l-amber-500/50',
    error: 'border-l-red-500/50',
    success: 'border-l-emerald-500/50',
  };

  const categoryColors = {
    system: 'bg-purple-500/10 text-purple-400',
    build: 'bg-blue-500/10 text-blue-400',
    ai: 'bg-amber-500/10 text-amber-400',
    preview: 'bg-green-500/10 text-green-400',
    network: 'bg-cyan-500/10 text-cyan-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border-l-2 pl-3 pr-2 py-2 hover:bg-muted/30 transition-colors cursor-pointer',
        levelColors[log.level]
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        {/* Expand indicator */}
        {log.details ? (
          <span className="mt-0.5 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {/* Level icon */}
        <span className="mt-0.5 flex-shrink-0">
          <LevelIcon level={log.level} />
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">
              {formatTime(log.timestamp)}
            </span>
            <Badge 
              variant="secondary" 
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 gap-1 font-normal',
                categoryColors[log.category]
              )}
            >
              <CategoryIcon category={log.category} />
              {log.category}
            </Badge>
            {log.source && (
              <span className="text-[10px] text-muted-foreground">
                [{log.source}]
              </span>
            )}
          </div>
          <p className="text-sm text-foreground mt-0.5 leading-snug">
            {log.message}
          </p>
          
          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && log.details && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/30 rounded px-2 py-1">
                  {log.details}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function LogsPanel({ className }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filterLevels, setFilterLevels] = useState<Set<LogEntry['level']>>(
    new Set(['info', 'warn', 'error', 'success'])
  );
  const [filterCategories, setFilterCategories] = useState<Set<LogEntry['category']>>(
    new Set(['system', 'build', 'ai', 'preview', 'network'])
  );

  // Initialize with sample logs
  useEffect(() => {
    setLogs(generateSampleLogs());
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (!filterLevels.has(log.level)) return false;
      // Category filter
      if (!filterCategories.has(log.category)) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          log.source?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [logs, filterLevels, filterCategories, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleLevel = (level: LogEntry['level']) => {
    setFilterLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const toggleCategory = (category: LogEntry['category']) => {
    setFilterCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const clearLogs = () => setLogs([]);

  const refreshLogs = () => {
    // Add a new log entry to simulate refresh
    const newLog: LogEntry = {
      id: String(Date.now()),
      timestamp: new Date(),
      level: 'info',
      category: 'system',
      message: 'Logs refreshed',
      source: 'System',
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const logCounts = useMemo(() => ({
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    success: logs.filter(l => l.level === 'success').length,
  }), [logs]);

  return (
    <div className={cn('h-full flex flex-col bg-[#1e1e1e]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Logs</span>
          </div>
          
          {/* Log level counts */}
          <div className="flex items-center gap-1.5">
            {logCounts.error > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                {logCounts.error} errors
              </Badge>
            )}
            {logCounts.warn > 0 && (
              <Badge className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">
                {logCounts.warn} warnings
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-40 pl-7 text-xs bg-[#1e1e1e] border-[#3c3c3c]"
            />
          </div>

          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Levels
              </div>
              <DropdownMenuCheckboxItem
                checked={filterLevels.has('info')}
                onCheckedChange={() => toggleLevel('info')}
              >
                <Info className="h-3.5 w-3.5 mr-2 text-blue-400" />
                Info
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterLevels.has('warn')}
                onCheckedChange={() => toggleLevel('warn')}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-400" />
                Warnings
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterLevels.has('error')}
                onCheckedChange={() => toggleLevel('error')}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-2 text-red-400" />
                Errors
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterLevels.has('success')}
                onCheckedChange={() => toggleLevel('success')}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                Success
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Categories
              </div>
              <DropdownMenuCheckboxItem
                checked={filterCategories.has('system')}
                onCheckedChange={() => toggleCategory('system')}
              >
                System
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterCategories.has('build')}
                onCheckedChange={() => toggleCategory('build')}
              >
                Build
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterCategories.has('ai')}
                onCheckedChange={() => toggleCategory('ai')}
              >
                AI
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filterCategories.has('preview')}
                onCheckedChange={() => toggleCategory('preview')}
              >
                Preview
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={clearLogs}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          {/* Refresh */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={refreshLogs}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-[#3c3c3c]/50">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Terminal className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">No logs to display</p>
              <p className="text-xs mt-1">Build actions and events will appear here</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => (
                <LogEntryRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleExpand(log.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}