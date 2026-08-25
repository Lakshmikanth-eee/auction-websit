import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchAPI } from '../../services/api';
import { Zap, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAPI('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (res.success && res.token) {
        login(res.token, res.admin);
        navigate('/admin/dashboard');
      } else {
        setError(res.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-md w-full bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl shadow-cyan-500/10">
        <div className="text-center mb-8">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl inline-block mb-3 shadow-lg shadow-cyan-500/30">
            <Zap className="w-8 h-8 text-yellow-300 animate-pulse" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-wider">ELECTROBIT</h1>
          <p className="text-xs font-bold text-cyan-400 tracking-widest uppercase mt-1">
            CONTROL CENTER ADMIN LOGIN
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
              Admin Username
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-extrabold text-black bg-cyan-400 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'LOG IN TO ADMIN PANEL'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Restricted to Authorized Event Administrators Only</span>
        </div>
      </div>
    </div>
  );
};
