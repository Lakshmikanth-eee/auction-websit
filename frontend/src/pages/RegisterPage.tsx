import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { fetchAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { Zap, CheckCircle2, UserPlus, AlertCircle, Printer, Sparkles, Building2, Mail, Users, Trophy, Play, LogIn } from 'lucide-react';

interface RegisteredTeamInfo {
  registrationNumber: string;
  teamName: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  department: string;
  points: number;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    teamName: '',
    participant1Name: '',
    participant2Name: '',
    collegeName: '',
    department: 'Electrical & Electronics Engineering',
    email: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredTeam, setRegisteredTeam] = useState<RegisteredTeamInfo | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetchAPI('/teams/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (response.success && response.team) {
        setRegisteredTeam(response.team);
        localStorage.setItem('team_info', JSON.stringify(response.team));
        // Automatically enter into auction screen
        setTimeout(() => {
          navigate('/live');
        }, 1500);
      } else {
        setError(response.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting registration.');
    } finally {
      setLoading(false);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17] text-slate-100">
      <Navbar />

      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wider uppercase mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>⚡ ELECTROBIT REGISTRATION</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white">Team Registration</h1>
          <p className="text-sm text-slate-400 mt-2">
            Maximum 2 participants per team. Initial balance: <strong className="text-yellow-400">50,000 points</strong>.
          </p>
        </div>

        {registeredTeam ? (
          /* SUCCESS SCREEN */
          <div className="bg-[#0d1424] border-2 border-cyan-500/40 rounded-3xl p-8 shadow-2xl shadow-cyan-500/20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-cyan-400" />
            </div>

            <div className="w-16 h-16 bg-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/40 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-3xl font-black text-white mb-2">Registration Successful! Redirecting to Auction...</h2>
            <p className="text-slate-300 text-sm mb-6">
              Your team has been recorded! Automatically entering live auction arena with 50,000 points...
            </p>

            {/* Registration Card */}
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 max-w-lg mx-auto text-left space-y-4 mb-8">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Registration Number</span>
                  <span className="text-2xl font-black text-cyan-400 font-mono tracking-wider">
                    {registeredTeam.registrationNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Initial Balance</span>
                  <span className="text-2xl font-black text-yellow-400 font-mono">
                    10,000 PTS
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">Team Name</span>
                <span className="text-xl font-bold text-white">{registeredTeam.teamName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Participant 1</span>
                  <span className="text-sm font-semibold text-slate-200">{registeredTeam.participant1Name}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block uppercase">Participant 2</span>
                  <span className="text-sm font-semibold text-slate-200">{registeredTeam.participant2Name}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 block uppercase">College & Department</span>
                <span className="text-sm font-semibold text-slate-300">
                  {registeredTeam.collegeName} ({registeredTeam.department})
                </span>
              </div>
            </div>

            {/* Note on Auction Portal Entry */}
            <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-2 border-cyan-500/40 rounded-2xl p-5 text-left max-w-lg mx-auto mb-8 text-xs text-cyan-200 shadow-xl">
              <div className="flex items-center space-x-2 mb-1.5">
                <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                <strong className="font-extrabold text-white text-sm">ENTERING LIVE AUCTION SCREEN...</strong>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your team <strong className="text-cyan-400">{registeredTeam.teamName}</strong> is registered with <strong className="text-yellow-400">10,000 starting points</strong>. You can bid your points for each question individually on the live auction screen. Winning bids will be reduced from your 10,000 balance!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 max-w-xl mx-auto">
              <Link
                to="/live"
                className="flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-black text-black bg-gradient-to-r from-cyan-400 via-yellow-400 to-amber-400 hover:from-cyan-300 hover:to-amber-300 shadow-xl shadow-yellow-500/20 text-sm transition-all"
              >
                <Zap className="w-5 h-5 fill-black" />
                <span>ENTER LIVE BIDDING ARENA NOW 🚀</span>
              </Link>

              <Link
                to={`/login?team=${encodeURIComponent(registeredTeam.teamName)}`}
                className="flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-bold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>TEAM LOGIN PORTAL</span>
              </Link>

              <Link
                to="/leaderboard"
                className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-black text-white bg-slate-800 border border-cyan-500/40 hover:bg-slate-700 text-sm transition-all"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>VIEW LIVE LEADERBOARD</span>
              </Link>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Confirmation</span>
              </button>

              <button
                onClick={() => {
                  setRegisteredTeam(null);
                  setFormData({
                    teamName: '',
                    participant1Name: '',
                    participant2Name: '',
                    collegeName: '',
                    department: 'Electrical & Electronics Engineering',
                    email: '',
                  });
                }}
                className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold text-cyan-400 bg-slate-900 border border-cyan-500/30 hover:bg-cyan-500/10 text-xs transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Another Team</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 shadow-xl">
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Team Name *
                  </label>
                  <div className="relative">
                    <Users className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="teamName"
                      required
                      value={formData.teamName}
                      onChange={handleChange}
                      placeholder="e.g. Circuit Kings"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                      Participant 1 Name *
                    </label>
                    <input
                      type="text"
                      name="participant1Name"
                      required
                      value={formData.participant1Name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                      Participant 2 Name *
                    </label>
                    <input
                      type="text"
                      name="participant2Name"
                      required
                      value={formData.participant2Name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    College Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="collegeName"
                      required
                      value={formData.collegeName}
                      onChange={handleChange}
                      placeholder="Full College / Institute Name"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="team.contact@college.edu"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-extrabold text-black text-lg bg-gradient-to-r from-cyan-400 to-yellow-400 hover:from-cyan-300 hover:to-yellow-300 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Registering Team...' : 'COMPLETE REGISTRATION'}
                </button>
              </form>
            </div>

            {/* Sidebar QR & Info */}
            <div className="space-y-6">
              <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">Registration QR Code</h3>
                <p className="text-xs text-slate-400 mb-4">Scan this QR code to quickly open team registration on mobile.</p>

                <div className="p-4 bg-white rounded-2xl inline-block mb-4 shadow-lg">
                  <QRCodeSVG value={currentUrl} size={160} />
                </div>

                <div className="text-[11px] font-mono text-cyan-400 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                  {currentUrl}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Registration Rules</h4>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li>Maximum 2 participants per team.</li>
                  <li>Initial points are awarded by the admin host.</li>
                  <li>No participant account or password needed.</li>
                  <li>Admin approves and controls all live bidding.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};
