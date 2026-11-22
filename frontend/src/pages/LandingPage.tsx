import React from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  GitBranch,
  Bot,
  Zap,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Lock,
  Cpu,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#080c14] text-[#c9d1d9]">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 overflow-hidden border-b border-[#1c2433]">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI SOFTWARE REPOSITORY INTELLIGENCE SYSTEM
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
            Understand any codebase <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              using actual source code as evidence.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 mb-8 leading-relaxed font-sans">
            CodeLens indexes your repository with semantic AST parsing, vector search, and grounded RAG.
            Ask questions with line-level citations, visualize dependency blast radiuses, generate onboarding docs, and detect security vulnerabilities.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-950"
            >
              <span>{isAuthenticated ? 'Open Projects Dashboard' : 'Start Analyzing Codebase'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#141b27] hover:bg-[#1a2332] text-gray-200 border border-[#273347] font-medium text-sm transition"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Sign In / Demo Login</span>
            </Link>
          </div>

          {/* Realistic Terminal / Code Preview */}
          <div className="mt-14 max-w-4xl mx-auto rounded-xl bg-[#0d131f] border border-[#202b3d] shadow-2xl overflow-hidden text-left">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#121927] border-b border-[#202b3d] text-xs font-mono text-gray-400">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="ml-2 text-gray-300 font-semibold">codelens-cli query "How is user authentication verified?"</span>
              </div>
              <span className="text-emerald-400 text-[11px]">Grounded RAG • 0 Hallucination</span>
            </div>

            <div className="p-5 font-mono text-xs leading-relaxed space-y-3 bg-[#0a0e17]">
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">&gt;</span> Analyzing repository AST &amp; vector embeddings...
              </div>

              <div className="text-gray-200 bg-[#111827] p-3 rounded border border-[#1f293d]">
                <div className="text-emerald-400 font-semibold mb-1">Answer from CodeLens Intelligence:</div>
                Authentication is implemented in <span className="text-cyan-300 underline font-semibold">auth/jwt_service.py</span> (lines 10–18) via the <span className="text-amber-300">AuthService.verify_token</span> method using HMAC-SHA256 tokens.
                Incoming requests are validated at the route handler in <span className="text-cyan-300 underline font-semibold">server.py</span> (lines 14–22).
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Citation: auth/jwt_service.py#L10-L18
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Citation: server.py#L14-L22
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Engineered for Senior Software Engineers
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Not a generic conversational chatbot. A repository intelligence platform built with concrete code graph evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-lg bg-[#0e1420] border border-[#1e2738] hover:border-emerald-500/40 transition">
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3.5">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Code-Aware RAG with Line Citations</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Every response is strictly grounded in actual AST-parsed code chunks. Every assertion links directly to the file path and line numbers in Monaco Editor.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1420] border border-[#1e2738] hover:border-emerald-500/40 transition">
            <div className="w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3.5">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Interactive Architecture Graph</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Explore the entire repository topology: module boundaries, imports, function calls, and class inheritance hierarchies in an interactive visualizer.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1420] border border-[#1e2738] hover:border-emerald-500/40 transition">
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Change-Impact Blast Radius</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Select any file or symbol to compute downstream direct and transitive dependents using BFS graph reachability with confidence metrics.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1420] border border-[#1e2738] hover:border-emerald-500/40 transition">
            <div className="w-9 h-9 rounded-md bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Automated SAST Security Auditing</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Identifies hardcoded API tokens, dynamic SQL injection risks, insecure deserialization, unsafe permissions, and weak cryptography with actionable fixes.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1420] border border-[#1e2738] hover:border-emerald-500/40 transition">
            <div className="w-9 h-9 rounded-md bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Living Documentation Generator</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generates Day-1 developer onboarding guides, architecture blueprints, installation guides, and API route catalogs exportable as Markdown.
            </p>
          </div>

          <div className="p-5 rounded-lg bg-[#0e1420] border border-[#1e2738] hover:border-emerald-500/40 transition">
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3.5">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Strict Project Isolation</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Strong tenant boundaries prevent cross-repository contamination. Path-traversal proof extraction guards against malicious archive attacks.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Architecture Highlights */}
      <section className="py-16 px-4 bg-[#0a0e17] border-y border-[#1c2433]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Zero-Leakage Security Model</h3>
            <p className="text-xs text-gray-400 max-w-lg leading-relaxed">
              All vector search operations are strictly bound by tenant project IDs. Uploaded code is sanitized, secrets are masked, and no user codebase is ever submitted to public training sets.
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>pgvector Vector DB isolation</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Safe Zip Slip traversal defense</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>JWT Authentication &amp; RBAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Ready to eliminate repository onboarding friction?
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
          Connect your GitHub repository or upload a ZIP archive in seconds.
        </p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/register'}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition shadow-lg shadow-emerald-950"
        >
          <span>Start Indexing Your First Project</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
};
