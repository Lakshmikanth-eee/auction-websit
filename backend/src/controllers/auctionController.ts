import { Request, Response } from 'express';
import { prisma } from '../prisma/db';
import { AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let activeTimerEndTime: number | null = null;

export const setAuctionSocketIO = (io: Server) => {
  ioInstance = io;
};

// Helper: Broadcast current state to all clients
export const broadcastAuctionState = async () => {
  if (!ioInstance) return;
  const currentAuction = await prisma.auction.findFirst({
    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      question: true,
      bids: {
        orderBy: { timestamp: 'desc' },
        include: { team: true },
      },
    },
  });

  if (currentAuction && currentAuction.isTimerRunning && activeTimerEndTime) {
    const remaining = Math.max(0, Math.ceil((activeTimerEndTime - Date.now()) / 1000));
    currentAuction.timerRemaining = remaining;
    if (remaining <= 0) {
      currentAuction.isTimerRunning = false;
    }
  }

  let highestBidderTeam = null;
  let winningTeam = null;

  if (currentAuction?.highestBidderTeamId) {
    highestBidderTeam = await prisma.team.findUnique({
      where: { id: currentAuction.highestBidderTeamId },
    });
  }

  if (currentAuction?.winningTeamId) {
    winningTeam = await prisma.team.findUnique({
      where: { id: currentAuction.winningTeamId },
    });
  }

  ioInstance.emit('auction_state_update', {
    auction: currentAuction,
    highestBidderTeam,
    winningTeam,
  });
};

// 1. Get Current Active Auction State
export const getCurrentAuction = async (_req: Request, res: Response) => {
  try {
    const currentAuction = await prisma.auction.findFirst({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        question: true,
        bids: {
          orderBy: { timestamp: 'desc' },
          take: 10,
          include: { team: true },
        },
      },
    });

    if (currentAuction && currentAuction.isTimerRunning && activeTimerEndTime) {
      const remaining = Math.max(0, Math.ceil((activeTimerEndTime - Date.now()) / 1000));
      currentAuction.timerRemaining = remaining;
      if (remaining <= 0) {
        currentAuction.isTimerRunning = false;
      }
    }

    let highestBidderTeam = null;
    let winningTeam = null;

    if (currentAuction?.highestBidderTeamId) {
      highestBidderTeam = await prisma.team.findUnique({
        where: { id: currentAuction.highestBidderTeamId },
      });
    }

    if (currentAuction?.winningTeamId) {
      winningTeam = await prisma.team.findUnique({
        where: { id: currentAuction.winningTeamId },
      });
    }

    return res.json({
      success: true,
      auction: currentAuction,
      highestBidderTeam,
      winningTeam,
    });
  } catch (error: any) {
    console.error('Get current auction error:', error);
    return res.json({ success: true, auction: null, highestBidderTeam: null, winningTeam: null });
  }
};

// 2. ADMIN: Start Auction for Selected Question
export const startAuction = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: 'Question ID is required.' });
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    // Cancel any existing pending auction
    await prisma.auction.updateMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      data: { status: 'CANCELLED' },
    });

    // Fetch default bidding timer from settings if configured
    const settings = await prisma.eventSettings.findUnique({ where: { id: 'default' } });
    const defaultTimerSecs = settings?.biddingTimerDefault || 90;

    // Create new auction
    const newAuction = await prisma.auction.create({
      data: {
        questionId: question.id,
        status: 'BIDDING_OPEN',
        currentBid: question.basePoints,
        timerRemaining: defaultTimerSecs,
        timerType: 'BIDDING',
        isTimerRunning: true,
      },
      include: { question: true },
    });

    // Update settings currentAuctionId
    await prisma.eventSettings.upsert({
      where: { id: 'default' },
      update: { currentAuctionId: newAuction.id, eventStatus: 'IN_PROGRESS' },
      create: { id: 'default', currentAuctionId: newAuction.id, eventStatus: 'IN_PROGRESS' },
    });

    // Start timer interval
    startServerTimer(newAuction.id, 'BIDDING', defaultTimerSecs);

    if (ioInstance) {
      ioInstance.emit('auction_started', newAuction);
      await broadcastAuctionState();
    }

    return res.status(201).json({
      success: true,
      message: `Auction started for question: "${question.questionText.slice(0, 40)}..."`,
      auction: newAuction,
    });
  } catch (error: any) {
    console.error('Start auction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start auction.' });
  }
};

// 3. ADMIN: Place Bid for Team (Strict Server-Side Validation)
export const placeBid = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId, amount } = req.body;

    if (!teamId || amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: 'Please select a team and enter a valid bid amount.' });
    }

    const bidAmount = Number(amount);

    // Fetch active auction
    const auction = await prisma.auction.findFirst({
      where: { status: 'BIDDING_OPEN' },
      include: { question: true },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'No active bidding auction in progress.' });
    }

    // Fetch team
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Selected team does not exist.' });
    }

    // RULE 1: Each team can bid ONLY ONCE per question auction
    const existingTeamBid = await prisma.bid.findFirst({
      where: {
        auctionId: auction.id,
        teamId: team.id,
      },
    });

    if (existingTeamBid) {
      return res.status(400).json({
        success: false,
        message: `Team "${team.teamName}" has already placed a bid for this question. Each team can bid only once per question!`,
      });
    }

    // RULE 2: Individual Custom Bidding - Bid must be >= question minimum limit (basePoints)
    const questionMinLimit = auction.question?.basePoints || 100;

    if (bidAmount < questionMinLimit) {
      return res.status(400).json({
        success: false,
        message: `Bid must be at least ${questionMinLimit} points (Question minimum limit is ${questionMinLimit} PTS).`,
      });
    }

    // Insufficient points check
    if (team.points < bidAmount) {
      return res.status(400).json({
        success: false,
        message: `Team "${team.teamName}" does not have enough points. Current balance: ${team.points} points.`,
      });
    }

    // Update auction highest bidder & current bid if this bid is higher than previous highest bid
    const isNewHighest = bidAmount > auction.currentBid || !auction.highestBidderTeamId;
    const newCurrentBid = isNewHighest ? bidAmount : auction.currentBid;
    const newHighestBidderId = isNewHighest ? team.id : auction.highestBidderTeamId;

    // Use Prisma transaction for atomic bid placement
    const [bidRecord, updatedTeam, updatedAuction] = await prisma.$transaction([
      prisma.bid.create({
        data: {
          auctionId: auction.id,
          teamId: team.id,
          amount: bidAmount,
        },
        include: { team: true },
      }),
      prisma.team.findUniqueOrThrow({
        where: { id: team.id },
      }),
      prisma.auction.update({
        where: { id: auction.id },
        data: {
          currentBid: newCurrentBid,
          highestBidderTeamId: newHighestBidderId,
        },
        include: { question: true },
      }),
    ]);

    if (ioInstance) {
      ioInstance.emit('score_updated', { teamId: team.id, newPoints: team.points });
      ioInstance.emit('leaderboard_updated');
      ioInstance.emit('bid_placed', {
        bid: bidRecord,
        team: updatedTeam,
        currentBid: bidAmount,
      });
      await broadcastAuctionState();
    }

    return res.json({
      success: true,
      message: `Bid of ${bidAmount} placed for ${updatedTeam.teamName}!`,
      auction: updatedAuction,
      bid: bidRecord,
      team: updatedTeam,
    });
  } catch (error: any) {
    console.error('Place bid error:', error);
    return res.status(500).json({ success: false, message: 'Failed to place bid.' });
  }
};

// 4. ADMIN: Timer Control (Start, Pause, Resume, Reset, Set, Stop)
export const controlTimer = async (req: AuthRequest, res: Response) => {
  try {
    const { action, seconds } = req.body; // 'START', 'PAUSE', 'RESUME', 'RESET', 'SET', 'STOP'

    const auction = await prisma.auction.findFirst({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'No active auction to control timer.' });
    }

    let updatedSeconds = auction.timerRemaining;
    let isRunning = auction.isTimerRunning;

    if (action === 'PAUSE') {
      isRunning = false;
      stopServerTimer();
    } else if (action === 'RESUME' || action === 'START') {
      isRunning = true;
      if (seconds !== undefined && !isNaN(Number(seconds)) && Number(seconds) > 0 && Number(seconds) !== auction.timerRemaining) {
        updatedSeconds = Number(seconds);
      }
      if (updatedSeconds <= 0) {
        updatedSeconds = auction.timerType === 'BIDDING' ? 90 : 30;
      }
      startServerTimer(auction.id, auction.timerType, updatedSeconds);
    } else if (action === 'RESET') {
      const defaultSecs = auction.timerType === 'BIDDING' ? 90 : 30;
      updatedSeconds = seconds !== undefined && !isNaN(Number(seconds)) && Number(seconds) > 0 ? Number(seconds) : defaultSecs;
      isRunning = false;
      stopServerTimer();
    } else if (action === 'SET') {
      updatedSeconds = seconds !== undefined && !isNaN(Number(seconds)) && Number(seconds) > 0 ? Number(seconds) : auction.timerRemaining;
      if (isRunning) {
        startServerTimer(auction.id, auction.timerType, updatedSeconds);
      } else {
        stopServerTimer();
      }
    } else if (action === 'STOP') {
      isRunning = false;
      updatedSeconds = 0;
      stopServerTimer();
      // Auto close bidding if in bidding phase
      if (auction.status === 'BIDDING_OPEN') {
        await closeBiddingInternal(auction.id);
      }
    }

    const updatedAuction = await prisma.auction.update({
      where: { id: auction.id },
      data: { timerRemaining: updatedSeconds, isTimerRunning: isRunning },
      include: { question: true },
    });

    if (ioInstance) {
      ioInstance.emit('timer_updated', {
        timerRemaining: updatedSeconds,
        isTimerRunning: isRunning,
        timerType: auction.timerType,
      });
      ioInstance.emit('timer_control', {
        action,
        timerRemaining: updatedSeconds,
        isTimerRunning: isRunning,
      });
      await broadcastAuctionState();
    }

    return res.json({ success: true, message: `Timer ${action} executed (${updatedSeconds}s).`, auction: updatedAuction });
  } catch (error: any) {
    console.error('Control timer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to control timer.' });
  }
};

// 5. ADMIN: Confirm Winner when Bidding Closes
export const confirmWinner = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await prisma.auction.findFirst({
      where: { status: { in: ['BIDDING_OPEN', 'BIDDING_CLOSED'] } },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'No active auction to confirm winner.' });
    }

    if (!auction.highestBidderTeamId) {
      return res.status(400).json({ success: false, message: 'No bids were placed in this auction yet.' });
    }

    stopServerTimer();

    const updatedAuction = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        status: 'WINNER_CONFIRMED',
        winningTeamId: auction.highestBidderTeamId,
        winningBid: auction.currentBid,
        isTimerRunning: false,
      },
      include: { question: true },
    });

    const winningTeam = await prisma.team.findUnique({
      where: { id: auction.highestBidderTeamId },
    });

    if (ioInstance) {
      ioInstance.emit('winner_selected', {
        auction: updatedAuction,
        winningTeam,
        winningBid: auction.currentBid,
      });
      await broadcastAuctionState();
    }

    return res.json({
      success: true,
      message: `Winner confirmed: ${winningTeam?.teamName} with winning bid of ${auction.currentBid} points!`,
      auction: updatedAuction,
      winningTeam,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to confirm winner.' });
  }
};

// 6. ADMIN: Start Answer Phase
export const startAnswerPhase = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await prisma.auction.findFirst({
      where: { status: 'WINNER_CONFIRMED' },
      include: { question: true },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'Please confirm winner before starting answer phase.' });
    }

    const updatedAuction = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        status: 'ANSWER_IN_PROGRESS',
        timerType: 'ANSWER',
        timerRemaining: auction.question.timeLimit || 30,
        isTimerRunning: true,
      },
      include: { question: true },
    });

    startServerTimer(updatedAuction.id, 'ANSWER', updatedAuction.timerRemaining);

    if (ioInstance) {
      ioInstance.emit('answer_started', updatedAuction);
      await broadcastAuctionState();
    }

    return res.json({ success: true, message: 'Answer phase started.', auction: updatedAuction });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to start answer phase.' });
  }
};

// 7. ADMIN: Submit Answer Outcome (CORRECT or WRONG) - Cascading Evaluation Loop
export const submitAnswerOutcome = async (req: AuthRequest, res: Response) => {
  try {
    const { outcome } = req.body; // 'CORRECT' or 'WRONG'

    if (!['CORRECT', 'WRONG'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'Outcome must be CORRECT or WRONG.' });
    }

    const auction = await prisma.auction.findFirst({
      where: { status: { in: ['ANSWER_IN_PROGRESS', 'WINNER_CONFIRMED'] } },
      include: {
        question: true,
        bids: {
          orderBy: { amount: 'desc' },
          include: { team: true },
        },
      },
    });

    if (!auction || !auction.winningTeamId || !auction.winningBid) {
      return res.status(400).json({ success: false, message: 'No valid auction winner found to mark outcome.' });
    }

    stopServerTimer();

    const currentEvaluatingTeam = await prisma.team.findUnique({ where: { id: auction.winningTeamId } });
    if (!currentEvaluatingTeam) return res.status(404).json({ success: false, message: 'Evaluating team not found.' });

    const previousPoints = currentEvaluatingTeam.points;
    const bidAmount = auction.winningBid;
    const questionBasePoints = auction.question.basePoints || 0;

    if (outcome === 'CORRECT') {
      // 1. CORRECT ANSWER: Add the exact points the team bided (+bidAmount) to team balance
      const pointDelta = bidAmount;
      const newPoints = previousPoints + pointDelta;

      const [updatedTeam, _scoreTrans, updatedAuction] = await prisma.$transaction([
        prisma.team.update({
          where: { id: currentEvaluatingTeam.id },
          data: {
            points: newPoints,
            correctAnswers: { increment: 1 },
          },
        }),
        prisma.scoreTransaction.create({
          data: {
            teamId: currentEvaluatingTeam.id,
            auctionId: auction.id,
            amount: pointDelta,
            type: 'AUCTION_WIN',
            previousPoints,
            newPoints,
            reason: `Auction Win (+${bidAmount} PTS Bid Added) for "${auction.question.questionText.slice(0, 30)}..."`,
            adminUsername: req.admin?.username || 'admin',
          },
        }),
        prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: 'COMPLETED',
            answerResult: 'CORRECT',
            scoreBefore: previousPoints,
            scoreAfter: newPoints,
            isTimerRunning: false,
          },
          include: { question: true },
        }),
        prisma.question.update({
          where: { id: auction.questionId },
          data: { isUsed: true },
        }),
      ]);

      if (ioInstance) {
        ioInstance.emit('answer_correct', {
          auction: updatedAuction,
          winningTeam: updatedTeam,
          previousPoints,
          newPoints,
          winningBid: bidAmount,
        });
        ioInstance.emit('score_updated', { teamId: updatedTeam.id, newPoints });
        ioInstance.emit('leaderboard_updated');
        await broadcastAuctionState();
      }

      return res.json({
        success: true,
        message: `Answer CORRECT! ${updatedTeam.teamName} won (+${bidAmount} PTS Bid Added).`,
        outcome: 'CORRECT',
        team: updatedTeam,
        auction: updatedAuction,
      });
    } else {
      // 2. WRONG ANSWER: Deduct the points the team bided (-bidAmount) from team balance
      const pointDelta = -bidAmount;
      const newPoints = Math.max(0, previousPoints + pointDelta);

      const [updatedTeam, _scoreTrans] = await prisma.$transaction([
        prisma.team.update({
          where: { id: currentEvaluatingTeam.id },
          data: {
            points: newPoints,
            wrongAnswers: { increment: 1 },
          },
        }),
        prisma.scoreTransaction.create({
          data: {
            teamId: currentEvaluatingTeam.id,
            auctionId: auction.id,
            amount: pointDelta,
            type: 'AUCTION_LOSS',
            previousPoints,
            newPoints,
            reason: `Answer WRONG (-${bidAmount} PTS Bid Deducted) for "${auction.question.questionText.slice(0, 30)}..."`,
            adminUsername: req.admin?.username || 'admin',
          },
        }),
      ]);

      // Check if there is a NEXT HIGHEST BIDDER among the bids for this auction!
      const currentTeamIndex = auction.bids.findIndex((b) => (b.teamId === currentEvaluatingTeam.id || b.team?.id === currentEvaluatingTeam.id));
      const nextBid = currentTeamIndex !== -1 && currentTeamIndex + 1 < auction.bids.length
        ? auction.bids[currentTeamIndex + 1]
        : null;

      if (nextBid && nextBid.team) {
        // CASCADING LOOP: Move to next highest bidder!
        const answerTimeLimit = auction.question.timeLimit || 30;

        const updatedAuction = await prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: 'ANSWER_IN_PROGRESS',
            winningTeamId: nextBid.team.id,
            winningBid: nextBid.amount,
            highestBidderTeamId: nextBid.team.id,
            currentBid: nextBid.amount,
            timerRemaining: answerTimeLimit,
            timerType: 'ANSWER',
            isTimerRunning: true,
          },
          include: { question: true },
        });

        startServerTimer(updatedAuction.id, 'ANSWER', answerTimeLimit);

        if (ioInstance) {
          ioInstance.emit('answer_wrong_cascaded', {
            auction: updatedAuction,
            failedTeam: updatedTeam,
            deductedBid: bidAmount,
            nextTeam: nextBid.team,
            nextBid: nextBid.amount,
          });
          ioInstance.emit('score_updated', { teamId: updatedTeam.id, newPoints });
          ioInstance.emit('leaderboard_updated');
          await broadcastAuctionState();
        }

        return res.json({
          success: true,
          message: `Answer WRONG for ${updatedTeam.teamName} (-${bidAmount} PTS deducted). Moving to next highest bidder: ${nextBid.team.teamName} (${nextBid.amount} PTS)!`,
          outcome: 'WRONG_CASCADED',
          failedTeam: updatedTeam,
          nextTeam: nextBid.team,
          nextBid: nextBid.amount,
          auction: updatedAuction,
        });
      } else {
        // NO MORE BIDDERS: Round completed with no correct answer
        const updatedAuction = await prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: 'COMPLETED',
            answerResult: 'WRONG',
            scoreBefore: previousPoints,
            scoreAfter: newPoints,
            isTimerRunning: false,
          },
          include: { question: true },
        });

        await prisma.question.update({
          where: { id: auction.questionId },
          data: { isUsed: true },
        });

        if (ioInstance) {
          ioInstance.emit('answer_wrong_all', {
            auction: updatedAuction,
            failedTeam: updatedTeam,
            deductedBid: bidAmount,
          });
          ioInstance.emit('score_updated', { teamId: updatedTeam.id, newPoints });
          ioInstance.emit('leaderboard_updated');
          await broadcastAuctionState();
        }

        return res.json({
          success: true,
          message: `Answer WRONG for ${updatedTeam.teamName} (-${bidAmount} PTS deducted). No more bidding teams remaining! Question round completed.`,
          outcome: 'WRONG_ALL_FAILED',
          failedTeam: updatedTeam,
          auction: updatedAuction,
        });
      }
    }
  } catch (error: any) {
    console.error('Submit answer outcome error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit answer outcome.' });
  }
};

// 8. ADMIN: Cancel Active Auction
export const cancelAuction = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await prisma.auction.findFirst({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'No active auction to cancel.' });
    }

    stopServerTimer();

    const cancelled = await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'CANCELLED', isTimerRunning: false },
    });

    if (ioInstance) {
      ioInstance.emit('auction_cancelled', cancelled);
      await broadcastAuctionState();
    }

    return res.json({ success: true, message: 'Auction cancelled successfully.', auction: cancelled });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to cancel auction.' });
  }
};

// 9. ADMIN: Reset Active Auction
export const resetAuction = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await prisma.auction.findFirst({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { question: true },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'No active auction to reset.' });
    }

    stopServerTimer();

    // Delete bids for this auction
    await prisma.bid.deleteMany({ where: { auctionId: auction.id } });

    const resetAuctionObj = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        status: 'BIDDING_OPEN',
        currentBid: auction.question.basePoints,
        highestBidderTeamId: null,
        winningTeamId: null,
        winningBid: null,
        answerResult: null,
        timerRemaining: 90,
        timerType: 'BIDDING',
        isTimerRunning: true,
      },
      include: { question: true },
    });

    startServerTimer(resetAuctionObj.id, 'BIDDING', 90);

    if (ioInstance) {
      ioInstance.emit('auction_reset', resetAuctionObj);
      await broadcastAuctionState();
    }

    return res.json({ success: true, message: 'Auction reset to starting state.', auction: resetAuctionObj });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to reset auction.' });
  }
};

// 10. ADMIN: Apply Non-Bidding Penalty to teams that did not place a bid
export const applyNonBiddingPenalty = async (req: AuthRequest, res: Response) => {
  try {
    const { customPenaltyAmount } = req.body;

    const auction = await prisma.auction.findFirst({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: {
        bids: true,
        question: true,
      },
    });

    if (!auction) {
      return res.status(400).json({ success: false, message: 'No active auction round found to apply penalty.' });
    }

    const settings = await prisma.eventSettings.findUnique({ where: { id: 'default' } });
    const penaltyAmount = customPenaltyAmount !== undefined && !isNaN(Number(customPenaltyAmount))
      ? Number(customPenaltyAmount)
      : (settings?.nonBiddingPenalty || 0);

    if (penaltyAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Non-bidding penalty is currently 0 PTS. Set penalty points in Event Settings or enter a custom amount.',
      });
    }

    const activeTeams = await prisma.team.findMany({
      where: { status: 'ACTIVE' },
    });

    const bidderTeamIds = new Set(auction.bids.map((b) => b.teamId));
    const nonBiddingTeams = activeTeams.filter((t) => !bidderTeamIds.has(t.id));

    if (nonBiddingTeams.length === 0) {
      return res.json({
        success: true,
        message: 'All registered active teams placed a bid for this question! No penalties needed.',
        penalizedCount: 0,
      });
    }

    const penalizedTeamNames: string[] = [];

    for (const team of nonBiddingTeams) {
      const previousPoints = team.points;
      const newPoints = Math.max(0, previousPoints - penaltyAmount);
      penalizedTeamNames.push(team.teamName);

      await prisma.$transaction([
        prisma.team.update({
          where: { id: team.id },
          data: { points: newPoints },
        }),
        prisma.scoreTransaction.create({
          data: {
            teamId: team.id,
            auctionId: auction.id,
            amount: -penaltyAmount,
            type: 'PENALTY',
            previousPoints,
            newPoints,
            reason: `Non-bidding penalty (-${penaltyAmount} PTS) for "${auction.question?.questionText.slice(0, 30)}..."`,
            adminUsername: req.admin?.username || 'admin',
          },
        }),
      ]);

      if (ioInstance) {
        ioInstance.emit('score_updated', { teamId: team.id, newPoints });
      }
    }

    if (ioInstance) {
      ioInstance.emit('leaderboard_updated');
      ioInstance.emit('penalty_applied', {
        auctionId: auction.id,
        penaltyAmount,
        penalizedTeamsCount: nonBiddingTeams.length,
        penalizedTeamNames,
      });
      await broadcastAuctionState();
    }

    return res.json({
      success: true,
      message: `⚡ Non-bidding penalty of -${penaltyAmount} PTS applied to ${nonBiddingTeams.length} teams (${penalizedTeamNames.join(', ')})!`,
      penaltyAmount,
      penalizedTeamsCount: nonBiddingTeams.length,
      penalizedTeamNames,
    });
  } catch (error: any) {
    console.error('Apply non-bidding penalty error:', error);
    return res.status(500).json({ success: false, message: 'Failed to apply non-bidding penalty.' });
  }
};

// --- Internal Server Timer Helper ---
function startServerTimer(auctionId: string, timerType: string, startSeconds: number) {
  stopServerTimer();

  activeTimerEndTime = Date.now() + startSeconds * 1000;

  timerInterval = setInterval(async () => {
    if (!activeTimerEndTime) return;
    const remaining = Math.max(0, Math.ceil((activeTimerEndTime - Date.now()) / 1000));

    if (ioInstance) {
      ioInstance.emit('timer_updated', {
        auctionId,
        timerType,
        timerRemaining: remaining,
        isTimerRunning: remaining > 0,
      });
    }

    // Save accurate timer remaining state in DB
    await prisma.auction.update({
      where: { id: auctionId },
      data: { timerRemaining: remaining, isTimerRunning: remaining > 0 },
    }).catch(() => {});

    if (remaining <= 0) {
      stopServerTimer();

      if (timerType === 'BIDDING') {
        await closeBiddingInternal(auctionId);
      } else if (timerType === 'ANSWER') {
        if (ioInstance) {
          ioInstance.emit('answer_timer_finished', { auctionId });
        }
      }
    }
  }, 1000);
}

function stopServerTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  activeTimerEndTime = null;
}

async function closeBiddingInternal(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { bids: true, question: true },
  });

  if (auction && auction.status === 'BIDDING_OPEN') {
    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: { status: 'BIDDING_CLOSED', isTimerRunning: false },
    });

    // Check if auto non-bidding penalty is configured in event settings
    const settings = await prisma.eventSettings.findUnique({ where: { id: 'default' } });
    const penaltyAmount = settings?.nonBiddingPenalty || 0;

    if (penaltyAmount > 0) {
      const activeTeams = await prisma.team.findMany({ where: { status: 'ACTIVE' } });
      const bidderTeamIds = new Set(auction.bids.map((b) => b.teamId));
      const nonBiddingTeams = activeTeams.filter((t) => !bidderTeamIds.has(t.id));

      for (const team of nonBiddingTeams) {
        const previousPoints = team.points;
        const newPoints = Math.max(0, previousPoints - penaltyAmount);

        await prisma.$transaction([
          prisma.team.update({
            where: { id: team.id },
            data: { points: newPoints },
          }),
          prisma.scoreTransaction.create({
            data: {
              teamId: team.id,
              auctionId: auction.id,
              amount: -penaltyAmount,
              type: 'PENALTY',
              previousPoints,
              newPoints,
              reason: `Non-bidding penalty (-${penaltyAmount} PTS) for "${auction.question?.questionText.slice(0, 30)}..."`,
              adminUsername: 'SYSTEM',
            },
          }),
        ]);

        if (ioInstance) {
          ioInstance.emit('score_updated', { teamId: team.id, newPoints });
        }
      }

      if (nonBiddingTeams.length > 0 && ioInstance) {
        ioInstance.emit('leaderboard_updated');
        ioInstance.emit('penalty_applied', {
          auctionId: auction.id,
          penaltyAmount,
          penalizedTeamsCount: nonBiddingTeams.length,
          penalizedTeamNames: nonBiddingTeams.map((t) => t.teamName),
        });
      }
    }

    if (ioInstance) {
      ioInstance.emit('bidding_closed', updated);
      await broadcastAuctionState();
    }
  }
}
