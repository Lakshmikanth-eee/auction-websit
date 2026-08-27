import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Trophy, ShieldCheck, Monitor, UserPlus, LogIn, Menu, X, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0e17]/90 backdrop-blur-md border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform duration-200">
              <Zap className="w-7 h-7 text-yellow-300 fill-yellow-300 animate-pulse-fast" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-2xl font-black tracking-wider text-white">ELECTROBID</span>
              </div>
              <span className="block text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
                THE EEE AUCTION CHALLENGE
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/')
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Home
            </Link>

            <Link
              to="/register"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/register')
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>Register Team</span>
            </Link>

            <Link
              to="/login"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/login')
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LogIn className="w-4 h-4 text-yellow-400" />
              <span>Team Login</span>
            </Link>

            <Link
              to="/rules"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/rules')
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Event Rules</span>
            </Link>

            <Link
              to="/leaderboard"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive('/leaderboard')
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Leaderboard</span>
            </Link>

            {/* Admin Link */}
            <Link
              to={isAuthenticated ? '/admin/dashboard' : '/admin/login'}
              className="ml-2 flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border border-slate-700/60 hover:text-slate-200 hover:border-slate-500 transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAuthenticated ? 'Admin Dashboard' : 'Admin Login'}</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-2 bg-[#0d1322] border-b border-cyan-500/20">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Home
          </Link>
          <Link
            to="/register"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-cyan-400 hover:bg-slate-800"
          >
            ⚡ Register Your Team
          </Link>
          <Link
            to="/rules"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
          >
            Event Rules
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-yellow-400 hover:bg-slate-800"
          >
            Live Leaderboard
          </Link>
          <Link
            to={isAuthenticated ? '/admin/dashboard' : '/admin/login'}
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 border border-slate-700 mt-2"
          >
            🔒 {isAuthenticated ? 'Admin Control Dashboard' : 'Admin Login'}
          </Link>
        </div>
      )}
    </nav>
  );
};
