import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { fetchAPI } from '../services/api';
import { socket } from '../services/socket';
import { Trophy, Medal, Zap, RefreshCw, Award, CheckCircle2, Download, Users, DollarSign, Target, XCircle } from 'lucide-react';

interface LeaderboardTeam {
  rank: number;
  id: string;
  registrationNumber: string;
  teamName: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  department: string;
  points: number;
  correctAnswers: number;
  wrongAnswers?: number;
  totalBids?: number;
}

export const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadLeaderboard = async () => {
    try {
      const res = await fetchAPI('/leaderboard');
      if (res.success && res.leaderboard) {
        setLeaderboard(res.leaderboard);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();

    // Listen for WebSocket live score & leaderboard updates
    const handleUpdate = () => {
      loadLeaderboard();
    };

    socket.on('leaderboard_updated', handleUpdate);
    socket.on('score_updated', handleUpdate);

    return () => {
      socket.off('leaderboard_updated', handleUpdate);
      socket.off('score_updated', handleUpdate);
    };
  }, []);

  // Download Winner List CSV
  const handleDownloadWinnerList = () => {
    const headers = [
      'Rank',
      'Registration Number',
      'Team Name',
      'Participant 1',
      'Participant 2',
      'College Name',
      'Department',
      'Final Points',
      'Correct Answers Count'
    ];

    const rows = leaderboard.map((t) => [
      `${t.rank}`,
      `"${t.registrationNumber || ''}"`,
      `"${t.teamName || ''}"`,
      `"${t.participant1Name || ''}"`,
      `"${t.participant2Name || ''}"`,
      `"${t.collegeName || ''}"`,
      `"${t.department || ''}"`,
      `${t.points || 0}`,
      `${t.correctAnswers || 0}`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `electrobit_winner_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17] text-slate-100">
      <Navbar />

      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 pb-6 border-b border-cyan-500/20 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wider uppercase mb-2">
              <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span>REAL-TIME STANDINGS (AUTO-SYNC)</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Live Leaderboard</h1>
            <p className="text-xs text-slate-400 mt-1">
              Updated automatically on every score transaction without refreshing the page.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <button
              onClick={handleDownloadWinnerList}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-extrabold text-xs text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 shadow-lg shadow-yellow-500/20 transition-all mr-2"
            >
              <Download className="w-4 h-4 text-black" />
              <span>🏆 Download Winner List</span>
            </button>

            <span>Last synced: {lastUpdated.toLocaleTimeString()}</span>
            <button
              onClick={loadLeaderboard}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:text-white transition-all"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* LEADERBOARD RANKING RULE BANNER */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-cyan-500/10 to-purple-500/10 border border-yellow-500/30 flex flex-col sm:flex-row justify-between items-center text-xs gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-400 font-bold">🏆</div>
            <div>
              <span className="font-extrabold text-white text-sm block">LEADERBOARD RANKING CRITERIA</span>
              <span className="text-slate-300">
                1st Priority: <strong className="text-yellow-400">Correct Answers Solved</strong> | 2nd Priority: <strong className="text-cyan-400">Bidding Skill &amp; Points Balance</strong>
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-[10px] uppercase">
            ⚡ AUTO TIEBREAKER ACTIVE
          </span>
        </div>

        {/* EVENT STATS SUMMARY HEADER (MATCHING media_1787638085118.png EXACTLY) */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-[#0d1424]/90 border border-cyan-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-xl">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">REGISTERED TEAMS</span>
                <span className="text-3xl font-black text-white font-mono">{leaderboard.length} <span className="text-sm font-extrabold text-cyan-400">TEAMS</span></span>
              </div>
            </div>

            <div className="bg-[#0d1424]/90 border border-purple-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-xl">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">CORRECT QUESTIONS SOLVED</span>
                <span className="text-3xl font-black text-purple-300 font-mono">
                  {leaderboard.reduce((acc, t) => acc + (t.correctAnswers || 0), 0)} <span className="text-sm font-extrabold text-purple-400">SOLVED</span>
                </span>
              </div>
            </div>

            <div className="bg-[#0d1424]/90 border border-yellow-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-xl">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-yellow-400">
                <DollarSign className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TOTAL POINTS BALANCE</span>
                <span className="text-3xl font-black text-yellow-400 font-mono">
                  {leaderboard.reduce((acc, t) => acc + (t.points || 0), 0).toLocaleString()} <span className="text-sm font-extrabold text-yellow-400">PTS</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TOP 3 PODIUM SHOWCASE (MATCHING media_1787638085118.png EXACTLY) */}
        {!loading && leaderboard.length >= 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
            {/* 2nd Place Card */}
            {top2 ? (
              <div className="bg-gradient-to-b from-[#151c2e] to-[#0d1322] border-2 border-slate-400/40 rounded-3xl p-6 text-center relative shadow-xl hover:scale-105 transition-transform">
                <div className="w-12 h-12 bg-slate-300/20 border border-slate-300 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-200 font-bold text-sm">
                  🥈 2nd
                </div>
                <div className="text-xs font-mono font-bold text-slate-400 uppercase">{top2.registrationNumber}</div>
                <h3 className="text-2xl font-black text-white mt-1">{top2.teamName}</h3>
                <div className="text-xs text-slate-400 mt-1">{top2.collegeName}</div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono font-bold">
                      🎯 {top2.correctAnswers || 0} Correct
                    </span>
                    {top2.totalBids !== undefined && (
                      <span className="px-2 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px]">
                        ⚡ {top2.totalBids} Bids
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-slate-200 font-mono">
                    {top2.points.toLocaleString()} <span className="text-xs font-normal text-slate-400">PTS</span>
                  </span>
                </div>
              </div>
            ) : null}

            {/* 1st Place Champion Card (Elevated Gold) */}
            {top1 ? (
              <div className="bg-gradient-to-b from-yellow-950/40 via-[#1a233a] to-[#0d1322] border-2 border-yellow-400/60 rounded-3xl p-8 text-center relative shadow-2xl shadow-yellow-500/20 md:-translate-y-4 hover:scale-105 transition-transform glow-yellow">
                <div className="inline-flex items-center space-x-1 px-4 py-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 font-extrabold text-xs mb-3 shadow-md">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span>🥇 OVERALL EVENT LEADER</span>
                </div>
                <div className="text-xs font-mono font-bold text-yellow-300/80 uppercase">{top1.registrationNumber}</div>
                <h2 className="text-4xl font-black text-white mt-1 tracking-tight">{top1.teamName}</h2>
                <div className="text-xs text-slate-300 mt-1 font-semibold">{top1.collegeName}</div>

                <div className="mt-8 pt-5 border-t border-yellow-500/20 flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-black text-sm">
                      🎯 {top1.correctAnswers || 0} Solved
                    </span>
                    {top1.totalBids !== undefined && (
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs">
                        ⚡ {top1.totalBids} Bids
                      </span>
                    )}
                  </div>
                  <span className="text-3xl font-black text-yellow-400 font-mono tracking-tight">
                    {top1.points.toLocaleString()} <span className="text-xs font-normal text-slate-300">PTS</span>
                  </span>
                </div>
              </div>
            ) : null}

            {/* 3rd Place Card */}
            {top3 ? (
              <div className="bg-gradient-to-b from-[#171720] to-[#0d1322] border-2 border-amber-700/40 rounded-3xl p-6 text-center relative shadow-xl hover:scale-105 transition-transform">
                <div className="w-12 h-12 bg-amber-600/20 border border-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-400 font-bold text-sm">
                  🥉 3rd
                </div>
                <div className="text-xs font-mono font-bold text-amber-500 uppercase">{top3.registrationNumber}</div>
                <h3 className="text-2xl font-black text-white mt-1">{top3.teamName}</h3>
                <div className="text-xs text-slate-400 mt-1">{top3.collegeName}</div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold">
                      🎯 {top3.correctAnswers || 0} Correct
                    </span>
                    {top3.totalBids !== undefined && (
                      <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px]">
                        ⚡ {top3.totalBids} Bids
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {top3.points.toLocaleString()} <span className="text-xs font-normal text-slate-400">PTS</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* FULL LEADERBOARD TABLE (MATCHING media_1787638085118.png EXACTLY) */}
        <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <span>Full Team Standings (Ranked by Correct Answers &amp; Bidding Skill)</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">
              Total Registered: {leaderboard.length} Teams
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-4 px-6 text-center w-16">RANK</th>
                  <th className="py-4 px-6">TEAM NAME</th>
                  <th className="py-4 px-6">PARTICIPANTS</th>
                  <th className="py-4 px-6">COLLEGE / DEPT</th>
                  <th className="py-4 px-6 text-center">CORRECT ANSWERS</th>
                  <th className="py-4 px-6 text-right">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading real-time leaderboard...
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No teams registered yet.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((team) => {
                    const isTop1 = team.rank === 1;
                    const isTop2 = team.rank === 2;
                    const isTop3 = team.rank === 3;

                    return (
                      <tr
                        key={team.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isTop1 ? 'bg-yellow-500/5' : isTop2 ? 'bg-slate-400/5' : isTop3 ? 'bg-amber-600/5' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center font-bold">
                          {isTop1 ? (
                            <span className="inline-block w-8 h-8 rounded-full bg-yellow-400 text-black leading-8 font-black text-base shadow-md shadow-yellow-500/40">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-block w-8 h-8 rounded-full bg-slate-300 text-black leading-8 font-black text-base">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-block w-8 h-8 rounded-full bg-amber-600 text-white leading-8 font-black text-base">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono font-bold">#{team.rank}</span>
                          )}
                        </td>

                        <td className="py-4 px-6 font-bold text-white">
                          <div className="flex items-center space-x-2">
                            <span>{team.teamName}</span>
                            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                              {team.registrationNumber}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-300 text-xs">
                          {team.participant1Name} &amp; {team.participant2Name}
                        </td>

                        <td className="py-4 px-6 text-slate-400 text-xs">
                          <div className="truncate max-w-xs">{team.collegeName}</div>
                          <div className="text-[11px] text-slate-500">{team.department}</div>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono font-bold text-xs inline-flex items-center space-x-1">
                              <span>🎯 {team.correctAnswers || 0}</span>
                              <span className="text-[10px] text-slate-400 font-normal">Solved</span>
                            </span>
                            {team.totalBids !== undefined && team.totalBids > 0 && (
                              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px]">
                                ⚡ {team.totalBids} Bids
                              </span>
                            )}
                            {team.wrongAnswers !== undefined && team.wrongAnswers > 0 && (
                              <span className="px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold text-[10px]">
                                ❌ {team.wrongAnswers} Wrong
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span
                            className={`text-xl font-black font-mono flex items-center justify-end space-x-1 ${
                              isTop1
                                ? 'text-yellow-400'
                                : isTop2
                                ? 'text-slate-200'
                                : isTop3
                                ? 'text-amber-400'
                                : 'text-cyan-400'
                            }`}
                          >
                            <span>💰 {team.points.toLocaleString()}</span>
                            <span className="text-xs font-normal text-slate-400">PTS</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
