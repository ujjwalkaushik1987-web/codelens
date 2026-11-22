import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  AlertTriangle,
  Key,
  Database,
  Lock,
  FileCode,
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';
import { analysisApi } from '../api/client';
import { SecurityFinding } from '../types';
import { useProject } from '../context/ProjectContext';

export const SecurityPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveProjectId, selectFileAndLine } = useProject();

  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      loadFindings(id);
    }
  }, [id]);

  const loadFindings = async (projectId: string) => {
    setIsLoading(true);
    try {
      const data = await analysisApi.getSecurityFindings(projectId);
      setFindings(data);
    } catch (err) {
      console.error('Failed to load security findings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunScan = async () => {
    if (!id) return;
    setIsScanning(true);
    try {
      const res = await analysisApi.runSecurityScan(id);
      setFindings(res.findings);
    } catch (err) {
      alert('Security scan failed. Please check repository index.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenMonaco = (filePath: string, line: number) => {
    if (!id) return;
    selectFileAndLine(filePath, line);
    navigate(`/projects/${id}/explorer?file=${encodeURIComponent(filePath)}&line=${line}`);
  };

  const filteredFindings = findings.filter(
    (f) => severityFilter === 'all' || f.severity === severityFilter
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 uppercase">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30 uppercase">
            Low / Info
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-8 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#1f293d]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            Static Security &amp; Vulnerability Audit
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Automated SAST scans identifying leaked API tokens, SQL injection risks, and insecure auth.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Codebase...' : 'Run Security Scan'}</span>
        </button>
      </div>

      {/* Advisory Notice */}
      <div className="p-3 mb-6 rounded-lg bg-[#0e1624] border border-[#1f2d45] text-xs text-gray-400 flex items-center gap-2.5 font-sans">
        <Info className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Notice:</strong> Findings are AI and rule-assisted static analysis detections. Verify context and business logic before deploying production patches.
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 text-xs font-mono">
        {['all', 'critical', 'high', 'medium', 'low'].map((sev) => {
          const count = sev === 'all' ? findings.length : findings.filter((f) => f.severity === sev).length;
          const isActive = severityFilter === sev;
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-md border transition ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold'
                  : 'bg-[#0e1420] border-[#202b3d] text-gray-400 hover:text-white'
              }`}
            >
              <span className="capitalize">{sev}</span> ({count})
            </button>
          );
        })}
      </div>

      {/* Findings List */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-xs text-gray-400">
          <RotateCw className="w-5 h-5 animate-spin text-emerald-400 mb-2" />
          <span>Scanning repository files for security vulnerabilities...</span>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-[#202b3d] bg-[#0c121d]">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-white mb-1">Zero Security Findings Detected</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            No known security anti-patterns or hardcoded secrets matched the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((f) => (
            <div
              key={f.id}
              className="p-5 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-red-500/40 transition shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {getSeverityBadge(f.severity)}
                  <span className="font-semibold text-white text-sm">{f.title}</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-[#16202f] border border-[#243347] text-[11px] uppercase">
                    Category: {f.category}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">{f.description}</p>

              {/* File citation and jump */}
              <div className="flex items-center justify-between p-2 rounded bg-[#090d15] border border-[#1a2333] text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium truncate">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.file_path}</span>
                  <span className="text-gray-400">:L{f.start_line}</span>
                </div>

                <button
                  onClick={() => handleOpenMonaco(f.file_path, f.start_line)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#16202f] hover:bg-[#202c3e] text-gray-200 transition text-[11px] shrink-0"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                  <span>Inspect Line</span>
                </button>
              </div>

              {/* Code Snippet */}
              {f.code_snippet && (
                <div>
                  <div className="text-[10px] font-mono text-gray-500 mb-1">Vulnerable Code Context:</div>
                  <pre className="p-2.5 rounded bg-[#06090f] border border-[#17202e] text-[11px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">
                    {f.code_snippet}
                  </pre>
                </div>
              )}

              {/* Actionable Fix Recommendation */}
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs">
                <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-1.5 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Remediation Recommendation:
                </div>
                <div className="text-gray-300 font-sans leading-relaxed">{f.recommendation}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
