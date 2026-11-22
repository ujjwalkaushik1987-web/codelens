import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Network, RotateCw, AlertCircle } from 'lucide-react';
import { analysisApi } from '../api/client';
import { ArchitectureGraph } from '../types';
import { ArchitectureVisualizer } from '../components/ArchitectureVisualizer';
import { useProject } from '../context/ProjectContext';

export const ArchitecturePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setActiveProjectId } = useProject();

  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      fetchArchitecture(id);
    }
  }, [id]);

  const fetchArchitecture = async (projectId: string) => {
    setIsLoading(true);
    try {
      const data = await analysisApi.getArchitecture(projectId);
      setGraph(data);
    } catch (err: any) {
      setError('Failed to compute architecture dependency graph.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] p-4 bg-[#080c14] text-[#c9d1d9] flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-400">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
          <span>Synthesizing repository module &amp; import graph...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : graph ? (
        <div className="flex-1 h-full overflow-hidden">
          <ArchitectureVisualizer graph={graph} />
        </div>
      ) : null}
    </div>
  );
};
