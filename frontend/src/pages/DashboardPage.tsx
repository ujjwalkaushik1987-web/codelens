import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Trash2,
  ArrowRight,
  Code2,
  Layers,
  FileCode
} from 'lucide-react';
import { Project } from '../types';
import { projectsApi } from '../api/client';
import { useProject } from '../context/ProjectContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveProjectId } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? All indexed data, chunks, and analysis will be permanently deleted.')) {
      return;
    }
    try {
      await projectsApi.deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const handleSelectProject = (project: Project) => {
    setActiveProjectId(project.id);
    navigate(`/projects/${project.id}`);
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case 'indexing':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            Indexing
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#1f293d]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-emerald-400" />
            Repository Projects
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your indexed software codebases, inspect architecture, and perform AI queries.
          </p>
        </div>

        <Link
          to="/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Repository</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0e1420] border border-[#222d40] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0e1420] border border-[#222d40] text-gray-300 rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready</option>
            <option value="indexing">Indexing</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-xs">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
          <span>Loading repository projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#222d40] bg-[#0c121d] p-12 text-center">
          <FolderGit2 className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-white mb-1">No repositories found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
            Upload a ZIP archive or connect a public GitHub repository to get started with CodeLens intelligence.
          </p>
          <Link
            to="/projects/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
          >
            <Plus className="w-4 h-4" />
            Connect Repository
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const topLangs = Object.keys(p.languages || {}).slice(0, 3);
            return (
              <div
                key={p.id}
                onClick={() => handleSelectProject(p)}
                className="group cursor-pointer rounded-xl bg-[#0e1420] border border-[#202b3d] hover:border-emerald-500/50 p-5 transition flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-emerald-950/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-mono font-semibold text-sm text-white group-hover:text-emerald-400 transition truncate">
                      {p.name}
                    </div>
                    {getStatusBadge(p.status)}
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div>
                  {/* Languages preview */}
                  {topLangs.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {topLangs.map((lang) => (
                        <span
                          key={lang}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#16202f] text-gray-300 uppercase border border-[#263447]"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metrics bar */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-[#0a0e17] border border-[#1a2333] text-[11px] font-mono text-gray-300 mb-4">
                    <div>
                      <div className="text-gray-500 text-[10px]">Files</div>
                      <div className="font-semibold text-white">{p.file_count}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-[10px]">Symbols</div>
                      <div className="font-semibold text-white">{p.symbol_count}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-[10px]">Chunks</div>
                      <div className="font-semibold text-white">{p.chunk_count}</div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-[#1a2332]">
                    <span className="truncate">
                      {p.last_indexed_at ? `Indexed ${new Date(p.last_indexed_at).toLocaleDateString()}` : 'Not indexed'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, p.id)}
                        title="Delete Project"
                        className="p-1 text-gray-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-400 transition" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
