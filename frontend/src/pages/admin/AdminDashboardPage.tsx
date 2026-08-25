import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { fetchAPI } from '../../services/api';
import { socket } from '../../services/socket';
import {
  Users,
  HelpCircle,
  Gavel,
  Trophy,
  Timer,
  Upload,
  Trash2,
  Play,
  Monitor,
  Zap,
  CheckCircle2,
  RefreshCw,
  Plus,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalQuestions: 0,
    currentLeader: 'N/A',
    currentLeaderPoints: 0,
  });

  const [auctionState, setAuctionState] = useState<any>(null);
  const [highestBidder, setHighestBidder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [presentCount, setPresentCount] = useState(0);

  const loadDashboardData = async () => {
    try {
      const teamsRes = await fetchAPI('/admin/teams');
      const questionsRes = await fetchAPI('/admin/questions');
      const auctionRes = await fetchAPI('/auction/current');

      const teams = teamsRes.teams || [];
      const questions = questionsRes.questions || [];

      setStats({
        totalTeams: teams.length,
        totalQuestions: questions.length,
        currentLeader: teams.length > 0 ? teams[0].teamName : 'N/A',
        currentLeaderPoints: teams.length > 0 ? teams[0].points : 0,
      });

      if (auctionRes.success) {
        setAuctionState(auctionRes.auction);
        setHighestBidder(auctionRes.highestBidderTeam);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    socket.on('auction_state_update', (data) => {
      setAuctionState(data.auction);
      setHighestBidder(data.highestBidderTeam);
    });

    socket.on('timer_updated', (data) => {
      setAuctionState((prev: any) => (prev ? { ...prev, timerRemaining: data.timerRemaining } : null));
    });

    socket.on('leaderboard_updated', () => {
      loadDashboardData();
    });

    socket.on('present_teams_update', (data) => {
      setPresentCount(data.count || 0);
    });

    return () => {
      socket.off('auction_state_update');
      socket.off('timer_updated');
      socket.off('leaderboard_updated');
      socket.off('present_teams_update');
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center space-x-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              <span>ELECTROBIT Central Control Panel</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live monitoring, auction state management, team management, and projector controls.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/admin/auction"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Gavel className="w-4 h-4" />
              <span>Launch Live Auction Controller</span>
            </Link>

            <Link
              to="/live"
              target="_blank"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all"
            >
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>Open Projector Screen</span>
            </Link>
          </div>
        </div>

        {/* TOP STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Teams */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Teams</span>
                <div className="text-4xl font-black text-white mt-2 flex items-baseline space-x-2">
                  <span>{stats.totalTeams}</span>
                  <span className="text-xs font-bold text-green-400 font-sans">
                    ({presentCount} Present Online)
                  </span>
                </div>
              </div>
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <Link to="/admin/teams" className="text-cyan-400 font-bold hover:underline">
                Manage Teams &rarr;
              </Link>
              <span className="text-slate-400 font-semibold flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                <span>{presentCount} in Live Room</span>
              </span>
            </div>
          </div>

          {/* Card 2: Total Questions */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Questions</span>
                <div className="text-4xl font-black text-white mt-2">{stats.totalQuestions}</div>
              </div>
              <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-xl border border-yellow-500/30">
                <HelpCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <Link to="/admin/questions" className="text-yellow-400 font-bold hover:underline">
                Question Bank &rarr;
              </Link>
              <span className="text-slate-500">Bulk Upload Available</span>
            </div>
          </div>

          {/* Card 3: Current Leader */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Leader</span>
                <div className="text-2xl font-extrabold text-yellow-400 mt-2 truncate max-w-[150px]">
                  {stats.currentLeader}
                </div>
              </div>
              <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-xl border border-yellow-500/30">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
              Points: <strong className="text-white">{stats.currentLeaderPoints} PTS</strong>
            </div>
          </div>

          {/* Card 4: Auction Status */}
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auction Status</span>
                <div className="text-xl font-black text-cyan-400 mt-2">
                  {auctionState?.status || 'IDLE / WAITING'}
                </div>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/30">
                <Timer className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono text-cyan-300">
              Timer: <strong>00:{auctionState?.timerRemaining < 10 ? `0${auctionState?.timerRemaining || 0}` : auctionState?.timerRemaining || 0}</strong>
            </div>
          </div>
        </div>

        {/* ACTIVE AUCTION SUMMARY WIDGET */}
        <div className="bg-[#0d1424] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
            <div>
              <span className="text-xs font-extrabold text-cyan-400 tracking-widest uppercase">LIVE EVENT MONITOR</span>
              <h2 className="text-2xl font-bold text-white mt-1">Current Bidding Session Summary</h2>
            </div>
            <Link
              to="/admin/auction"
              className="px-6 py-2.5 rounded-xl font-extrabold text-black bg-yellow-400 hover:bg-yellow-300 transition-all text-sm"
            >
              Control Auction Live
            </Link>
          </div>

          {auctionState && auctionState.question ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
              {/* Question Preview */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                    {auctionState.question.difficulty}
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase">{auctionState.question.category}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  "{auctionState.question.questionText}"
                </h3>
                <div className="text-xs text-slate-400">
                  Base Points: <strong className="text-cyan-400 font-mono">{auctionState.question.basePoints} PTS</strong>
                </div>
              </div>

              {/* Bidding Summary */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Highest Bidder</span>
                  <span className="text-2xl font-black text-white block mt-1">
                    {highestBidder ? highestBidder.teamName : 'No Bids Yet'}
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-bold uppercase">Current Highest Bid</span>
                  <span className="text-3xl font-black text-yellow-400 font-mono">
                    {auctionState.currentBid || 0} PTS
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Zap className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-base font-bold text-slate-300">No Active Bidding Session Currently Running</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Go to Auction Control to select a question from the question bank and start a new live auction.
              </p>
            </div>
          )}
        </div>

        {/* QUICK MANAGEMENT SHORTCUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Team Management Shortcuts</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add teams, edit team parameters, adjust points with reason audit trail, or delete teams in bulk.
            </p>
            <Link
              to="/admin/teams"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20"
            >
              <span>Manage Registered Teams</span>
            </Link>
          </div>

          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-yellow-400" />
              <span>Question Bank Shortcuts</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Upload questions in bulk via JSON/XLSX, filter by difficulty (Easy, Medium, Hard, Super Challenge).
            </p>
            <Link
              to="/admin/questions"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20"
            >
              <span>Open Question Bank</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
