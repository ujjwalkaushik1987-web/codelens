import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, ArrowUpRight } from 'lucide-react';
import { Citation } from '../types';
import { useProject } from '../context/ProjectContext';

interface CitationCardProps {
  citation: Citation;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const navigate = useNavigate();
  const { currentProject, selectFileAndLine } = useProject();

  const handleOpenCode = () => {
    if (!currentProject) return;
    selectFileAndLine(citation.file, citation.start_line);
    navigate(`/projects/${currentProject.id}/explorer?file=${encodeURIComponent(citation.file)}&line=${citation.start_line}`);
  };

  return (
    <div
      onClick={handleOpenCode}
      className="group cursor-pointer rounded-md bg-[#0f1521] border border-[#222b3a] hover:border-emerald-500/50 p-2.5 transition shadow-sm hover:shadow-md"
    >
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-medium truncate max-w-[85%]">
          <FileCode className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{citation.file}</span>
          <span className="text-gray-400 font-normal">
            :L{citation.start_line}
            {citation.end_line && citation.end_line !== citation.start_line ? `–L${citation.end_line}` : ''}
          </span>
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition shrink-0" />
      </div>

      {citation.symbol && (
        <div className="mb-1 text-[11px] text-gray-400 font-mono">
          <span className="text-gray-500">Symbol:</span> <span className="text-amber-300">{citation.symbol}</span>
        </div>
      )}

      {citation.snippet && (
        <pre className="bg-[#090d14] border border-[#1b2330] rounded p-1.5 text-[11px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap line-clamp-3">
          {citation.snippet.trim()}
        </pre>
      )}
    </div>
  );
};
