import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  RotateCcw, 
  Eye, 
  Clock, 
  FileCode,
  ChevronRight,
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface VersionFile {
  path: string;
  content: string;
}

interface Version {
  id: string;
  version_number: number;
  label: string | null;
  files: VersionFile[];
  preview_html: string | null;
  created_at: string;
}

interface VersionHistoryViewProps {
  versions: Version[];
  currentVersion: number;
  onPreviewVersion: (version: Version) => void;
  onRestoreVersion: (version: Version) => void;
  isRestoring: boolean;
  onClose: () => void;
}

export default function VersionHistoryView({
  versions,
  currentVersion,
  onPreviewVersion,
  onRestoreVersion,
  isRestoring,
}: VersionHistoryViewProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Version History</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {versions.length} version{versions.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {/* Version List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {versions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No versions yet</p>
              <p className="text-sm text-muted-foreground/70">
                Versions are created automatically when you make changes
              </p>
            </div>
          ) : (
            versions.map((version, index) => {
              const isExpanded = expandedVersion === version.id;
              const isSelected = selectedVersion === version.id;
              const isCurrent = version.version_number === currentVersion;
              
              return (
                <motion.div
                  key={version.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "rounded-lg border transition-colors",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800"
                  )}
                >
                  {/* Version Header */}
                  <button
                    onClick={() => {
                      setExpandedVersion(isExpanded ? null : version.id);
                      setSelectedVersion(version.id);
                      onPreviewVersion(version);
                    }}
                    className="w-full p-3 flex items-start gap-3 text-left"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isCurrent ? "bg-primary text-primary-foreground" : "bg-zinc-700"
                    )}>
                      <span className="text-xs font-medium">v{version.version_number}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {version.label || `Version ${version.version_number}`}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}</span>
                        <span>•</span>
                        <FileCode className="h-3 w-3" />
                        <span>{version.files.length} file{version.files.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 mt-2",
                      isExpanded && "rotate-90"
                    )} />
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-zinc-700/50">
                          {/* Files List */}
                          <div className="mb-3 max-h-40 overflow-auto">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Files</p>
                            <div className="space-y-1">
                              {version.files.slice(0, 8).map((file) => (
                                <div 
                                  key={file.path}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <FileCode className="h-3 w-3" />
                                  <span className="truncate">{file.path}</span>
                                </div>
                              ))}
                              {version.files.length > 8 && (
                                <p className="text-xs text-muted-foreground/70">
                                  +{version.files.length - 8} more files
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 text-xs"
                              onClick={() => onPreviewVersion(version)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() => onRestoreVersion(version)}
                              disabled={isRestoring || isCurrent}
                            >
                              {isRestoring ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3 mr-1" />
                              )}
                              {isCurrent ? 'Current' : 'Restore'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
