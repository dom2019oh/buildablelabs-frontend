import { useState, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Check, Copy, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  onSave?: (newCode: string) => void;
  readOnly?: boolean;
}

// Map file extensions to Monaco language IDs
function getMonacoLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'javascript',
    tsx: 'typescript',
    jsx: 'javascript',
    css: 'css',
    html: 'html',
    json: 'json',
    markdown: 'markdown',
    md: 'markdown',
    text: 'plaintext',
    xml: 'xml',
    svg: 'xml',
  };
  return languageMap[language] || 'plaintext';
}

export default function CodeViewer({ 
  code, 
  language = 'typescript', 
  filename, 
  className,
  onSave,
  readOnly = false,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(isEditing ? editedCode : code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Define custom dark theme matching VS Code Dark+
    monaco.editor.defineTheme('buildify-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'keyword.control', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'string.escape', foreground: 'D7BA7D' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'interface', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'variable.predefined', foreground: '4FC1FF' },
        { token: 'constant', foreground: '4FC1FF' },
        { token: 'tag', foreground: '569CD6' },
        { token: 'attribute.name', foreground: '9CDCFE' },
        { token: 'attribute.value', foreground: 'CE9178' },
        { token: 'delimiter', foreground: 'D4D4D4' },
        { token: 'delimiter.bracket', foreground: 'FFD700' },
        { token: 'operator', foreground: 'D4D4D4' },
        // JSX/TSX specific
        { token: 'tag.tsx', foreground: '4EC9B0' },
        { token: 'tag.jsx', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorCursor.foreground': '#aeafad',
        'editorWhitespace.foreground': '#3b3b3b',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464b3',
        'scrollbarSlider.activeBackground': '#bfbfbf66',
      },
    });
    
    monaco.editor.setTheme('buildify-dark');
    
    // Configure TypeScript/JavaScript for JSX/TSX
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      jsxFactory: 'React.createElement',
      reactNamespace: 'React',
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    });
  };

  const handleStartEdit = () => {
    setEditedCode(code);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedCode(code);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (onSave) {
      onSave(editedCode);
    }
    setIsEditing(false);
  };

  const monacoLanguage = getMonacoLanguage(language);

  return (
    <div className={cn('flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden', className)}>
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">{filename}</span>
            {isEditing && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                Editing
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleCancelEdit}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                  onClick={handleSaveEdit}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </Button>
              </>
            ) : (
              <>
                {!readOnly && onSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
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
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={isEditing ? editedCode : code}
          onChange={(value) => setEditedCode(value || '')}
          onMount={handleEditorMount}
          options={{
            readOnly: !isEditing,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            lineNumbersMinChars: 4,
            renderLineHighlight: 'line',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            folding: true,
            foldingHighlight: true,
            showFoldingControls: 'mouseover',
            matchBrackets: 'always',
            selectionHighlight: true,
            occurrencesHighlight: 'singleFile',
            renderWhitespace: 'selection',
            contextmenu: true,
            quickSuggestions: isEditing,
            suggestOnTriggerCharacters: isEditing,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: isEditing ? 'top' : 'none',
          }}
          theme="buildify-dark"
          loading={
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading editor...
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
