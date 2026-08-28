import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { fetchAPI } from '../services/api';
import { socket } from '../services/socket';
import { Zap, LogIn, AlertCircle, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export const TeamLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('team') || '');
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await fetchAPI('/teams');
        if (res.success && res.teams) {
          setRegisteredTeams(res.teams);
        }
      } catch (err) {
        console.error('Failed to load registered teams:', err);
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please select or enter your registered Team Name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchAPI('/teams/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      if (res.success && res.team) {
        // Store team session info & authentication token
        if (res.token) {
          localStorage.setItem('team_token', res.token);
        }
        localStorage.setItem('team_info', JSON.stringify(res.team));

        // Connect team to live auction room socket
        socket.emit('join_auction_room', {
          teamId: res.team.id,
          teamName: res.team.teamName,
          registrationNumber: res.team.registrationNumber,
        });

        // Redirect to live auction screen
        navigate('/live');
      } else {
        setError(res.message || 'Team login failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Team Name or Registration Number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17] text-slate-100">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-[#0d1424] border-2 border-cyan-500/30 rounded-3xl p-8 shadow-2xl shadow-cyan-500/10 relative">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <Zap className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>

            <h1 className="text-3xl font-black text-white">Team Portal Login</h1>
            <p className="text-xs text-slate-400 mt-2">
              Select or enter your registered <strong>Team Name</strong> to enter the live auction.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Registered Teams Quick Dropdown */}
            {registeredTeams.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Select Registered Team Dropdown
                </label>
                <select
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl p-3.5 text-white text-sm focus:outline-none"
                >
                  <option value="">-- Select Your Registered Team --</option>
                  {registeredTeams.map((t) => (
                    <option key={t.id} value={t.teamName}>
                      ⚡ {t.teamName} ({t.registrationNumber} - {t.collegeName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Text Input Option */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                Or Type Team Name / Reg #
              </label>
              <div className="relative">
                <Users className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Circuit Kings or EBID-1001"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-extrabold text-black text-base bg-gradient-to-r from-cyan-400 via-cyan-300 to-yellow-400 hover:from-cyan-300 hover:to-yellow-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Entering Auction...' : 'ENTER LIVE AUCTION'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
            <span>Haven't registered your team yet? </span>
            <Link to="/register" className="text-cyan-400 font-bold hover:underline">
              Register Here
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
