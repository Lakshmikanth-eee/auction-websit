import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { fetchAPI } from '../../services/api';
import { socket } from '../../services/socket';
import {
  Gavel,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Square,
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  Timer,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface Question {
  id: string;
  questionText: string;
  correctAnswer: string;
  difficulty: string;
  basePoints: number;
  timeLimit: number;
  category: string;
  isUsed: boolean;
}

interface Team {
  id: string;
  registrationNumber: string;
  teamName: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  points: number;
  status: string;
}

export const AdminAuctionPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');

  const [auction, setAuction] = useState<any | null>(null);
  const [highestBidder, setHighestBidder] = useState<Team | null>(null);
  const [winningTeam, setWinningTeam] = useState<Team | null>(null);

  // Bidding state
  const [biddingTeamId, setBiddingTeamId] = useState<string>('');
  const [bidAmountInput, setBidAmountInput] = useState<number>(0);
  const [presentTeamsCount, setPresentTeamsCount] = useState<number>(0);
  const [presentTeams, setPresentTeams] = useState<any[]>([]);

  const [bidViewMode, setBidViewMode] = useState<'ALL' | 'BY_TEAM'>('ALL');

  const formatBidTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ action: 'CANCEL' | 'RESET'; title: string } | null>(null);

  const loadAuctionData = async () => {
    try {
      const qRes = await fetchAPI('/admin/questions');
      const tRes = await fetchAPI('/admin/teams?status=ACTIVE');
      const aucRes = await fetchAPI('/auction/current');

      if (qRes.success) setQuestions(qRes.questions);
      if (tRes.success && tRes.teams) {
        setTeams(tRes.teams);
        if (tRes.teams.length > 0) {
          setBiddingTeamId((prev) => prev || tRes.teams[0].id);
        }
      }

      if (aucRes.success && aucRes.auction) {
        setAuction(aucRes.auction);
        setHighestBidder(aucRes.highestBidderTeam);
        setWinningTeam(aucRes.winningTeam);

        // Pre-fill next bid amount based on current bid
        const current = aucRes.auction.currentBid || 0;
        setBidAmountInput(current + 100);
      }
    } catch (err: any) {
      console.error('Error loading auction controller:', err);
    }
  };

  useEffect(() => {
    loadAuctionData();

    socket.on('auction_state_update', (data) => {
      setAuction(data.auction);
      setHighestBidder(data.highestBidderTeam);
      setWinningTeam(data.winningTeam);
      if (data.auction?.currentBid) {
        setBidAmountInput(data.auction.currentBid + 100);
      }
    });

    socket.on('timer_updated', (data) => {
      setAuction((prev: any) =>
        prev
          ? {
              ...prev,
              timerRemaining: data.timerRemaining,
              isTimerRunning: data.isTimerRunning !== undefined ? data.isTimerRunning : prev.isTimerRunning,
            }
          : null
      );
    });

    socket.on('bid_placed', (data) => {
      setAuction((prev: any) => (prev ? { ...prev, currentBid: data.currentBid } : null));
      setHighestBidder(data.team);
      setBidAmountInput(data.currentBid + 100);
    });

    socket.on('team_registered', (newTeam: Team) => {
      setTeams((prev) => {
        if (prev.some((t) => t.id === newTeam.id)) return prev;
        return [...prev, newTeam];
      });
    });

    socket.on('present_teams_update', (data) => {
      setPresentTeamsCount(data.count || 0);
      setPresentTeams(data.teams || []);
    });

    return () => {
      socket.off('auction_state_update');
      socket.off('timer_updated');
      socket.off('bid_placed');
      socket.off('team_registered');
      socket.off('present_teams_update');
    };
  }, []);

  // 1. START AUCTION
  const handleStartAuction = async () => {
    if (!selectedQuestionId) {
      setMessage({ type: 'error', text: 'Please select a question from the question bank.' });
      return;
    }

    try {
      const res = await fetchAPI('/admin/auction/start', {
        method: 'POST',
        body: JSON.stringify({ questionId: selectedQuestionId }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: `⚡ Auction started for Question!` });
        setAuction(res.auction);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 2. PLACE BID (FAST / CUSTOM)
  const handlePlaceBid = async (amountToBid?: number) => {
    let teamIdToUse = biddingTeamId;
    if (!teamIdToUse && teams.length > 0) {
      teamIdToUse = teams[0].id;
      setBiddingTeamId(teamIdToUse);
    }

    if (!teamIdToUse) {
      setMessage({ type: 'error', text: 'No registered teams found to place bid for.' });
      return;
    }

    const targetAmount = amountToBid !== undefined ? amountToBid : bidAmountInput;

    try {
      const res = await fetchAPI('/admin/auction/bid', {
        method: 'POST',
        body: JSON.stringify({ teamId: teamIdToUse, amount: targetAmount }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // GRANT INITIAL POINTS TO TEAM BY ADMIN
  const handleGrantInitialPoints = async (amount: number) => {
    let teamIdToUse = biddingTeamId;
    if (!teamIdToUse && teams.length > 0) {
      teamIdToUse = teams[0].id;
      setBiddingTeamId(teamIdToUse);
    }

    if (!teamIdToUse) {
      setMessage({ type: 'error', text: 'Please select a team to grant points to.' });
      return;
    }

    try {
      const res = await fetchAPI(`/admin/teams/${biddingTeamId}/score`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          actionType: 'ADD',
          reason: `Admin granted ${amount} initial balance points during auction setup`,
        }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: `Granted ${amount} points to ${res.team.teamName}!` });
        setTeams((prev) => prev.map((t) => (t.id === res.team.id ? { ...t, points: res.team.points } : t)));
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // FAST BID BUTTON HELPER (+100, +200, +300, +500, +1000)
  const handleFastIncrement = (increment: number) => {
    const current = auction?.currentBid || 0;
    const newBid = current + increment;
    setBidAmountInput(newBid);
    if (biddingTeamId) {
      handlePlaceBid(newBid);
    }
  };

  // Custom Timer State
  const [customTimerValue, setCustomTimerValue] = useState<number | string>('90');

  // Non-bidding penalty state
  const [penaltyAmountInput, setPenaltyAmountInput] = useState<number | string>('200');

  const handleApplyPenalty = async (customPenalty?: number) => {
    try {
      const penaltyToUse = customPenalty !== undefined ? customPenalty : (Number(penaltyAmountInput) || 200);
      const res = await fetchAPI('/admin/auction/apply-penalty', {
        method: 'POST',
        body: JSON.stringify({ customPenaltyAmount: penaltyToUse }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        loadAuctionData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 3. TIMER CONTROL
  const handleTimerControl = async (action: 'START' | 'PAUSE' | 'RESUME' | 'RESET' | 'STOP' | 'SET', targetSeconds?: number) => {
    try {
      const payload: any = { action };
      if (targetSeconds !== undefined) {
        payload.seconds = targetSeconds;
      }
      const res = await fetchAPI('/admin/auction/timer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.auction) {
        setAuction(res.auction);
        setMessage({
          type: 'success',
          text: `⚡ Auction Timer ${action} updated (${res.auction.timerRemaining}s) for all!`,
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 4. CONFIRM WINNER
  const handleConfirmWinner = async () => {
    try {
      const res = await fetchAPI('/admin/auction/confirm-winner', { method: 'POST' });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setWinningTeam(res.winningTeam);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 5. START ANSWER PHASE
  const handleStartAnswerPhase = async () => {
    try {
      const res = await fetchAPI('/admin/auction/start-answer', { method: 'POST' });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 6. SUBMIT ANSWER OUTCOME (CORRECT / WRONG)
  const handleSubmitOutcome = async (outcome: 'CORRECT' | 'WRONG') => {
    try {
      const res = await fetchAPI('/admin/auction/submit-answer', {
        method: 'POST',
        body: JSON.stringify({ outcome }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        loadAuctionData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 7. CANCEL / RESET AUCTION
  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    try {
      const endpoint = confirmModal.action === 'CANCEL' ? '/admin/auction/cancel' : '/admin/auction/reset';
      const res = await fetchAPI(endpoint, { method: 'POST' });
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setConfirmModal(null);
        loadAuctionData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 8. START NEXT QUESTION AUCTION
  const handleNextQuestion = async () => {
    let qId = selectedQuestionId;
    if (!qId && unusedQuestions.length > 0) {
      qId = unusedQuestions[0].id;
    }

    if (!qId) {
      setMessage({
        type: 'error',
        text: 'No unused questions available in question bank. Please add questions first.',
      });
      return;
    }

    try {
      const res = await fetchAPI('/admin/auction/start', {
        method: 'POST',
        body: JSON.stringify({ questionId: qId }),
      });

      if (res.success) {
        setMessage({ type: 'success', text: `Auction started for Next Question: "${res.auction?.question?.questionText.slice(0, 40)}..."` });
        setSelectedQuestionId('');
        setBiddingTeamId('');
        setHighestBidder(null);
        setWinningTeam(null);
        loadAuctionData();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to start next question auction.' });
    }
  };

  const unusedQuestions = questions.filter((q) => !q.isUsed);
  const status = auction?.status || 'IDLE';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Bar Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-cyan-500/20">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center space-x-3">
              <Gavel className="w-8 h-8 text-cyan-400" />
              <span>Live Auction Controller</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Host-driven live bidding, server timers, winner confirmation, answer scoring, and projector state sync.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {auction && !['COMPLETED', 'CANCELLED'].includes(status) && (
              <>
                <button
                  onClick={() => setConfirmModal({ action: 'RESET', title: 'Reset Active Auction' })}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20"
                >
                  Reset Bids
                </button>
                <button
                  onClick={() => setConfirmModal({ action: 'CANCEL', title: 'Cancel Active Auction' })}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20"
                >
                  Cancel Auction
                </button>
              </>
            )}

            <button
              onClick={handleNextQuestion}
              disabled={unusedQuestions.length === 0}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 shadow-md shadow-yellow-500/20 disabled:opacity-50 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>NEXT QUESTION &rarr;</span>
            </button>
          </div>
        </div>

        {/* Teams Present in Auction Live Banner */}
        <div className="bg-slate-900/90 border-2 border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Users className="w-6 h-6 text-cyan-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Teams Present in Live Auction</span>
              <div className="text-lg font-black text-white flex items-center space-x-2">
                <span className="text-cyan-400 font-mono text-xl">{presentTeamsCount}</span>
                <span className="text-slate-400 text-sm font-normal">/ {teams.length} Teams Logged In</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-w-md">
            {presentTeams.map((pt) => (
              <span key={pt.socketId} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <span>{pt.teamName}</span>
              </span>
            ))}
            {presentTeams.length === 0 && (
              <span className="text-xs text-slate-500 italic">No teams in live room currently.</span>
            )}
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SECTION 1: QUESTION SELECTION & AUCTION LAUNCH */}
        {['IDLE', 'CANCELLED', 'COMPLETED'].includes(status) && (
          <div className="bg-[#0d1424] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-extrabold text-white mb-4 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>Step 1: Select Question & Start Live Auction</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Select Unused Question ({unusedQuestions.length} Available)
                </label>
                <select
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white text-sm"
                >
                  <option value="">-- Choose a Question --</option>
                  {unusedQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.difficulty} - {q.basePoints} PTS] [{q.category}] {q.questionText.slice(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={handleStartAuction}
                  disabled={!selectedQuestionId}
                  className="w-full py-3.5 rounded-xl font-extrabold text-black text-base bg-gradient-to-r from-cyan-400 to-yellow-400 hover:from-cyan-300 hover:to-yellow-300 shadow-xl shadow-cyan-500/20 disabled:opacity-40"
                >
                  ⚡ START LIVE AUCTION NOW
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: ACTIVE AUCTION CONTROLLER */}
        {auction && !['COMPLETED', 'CANCELLED'].includes(status) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Col: Current Question Info & Controls (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Question Preview Box */}
              <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                    {auction.question?.difficulty} ({auction.question?.basePoints} PTS)
                  </span>
                  <span className="text-xs text-slate-400 font-bold uppercase">{auction.question?.category}</span>
                </div>

                <h3 className="text-xl font-extrabold text-white mb-4">
                  "{auction.question?.questionText}"
                </h3>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300">
                  Reference Answer: <strong className="text-cyan-300 font-mono">{auction.question?.correctAnswer}</strong>
                </div>
              </div>

              {/* TIMER CONTROLLER WIDGET */}
              <div className="bg-[#0d1424] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-extrabold text-slate-400 uppercase flex items-center space-x-1">
                      <Timer className="w-4 h-4 text-cyan-400" />
                      <span>Server Timer: {auction.timerType} PHASE</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Live sync across Projector & All Team Consoles
                    </span>
                  </div>

                  <div className="text-3xl font-black font-mono text-cyan-400 bg-slate-900 px-4 py-2 rounded-2xl border border-cyan-500/30">
                    {formatTimer(auction.timerRemaining)}
                  </div>
                </div>

                {/* FAST PRESET TIMERS FOR ALL */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">
                    ⚡ Quick Preset Timers (Click to change timer for all):
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { label: '30s', sec: 30 },
                      { label: '45s', sec: 45 },
                      { label: '60s (1m)', sec: 60 },
                      { label: '90s (1.5m)', sec: 90 },
                      { label: '120s (2m)', sec: 120 },
                      { label: '180s (3m)', sec: 180 },
                    ].map((p) => (
                      <button
                        key={p.sec}
                        type="button"
                        onClick={() => {
                          setCustomTimerValue(p.sec);
                          handleTimerControl('SET', p.sec);
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-mono font-extrabold border transition-all ${
                          auction.timerRemaining === p.sec
                            ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-900 border-slate-800 text-cyan-300 hover:bg-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUSTOM TIMER VALUE KEYBOARD INPUT */}
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    ⌨️ Custom Timer Value (Type seconds from keyboard):
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={customTimerValue}
                      onChange={(e) => setCustomTimerValue(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 45, 60, 120, 300"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleTimerControl('SET', Number(customTimerValue) || 90)}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md transition-all whitespace-nowrap"
                    >
                      ⚡ Set Timer ({customTimerValue || 0}s)
                    </button>
                  </div>
                </div>

                {/* Timer Action Controls */}
                <div className="grid grid-cols-4 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTimerControl(auction.isTimerRunning ? 'PAUSE' : 'START')}
                    className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-lg transition-all ${
                      auction.isTimerRunning
                        ? 'bg-amber-500/20 border-2 border-amber-500/60 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-green-500/20 border-2 border-green-500/60 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {auction.isTimerRunning ? (
                      <>
                        <Pause className="w-4 h-4 text-amber-400" />
                        <span>Pause Timer</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-green-400" />
                        <span>{auction.timerRemaining > 0 ? 'Resume / Start' : 'Start Timer'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTimerControl('PAUSE')}
                    disabled={!auction.isTimerRunning}
                    className="py-3 rounded-xl font-extrabold text-xs bg-yellow-500/20 border-2 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-40"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTimerControl('RESET', Number(customTimerValue) || 90)}
                    className="py-3 rounded-xl font-extrabold text-xs bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset ({customTimerValue || 90}s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTimerControl('STOP')}
                    className="py-3 rounded-xl font-extrabold text-xs bg-red-500/20 border-2 border-red-500/50 text-red-400 hover:bg-red-500/30 flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop Bidding</span>
                  </button>
                </div>
              </div>

              {/* NON-BIDDING PENALTY CONTROL WIDGET */}
              <div className="bg-[#0d1424] border border-yellow-500/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-extrabold text-yellow-400 uppercase flex items-center space-x-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span>Non-Bidding Penalty Control</span>
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Deduct penalty points from registered teams that failed to submit a bid
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-bold border border-yellow-500/30 uppercase">
                    ⚡ Admin Only Control
                  </span>
                </div>

                {/* FAST PENALTY PRESETS */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">
                    Select Penalty Preset (PTS):
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {[100, 200, 300, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setPenaltyAmountInput(amt);
                          handleApplyPenalty(amt);
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-mono font-extrabold border transition-all ${
                          Number(penaltyAmountInput) === amt
                            ? 'bg-yellow-500 text-black border-yellow-400 font-black shadow-lg shadow-yellow-500/20'
                            : 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800 hover:border-yellow-500/40'
                        }`}
                      >
                        -{amt} PTS
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUSTOM PENALTY INPUT */}
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    ⌨️ Custom Penalty Amount (Type points from keyboard):
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={penaltyAmountInput}
                      onChange={(e) => setPenaltyAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 200, 500"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPenalty(Number(penaltyAmountInput) || 200)}
                      className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs shadow-md transition-all whitespace-nowrap flex items-center space-x-1"
                    >
                      <span>⚡ Apply Penalty (-{penaltyAmountInput || 0} PTS)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ANSWER PHASE CONTROLS (✅ CORRECT / ❌ WRONG) */}
              {['WINNER_CONFIRMED', 'ANSWER_IN_PROGRESS'].includes(status) && (
                <div className="bg-[#0d1424] border-2 border-purple-500/40 rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>Step 3: Answer Evaluation for {winningTeam?.teamName || highestBidder?.teamName}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Winning Bid: <strong className="text-yellow-400 font-mono">{auction.winningBid || auction.currentBid} PTS</strong>
                  </p>

                  {status === 'WINNER_CONFIRMED' && (
                    <button
                      onClick={handleStartAnswerPhase}
                      className="w-full py-3 mb-4 rounded-xl font-extrabold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 text-sm"
                    >
                      🧠 START 30s ANSWER TIMER
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      onClick={() => handleSubmitOutcome('CORRECT')}
                      className="py-4 rounded-2xl font-black text-black bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-base shadow-lg shadow-green-500/20 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>✅ MARK CORRECT (-{auction.winningBid || auction.currentBid} Bid +{auction.question?.basePoints} Base)</span>
                    </button>

                    <button
                      onClick={() => handleSubmitOutcome('WRONG')}
                      className="py-4 rounded-2xl font-black text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-base shadow-lg shadow-red-500/20 flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-6 h-6" />
                      <span>❌ MARK WRONG (-{auction.winningBid || auction.currentBid} Bid)</span>
                    </button>
                  </div>
                </div>
              )}

              {['COMPLETED', 'CANCELLED'].includes(status) && (
                <div className="bg-[#0d1424] border-2 border-yellow-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
                  <div className="w-12 h-12 bg-yellow-500/20 text-yellow-400 rounded-2xl flex items-center justify-center mx-auto border border-yellow-500/40">
                    <Zap className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">AUCTION ROUND COMPLETED</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ready to launch the next high-voltage question for the competing teams?
                    </p>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    disabled={unusedQuestions.length === 0}
                    className="w-full py-4 rounded-2xl font-black text-black bg-gradient-to-r from-yellow-400 via-amber-400 to-cyan-400 hover:from-yellow-300 hover:to-cyan-300 text-lg shadow-xl shadow-yellow-500/20 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    <span>➡️ START NEXT QUESTION ({unusedQuestions.length} Questions Remaining)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Col: Admin Host Bidding Interface (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* ADMIN BIDDING PANEL */}
              <div className="bg-[#0d1424] border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-6">
                <div className="pb-4 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Current Highest Bid</span>
                  <div className="text-4xl font-black text-yellow-400 font-mono mt-1">
                    {auction.currentBid || 0} <span className="text-sm font-normal">PTS</span>
                  </div>
                  <div className="text-xs text-cyan-300 mt-1">
                    Highest Bidder: <strong className="text-white">{highestBidder?.teamName || 'None'}</strong>
                  </div>
                </div>

                {/* Team Selector Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Select Team *
                  </label>
                  <select
                    value={biddingTeamId}
                    onChange={(e) => setBiddingTeamId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-white text-sm mb-3"
                  >
                    <option value="">-- Select Active Team --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName} ({t.points} PTS balance)
                      </option>
                    ))}
                  </select>

                  {/* Admin Grant Starting Points Quick Buttons */}
                  <div className="p-3 bg-slate-900/90 border border-yellow-500/30 rounded-xl">
                    <span className="text-[11px] font-extrabold text-yellow-400 uppercase block mb-1.5">
                      ⚡ Grant Initial Balance to Selected Team
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGrantInitialPoints(1000)}
                        disabled={!biddingTeamId}
                        className="py-1.5 rounded-lg text-xs font-bold bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-30"
                      >
                        +1000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrantInitialPoints(2000)}
                        disabled={!biddingTeamId}
                        className="py-1.5 rounded-lg text-xs font-bold bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-30"
                      >
                        +2000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrantInitialPoints(5000)}
                        disabled={!biddingTeamId}
                        className="py-1.5 rounded-lg text-xs font-bold bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-30"
                      >
                        +5000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGrantInitialPoints(10000)}
                        disabled={!biddingTeamId}
                        className="py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 border border-purple-400 text-purple-300 hover:bg-purple-500/30 disabled:opacity-30"
                      >
                        +10000
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fast Increments (+100, +200, +300, +500, +1000) */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fast Bid Increment</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFastIncrement(100)}
                      className="py-2.5 rounded-xl font-black text-xs bg-slate-800 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFastIncrement(200)}
                      className="py-2.5 rounded-xl font-black text-xs bg-slate-800 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    >
                      +200
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFastIncrement(300)}
                      className="py-2.5 rounded-xl font-black text-xs bg-slate-800 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    >
                      +300
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFastIncrement(500)}
                      className="py-2.5 rounded-xl font-black text-xs bg-slate-800 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20"
                    >
                      +500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFastIncrement(1000)}
                      className="col-span-2 py-2.5 rounded-xl font-black text-xs bg-purple-500/20 border border-purple-400 text-purple-300 hover:bg-purple-500/30"
                    >
                      ⚡ +1000 SUPER BID
                    </button>
                  </div>
                </div>

                {/* Custom Bid Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">New Bid Amount</label>
                  <input
                    type="number"
                    value={bidAmountInput}
                    onChange={(e) => setBidAmountInput(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-white font-mono font-bold text-lg"
                  />
                </div>

                {/* PLACE BID BUTTON */}
                <button
                  onClick={() => handlePlaceBid()}
                  disabled={status !== 'BIDDING_OPEN' || !biddingTeamId}
                  className="w-full py-4 rounded-2xl font-black text-black text-lg bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 shadow-xl shadow-yellow-500/20 disabled:opacity-40"
                >
                  ⚡ PLACE BID NOW
                </button>

                {/* CONFIRM WINNER BUTTON */}
                {status === 'BIDDING_CLOSED' || status === 'BIDDING_OPEN' ? (
                  <button
                    onClick={handleConfirmWinner}
                    disabled={!highestBidder}
                    className="w-full py-3.5 rounded-2xl font-extrabold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 text-sm disabled:opacity-40 mt-2"
                  >
                    🏆 CONFIRM WINNER: {highestBidder?.teamName || 'None'}
                  </button>
                ) : null}
              </div>

              {/* LIVE BIDS LOG / TEAM BID HISTORY CARD */}
              <div className="bg-[#0d1424] border-2 border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center space-x-2">
                      <Gavel className="w-4 h-4 text-yellow-400" />
                      <span>LIVE BIDS HISTORY BY TEAM</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      Real-time bid stream for current auction ({auction?.bids?.length || 0} bids placed)
                    </span>
                  </div>

                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setBidViewMode('ALL')}
                      className={`px-3 py-1 rounded-lg transition-all ${bidViewMode === 'ALL' ? 'bg-cyan-400 text-black font-extrabold' : 'text-slate-400 hover:text-white'}`}
                    >
                      All Stream
                    </button>
                    <button
                      type="button"
                      onClick={() => setBidViewMode('BY_TEAM')}
                      className={`px-3 py-1 rounded-lg transition-all ${bidViewMode === 'BY_TEAM' ? 'bg-cyan-400 text-black font-extrabold' : 'text-slate-400 hover:text-white'}`}
                    >
                      By Team
                    </button>
                  </div>
                </div>

                {!auction?.bids || auction.bids.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-2xl">
                    No bids have been placed yet for this auction question.
                  </div>
                ) : bidViewMode === 'ALL' ? (
                  /* ALL BIDS CHRONOLOGICAL STREAM */
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {auction.bids.map((b: any, index: number) => {
                      const isTopBid = index === 0;
                      return (
                        <div
                          key={b.id || index}
                          className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition-all ${
                            isTopBid
                              ? 'bg-yellow-500/10 border-yellow-500/40 text-white shadow-lg'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md">
                              {formatBidTime(b.timestamp)}
                            </span>
                            <div>
                              <strong className="text-white block font-bold">{b.team?.teamName}</strong>
                              <span className="text-[10px] text-cyan-400 font-mono">({b.team?.registrationNumber})</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-black font-mono text-yellow-400">{b.amount} PTS</div>
                            {isTopBid ? (
                              <span className="text-[9px] font-black uppercase text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full inline-block">
                                👑 HIGHEST BIDDER
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold text-slate-500 uppercase">OUTBID</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* GROUPED BY TEAM SUMMARY */
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {Object.values(
                      auction.bids.reduce((acc: any, b: any) => {
                        const tId = b.team?.id || b.teamId;
                        if (!acc[tId]) {
                          acc[tId] = {
                            teamName: b.team?.teamName,
                            registrationNumber: b.team?.registrationNumber,
                            highestBid: b.amount,
                            bidsCount: 1,
                            lastBidTime: b.timestamp,
                          };
                        } else {
                          acc[tId].bidsCount += 1;
                          if (b.amount > acc[tId].highestBid) {
                            acc[tId].highestBid = b.amount;
                          }
                        }
                        return acc;
                      }, {})
                    ).map((teamSummary: any) => (
                      <div key={teamSummary.registrationNumber} className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                        <div>
                          <strong className="text-white block font-bold">{teamSummary.teamName}</strong>
                          <span className="text-[10px] text-slate-400">
                            Reg: <span className="text-cyan-400 font-mono">{teamSummary.registrationNumber}</span> | Total Bids: <strong className="text-white">{teamSummary.bidsCount}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Highest Bid</span>
                          <span className="text-sm font-black text-yellow-400 font-mono">{teamSummary.highestBid} PTS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SAFETY CONFIRM MODAL */}
        {confirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1424] border-2 border-red-500/40 rounded-3xl p-6 max-w-md w-full text-center">
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">{confirmModal.title}</h3>
              <p className="text-xs text-slate-300 mt-2 mb-6">
                Are you sure you want to proceed? This will update the active auction state on all connected screens.
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-500"
                >
                  YES, PROCEED
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
