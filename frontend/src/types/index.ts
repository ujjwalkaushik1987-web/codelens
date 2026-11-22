export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: 'user' | 'admin';
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface AnalysisJob {
  id: string;
  job_type: 'indexing' | 'reindexing' | 'security_scan' | 'documentation' | 'impact_analysis';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  stage_message: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  source_type: 'zip' | 'github';
  repository_url: string;
  status: 'pending' | 'indexing' | 'ready' | 'failed';
  file_count: number;
  symbol_count: number;
  chunk_count: number;
  line_count: number;
  languages: Record<string, number>;
  metadata: Record<string, any>;
  owner_email?: string;
  last_indexed_at?: string;
  created_at: string;
  updated_at: string;
  latest_job?: AnalysisJob;
}

export interface CodeSymbol {
  id: string;
  symbol_type: 'function' | 'class' | 'method' | 'import' | 'route' | 'model' | 'service' | 'variable';
  name: string;
  start_line: number;
  end_line: number;
  signature: string;
  docstring: string;
  metadata: Record<string, any>;
}

export interface RepositoryFile {
  id: string;
  path: string;
  language: string;
  size: number;
  line_count: number;
  created_at: string;
  symbol_count?: number;
  content?: string;
  content_hash?: string;
  symbols?: CodeSymbol[];
}

export interface Citation {
  file: string;
  start_line: number;
  end_line: number;
  symbol: string;
  snippet: string;
}

export interface Message {
  id: string;
  conversation: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  project: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  message_count?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'module';
  language?: string;
  module?: string;
  lineCount?: number;
  symbolCount?: number;
  fileId?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  modules: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    totalFiles: number;
    totalModules: number;
    totalSymbols: number;
  };
}

export interface AffectedComponent {
  path: string;
  file_id: string | null;
  depth: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  reasons: any[];
  line_count: number;
}

export interface ImpactAnalysisResult {
  target_file: string;
  target_symbol: string;
  direct_impact_count: number;
  transitive_impact_count: number;
  total_affected: number;
  affected_components: AffectedComponent[];
  recommendation: string;
  error?: string;
}

export interface SecurityFinding {
  id: string;
  file: string;
  file_path: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'secret' | 'sqli' | 'auth' | 'permissions' | 'dependencies' | 'validation';
  title: string;
  description: string;
  start_line: number;
  end_line: number;
  code_snippet: string;
  recommendation: string;
  confidence: string;
  is_resolved: boolean;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  doc_type: 'overview' | 'installation' | 'api' | 'modules' | 'onboarding';
  title: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SystemAnalytics {
  metrics: {
    total_users: number;
    total_projects: number;
    total_files: number;
    total_symbols: number;
    total_chunks: number;
  };
  jobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  recent_jobs: {
    id: string;
    project_id: string;
    project_name: string;
    job_type: string;
    status: string;
    progress: number;
    stage_message: string;
    error_message?: string;
    created_at: string;
    completed_at?: string;
  }[];
  languages: { language: string; count: number }[];
}
