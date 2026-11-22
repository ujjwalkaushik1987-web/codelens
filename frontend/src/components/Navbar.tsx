import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Code2,
  FolderGit2,
  Bot,
  Network,
  Zap,
  BookOpen,
  ShieldAlert,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = currentProject
    ? [
        { label: 'Overview', path: `/projects/${currentProject.id}`, icon: FolderGit2 },
        { label: 'Explorer', path: `/projects/${currentProject.id}/explorer`, icon: Code2 },
        { label: 'AI Assistant', path: `/projects/${currentProject.id}/chat`, icon: Bot },
        { label: 'Architecture', path: `/projects/${currentProject.id}/architecture`, icon: Network },
        { label: 'Impact Blast Radius', path: `/projects/${currentProject.id}/impact`, icon: Zap },
        { label: 'Docs', path: `/projects/${currentProject.id}/documentation`, icon: BookOpen },
        { label: 'Security', path: `/projects/${currentProject.id}/security`, icon: ShieldAlert },
        { label: 'Settings', path: `/projects/${currentProject.id}/settings`, icon: Settings },
      ]
    : [];

  return (
    <header className="bg-[#0e131b] border-b border-[#222b38] sticky top-0 z-40 text-sm">
      {/* Top Bar */}
      <div className="max-w-[1700px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 font-semibold text-[#f0f6fc] tracking-tight hover:opacity-90 transition">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-base font-bold text-white tracking-wider">CODELENS</span>
              <span className="text-[10px] text-gray-400 -mt-1 font-mono tracking-widest uppercase">REPO INTELLIGENCE</span>
            </div>
          </Link>

          {isAuthenticated && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[#222b38] text-gray-300">
              <Link to="/dashboard" className="hover:text-white transition flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                Projects
              </Link>

              {currentProject && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  <span className="font-mono text-xs text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {currentProject.name}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/projects/create"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Connect Repo
              </Link>

              {user?.is_admin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              )}

              <div className="flex items-center gap-2 pl-3 border-l border-[#222b38]">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-gray-200">{user?.name || user?.username}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#161f2e] rounded transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Project Sub-navigation Tabs */}
      {currentProject && (
        <div className="bg-[#0b0f16] border-t border-[#1c2430] px-4">
          <div className="max-w-[1700px] mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
