import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderUp,
  Github,
  FileArchive,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Info
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { useProject } from '../context/ProjectContext';

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveProjectId } = useProject();

  const [mode, setMode] = useState<'zip' | 'github'>('zip');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stageMessage, setStageMessage] = useState<string>('');

  const pollingRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollProjectStatus = (projectId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const data = await projectsApi.getProjectStatus(projectId);
        setIndexingStatus(data.status);
        if (data.job) {
          setProgress(data.job.progress || 0);
          setStageMessage(data.job.stage_message || 'Indexing repository...');
        }

        if (data.status === 'ready') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setActiveProjectId(projectId);
          setTimeout(() => {
            navigate(`/projects/${projectId}`);
          }, 1200);
        } else if (data.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError(data.job?.error_message || 'Indexing failed. Please check archive contents.');
          setIsSubmitting(false);
        }
      } catch (err) {
        console.error('Error polling status', err);
      }
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }

    if (mode === 'zip' && !file) {
      setError('Please select a .zip codebase archive.');
      return;
    }

    if (mode === 'github' && (!githubUrl || !githubUrl.includes('github.com'))) {
      setError('Please enter a valid GitHub repository URL.');
      return;
    }

    setIsSubmitting(true);
    setProgress(5);
    setStageMessage('Creating project record...');

    try {
      // 1. Create Project
      const project = await projectsApi.createProject({
        name,
        description,
      });

      // 2. Trigger Upload or GitHub connection
      if (mode === 'zip' && file) {
        setStageMessage('Uploading archive...');
        await projectsApi.uploadZip(project.id, file);
      } else if (mode === 'github') {
        setStageMessage('Requesting GitHub repository download...');
        await projectsApi.connectGitHub(project.id, githubUrl);
      }

      setIndexingStatus('indexing');
      pollProjectStatus(project.id);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error?.message || 'Failed to initialize project.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.zip')) {
        setError('Only .zip files are supported.');
        return;
      }
      setFile(selected);
      setError(null);
      if (!name) {
        setName(selected.name.replace('.zip', ''));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-10 px-4 sm:px-6 max-w-3xl mx-auto">
      <div className="mb-8 pb-6 border-b border-[#1f293d]">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <FolderUp className="w-6 h-6 text-emerald-400" />
          Connect &amp; Index Repository
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Upload a local codebase ZIP or connect a public GitHub repository for AI architecture intelligence.
        </p>
      </div>

      <div className="bg-[#0e1420] border border-[#202b3d] rounded-xl p-6 shadow-xl">
        {error && (
          <div className="mb-6 flex items-center gap-2.5 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Indexing Progress Modal / Indicator */}
        {isSubmitting ? (
          <div className="py-12 px-4 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <RotateCw className="w-6 h-6 animate-spin" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                {indexingStatus === 'ready' ? 'Indexing Complete!' : 'Indexing Repository Codebase...'}
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">{stageMessage}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto bg-[#17202e] rounded-full h-2.5 overflow-hidden border border-[#253347]">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>

            <div className="text-[11px] font-mono text-gray-500">{progress}% Completed</div>

            <div className="p-3 bg-[#111723] rounded border border-[#202b3d] text-left text-xs font-mono text-gray-400 max-w-md mx-auto">
              <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Pipeline Actions:
              </div>
              <div>• AST parsing of functions, classes, and routes</div>
              <div>• Symbol-level semantic code chunking</div>
              <div>• Vector embedding generation &amp; pgvector indexing</div>
              <div>• Dependency graph compilation &amp; SAST scan</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Source Selection Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">Ingestion Source</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('zip')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition ${
                    mode === 'zip'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#131b27] border-[#222d3e] text-gray-400 hover:text-white'
                  }`}
                >
                  <FileArchive className="w-4 h-4" />
                  <span>ZIP Codebase Archive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('github')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition ${
                    mode === 'github'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#131b27] border-[#222d3e] text-gray-400 hover:text-white'
                  }`}
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                </button>
              </div>
            </div>

            {/* Project Name & Description */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core Payment Service"
                  className="w-full px-3 py-2 bg-[#141b27] border border-[#273449] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of repository purpose and technology..."
                  className="w-full px-3 py-2 bg-[#141b27] border border-[#273449] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Ingestion Inputs */}
            {mode === 'zip' ? (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Codebase Archive (.zip)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#263447] border-dashed rounded-lg bg-[#111724] hover:border-emerald-500/50 transition">
                  <div className="space-y-1 text-center">
                    <FileArchive className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="flex text-xs text-gray-400 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-emerald-400 hover:text-emerald-300">
                        <span>Upload archive</span>
                        <input
                          type="file"
                          accept=".zip"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-[11px] text-gray-500">ZIP up to 50MB (ignores .git, node_modules, binaries)</p>
                    {file && (
                      <div className="pt-2 text-xs font-mono text-emerald-400 font-medium flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">GitHub Repository URL *</label>
                <input
                  type="url"
                  required={mode === 'github'}
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full px-3 py-2 bg-[#141b27] border border-[#273449] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Info className="w-3.5 h-3.5" />
                  <span>Public GitHub repositories are cloned directly without requiring personal tokens.</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm"
            >
              <span>Start Repository Indexing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
