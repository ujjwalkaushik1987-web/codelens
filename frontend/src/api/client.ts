import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  AuthResponse,
  Project,
  RepositoryFile,
  ArchitectureGraph,
  ImpactAnalysisResult,
  SecurityFinding,
  GeneratedDocument,
  Conversation,
  Message,
  SystemAnalytics
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('codelens_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login/') || originalRequest.url?.includes('/auth/register/')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('codelens_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('codelens_access_token');
        localStorage.removeItem('codelens_refresh_token');
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = data.access;
        localStorage.setItem('codelens_access_token', newAccess);
        if (data.refresh) {
          localStorage.setItem('codelens_refresh_token', data.refresh);
        }
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('codelens_access_token');
        localStorage.removeItem('codelens_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Authentication Endpoints
export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login/', credentials);
    return res.data;
  },
  register: async (payload: { email: string; username: string; password: string; password_confirm: string; name?: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register/', payload);
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me/');
    return res.data.user;
  },
};

// Projects Endpoints
export const projectsApi = {
  getProjects: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects/');
    return res.data;
  },
  getProject: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}/`);
    return res.data;
  },
  createProject: async (data: { name: string; description?: string }): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects/', data);
    return res.data;
  },
  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}/`);
  },
  getProjectStatus: async (id: string) => {
    const res = await apiClient.get(`/projects/${id}/status/`);
    return res.data;
  },
  uploadZip: async (id: string, file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/projects/${id}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },
  connectGitHub: async (id: string, url: string) => {
    const res = await apiClient.post(`/projects/${id}/github-connect/`, { url });
    return res.data;
  },
  reindex: async (id: string) => {
    const res = await apiClient.post(`/projects/${id}/reindex/`);
    return res.data;
  },
};

// Repositories Endpoints
export const repositoriesApi = {
  getFiles: async (projectId: string, params?: { search?: string; language?: string }): Promise<RepositoryFile[]> => {
    const res = await apiClient.get<RepositoryFile[]>(`/projects/${projectId}/files/`, { params });
    return res.data;
  },
  getFileDetail: async (projectId: string, fileId: string): Promise<RepositoryFile> => {
    const res = await apiClient.get<RepositoryFile>(`/projects/${projectId}/files/${fileId}/`);
    return res.data;
  },
};

// Code Analysis Endpoints
export const analysisApi = {
  getArchitecture: async (projectId: string): Promise<ArchitectureGraph> => {
    const res = await apiClient.get<ArchitectureGraph>(`/projects/${projectId}/architecture/`);
    return res.data;
  },
  runImpactAnalysis: async (projectId: string, data: { file_path: string; symbol_name?: string }): Promise<ImpactAnalysisResult> => {
    const res = await apiClient.post<ImpactAnalysisResult>(`/projects/${projectId}/impact-analysis/`, data);
    return res.data;
  },
  getDocumentation: async (projectId: string): Promise<GeneratedDocument[]> => {
    const res = await apiClient.get<GeneratedDocument[]>(`/projects/${projectId}/documentation/`);
    return res.data;
  },
  generateDocumentation: async (projectId: string): Promise<{ message: string; documents: GeneratedDocument[] }> => {
    const res = await apiClient.post(`/projects/${projectId}/documentation/`);
    return res.data;
  },
  getSecurityFindings: async (projectId: string): Promise<SecurityFinding[]> => {
    const res = await apiClient.get<SecurityFinding[]>(`/projects/${projectId}/security-scan/`);
    return res.data;
  },
  runSecurityScan: async (projectId: string): Promise<{ message: string; findings: SecurityFinding[] }> => {
    const res = await apiClient.post(`/projects/${projectId}/security-scan/`);
    return res.data;
  },
};

// Conversations & AI Assistant Endpoints
export const conversationsApi = {
  getConversations: async (projectId: string): Promise<Conversation[]> => {
    const res = await apiClient.get<Conversation[]>(`/projects/${projectId}/conversations/`);
    return res.data;
  },
  createConversation: async (projectId: string, title?: string): Promise<Conversation> => {
    const res = await apiClient.post<Conversation>(`/projects/${projectId}/conversations/`, { title });
    return res.data;
  },
  getConversation: async (conversationId: string): Promise<Conversation> => {
    const res = await apiClient.get<Conversation>(`/conversations/${conversationId}/`);
    return res.data;
  },
  deleteConversation: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`/conversations/${conversationId}/`);
  },
  sendMessage: async (conversationId: string, content: string): Promise<{
    success: boolean;
    user_message: Message;
    message: Message;
    citations: any[];
  }> => {
    const res = await apiClient.post(`/conversations/${conversationId}/messages/`, { content });
    return res.data;
  },
};

// Analytics & Admin Endpoints
export const analyticsApi = {
  getSystemAnalytics: async (): Promise<SystemAnalytics> => {
    const res = await apiClient.get<SystemAnalytics>('/analytics/system/');
    return res.data;
  },
  getProjectAnalytics: async (projectId: string) => {
    const res = await apiClient.get(`/analytics/projects/${projectId}/`);
    return res.data;
  },
};
