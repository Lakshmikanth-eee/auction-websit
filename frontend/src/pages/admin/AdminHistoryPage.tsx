import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { fetchAPI } from '../../services/api';
import { socket } from '../../services/socket';
import { History, Gavel, Award, RefreshCw, FileText, CheckCircle2, XCircle, Download, ChevronDown, ChevronUp, Zap, X, Trash2, AlertTriangle } from 'lucide-react';

export const AdminHistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SCORE' | 'AUCTION' | 'BIDS'>('AUCTION');
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [auctionHistory, setAuctionHistory] = useState<any[]>([]);
  const [selectedAuctionBids, setSelectedAuctionBids] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete Confirmation Modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: 'AUCTION' | 'BID' | 'SCORE' | 'CLEAR_ALL';
    id?: string;
    target?: string;
    title: string;
  } | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [scoreRes, aucRes] = await Promise.all([
        fetchAPI('/admin/score-history'),
        fetchAPI('/admin/auction-history'),
      ]);
      if (scoreRes.success) setScoreHistory(scoreRes.history);
      if (aucRes.success) setAuctionHistory(aucRes.history);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleUpdate = () => {
      loadHistory();
    };

    socket.on('history_updated', handleUpdate);
    socket.on('leaderboard_updated', handleUpdate);

    return () => {
      socket.off('history_updated', handleUpdate);
      socket.off('leaderboard_updated', handleUpdate);
    };
  }, []);

  // Execute Deletion
  const handleExecuteDelete = async () => {
    if (!deleteConfirmModal) return;

    try {
      let res: any;
      if (deleteConfirmModal.type === 'AUCTION' && deleteConfirmModal.id) {
        res = await fetchAPI(`/admin/history/auction/${deleteConfirmModal.id}`, { method: 'DELETE' });
      } else if (deleteConfirmModal.type === 'BID' && deleteConfirmModal.id) {
        res = await fetchAPI(`/admin/history/bids/${deleteConfirmModal.id}`, { method: 'DELETE' });
      } else if (deleteConfirmModal.type === 'SCORE' && deleteConfirmModal.id) {
        res = await fetchAPI(`/admin/history/score-transactions/${deleteConfirmModal.id}`, { method: 'DELETE' });
      } else if (deleteConfirmModal.type === 'CLEAR_ALL') {
        res = await fetchAPI('/admin/history/clear-all', {
          method: 'POST',
          body: JSON.stringify({ target: deleteConfirmModal.target || 'ALL' }),
        });
      }

      if (res && res.success) {
        setMessage({ type: 'success', text: res.message || 'History deleted successfully.' });
        loadHistory();
        if (selectedAuctionBids && deleteConfirmModal.type === 'BID') {
          setSelectedAuctionBids((prev: any) =>
            prev ? { ...prev, bids: (prev.bids || []).filter((b: any) => b.id !== deleteConfirmModal.id) } : null
          );
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete history item.' });
    } finally {
      setDeleteConfirmModal(null);
    }
  };

  // Download Full Bidding History CSV
  const handleDownloadBiddingHistory = () => {
    const headers = [
      'Auction ID',
      'Auction Date',
      'Question Category',
      'Question Text',
      'Base Points',
      'Team Reg #',
      'Team Name',
      'College Name',
      'Bid Amount (PTS)',
      'Bid Time',
      'Highest Bidder?',
      'Winning Bidder?',
      'Round Outcome'
    ];

    const rows: string[][] = [];

    auctionHistory.forEach((auc) => {
      if (!auc.bids || auc.bids.length === 0) {
        rows.push([
          `"${auc.id}"`,
          `"${new Date(auc.createdAt).toLocaleString()}"`,
          `"${auc.question?.category || ''}"`,
          `"${auc.question?.questionText || ''}"`,
          `${auc.question?.basePoints || 0}`,
          `"NO BIDS"`,
          `"No Bids Placed"`,
          `""`,
          `0`,
          `""`,
          `"NO"`,
          `"NO"`,
          `"${auc.answerResult || auc.status}"`
        ]);
      } else {
        auc.bids.forEach((b: any, idx: number) => {
          const isWinner = auc.winningTeamId === b.teamId;
          const isHighest = idx === 0;
          rows.push([
            `"${auc.id}"`,
            `"${new Date(auc.createdAt).toLocaleString()}"`,
            `"${auc.question?.category || ''}"`,
            `"${auc.question?.questionText || ''}"`,
            `${auc.question?.basePoints || 0}`,
            `"${b.team?.registrationNumber || ''}"`,
            `"${b.team?.teamName || ''}"`,
            `"${b.team?.collegeName || ''}"`,
            `${b.amount}`,
            `"${new Date(b.timestamp || auc.createdAt).toLocaleTimeString()}"`,
            `"${isHighest ? 'YES' : 'NO'}"`,
            `"${isWinner ? 'YES' : 'NO'}"`,
            `"${auc.answerResult || auc.status}"`
          ]);
        });
      }
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ELECTROBID_team_bidding_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center space-x-3">
              <History className="w-8 h-8 text-cyan-400" />
              <span>Event &amp; Score Audit History</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete chronological audit logs of all manual score adjustments, auction completions, and bids.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadBiddingHistory}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 shadow-md transition-all"
            >
              <Download className="w-4 h-4 text-black" />
              <span>📥 Export All Bids (.csv)</span>
            </button>

            <button
              onClick={() =>
                setDeleteConfirmModal({
                  type: 'CLEAR_ALL',
                  target: 'ALL',
                  title: 'All Auction, Bid, & Score Audit History Records',
                })
              }
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 shadow-md transition-all"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>🗑️ Clear All History</span>
            </button>

            <div className="flex items-center space-x-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab('AUCTION')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'AUCTION'
                    ? 'bg-cyan-500 text-black font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Auction Rounds Log
              </button>

              <button
                onClick={() => setActiveTab('BIDS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'BIDS'
                    ? 'bg-cyan-500 text-black font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Team Bids Stream
              </button>

              <button
                onClick={() => setActiveTab('SCORE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'SCORE'
                    ? 'bg-cyan-500 text-black font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Score Adjustments Log
              </button>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* SCORE TRANSACTIONS LOG TABLE */}
        {activeTab === 'SCORE' && (
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white">Score Adjustment &amp; Auction Win/Loss Audit Records</span>
              <button onClick={loadHistory} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-4 px-4">Timestamp</th>
                    <th className="py-4 px-4">Team</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Reason / Details</th>
                    <th className="py-4 px-4 text-center">Prev Points</th>
                    <th className="py-4 px-4 text-center">New Points</th>
                    <th className="py-4 px-4 text-right">Change Amount</th>
                    <th className="py-4 px-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading score transaction logs...
                      </td>
                    </tr>
                  ) : scoreHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No score transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    scoreHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/50">
                        <td className="py-4 px-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-bold text-white">{tx.team?.teamName}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                              tx.type === 'AUCTION_WIN'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : tx.type === 'AUCTION_LOSS'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : tx.type === 'ADMIN_ADD'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-400'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300 text-xs">{tx.reason}</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-400">{tx.previousPoints}</td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-white">{tx.newPoints}</td>
                        <td className="py-4 px-4 text-right font-mono font-black">
                          <span className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} PTS
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() =>
                              setDeleteConfirmModal({
                                type: 'SCORE',
                                id: tx.id,
                                title: `${tx.type} record for ${tx.team?.teamName}`,
                              })
                            }
                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                            title="Delete Score Log Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUCTION HISTORY LOG TABLE */}
        {activeTab === 'AUCTION' && (
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Completed &amp; Past Auction Sessions Log (Color Separated by Auction Round)</span>
              </span>
              <button onClick={loadHistory} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-4 px-4 w-12 text-center">Round</th>
                    <th className="py-4 px-4">Date &amp; Time</th>
                    <th className="py-4 px-4">Question Text</th>
                    <th className="py-4 px-4">Difficulty</th>
                    <th className="py-4 px-4">Winning Team</th>
                    <th className="py-4 px-4 text-center">Winning Bid</th>
                    <th className="py-4 px-4 text-center">Outcome</th>
                    <th className="py-4 px-4 text-center">Team Bids</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Loading auction history logs...
                      </td>
                    </tr>
                  ) : auctionHistory.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No completed auctions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auctionHistory.map((auc, index) => {
                      const themes = [
                        { bg: 'bg-emerald-950/20 hover:bg-emerald-900/35 border-l-4 border-l-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', text: 'text-emerald-400' },
                        { bg: 'bg-cyan-950/20 hover:bg-cyan-900/35 border-l-4 border-l-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', text: 'text-cyan-400' },
                        { bg: 'bg-purple-950/20 hover:bg-purple-900/35 border-l-4 border-l-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', text: 'text-purple-400' },
                        { bg: 'bg-amber-950/20 hover:bg-amber-900/35 border-l-4 border-l-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', text: 'text-amber-400' },
                        { bg: 'bg-rose-950/20 hover:bg-rose-900/35 border-l-4 border-l-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', text: 'text-rose-400' },
                        { bg: 'bg-blue-950/20 hover:bg-blue-900/35 border-l-4 border-l-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', text: 'text-blue-400' },
                      ];
                      const theme = themes[index % themes.length];
                      const roundNum = auctionHistory.length - index;

                      return (
                        <tr key={auc.id} className={`transition-colors ${theme.bg}`}>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border ${theme.badge}`}>
                              #{roundNum}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-300 font-mono text-xs whitespace-nowrap">
                            {new Date(auc.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 font-extrabold text-white max-w-xs truncate">
                            {auc.question?.questionText}
                          </td>
                          <td className="py-4 px-4 text-xs">
                            <span className={`font-bold ${theme.text}`}>{auc.question?.difficulty}</span>
                          </td>
                          <td className="py-4 px-4 font-extrabold text-yellow-300">
                            {auc.winningTeam ? auc.winningTeam.teamName : <span className="text-slate-500 font-normal">None</span>}
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-black text-yellow-400 text-base">
                            {auc.winningBid || auc.currentBid} PTS
                          </td>
                          <td className="py-4 px-4 text-center">
                            {auc.answerResult === 'CORRECT' && (
                              <span className="px-3 py-1 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 font-extrabold text-xs inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>CORRECT</span>
                              </span>
                            )}
                            {auc.answerResult === 'WRONG' && (
                              <span className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-extrabold text-xs inline-flex items-center space-x-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>WRONG</span>
                              </span>
                            )}
                            {!auc.answerResult && <span className="text-slate-500 text-xs font-bold">CANCELLED</span>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => setSelectedAuctionBids(auc)}
                              className={`px-3.5 py-1.5 rounded-xl border text-xs font-extrabold transition-all inline-flex items-center space-x-1 shadow-md ${theme.badge}`}
                            >
                              <span>⚡ {auc.bids?.length || 0} Bids</span>
                            </button>
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-xs font-black uppercase text-slate-400">
                            {auc.status}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() =>
                                setDeleteConfirmModal({
                                  type: 'AUCTION',
                                  id: auc.id,
                                  title: `Auction Round #${roundNum} (${auc.question?.questionText.slice(0, 30)}...)`,
                                })
                              }
                              className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                              title="Delete Auction Round Entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ALL TEAM BIDS STREAM TAB */}
        {activeTab === 'BIDS' && (
          <div className="bg-[#0d1424] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white">All Team Bids Submitted Across All Auctions (Grouped &amp; Color Separated by Auction Round)</span>
              <button onClick={loadHistory} className="text-slate-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-4 px-4 w-12 text-center">Round</th>
                    <th className="py-4 px-4">Question Text</th>
                    <th className="py-4 px-4">Base Pts</th>
                    <th className="py-4 px-4">Team Reg #</th>
                    <th className="py-4 px-4">Team Name</th>
                    <th className="py-4 px-4">College</th>
                    <th className="py-4 px-4 text-center">Bid Amount</th>
                    <th className="py-4 px-4 text-center">Result</th>
                    <th className="py-4 px-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Loading team bids history...
                      </td>
                    </tr>
                  ) : (
                    auctionHistory.flatMap((auc, aucIdx) => {
                      const themes = [
                        { bg: 'bg-emerald-950/20 hover:bg-emerald-900/35 border-l-4 border-l-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                        { bg: 'bg-cyan-950/20 hover:bg-cyan-900/35 border-l-4 border-l-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
                        { bg: 'bg-purple-950/20 hover:bg-purple-900/35 border-l-4 border-l-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                        { bg: 'bg-amber-950/20 hover:bg-amber-900/35 border-l-4 border-l-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                        { bg: 'bg-rose-950/20 hover:bg-rose-900/35 border-l-4 border-l-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                        { bg: 'bg-blue-950/20 hover:bg-blue-900/35 border-l-4 border-l-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                      ];
                      const theme = themes[aucIdx % themes.length];
                      const roundNum = auctionHistory.length - aucIdx;

                      return (auc.bids || []).map((bid: any, idx: number) => {
                        const isWinner = auc.winningTeamId === bid.teamId;
                        const isHighest = idx === 0;

                        return (
                          <tr key={bid.id || `${auc.id}-${idx}`} className={`transition-colors ${theme.bg}`}>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${theme.badge}`}>
                                #{roundNum}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-bold text-white max-w-xs truncate">
                              {auc.question?.questionText}
                            </td>
                            <td className="py-4 px-4 text-xs font-mono font-bold text-slate-400">
                              {auc.question?.basePoints} PTS
                            </td>
                            <td className="py-4 px-4 font-mono text-cyan-400 text-xs">{bid.team?.registrationNumber}</td>
                            <td className="py-4 px-4 font-extrabold text-slate-200">{bid.team?.teamName}</td>
                            <td className="py-4 px-4 text-xs text-slate-400">{bid.team?.collegeName}</td>
                            <td className="py-4 px-4 text-center font-mono font-black text-yellow-400 text-base">
                              {bid.amount} PTS
                            </td>
                            <td className="py-4 px-4 text-center">
                              {isWinner ? (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/30">
                                  🏆 WINNER
                                </span>
                              ) : isHighest ? (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                  ⚡ HIGHEST
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                                  BIDDER
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() =>
                                  setDeleteConfirmModal({
                                    type: 'BID',
                                    id: bid.id,
                                    title: `Bid of ${bid.amount} PTS by ${bid.team?.teamName}`,
                                  })
                                }
                                className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                                title="Delete Bid Entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: TEAM BIDS BREAKDOWN FOR SELECTED AUCTION */}
        {selectedAuctionBids && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1424] border border-cyan-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative space-y-4">
              <button
                onClick={() => setSelectedAuctionBids(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Auction Bidding Breakdown
                </span>
                <h2 className="text-xl font-black text-white">
                  "{selectedAuctionBids.question?.questionText}"
                </h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                  <span>Category: {selectedAuctionBids.question?.category}</span>
                  <span>•</span>
                  <span>Base Limit: {selectedAuctionBids.question?.basePoints} PTS</span>
                  <span>•</span>
                  <span className="text-yellow-400 font-bold">Winning Bid: {selectedAuctionBids.winningBid || selectedAuctionBids.currentBid} PTS</span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase">
                  All Teams Who Bid For This Question ({selectedAuctionBids.bids?.length || 0} Total Bids):
                </h3>

                {!selectedAuctionBids.bids || selectedAuctionBids.bids.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    No team placed a bid for this question.
                  </div>
                ) : (
                  selectedAuctionBids.bids.map((b: any, index: number) => {
                    const isWinner = selectedAuctionBids.winningTeamId === b.teamId;

                    return (
                      <div
                        key={b.id || index}
                        className={`p-3.5 rounded-2xl border flex justify-between items-center text-sm ${
                          isWinner
                            ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs font-mono ${
                              index === 0
                                ? 'bg-yellow-400 text-black font-black'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div>
                            <div className="font-extrabold text-white">
                              {b.team?.teamName} <span className="text-cyan-400 font-mono font-bold text-xs">({b.team?.registrationNumber})</span>
                            </div>
                            <div className="text-[11px] text-slate-400">{b.team?.collegeName}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-lg font-black font-mono text-yellow-400">
                              {b.amount} PTS
                            </div>
                            {isWinner && (
                              <span className="text-[10px] font-black uppercase text-green-400 bg-green-500/20 px-2 py-0.5 rounded border border-green-500/30">
                                🏆 WINNING BIDDER
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setDeleteConfirmModal({
                                type: 'BID',
                                id: b.id,
                                title: `Bid of ${b.amount} PTS by ${b.team?.teamName}`,
                              })
                            }
                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                            title="Delete Bid"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedAuctionBids(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DELETE CONFIRMATION */}
        {deleteConfirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1424] border-2 border-red-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Confirm Delete Record</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete <strong className="text-red-400">{deleteConfirmModal.title}</strong>? This action cannot be undone!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal(null)}
                  className="py-2.5 rounded-xl font-extrabold text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="py-2.5 rounded-xl font-black text-xs bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20 transition-all"
                >
                  ⚡ Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
