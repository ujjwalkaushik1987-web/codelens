import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '../types';
import { projectsApi } from '../api/client';

interface ProjectContextType {
  currentProject: Project | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  refetchProject: () => Promise<void>;
  isLoading: boolean;
  selectedFilePath: string | null;
  selectedLine: number | null;
  selectFileAndLine: (path: string, line?: number) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const fetchProject = async (id: string) => {
    setIsLoading(true);
    try {
      const p = await projectsApi.getProject(id);
      setCurrentProject(p);
    } catch (err) {
      setCurrentProject(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProjectId) {
      fetchProject(activeProjectId);
    } else {
      setCurrentProject(null);
    }
  }, [activeProjectId]);

  const refetchProject = async () => {
    if (activeProjectId) {
      await fetchProject(activeProjectId);
    }
  };

  const selectFileAndLine = (path: string, line?: number) => {
    setSelectedFilePath(path);
    setSelectedLine(line ?? 1);
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        activeProjectId,
        setActiveProjectId,
        refetchProject,
        isLoading,
        selectedFilePath,
        selectedLine,
        selectFileAndLine,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
