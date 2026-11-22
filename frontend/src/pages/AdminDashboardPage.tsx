import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Server,
  Activity,
  Users,
  FolderGit2,
  FileCode,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { analyticsApi, apiClient } from '../api/client';
import { SystemAnalytics } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, healthRes] = await Promise.all([
        analyticsApi.getSystemAnalytics(),
        apiClient.get('/health/').then((res) => res.data).catch(() => ({ status: 'degraded' })),
      ]);
      setAnalytics(analyticsData);
      setHealth(healthRes);
    } catch (err) {
      console.error('Failed to load admin analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !analytics) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-xs text-gray-400">
        <RotateCw className="w-5 h-5 animate-spin text-amber-400 mr-2" />
        Loading system telemetry...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1f293d]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            System Administration &amp; Telemetry
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Monitor ingestion task workers, system health checks, database connections, and usage statistics.
          </p>
        </div>

        <button
          onClick={fetchSystemData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16202f] hover:bg-[#202c3e] text-gray-200 border border-[#273549] text-xs font-mono transition self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Services Health Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-gray-400">Database Engine</div>
            <div className="text-sm font-semibold text-white capitalize font-mono">
              {health?.services?.database?.vendor || 'PostgreSQL / SQLite'}
            </div>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> UP
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-gray-400">Redis Broker / In-Memory</div>
            <div className="text-sm font-semibold text-white capitalize font-mono">
              {health?.services?.redis?.status || 'Active'}
            </div>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-3.5 h-3.5" /> OK
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-gray-400">System Overall Status</div>
            <div className="text-sm font-semibold text-white capitalize font-mono">
              {health?.status || 'Healthy'}
            </div>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Server className="w-3.5 h-3.5" /> NORMAL
          </span>
        </div>
      </div>

      {/* Platform Metrics Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
          <div className="text-xs font-mono text-gray-400 mb-1">Total Users</div>
          <div className="text-2xl font-bold font-mono text-white">{analytics.metrics.total_users}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
          <div className="text-xs font-mono text-gray-400 mb-1">Total Repositories</div>
          <div className="text-2xl font-bold font-mono text-white">{analytics.metrics.total_projects}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
          <div className="text-xs font-mono text-gray-400 mb-1">Indexed Files</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{analytics.metrics.total_files}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
          <div className="text-xs font-mono text-gray-400 mb-1">Total AST Symbols</div>
          <div className="text-2xl font-bold font-mono text-cyan-400">{analytics.metrics.total_symbols}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0e1420] border border-[#202b3d]">
          <div className="text-xs font-mono text-gray-400 mb-1">Vector Chunks</div>
          <div className="text-2xl font-bold font-mono text-purple-400">{analytics.metrics.total_chunks}</div>
        </div>
      </div>

      {/* Ingestion Jobs Queue Table */}
      <div className="bg-[#0e1420] border border-[#202b3d] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#111724] border-b border-[#202b3d] flex items-center justify-between text-xs">
          <span className="font-semibold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Recent Ingestion Tasks ({analytics.recent_jobs.length})
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {analytics.jobs.completed} Completed • {analytics.jobs.failed} Failed • {analytics.jobs.running} Running
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0b0f17] text-gray-400 border-b border-[#1f293d]">
              <tr>
                <th className="py-2.5 px-4">Project</th>
                <th className="py-2.5 px-4">Job Type</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Progress</th>
                <th className="py-2.5 px-4">Stage Message</th>
                <th className="py-2.5 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182130]">
              {analytics.recent_jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#121927] transition">
                  <td className="py-2.5 px-4 font-semibold text-white">{job.project_name}</td>
                  <td className="py-2.5 px-4 text-gray-400">{job.job_type}</td>
                  <td className="py-2.5 px-4">
                    {job.status === 'completed' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        COMPLETED
                      </span>
                    ) : job.status === 'running' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        RUNNING
                      </span>
                    ) : job.status === 'failed' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                        FAILED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[#16202f] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400">{job.progress}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-gray-300 max-w-xs truncate">{job.stage_message}</td>
                  <td className="py-2.5 px-4 text-gray-500 text-[11px]">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
