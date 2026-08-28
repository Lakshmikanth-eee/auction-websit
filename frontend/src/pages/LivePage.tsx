import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../services/api';
import { socket } from '../services/socket';
import confetti from 'canvas-confetti';
import { Zap, Trophy, Timer, Crown, CheckCircle2, XCircle, Award, Flame, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  questionText: string;
  correctAnswer: string;
  difficulty: string;
  basePoints: number;
  timeLimit: number;
  category: string;
}

interface Team {
  id: string;
  registrationNumber: string;
  teamName: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  points: number;
}

interface AuctionState {
  id: string;
  status: string; // IDLE, BIDDING_OPEN, BIDDING_CLOSED, WINNER_CONFIRMED, ANSWER_IN_PROGRESS, COMPLETED, CANCELLED
  currentBid: number;
  highestBidderTeamId?: string;
  winningTeamId?: string;
  winningBid?: number;
  answerResult?: string;
  timerRemaining: number;
  timerType: string;
  isTimerRunning: boolean;
  question: Question;
  bids?: any[];
}

export const LivePage: React.FC = () => {
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [highestBidder, setHighestBidder] = useState<Team | null>(null);
  const [winningTeam, setWinningTeam] = useState<Team | null>(null);
  const [eventStatus, setEventStatus] = useState<string>('IN_PROGRESS');
  const [finalResults, setFinalResults] = useState<any>(null);
  const [teamsList, setTeamsList] = useState<any[]>([]);

  const fetchLiveState = async () => {
    try {
      const res = await fetchAPI('/auction/current');
      if (res.success) {
        setAuction(res.auction);
        setHighestBidder(res.highestBidderTeam);
        setWinningTeam(res.winningTeam);
      }

      const settingsRes = await fetchAPI('/settings');
      if (settingsRes.success && settingsRes.settings) {
        setEventStatus(settingsRes.settings.eventStatus);
        if (settingsRes.settings.eventStatus === 'COMPLETED') {
          fetchFinalResults();
        }
      }

      const teamsRes = await fetchAPI('/teams');
      if (teamsRes.success && teamsRes.teams) {
        setTeamsList(teamsRes.teams);
        const storedStr = localStorage.getItem('team_info');
        if (storedStr) {
          try {
            const parsed = JSON.parse(storedStr);
            const matchingTeam = teamsRes.teams.find((t: any) => String(t.id) === String(parsed.id));
            if (matchingTeam) {
              setTeamInfo(matchingTeam);
              localStorage.setItem('team_info', JSON.stringify(matchingTeam));
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error fetching live screen state:', err);
    }
  };

  const handleSelectTeam = (selectedTeam: any) => {
    setTeamInfo(selectedTeam);
    localStorage.setItem('team_info', JSON.stringify(selectedTeam));
    if (selectedTeam?.id) {
      socket.emit('join_auction_room', {
        teamId: selectedTeam.id,
        teamName: selectedTeam.teamName,
        registrationNumber: selectedTeam.registrationNumber,
      });
    }
  };

  const fetchFinalResults = async () => {
    try {
      const res = await fetchAPI('/final-results');
      if (res.success) {
        setFinalResults(res);
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      }
    } catch (e) {}
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [teamBidInput, setTeamBidInput] = useState<string>('');
  const [bidMessage, setBidMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePlaceTeamBid = async (targetAmount?: number) => {
    let currentTeam = teamInfo;
    if (!currentTeam?.id) {
      const teamInfoStr = localStorage.getItem('team_info');
      if (teamInfoStr) {
        try {
          currentTeam = JSON.parse(teamInfoStr);
          if (currentTeam?.id) {
            setTeamInfo(currentTeam);
          }
        } catch (e) {}
      }
    }

    if (!currentTeam?.id) {
      setBidMessage({
        type: 'error',
        text: 'Please select your registered team above to place bids.',
      });
      return;
    }

    const bidValue = targetAmount !== undefined ? targetAmount : Number(teamBidInput);

    if (isNaN(bidValue) || bidValue <= 0) {
      setBidMessage({ type: 'error', text: 'Please enter a valid numeric custom bid amount.' });
      return;
    }

    const questionMinLimit = auction?.question?.basePoints || 100;

    if (bidValue < questionMinLimit) {
      setBidMessage({
        type: 'error',
        text: `Custom bid must be at least ${questionMinLimit} PTS (Question minimum limit is ${questionMinLimit} PTS).`,
      });
      return;
    }

    try {
      const res = await fetchAPI('/auction/bid', {
        method: 'POST',
        body: JSON.stringify({ teamId: currentTeam.id, amount: bidValue }),
      });

      if (res.success) {
        setBidMessage({ type: 'success', text: `⚡ BID PLACED! You placed your bid at ${bidValue} PTS!` });
        setTeamBidInput('');

        // Optimistically add placed bid to auction.bids array so UI transitions immediately to BID SUBMITTED
        if (res.bid) {
          setAuction((prev: any) => {
            if (!prev) return null;
            const existingBids = prev.bids || [];
            const updatedBids = existingBids.some((b: any) => b.id === res.bid.id)
              ? existingBids
              : [...existingBids, res.bid];
            return {
              ...prev,
              currentBid: Math.max(prev.currentBid || 0, res.bid.amount),
              bids: updatedBids,
            };
          });
        }

        if (res.team) {
          setTeamInfo((prev: any) => {
            const updated = { ...(prev || {}), points: res.team.points };
            localStorage.setItem('team_info', JSON.stringify(updated));
            return updated;
          });
        }
        fetchLiveState();
      } else {
        setBidMessage({ type: 'error', text: res.message || 'Failed to place bid.' });
      }
    } catch (err: any) {
      setBidMessage({ type: 'error', text: err.message || 'Failed to place bid.' });
    }
  };

  useEffect(() => {
    fetchLiveState();
    const syncInterval = setInterval(fetchLiveState, 1000);

    // Check if team is logged in and notify backend of presence
    const teamInfoStr = localStorage.getItem('team_info');
    if (teamInfoStr) {
      try {
        const teamData = JSON.parse(teamInfoStr);
        setTeamInfo(teamData);
        if (teamData?.id) {
          socket.emit('join_auction_room', {
            teamId: teamData.id,
            teamName: teamData.teamName,
            registrationNumber: teamData.registrationNumber,
          });
        }
      } catch (e) {}
    }

    // Socket Event Handlers
    socket.on('initial_state', (data) => {
      if (data.auction) {
        setAuction(data.auction);
        setHighestBidder(data.highestBidderTeam);
      }
    });

    socket.on('auction_state_update', (data) => {
      setAuction(data.auction);
      setHighestBidder(data.highestBidderTeam);
      setWinningTeam(data.winningTeam);
    });

    socket.on('timer_updated', (data) => {
      setAuction((prev) => (prev ? { ...prev, timerRemaining: data.timerRemaining } : null));
    });

    socket.on('bid_placed', (data) => {
      setAuction((prev: any) => {
        if (!prev) return null;
        const existingBids = prev.bids || [];
        const newBidObj = data.bid;
        const updatedBids = newBidObj && !existingBids.some((b: any) => b.id === newBidObj.id)
          ? [...existingBids, newBidObj]
          : existingBids;
        return {
          ...prev,
          currentBid: Math.max(prev.currentBid || 0, data.currentBid || 0),
          bids: updatedBids,
        };
      });
      setHighestBidder(data.team);
    });

    socket.on('score_updated', (data) => {
      setTeamInfo((prev: any) => {
        if (!prev || prev.id !== data.teamId) return prev;
        const updated = { ...prev, points: data.newPoints };
        localStorage.setItem('team_info', JSON.stringify(updated));
        return updated;
      });
    });

    socket.on('winner_selected', (data) => {
      setAuction(data.auction);
      setWinningTeam(data.winningTeam);
      confetti({ particleCount: 70, spread: 60 });
    });

    socket.on('answer_correct', (data) => {
      setAuction(data.auction);
      setWinningTeam(data.winningTeam);
      confetti({ particleCount: 120, spread: 90 });
    });

    socket.on('answer_wrong', (data) => {
      setAuction(data.auction);
      setWinningTeam(data.winningTeam);
    });

    socket.on('penalty_applied', (data) => {
      setBidMessage({
        type: 'error',
        text: `⚠️ NON-BIDDING PENALTY APPLIED (-${data.penaltyAmount} PTS)! ${data.penalizedTeamsCount} non-bidding team(s) were penalized.`,
      });
      fetchLiveState();
    });

    socket.on('event_status_changed', (data) => {
      setEventStatus(data.eventStatus);
      if (data.eventStatus === 'COMPLETED') {
        fetchFinalResults();
      }
    });

    return () => {
      clearInterval(syncInterval);
      socket.off('initial_state');
      socket.off('auction_state_update');
      socket.off('timer_updated');
      socket.off('bid_placed');
      socket.off('score_updated');
      socket.off('winner_selected');
      socket.off('answer_correct');
      socket.off('answer_wrong');
      socket.off('event_status_changed');
    };
  }, []);

  // Difficulty badge styling helper
  const renderDifficultyBadge = (diff?: string) => {
    switch (diff?.toUpperCase()) {
      case 'EASY':
        return (
          <span className="px-4 py-1.5 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-sm font-black tracking-wider uppercase glow-green">
            🟢 EASY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-4 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-sm font-black tracking-wider uppercase glow-yellow">
            🟡 MEDIUM
          </span>
        );
      case 'HARD':
        return (
          <span className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-black tracking-wider uppercase glow-red">
            🔴 HARD
          </span>
        );
      case 'SUPER_CHALLENGE':
      case 'SUPER CHALLENGE':
        return (
          <span className="px-4 py-1.5 rounded-full bg-purple-500/30 border border-purple-400 text-purple-300 text-sm font-black tracking-wider uppercase animate-pulse">
            ⚡ SUPER CHALLENGE
          </span>
        );
      default:
        return null;
    }
  };

  // IF FINAL RESULTS MODE
  if (eventStatus === 'COMPLETED' && finalResults) {
    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden aspect-video">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-cyan-500/30">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/30">
              <Zap className="w-10 h-10 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-wider text-white">ELECTROBID</h1>
              <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">THE EEE AUCTION CHALLENGE</span>
            </div>
          </div>
          <div className="px-6 py-2 rounded-full bg-yellow-500/20 border border-yellow-400/50 text-yellow-400 text-sm font-extrabold tracking-widest uppercase">
            🏆 FINAL EVENT RESULTS
          </div>
        </div>

        {/* CHAMPION SHOWCASE */}
        <div className="my-8 text-center">
          <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-yellow-400 text-black font-black text-lg tracking-wider mb-4 shadow-xl shadow-yellow-500/30">
            <Crown className="w-6 h-6" />
            <span>ELECTROBID CHAMPION</span>
          </div>

          <h2 className="text-6xl sm:text-7xl font-black text-white tracking-tight my-2">
            {finalResults.champion?.teamName || 'N/A'}
          </h2>

          <div className="text-xl font-bold text-cyan-300">{finalResults.champion?.collegeName}</div>

          <div className="mt-6 inline-block px-10 py-4 rounded-3xl bg-slate-900 border-2 border-yellow-400/60 shadow-2xl glow-yellow">
            <span className="text-sm font-bold text-slate-400 uppercase block">FINAL SCORE</span>
            <span className="text-6xl font-black text-yellow-400 font-mono">{finalResults.champion?.points} <span className="text-xl">PTS</span></span>
          </div>
        </div>

        {/* PODIUM SUMMARY */}
        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-yellow-500/40 text-center">
            <div className="text-sm font-bold text-yellow-400">🥇 1st Place</div>
            <div className="text-lg font-extrabold text-white mt-1">{finalResults.champion?.teamName}</div>
            <div className="text-sm font-mono text-yellow-300 font-bold mt-1">{finalResults.champion?.points} PTS</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-400/40 text-center">
            <div className="text-sm font-bold text-slate-300">🥈 2nd Place</div>
            <div className="text-lg font-extrabold text-white mt-1">{finalResults.runnerUp1?.teamName || '-'}</div>
            <div className="text-sm font-mono text-slate-300 font-bold mt-1">{finalResults.runnerUp1?.points || 0} PTS</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-700/40 text-center">
            <div className="text-sm font-bold text-amber-500">🥉 3rd Place</div>
            <div className="text-lg font-extrabold text-white mt-1">{finalResults.runnerUp2?.teamName || '-'}</div>
            <div className="text-sm font-mono text-amber-400 font-bold mt-1">{finalResults.runnerUp2?.points || 0} PTS</div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE AUCTION PROJECTOR DISPLAY
  const status = auction?.status || 'WAITING';
  const myTeamBids = auction?.bids?.filter((b: any) => String(b.teamId || b.team?.id) === String(teamInfo?.id)) || [];
  const myPlacedBid = myTeamBids.length > 0
    ? myTeamBids.reduce((latest: any, b: any) => (b.amount > latest.amount ? b : latest), myTeamBids[0])
    : null;
  const hasAlreadyBid = Boolean(myPlacedBid);

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-between p-6 sm:p-10 pb-24 sm:pb-32 select-none overflow-y-auto relative space-y-6">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-purple-600/10 blur-[150px] pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-cyan-500/25 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-xl shadow-cyan-500/30">
            <Zap className="w-10 h-10 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-white">ELECTROBID</h1>
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">THE EEE AUCTION CHALLENGE</span>
          </div>
        </div>

        {/* STATUS BADGE */}
        <div>
          {status === 'BIDDING_OPEN' && (
            <div className="px-6 py-2.5 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 text-lg font-black tracking-wider uppercase animate-pulse-fast shadow-lg shadow-cyan-500/30">
              ⚡ BIDDING OPEN
            </div>
          )}
          {status === 'BIDDING_CLOSED' && (
            <div className="px-6 py-2.5 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 text-lg font-black tracking-wider uppercase">
              🔒 BIDDING CLOSED
            </div>
          )}
          {status === 'WINNER_CONFIRMED' && (
            <div className="px-6 py-2.5 rounded-full bg-yellow-500/20 border-2 border-yellow-400 text-yellow-300 text-lg font-black tracking-wider uppercase">
              🏆 WINNER CONFIRMED
            </div>
          )}
          {status === 'ANSWER_IN_PROGRESS' && (
            <div className="px-6 py-2.5 rounded-full bg-purple-500/20 border-2 border-purple-400 text-purple-300 text-lg font-black tracking-wider uppercase animate-pulse">
              🧠 ANSWER TIME
            </div>
          )}
          {status === 'COMPLETED' && auction?.answerResult === 'CORRECT' && (
            <div className="px-6 py-2.5 rounded-full bg-green-500/20 border-2 border-green-400 text-green-300 text-lg font-black tracking-wider uppercase">
              ✅ CORRECT ANSWER
            </div>
          )}
          {status === 'COMPLETED' && auction?.answerResult === 'WRONG' && (
            <div className="px-6 py-2.5 rounded-full bg-red-500/20 border-2 border-red-400 text-red-300 text-lg font-black tracking-wider uppercase">
              ❌ WRONG ANSWER
            </div>
          )}
          {(!auction || ['IDLE', 'CANCELLED', 'WAITING'].includes(status)) && (
            <div className="px-6 py-2.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-lg font-bold tracking-wider uppercase">
              ⏳ WAITING FOR NEXT AUCTION
            </div>
          )}
        </div>
      </div>

      {/* TEAM STATUS BAR (INDIVIDUAL TEAM LOGIN & SWITCHER) */}
      <div className="bg-[#0d1424]/90 border border-cyan-500/30 rounded-2xl px-6 py-3.5 my-2 flex flex-col sm:flex-row justify-between items-center text-xs shadow-xl relative z-20 gap-3">
        {teamInfo ? (
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Logged In Individual Team</span>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black text-white">{teamInfo.teamName}</span>
                <span className="text-cyan-400 font-mono">({teamInfo.registrationNumber})</span>
              </div>
            </div>

            {/* Team Switcher Selector */}
            {teamsList.length > 1 && (
              <select
                value={teamInfo.id}
                onChange={(e) => {
                  const found = teamsList.find((t) => t.id === e.target.value);
                  if (found) handleSelectTeam(found);
                }}
                className="ml-3 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-cyan-300 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="" disabled>-- Switch Team --</option>
                {teamsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.registrationNumber} - {t.teamName} ({t.points} PTS)
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full justify-between">
            <div className="flex items-center space-x-2 text-yellow-400 font-bold">
              <AlertCircle className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span>Select Your Registered Team to Enter Individual Auction Screen:</span>
            </div>

            <select
              value=""
              onChange={(e) => {
                const found = teamsList.find((t) => t.id === e.target.value);
                if (found) handleSelectTeam(found);
              }}
              className="bg-cyan-500/10 border-2 border-cyan-400 text-white font-bold rounded-xl px-4 py-2 text-xs hover:bg-cyan-500/20 focus:outline-none shadow-lg cursor-pointer"
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">-- Choose Your Team ({teamsList.length} Registered) --</option>
              {teamsList.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.registrationNumber} - {t.teamName} ({t.points} PTS)
                </option>
              ))}
            </select>
          </div>
        )}

        {teamInfo && (
          <div className="flex items-center space-x-4">
            {/* PROMINENT BALANCE POINT DISPLAY */}
            <div className="px-5 py-2 rounded-xl bg-slate-900 border border-green-500/40 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">YOUR BALANCE</span>
              <span className="text-xl font-black text-green-400 font-mono">{teamInfo.points ?? 10000} PTS</span>
            </div>

            {/* PROMINENT SUBMITTED BID DISPLAY IF TEAM HAS PLACED BID */}
            {hasAlreadyBid && (
              <div className="px-5 py-2 rounded-xl bg-slate-900 border-2 border-yellow-400 text-center shadow-lg glow-yellow">
                <span className="text-[10px] text-yellow-400 font-extrabold uppercase block">⚡ YOUR SUBMITTED BID</span>
                <span className="text-xl font-black text-yellow-400 font-mono">{myPlacedBid.amount} PTS</span>
              </div>
            )}

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Auction Status</span>
              <span className="text-xs font-extrabold text-yellow-400 bg-yellow-500/10 border border-yellow-500/40 px-3 py-1 rounded-lg">
                ⚡ ONLINE & READY
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MAIN SCREEN BODY */}
      {!auction || ['IDLE', 'CANCELLED', 'WAITING', 'COMPLETED'].includes(status) ? (
        /* WAITING FOR NEXT QUESTION STATE */
        <div className="my-auto text-center py-12 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-500/20 to-cyan-500/20 border-2 border-yellow-400/40 rounded-3xl flex items-center justify-center mx-auto mb-6 text-yellow-400 animate-bounce shadow-2xl">
            <Zap className="w-14 h-14" />
          </div>

          <span className="px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-extrabold tracking-widest uppercase mb-4 inline-block">
            {status === 'COMPLETED' ? '✅ AUCTION ROUND FINISHED' : '⚡ READY FOR NEXT ROUND'}
          </span>

          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
            {status === 'COMPLETED' ? 'PREPARING NEXT AUCTION' : 'WAITING FOR NEXT AUCTION'}
          </h2>

          <p className="text-lg text-slate-300 max-w-xl mx-auto mb-6">
            The Admin Host will launch the next question shortly. Competing teams, stand by!
          </p>

          {winningTeam && status === 'COMPLETED' && (
            <div className="bg-[#0d1424] border-2 border-cyan-500/40 rounded-3xl p-6 max-w-md mx-auto shadow-2xl">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                PREVIOUS ROUND WINNER
              </span>
              <div className="text-2xl font-black text-white">{winningTeam.teamName}</div>
              <div className="text-xs text-cyan-400 font-semibold mt-1">{winningTeam.collegeName}</div>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE AUCTION QUESTION & BID DISPLAY */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-4 relative z-10">
          {/* Left Column: Question Details (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0d1424]/90 border border-cyan-500/20 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                {renderDifficultyBadge(auction.question?.difficulty)}
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800">
                  {auction.question?.category || 'Electrical Engineering'}
                </span>
              </div>

              {/* HUGE QUESTION TEXT */}
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-snug tracking-tight mb-8">
                "{auction.question?.questionText}"
              </h2>
            </div>

            {/* Base points footer */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-sm">
              <span className="text-slate-400 font-bold uppercase">Question Base Value:</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">
                {auction.question?.basePoints} POINTS
              </span>
            </div>
          </div>

          {/* Right Column: Timer & Live Bidder Showcase (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* TIMER CARD */}
            <div className="bg-[#0d1424]/90 border border-cyan-500/20 rounded-3xl p-6 text-center shadow-xl">
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-slate-400 uppercase mb-2">
                <Timer className="w-4 h-4 text-cyan-400" />
                <span>{auction.timerType === 'ANSWER' ? 'ANSWER TIMER' : 'BIDDING TIMER'}</span>
              </div>

              <div
                className={`text-6xl sm:text-7xl font-black font-mono tracking-tight ${
                  auction.timerRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'
                }`}
              >
                {formatTimer(auction.timerRemaining)}
              </div>
            </div>

            {/* HIGHEST BIDDER / WINNER DISPLAY (SHOWN DURING EVALUATION & RESULTS ONLY) */}
            {status !== 'BIDDING_OPEN' && (winningTeam || highestBidder) && (
              <div className="bg-gradient-to-b from-[#111827] to-[#0d1424] border-2 border-cyan-500/40 rounded-3xl p-6 text-center shadow-2xl flex-1 flex flex-col justify-center">
                <span className="text-xs font-extrabold tracking-widest text-yellow-400 uppercase mb-2 block">
                  {status === 'COMPLETED' && auction.answerResult === 'CORRECT'
                    ? '🎉 POINTS AWARDED'
                    : status === 'COMPLETED' && auction.answerResult === 'WRONG'
                    ? '💔 POINTS DEDUCTED'
                    : '🏆 EVALUATING CANDIDATE'}
                </span>

                <h3 className="text-4xl font-black text-white tracking-tight my-2">
                  {winningTeam?.teamName || highestBidder?.teamName}
                </h3>

                <div className="text-xs text-slate-300 font-semibold mb-4">
                  {winningTeam?.collegeName || highestBidder?.collegeName}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase block">
                    {status === 'COMPLETED' && auction.answerResult === 'CORRECT'
                      ? `WINNING BID ADDED TO BALANCE (+${auction.winningBid || auction.currentBid} PTS)`
                      : 'BID VALUE FOR EVALUATION'}
                  </span>
                  <span className="text-5xl font-black text-yellow-400 font-mono">
                    {auction.winningBid || auction.currentBid} <span className="text-lg font-normal">PTS</span>
                  </span>
                </div>
              </div>
            )}

            {/* INTERACTIVE TEAM BIDDING CONSOLE (MATCHING EXACT USER DESIGN) */}
            {status === 'BIDDING_OPEN' && (
              <div className="bg-[#0b101d] border-2 border-yellow-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
                {/* Header Info */}
                <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center">
                      <Zap className="w-3.5 h-3.5 fill-cyan-400 mr-1" />
                      <span>TEAM INDIVIDUAL BIDDING</span>
                    </span>
                    <div className="text-xs text-slate-400 font-semibold mt-1">
                      Min Limit: <strong className="text-yellow-400 font-mono">{auction.question?.basePoints || 100} PTS</strong>
                    </div>
                  </div>
                  {teamInfo ? (
                    <div className="text-right flex items-center space-x-3">
                      {hasAlreadyBid && (
                        <div className="text-right pr-3 border-r border-slate-800">
                          <span className="text-[10px] font-extrabold text-yellow-400 uppercase block">YOUR BID</span>
                          <span className="text-xl font-black text-yellow-400 font-mono">{myPlacedBid.amount} PTS</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">YOUR BALANCE</span>
                        <span className="text-xl font-black text-green-400 font-mono">{teamInfo.points ?? 10000} PTS</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-extrabold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl">
                      🔑 SELECT TEAM BELOW
                    </span>
                  )}
                </div>

                {!teamInfo && (
                  <div className="p-4 bg-slate-900/90 border border-yellow-500/40 rounded-2xl space-y-2">
                    <label className="block text-xs font-extrabold text-yellow-400 uppercase tracking-wider">
                      🔑 Select Your Registered Team to Place Bids:
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const selected = teamsList.find((t: any) => t.id === e.target.value);
                        if (selected) {
                          setTeamInfo(selected);
                          localStorage.setItem('team_info', JSON.stringify(selected));
                          socket.emit('join_auction_room', {
                            teamId: selected.id,
                            teamName: selected.teamName,
                            registrationNumber: selected.registrationNumber,
                          });
                          setBidMessage({ type: 'success', text: `Logged in as ${selected.teamName} (${selected.registrationNumber})!` });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">-- Select Your Registered Team --</option>
                      {teamsList.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.teamName} ({t.registrationNumber}) - {t.collegeName} [{t.points} PTS]
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {hasAlreadyBid ? (
                  <div className="bg-yellow-500/10 border-2 border-yellow-500/50 rounded-2xl p-6 text-center space-y-3 shadow-xl">
                    <div className="w-12 h-12 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h4 className="text-lg font-black text-white uppercase tracking-wider">BID SUBMITTED FOR THIS QUESTION</h4>

                    <div className="py-3 px-6 rounded-2xl bg-slate-950 border border-yellow-500/40 inline-block text-center my-1">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">⚡ YOUR SUBMITTED BID POINTS</span>
                      <span className="text-4xl font-black text-yellow-400 font-mono tracking-tight">{myPlacedBid.amount} PTS</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your team <strong className="text-cyan-400">{teamInfo.teamName}</strong> ({teamInfo.registrationNumber}) has submitted its <strong>1 allowed bid</strong> of <strong className="text-yellow-400 font-mono text-sm">{myPlacedBid.amount} PTS</strong>.
                    </p>
                    <span className="inline-block text-[10px] font-bold text-slate-400 uppercase bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                      🔒 EACH TEAM CAN BID ONLY ONCE PER QUESTION
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Message Toast */}
                    {bidMessage && (
                      <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                        bidMessage.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        <span>{bidMessage.text}</span>
                        <button onClick={() => setBidMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
                      </div>
                    )}

                    {/* FAST BID INCREMENT BUTTONS */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          FAST BID INCREMENT
                        </span>
                        <span className="text-[10px] text-cyan-400 font-semibold">
                          Min Limit: {auction.question?.basePoints || 100} PTS
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const qMin = auction.question?.basePoints || 100;
                            const newBid = qMin + 100;
                            setTeamBidInput(String(newBid));
                            handlePlaceTeamBid(newBid);
                          }}
                          className="py-3 rounded-xl font-extrabold text-xs text-cyan-300 bg-slate-900 border border-cyan-500/40 hover:bg-cyan-500/20 transition-all shadow-md"
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const qMin = auction.question?.basePoints || 100;
                            const newBid = qMin + 200;
                            setTeamBidInput(String(newBid));
                            handlePlaceTeamBid(newBid);
                          }}
                          className="py-3 rounded-xl font-extrabold text-xs text-cyan-300 bg-slate-900 border border-cyan-500/40 hover:bg-cyan-500/20 transition-all shadow-md"
                        >
                          +200
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const qMin = auction.question?.basePoints || 100;
                            const newBid = qMin + 300;
                            setTeamBidInput(String(newBid));
                            handlePlaceTeamBid(newBid);
                          }}
                          className="py-3 rounded-xl font-extrabold text-xs text-cyan-300 bg-slate-900 border border-cyan-500/40 hover:bg-cyan-500/20 transition-all shadow-md"
                        >
                          +300
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const qMin = auction.question?.basePoints || 100;
                            const newBid = qMin + 500;
                            setTeamBidInput(String(newBid));
                            handlePlaceTeamBid(newBid);
                          }}
                          className="py-3 rounded-xl font-extrabold text-xs text-yellow-300 bg-slate-900 border border-yellow-500/40 hover:bg-yellow-500/20 transition-all shadow-md"
                        >
                          +500
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const qMin = auction.question?.basePoints || 100;
                            const newBid = qMin + 1000;
                            setTeamBidInput(String(newBid));
                            handlePlaceTeamBid(newBid);
                          }}
                          className="col-span-2 py-3 rounded-xl font-black text-xs text-purple-300 bg-purple-950/60 border-2 border-purple-500/50 hover:bg-purple-900/80 transition-all shadow-md flex items-center justify-center space-x-1"
                        >
                          <Zap className="w-3.5 h-3.5 fill-purple-300" />
                          <span>+1000 SUPER BID</span>
                        </button>
                      </div>
                    </div>

                    {/* NEW BID AMOUNT INPUT */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          CUSTOM BID AMOUNT
                        </label>
                        <span className="text-[10px] text-yellow-400 font-semibold">
                          Must be &ge; {auction.question?.basePoints || 100} PTS
                        </span>
                      </div>
                      <input
                        type="number"
                        placeholder={`Enter custom bid (min ${auction.question?.basePoints || 100} PTS)`}
                        value={teamBidInput}
                        onChange={(e) => setTeamBidInput(e.target.value)}
                        className="w-full bg-slate-950 border-2 border-slate-700 focus:border-yellow-400 rounded-2xl p-3.5 text-white font-mono text-xl font-black focus:outline-none"
                      />
                    </div>

                    {/* PLACE BID BUTTON */}
                    <button
                      type="button"
                      onClick={() => handlePlaceTeamBid()}
                      className="w-full py-4 rounded-2xl font-black text-black bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-lg shadow-xl shadow-yellow-500/20 flex items-center justify-center space-x-2 transition-all"
                    >
                      <Zap className="w-5 h-5 fill-black" />
                      <span>SUBMIT MY 1 BID NOW</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER TICKER WITH COMFORTABLE MARGIN */}
      <div className="pt-6 pb-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 relative z-10 mt-8 mb-4">
        <span>⚡ ELECTROBID 2026 | Admin-Controlled Bidding System</span>
        <span>College EEE Flagship Symposium</span>
      </div>

      {/* EMPTY SPACE AT BOTTOM FOR UNRESTRICTED VIEWING & SCROLLING */}
      <div className="h-24 sm:h-32 w-full flex-shrink-0 pointer-events-none" />
    </div>
  );
};
