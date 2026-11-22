import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Folder, FileCode, Search, Filter, ExternalLink, ArrowRight } from 'lucide-react';
import { ArchitectureGraph, GraphNode } from '../types';
import { useProject } from '../context/ProjectContext';

interface ArchitectureVisualizerProps {
  graph: ArchitectureGraph;
}

export const ArchitectureVisualizer: React.FC<ArchitectureVisualizerProps> = ({ graph }) => {
  const navigate = useNavigate();
  const { currentProject, selectFileAndLine } = useProject();
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Filter nodes based on module and search query
  const filteredNodes = useMemo(() => {
    return graph.nodes.filter((node) => {
      if (node.type === 'module') return false; // Modules handled in sidebar/grouping
      const matchModule = selectedModule === 'all' || node.module === selectedModule;
      const matchSearch =
        !searchTerm ||
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchModule && matchSearch;
    });
  }, [graph.nodes, selectedModule, searchTerm]);

  // Group nodes by module
  const groupedByModule = useMemo(() => {
    const groups: Record<string, GraphNode[]> = {};
    filteredNodes.forEach((node) => {
      const mod = node.module || 'root';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(node);
    });
    return groups;
  }, [filteredNodes]);

  // Edges involving currently filtered nodes
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return graph.edges.filter(
      (e) => (nodeIds.has(e.source) || nodeIds.has(e.target)) && e.type !== 'contains'
    );
  }, [graph.edges, filteredNodes]);

  const handleOpenInMonaco = (node: GraphNode) => {
    if (!currentProject) return;
    selectFileAndLine(node.id, 1);
    navigate(`/projects/${currentProject.id}/explorer?file=${encodeURIComponent(node.id)}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e16] border border-[#222b38] rounded-lg overflow-hidden shadow-xl">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111723] border-b border-[#222b38] text-xs">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">Repository Dependency Graph</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
            {filteredNodes.length} Files • {filteredEdges.length} Relations
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Module Filter */}
          <div className="flex items-center gap-1.5 bg-[#182130] border border-[#2c3749] rounded px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent text-gray-200 outline-none text-xs cursor-pointer font-mono"
            >
              <option value="all">All Modules ({graph.modules.length})</option>
              {graph.modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div className="flex items-center gap-1.5 bg-[#182130] border border-[#2c3749] rounded px-2.5 py-1">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-gray-200 placeholder-gray-500 outline-none text-xs w-36 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Graph Grid / Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Modules & File Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.keys(groupedByModule).length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-sm">
              <Network className="w-8 h-8 mb-2 opacity-40 text-gray-400" />
              <span>No components found matching current filters.</span>
            </div>
          ) : (
            Object.entries(groupedByModule).map(([moduleName, nodes]) => (
              <div
                key={moduleName}
                className="bg-[#0e141f] border border-[#1e2736] rounded-lg p-3.5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#1b2331]">
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span className="font-mono font-semibold text-xs text-gray-200">{moduleName}</span>
                  <span className="text-[11px] text-gray-500 font-mono">({nodes.length} files)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const incoming = graph.edges.filter((e) => e.target === node.id && e.type !== 'contains');
                    const outgoing = graph.edges.filter((e) => e.source === node.id && e.type !== 'contains');

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`cursor-pointer rounded-md p-2.5 border transition text-xs flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                            : 'bg-[#131b28] border-[#222d3f] hover:border-gray-500 hover:bg-[#182233]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 font-mono font-medium text-gray-200 truncate">
                            <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{node.label}</span>
                          </div>
                          <span className="text-[10px] font-mono px-1 rounded bg-[#1e293b] text-gray-400 uppercase">
                            {node.language}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-1 pt-1 border-t border-[#1a2332]">
                          <span>{node.lineCount || 0} lines</span>
                          <span>{node.symbolCount || 0} symbols</span>
                        </div>

                        {(incoming.length > 0 || outgoing.length > 0) && (
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 font-mono">
                            {incoming.length > 0 && <span title="Incoming dependencies">↓ {incoming.length} in</span>}
                            {outgoing.length > 0 && <span title="Outgoing dependencies">↑ {outgoing.length} out</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Component Inspector Panel */}
        {selectedNode && (
          <div className="w-80 bg-[#0e1420] border-l border-[#222b38] p-4 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#222b38]">
                <span className="font-mono font-semibold text-xs text-white">Component Details</span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-0.5">File Path</label>
                  <div className="font-mono text-emerald-400 bg-[#141b27] p-1.5 rounded border border-[#212b3c] break-all">
                    {selectedNode.id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-[#141b27] p-2 rounded border border-[#212b3c]">
                    <div className="text-gray-500">Module</div>
                    <div className="text-gray-200 truncate">{selectedNode.module}</div>
                  </div>
                  <div className="bg-[#141b27] p-2 rounded border border-[#212b3c]">
                    <div className="text-gray-500">Lines</div>
                    <div className="text-gray-200">{selectedNode.lineCount}</div>
                  </div>
                </div>

                {/* Direct Dependencies */}
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Outgoing Dependencies</label>
                  {graph.edges.filter((e) => e.source === selectedNode.id && e.type !== 'contains').length === 0 ? (
                    <div className="text-gray-500 text-[11px] italic">No outgoing dependencies</div>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {graph.edges
                        .filter((e) => e.source === selectedNode.id && e.type !== 'contains')
                        .map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1.5 p-1.5 rounded bg-[#141b27] font-mono text-[11px] text-gray-300"
                          >
                            <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{e.target}</span>
                            <span className="ml-auto text-[10px] text-gray-500">({e.label})</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Incoming Dependents */}
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Incoming Callers / Importers</label>
                  {graph.edges.filter((e) => e.target === selectedNode.id && e.type !== 'contains').length === 0 ? (
                    <div className="text-gray-500 text-[11px] italic">No incoming dependents</div>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {graph.edges
                        .filter((e) => e.target === selectedNode.id && e.type !== 'contains')
                        .map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1.5 p-1.5 rounded bg-[#141b27] font-mono text-[11px] text-gray-300"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="truncate">{e.source}</span>
                            <span className="ml-auto text-[10px] text-gray-500">({e.label})</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenInMonaco(selectedNode)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Monaco Code Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
