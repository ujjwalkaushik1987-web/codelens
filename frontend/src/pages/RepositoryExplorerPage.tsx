import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  FileCode,
  Search,
  RotateCw,
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { repositoriesApi } from '../api/client';
import { RepositoryFile, CodeSymbol } from '../types';
import { MonacoViewer } from '../components/MonacoViewer';
import { useProject } from '../context/ProjectContext';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: Record<string, TreeNode>;
  fileData?: RepositoryFile;
}

export const RepositoryExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { setActiveProjectId, selectedFilePath, selectedLine } = useProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileSymbols, setFileSymbols] = useState<CodeSymbol[]>([]);
  const [targetLine, setTargetLine] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      fetchFiles(id);
    }
  }, [id]);

  const fetchFiles = async (projectId: string) => {
    setIsLoading(true);
    try {
      const data = await repositoriesApi.getFiles(projectId);
      setFiles(data);

      // Check if URL has ?file=...&line=... query params
      const qFile = searchParams.get('file') || selectedFilePath;
      const qLine = searchParams.get('line') ? parseInt(searchParams.get('line')!, 10) : selectedLine;

      if (qLine) {
        setTargetLine(qLine);
      }

      if (qFile) {
        const found = data.find((f) => f.path === qFile);
        if (found) {
          loadFileDetail(projectId, found.id);
          // Expand parent folders
          const parts = qFile.split('/');
          let acc = '';
          const newOpen = new Set<string>();
          for (let i = 0; i < parts.length - 1; i++) {
            acc = acc ? `${acc}/${parts[i]}` : parts[i];
            newOpen.add(acc);
          }
          setOpenFolders(newOpen);
        } else if (data.length > 0) {
          loadFileDetail(projectId, data[0].id);
        }
      } else if (data.length > 0) {
        loadFileDetail(projectId, data[0].id);
      }
    } catch (err) {
      console.error('Failed to load repository files', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileDetail = async (projectId: string, fileId: string) => {
    try {
      const detail = await repositoriesApi.getFileDetail(projectId, fileId);
      setSelectedFile(detail);
      setFileContent(detail.content || '');
      setFileSymbols(detail.symbols || []);
    } catch (err) {
      console.error('Failed to fetch file content', err);
    }
  };

  const toggleFolder = (folderPath: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Build tree from file paths
  const fileTree = React.useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };

    files.forEach((f) => {
      const parts = f.path.split('/');
      let current = root;

      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1;
        const currentPath = parts.slice(0, idx + 1).join('/');

        if (isLast) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isFolder: false,
            children: {},
            fileData: f,
          };
        } else {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: currentPath,
              isFolder: true,
              children: {},
            };
          }
          current = current.children[part];
        }
      });
    });

    return root;
  }, [files]);

  const renderTree = (node: TreeNode, depth: number = 0) => {
    const entries = Object.values(node.children).sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });

    return (
      <div className="space-y-0.5">
        {entries.map((item) => {
          if (item.isFolder) {
            const isOpen = openFolders.has(item.path);
            return (
              <div key={item.path}>
                <div
                  onClick={() => toggleFolder(item.path)}
                  style={{ paddingLeft: `${depth * 12 + 6}px` }}
                  className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-[#161f2e] cursor-pointer text-xs font-mono text-gray-300 select-none transition"
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  )}
                  {isOpen ? (
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                </div>
                {isOpen && renderTree(item, depth + 1)}
              </div>
            );
          } else {
            const isSelected = selectedFile?.path === item.path;
            return (
              <div
                key={item.path}
                onClick={() => {
                  if (item.fileData && id) {
                    setTargetLine(null);
                    loadFileDetail(id, item.fileData.id);
                  }
                }}
                style={{ paddingLeft: `${depth * 12 + 16}px` }}
                className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs font-mono select-none transition ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-400 font-semibold border-l-2 border-emerald-500'
                    : 'text-gray-300 hover:bg-[#161f2e] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileCode className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.fileData?.symbol_count ? (
                  <span className="text-[10px] text-gray-500">{item.fileData.symbol_count}s</span>
                ) : null}
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex overflow-hidden bg-[#080c14] text-[#c9d1d9]">
      {/* Left File Tree Sidebar */}
      <div className="w-72 bg-[#0e1420] border-r border-[#202b3d] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#202b3d]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#141b27] border border-[#273449] rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-gray-500">
              <RotateCw className="w-4 h-4 animate-spin mr-1.5 text-emerald-400" />
              Loading tree...
            </div>
          ) : (
            renderTree(fileTree)
          )}
        </div>

        {/* Selected file symbol list */}
        {fileSymbols.length > 0 && (
          <div className="p-3 border-t border-[#202b3d] bg-[#0b1019] max-h-48 overflow-y-auto">
            <div className="text-[11px] font-mono text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Symbols in File ({fileSymbols.length})</span>
            </div>
            <div className="space-y-1">
              {fileSymbols.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setTargetLine(s.start_line)}
                  className="flex items-center justify-between text-[11px] font-mono p-1 rounded hover:bg-[#16202f] cursor-pointer text-gray-300 transition"
                >
                  <span className="truncate text-emerald-400">{s.name}</span>
                  <span className="text-gray-500 text-[10px]">L{s.start_line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Monaco Viewer Area */}
      <div className="flex-1 p-3 overflow-hidden bg-[#080c14]">
        {selectedFile ? (
          <MonacoViewer
            code={fileContent}
            language={selectedFile.language}
            filePath={selectedFile.path}
            highlightLine={targetLine}
            height="100%"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs border border-dashed border-[#202b3d] rounded-lg">
            <FileCode className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
            <span>Select a file from the repository tree to view code.</span>
          </div>
        )}
      </div>
    </div>
  );
};
