import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HelpCircle,
  Gavel,
  Trophy,
  History,
  Monitor,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Teams', path: '/admin/teams', icon: Users },
    { label: 'Questions', path: '/admin/questions', icon: HelpCircle },
    { label: 'Auction Control', path: '/admin/auction', icon: Gavel },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy, external: true },
    { label: 'Score & Auction History', path: '/admin/history', icon: History },
    { label: 'Projector Live Screen', path: '/live', icon: Monitor, external: true },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d1322] border-b border-cyan-500/20 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="font-extrabold text-white">ELECTROBIT ADMIN</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-400 hover:text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-64 bg-[#0b101d] border-r border-cyan-500/15 flex flex-col justify-between flex-shrink-0 fixed md:sticky top-0 h-screen z-50 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-md shadow-cyan-500/30">
              <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <span className="font-black text-lg text-white tracking-wider">ELECTROBIT</span>
              <span className="block text-[10px] font-extrabold text-cyan-400 tracking-widest uppercase">
                CONTROL CENTER
              </span>
            </div>
          </div>

          {/* User Badge */}
          <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800/50 flex items-center space-x-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>LoggedIn as: <strong className="text-white">{admin?.username || 'Administrator'}</strong></span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
                  >
                    <Icon className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>{item.label}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
