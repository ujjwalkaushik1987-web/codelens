import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  Code2,
  Bot,
  Network,
  Zap,
  BookOpen,
  ShieldAlert,
  Settings,
  RotateCw,
  FileCode,
  Layers,
  Database,
  CheckCircle2,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { projectsApi, analysisApi } from '../api/client';
import { Project, SecurityFinding } from '../types';
import { useProject } from '../context/ProjectContext';

export const ProjectOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setActiveProjectId } = useProject();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      fetchDetails(id);
    }
  }, [id]);

  const fetchDetails = async (projectId: string) => {
    setIsLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        projectsApi.getProject(projectId),
        analysisApi.getSecurityFindings(projectId).catch(() => []),
      ]);
      setProject(pData);
      setFindings(sData);
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-xs text-gray-400">
        <RotateCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
        Loading repository architecture...
      </div>
    );
  }

  const langEntries = Object.entries(project.languages || {}).sort((a, b) => b[1] - a[1]);
  const totalLangFiles = langEntries.reduce((sum, item) => sum + item[1], 0) || 1;

  const criticalFindings = findings.filter((f) => f.severity === 'critical');
  const highFindings = findings.filter((f) => f.severity === 'high');

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Project Header Banner */}
      <div className="bg-[#0e1420] border border-[#202b3d] rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1f293d]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl font-bold text-white tracking-tight font-mono">{project.name}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {project.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              {project.description || 'Repository intelligence overview and grounded architecture metrics.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <Link
              to={`/projects/${project.id}/chat`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition shadow-sm"
            >
              <Bot className="w-4 h-4" />
              <span>Ask CodeLens AI</span>
            </Link>
            <Link
              to={`/projects/${project.id}/explorer`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#16202f] hover:bg-[#1e2b3f] text-gray-200 border border-[#273549] transition"
            >
              <Code2 className="w-4 h-4" />
              <span>Browse Code</span>
            </Link>
          </div>
        </div>

        {/* 4 Core Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-lg bg-[#0a0e17] border border-[#1a2333]">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-mono">Indexed Files</span>
              <FileCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{project.file_count}</div>
            <div className="text-[11px] text-gray-500 mt-1">Source files analyzed</div>
          </div>

          <div className="p-4 rounded-lg bg-[#0a0e17] border border-[#1a2333]">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-mono">Lines of Code</span>
              <Code2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{project.line_count.toLocaleString()}</div>
            <div className="text-[11px] text-gray-500 mt-1">Total repository lines</div>
          </div>

          <div className="p-4 rounded-lg bg-[#0a0e17] border border-[#1a2333]">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-mono">Code Symbols</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{project.symbol_count}</div>
            <div className="text-[11px] text-gray-500 mt-1">Functions, classes &amp; routes</div>
          </div>

          <div className="p-4 rounded-lg bg-[#0a0e17] border border-[#1a2333]">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-mono">Vector Chunks</span>
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{project.chunk_count}</div>
            <div className="text-[11px] text-gray-500 mt-1">RAG indexed embeddings</div>
          </div>
        </div>
      </div>

      {/* Middle Row: Languages & Security Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Languages Breakdown */}
        <div className="lg:col-span-2 bg-[#0e1420] border border-[#202b3d] rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            Language Distribution
          </h2>

          {/* Stacked bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#16202f] mb-4">
            {langEntries.map(([lang, count], idx) => {
              const pct = (count / totalLangFiles) * 100;
              const colors = ['bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];
              return (
                <div
                  key={lang}
                  style={{ width: `${pct}%` }}
                  title={`${lang}: ${count} files (${pct.toFixed(1)}%)`}
                  className={`${colors[idx % colors.length]} h-full transition-all`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {langEntries.map(([lang, count]) => {
              const pct = ((count / totalLangFiles) * 100).toFixed(1);
              return (
                <div key={lang} className="p-2.5 rounded bg-[#121926] border border-[#1c2637] text-xs font-mono">
                  <div className="text-gray-300 font-semibold uppercase">{lang}</div>
                  <div className="text-gray-500 text-[11px]">{count} files • {pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Health Summary */}
        <div className="bg-[#0e1420] border border-[#202b3d] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Security Posture
              </h2>
              <Link to={`/projects/${project.id}/security`} className="text-xs text-emerald-400 hover:underline">
                View Audit
              </Link>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                <span>Critical Vulnerabilities</span>
                <span className="font-bold">{criticalFindings.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <span>High Severity Risks</span>
                <span className="font-bold">{highFindings.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#121926] border border-[#1c2637] text-gray-300">
                <span>Total Security Findings</span>
                <span className="font-bold">{findings.length}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Automated SAST audits search for exposed API secrets, unsafe SQL queries, and weak cryptography patterns.
          </p>
        </div>
      </div>

      {/* Quick Access Feature Cards */}
      <h2 className="text-base font-semibold text-white mb-4">Repository Intelligence Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to={`/projects/${project.id}/chat`}
          className="group p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 transition flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-emerald-400 mb-1">
              <span>CodeLens AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask questions about the repository. Returns grounded explanations with clickable file and line citations.
            </p>
          </div>
        </Link>

        <Link
          to={`/projects/${project.id}/architecture`}
          className="group p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 transition flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-cyan-400 mb-1">
              <span>Architecture &amp; Dependencies</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Interactive visualizer of module boundaries, file imports, class inheritances, and function calls.
            </p>
          </div>
        </Link>

        <Link
          to={`/projects/${project.id}/impact`}
          className="group p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 transition flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-amber-400 mb-1">
              <span>Change-Impact Blast Radius</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Select any file or function to trace downstream direct and transitive dependents before merging changes.
            </p>
          </div>
        </Link>

        <Link
          to={`/projects/${project.id}/documentation`}
          className="group p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 transition flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-purple-400 mb-1">
              <span>Documentation Generator</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Synthesizes Day-1 developer onboarding guides, architecture blueprints, installation setups, and API routes.
            </p>
          </div>
        </Link>

        <Link
          to={`/projects/${project.id}/security`}
          className="group p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 transition flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-red-400 mb-1">
              <span>Security Audit</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 transition" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Scan for secrets, SQL injection, insecure permissions, and deserialization flaws with code citations.
            </p>
          </div>
        </Link>

        <Link
          to={`/projects/${project.id}/explorer`}
          className="group p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 transition flex items-start gap-3.5"
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-white group-hover:text-blue-400 mb-1">
              <span>Repository Code Explorer</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition" />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Browse the file hierarchy, inspect symbols, and view full source code in Monaco Editor with syntax highlighting.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
