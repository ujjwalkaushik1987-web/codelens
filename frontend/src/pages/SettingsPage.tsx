import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Settings,
  RotateCw,
  Trash2,
  Lock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

export const SettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveProjectId } = useProject();

  const [project, setProject] = useState<Project | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      loadProject(id);
    }
  }, [id]);

  const loadProject = async (projectId: string) => {
    try {
      const p = await projectsApi.getProject(projectId);
      setProject(p);
    } catch (err) {
      console.error('Failed to load project', err);
    }
  };

  const handleReindex = async () => {
    if (!id) return;
    setIsReindexing(true);
    setMessage(null);
    try {
      await projectsApi.reindex(id);
      setMessage('Re-indexing pipeline initiated successfully.');
      loadProject(id);
    } catch (err) {
      alert('Failed to reindex project.');
    } finally {
      setIsReindexing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !project) return;
    if (!window.confirm(`Are you absolutely sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await projectsApi.deleteProject(id);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to delete project.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-8 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-400" />
          Project &amp; System Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure repository indexing policies, privacy boundaries, and project lifecycle.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Project Configuration Card */}
      <div className="p-6 rounded-xl bg-[#0e1420] border border-[#202b3d] shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-white">Repository Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded bg-[#131b27] border border-[#222d3e]">
            <span className="text-gray-500 block mb-0.5">Project Name</span>
            <span className="text-white font-medium">{project?.name}</span>
          </div>
          <div className="p-3 rounded bg-[#131b27] border border-[#222d3e]">
            <span className="text-gray-500 block mb-0.5">Source Type</span>
            <span className="text-emerald-400 capitalize">{project?.source_type}</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-white">Trigger Re-index</div>
            <div className="text-[11px] text-gray-400">Re-parse AST symbols, regenerate chunks, and update embeddings.</div>
          </div>
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#16202f] hover:bg-[#202c3e] text-gray-200 border border-[#273549] text-xs font-mono transition disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isReindexing ? 'Re-indexing...' : 'Re-index Now'}</span>
          </button>
        </div>
      </div>

      {/* AI & Privacy Controls */}
      <div className="p-6 rounded-xl bg-[#0e1420] border border-[#202b3d] shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          AI Engine &amp; Tenant Privacy Boundaries
        </h2>

        <div className="space-y-3 text-xs leading-relaxed text-gray-300">
          <div className="flex items-start gap-2.5 p-3 rounded bg-[#131b27] border border-[#222d3e]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Strict Tenant Isolation:</strong> Chunks and embeddings are bound to your project ID (`{id}`). No cross-tenant vector retrieval is permitted.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded bg-[#131b27] border border-[#222d3e]">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Zero Public Model Training:</strong> Source code uploaded to CodeLens is used exclusively for in-session RAG retrieval.
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-xl bg-[#130d12] border border-red-500/30 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          Permanently delete this project. All associated files, AST symbols, vector chunks, security findings, and conversation histories will be immediately erased.
        </p>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isDeleting ? 'Deleting...' : 'Delete Project Permanently'}</span>
        </button>
      </div>
    </div>
  );
};
