import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Copy, Check, FileCode, ExternalLink } from 'lucide-react';

interface MonacoViewerProps {
  code: string;
  language?: string;
  filePath: string;
  highlightLine?: number | null;
  height?: string;
}

export const MonacoViewer: React.FC<MonacoViewerProps> = ({
  code,
  language = 'python',
  filePath,
  highlightLine,
  height = '100%',
}) => {
  const editorRef = useRef<any>(null);
  const [copied, setCopied] = React.useState(false);

  const getMonacoLanguage = (lang: string, path: string): string => {
    const l = lang.toLowerCase();
    if (l === 'python' || path.endsWith('.py')) return 'python';
    if (l === 'typescript' || path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (l === 'javascript' || path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (l === 'json' || path.endsWith('.json')) return 'json';
    if (l === 'yaml' || path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
    if (l === 'markdown' || path.endsWith('.md')) return 'markdown';
    if (l === 'dockerfile' || path.toLowerCase().includes('dockerfile')) return 'dockerfile';
    if (l === 'sql' || path.endsWith('.sql')) return 'sql';
    if (l === 'java' || path.endsWith('.java')) return 'java';
    if (l === 'html') return 'html';
    if (l === 'css') return 'css';
    return 'plaintext';
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom dark developer theme
    monaco.editor.defineTheme('codelens-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
      ],
      colors: {
        'editor.background': '#0a0e17',
        'editor.foreground': '#c9d1d9',
        'editorCursor.foreground': '#58a6ff',
        'editor.lineHighlightBackground': '#161e2e',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#f0f6fc',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#1f385c',
      },
    });

    monaco.editor.setTheme('codelens-dark');

    if (highlightLine && highlightLine > 0) {
      editor.revealLineInCenter(highlightLine);
      editor.setPosition({ lineNumber: highlightLine, column: 1 });
    }
  };

  useEffect(() => {
    if (editorRef.current && highlightLine && highlightLine > 0) {
      editorRef.current.revealLineInCenter(highlightLine);
      editorRef.current.setPosition({ lineNumber: highlightLine, column: 1 });
    }
  }, [highlightLine, code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = code ? code.split('\n').length : 0;
  const monacoLang = getMonacoLanguage(language, filePath);

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border border-[#222b38] rounded-lg overflow-hidden shadow-xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#101622] border-b border-[#222b38] select-none text-xs">
        <div className="flex items-center gap-2 font-mono text-gray-300">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">{filePath || 'untitled'}</span>
          {highlightLine && (
            <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              Line {highlightLine}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
          <span>{lineCount} lines</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1c2433] text-gray-300 uppercase">{monacoLang}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1c2433] hover:bg-[#263245] text-gray-200 transition"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 relative">
        <Editor
          height={height}
          language={monacoLang}
          value={code}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            automaticLayout: true,
            tabSize: 2,
            lineNumbersMinChars: 4,
          }}
        />
      </div>
    </div>
  );
};
