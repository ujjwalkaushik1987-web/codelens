import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Zap,
  RotateCw,
  AlertCircle,
  FileCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { repositoriesApi, analysisApi } from '../api/client';
import { RepositoryFile, ImpactAnalysisResult } from '../types';
import { useProject } from '../context/ProjectContext';

export const ImpactAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveProjectId, selectFileAndLine } = useProject();

  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      loadFiles(id);
    }
  }, [id]);

  const loadFiles = async (projectId: string) => {
    try {
      const data = await repositoriesApi.getFiles(projectId);
      setFiles(data);
      if (data.length > 0) {
        setSelectedPath(data[0].path);
        runAnalysis(projectId, data[0].path);
      }
    } catch (err) {
      console.error('Failed to load files', err);
    }
  };

  const runAnalysis = async (projectId: string, path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analysisApi.runImpactAnalysis(projectId, { file_path: path });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to compute change blast radius.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMonaco = (filePath: string) => {
    if (!id) return;
    selectFileAndLine(filePath, 1);
    navigate(`/projects/${id}/explorer?file=${encodeURIComponent(filePath)}`);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-8 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-[#1f293d]">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Zap className="w-6 h-6 text-amber-400" />
          Change-Impact Blast Radius Analyzer
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Predict the ripple effects of code changes. Traces direct importers, function calls, and transitive downstream dependencies.
        </p>
      </div>

      {/* Target Selector Bar */}
      <div className="bg-[#0e1420] border border-[#202b3d] rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-mono text-gray-400 shrink-0">Target File to Modify:</label>
          <select
            value={selectedPath}
            onChange={(e) => {
              setSelectedPath(e.target.value);
              if (id) runAnalysis(id, e.target.value);
            }}
            className="flex-1 sm:w-96 px-3 py-2 bg-[#141b27] border border-[#273449] rounded-md text-xs text-white font-mono outline-none focus:border-amber-400"
          >
            {files.map((f) => (
              <option key={f.id} value={f.path}>
                {f.path} ({f.line_count} lines)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => id && runAnalysis(id, selectedPath)}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold text-xs transition shadow-sm disabled:opacity-50"
        >
          {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          <span>Re-calculate Blast Radius</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
              <div className="text-xs font-mono text-gray-400 mb-1">Direct Dependents</div>
              <div className="text-3xl font-bold font-mono text-red-400">{result.direct_impact_count}</div>
              <div className="text-[11px] text-gray-500 mt-1">Directly import or invoke this file</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
              <div className="text-xs font-mono text-gray-400 mb-1">Transitive Dependents</div>
              <div className="text-3xl font-bold font-mono text-amber-400">{result.transitive_impact_count}</div>
              <div className="text-[11px] text-gray-500 mt-1">Secondary downstream propagation</div>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
              <div className="text-xs font-mono text-gray-400 mb-1">Total Blast Radius</div>
              <div className="text-3xl font-bold font-mono text-emerald-400">{result.total_affected}</div>
              <div className="text-[11px] text-gray-500 mt-1">Total affected codebase units</div>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          <div className="p-4 rounded-xl bg-[#111927] border border-[#23324a] text-xs leading-relaxed">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1 font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Impact Risk Recommendation:</span>
            </div>
            <div className="text-gray-300 font-sans">{result.recommendation}</div>
          </div>

          {/* Affected Components List */}
          <div className="bg-[#0e1420] border border-[#202b3d] rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#111724] border-b border-[#202b3d] flex items-center justify-between text-xs">
              <span className="font-semibold text-white font-mono">
                Affected Components ({result.affected_components.length})
              </span>
              <span className="text-gray-400 text-[11px]">Sorted by propagation proximity</span>
            </div>

            {result.affected_components.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-mono">
                ✓ No dependent components detected. This module operates in isolated scope.
              </div>
            ) : (
              <div className="divide-y divide-[#182130]">
                {result.affected_components.map((comp) => {
                  const severityBadge =
                    comp.severity === 'HIGH' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                        DIRECT IMPACT (Depth {comp.depth})
                      </span>
                    ) : comp.severity === 'MEDIUM' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        SECONDARY (Depth {comp.depth})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        TRANSITIVE (Depth {comp.depth})
                      </span>
                    );

                  return (
                    <div
                      key={comp.path}
                      className="p-4 hover:bg-[#121927] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-mono font-semibold text-white">{comp.path}</span>
                          {severityBadge}
                        </div>
                        <p className="text-gray-400 font-mono text-[11px]">
                          Evidence: <span className="text-gray-300">{comp.explanation}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenMonaco(comp.path)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#172131] hover:bg-[#202e45] text-gray-200 border border-[#27364d] text-xs font-mono transition self-start sm:self-auto shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inspect File</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
