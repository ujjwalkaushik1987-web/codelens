import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Code2 className="w-5 h-5" />
          </div>
          <span className="font-mono text-xl font-bold text-white tracking-wider">CODELENS</span>
        </Link>
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Sign in to your repository
        </h2>
        <p className="mt-1 text-center text-xs text-gray-400">
          Or{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
            create a new developer account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0e1420] py-8 px-6 border border-[#202b3d] rounded-xl shadow-2xl sm:px-10">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@codelens.dev"
                  className="block w-full pl-9 pr-3 py-2 bg-[#141b27] border border-[#273449] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 bg-[#141b27] border border-[#273449] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Credentials Fill */}
          <div className="mt-6 pt-5 border-t border-[#1d2738]">
            <div className="text-[11px] font-mono text-gray-400 mb-2">Quick Sign-in with Demo Accounts:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('developer@codelens.dev', 'dev123456')}
                className="flex items-center justify-center gap-1.5 p-2 rounded bg-[#151d2a] hover:bg-[#1c2738] border border-[#27354a] text-[11px] text-gray-300 transition font-mono"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Developer Demo
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin@codelens.dev', 'admin123456')}
                className="flex items-center justify-center gap-1.5 p-2 rounded bg-[#151d2a] hover:bg-[#1c2738] border border-[#27354a] text-[11px] text-gray-300 transition font-mono"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Admin Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
