import { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image,
  Settings,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  selectedFile?: string;
  onFileSelect?: (file: FileNode) => void;
  className?: string;
}

// Get icon based on file extension
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
    case 'txt':
      return FileText;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
    case 'ico':
      return Image;
    case 'toml':
    case 'yaml':
    case 'yml':
      return Settings;
    default:
      return File;
  }
}

// Get file color based on extension
function getFileColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'tsx':
      return 'text-blue-400';
    case 'ts':
      return 'text-blue-500';
    case 'jsx':
      return 'text-yellow-400';
    case 'js':
      return 'text-yellow-500';
    case 'json':
      return 'text-amber-400';
    case 'css':
      return 'text-purple-400';
    case 'html':
      return 'text-orange-500';
    case 'md':
      return 'text-gray-400';
    case 'svg':
    case 'png':
    case 'jpg':
      return 'text-green-400';
    default:
      return 'text-muted-foreground';
  }
}

interface TreeNodeProps {
  node: FileNode;
  level: number;
  selectedFile?: string;
  onFileSelect?: (file: FileNode) => void;
  defaultExpanded?: boolean;
}

function TreeNode({ node, level, selectedFile, onFileSelect, defaultExpanded = false }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);
  const isSelected = selectedFile === node.path;
  
  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(node);
    }
  };

  const FileIcon = node.type === 'folder' 
    ? (isExpanded ? FolderOpen : Folder)
    : getFileIcon(node.name);

  const iconColor = node.type === 'folder' 
    ? 'text-amber-500' 
    : getFileColor(node.name);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm text-sm',
          'hover:bg-accent/50 transition-colors',
          isSelected && 'bg-accent text-accent-foreground'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}
        <FileIcon className={cn('h-4 w-4 flex-shrink-0', iconColor)} />
        <span className="truncate">{node.name}</span>
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({ files, selectedFile, onFileSelect, className }: FileExplorerProps) {
  // Sort files: folders first, then alphabetically
  const sortedFiles = useMemo(() => {
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
      return [...nodes].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      }).map(node => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined
      }));
    };
    return sortNodes(files);
  }, [files]);

  if (files.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-muted-foreground', className)}>
        <Package className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">No files yet</p>
        <p className="text-xs mt-1">Start building to see your project structure</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="py-2">
        {sortedFiles.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            level={0}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            defaultExpanded
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// Helper function to build file tree from flat paths
export function buildFileTree(files: Array<{ path: string; content?: string }>): FileNode[] {
  const root: FileNode[] = [];
  
  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;
      
      let existing = currentLevel.find(n => n.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          children: isFile ? undefined : [],
          content: isFile ? file.content : undefined,
        };
        currentLevel.push(existing);
      }
      
      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }
  
  return root;
}
