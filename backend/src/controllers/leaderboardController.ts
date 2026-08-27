import { Request, Response } from 'express';
import { prisma } from '../prisma/db';
import { AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;
export const setLeaderboardSocketIO = (io: Server) => {
  ioInstance = io;
};

// 1. Get Live Leaderboard
export const getLeaderboard = async (_req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { correctAnswers: 'desc' },
        { points: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        registrationNumber: true,
        teamName: true,
        participant1Name: true,
        participant2Name: true,
        collegeName: true,
        department: true,
        points: true,
        correctAnswers: true,
        wrongAnswers: true,
        status: true,
        _count: {
          select: { bids: true },
        },
      },
    });

    const formatted = teams.map((t, index) => ({
      rank: index + 1,
      ...t,
      totalBids: t._count?.bids || 0,
    }));

    return res.json({ success: true, leaderboard: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard.' });
  }
};

// 2. Get Final Results
export const getFinalResults = async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.eventSettings.findUnique({ where: { id: 'default' } });
    const teams = await prisma.team.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { correctAnswers: 'desc' },
        { points: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const champion = teams.length > 0 ? teams[0] : null;
    const runnerUp1 = teams.length > 1 ? teams[1] : null;
    const runnerUp2 = teams.length > 2 ? teams[2] : null;

    return res.json({
      success: true,
      eventStatus: settings?.eventStatus || 'NOT_STARTED',
      champion,
      runnerUp1,
      runnerUp2,
      fullLeaderboard: teams.map((t, i) => ({ rank: i + 1, ...t })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch final results.' });
  }
};

// 3. ADMIN: Get Score History Audit Log
export const getScoreHistory = async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.scoreTransaction.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        team: true,
        auction: { include: { question: true } },
      },
      take: 100,
    });

    return res.json({ success: true, history });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch score history.' });
  }
};

// 4. ADMIN: Get Auction History Log
export const getAuctionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.auction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        question: true,
        bids: {
          orderBy: { amount: 'desc' },
          include: { team: true },
        },
      },
    });

    const enriched = await Promise.all(
      history.map(async (auc) => {
        let winningTeam = null;
        if (auc.winningTeamId) {
          winningTeam = await prisma.team.findUnique({ where: { id: auc.winningTeamId } });
        }
        return {
          ...auc,
          winningTeam,
        };
      })
    );

    return res.json({ success: true, history: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch auction history.' });
  }
};

const defaultSettingsObj = {
  id: 'default',
  eventName: 'ELECTROBID',
  eventSubtitle: 'THE EEE AUCTION CHALLENGE',
  eventStatus: 'NOT_STARTED',
  startingPoints: 50000,
  minBidIncrement: 100,
  biddingTimerDefault: 30,
  answerTimerDefault: 30,
  nonBiddingPenalty: 0,
};

export const getEventSettings = async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.eventSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    if (!settings) {
      settings = await prisma.eventSettings.create({
        data: defaultSettingsObj,
      }).catch(() => null);
    }

    return res.json({ success: true, settings: settings || defaultSettingsObj });
  } catch (error: any) {
    return res.json({ success: true, settings: defaultSettingsObj });
  }
};

// 6. ADMIN: Update Event Settings / Status
export const updateEventSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { eventStatus, startingPoints, minBidIncrement, biddingTimerDefault, answerTimerDefault, nonBiddingPenalty } = req.body;

    const settings = await prisma.eventSettings.upsert({
      where: { id: 'default' },
      update: {
        eventStatus: eventStatus || undefined,
        startingPoints: startingPoints !== undefined ? Number(startingPoints) : undefined,
        minBidIncrement: minBidIncrement !== undefined ? Number(minBidIncrement) : undefined,
        biddingTimerDefault: biddingTimerDefault !== undefined ? Number(biddingTimerDefault) : undefined,
        answerTimerDefault: answerTimerDefault !== undefined ? Number(answerTimerDefault) : undefined,
        nonBiddingPenalty: nonBiddingPenalty !== undefined ? Number(nonBiddingPenalty) : undefined,
      },
      create: {
        id: 'default',
        eventName: 'ELECTROBID',
        eventSubtitle: 'THE EEE AUCTION CHALLENGE',
        eventStatus: eventStatus || 'NOT_STARTED',
        nonBiddingPenalty: nonBiddingPenalty ? Number(nonBiddingPenalty) : 0,
      },
    });

    if (ioInstance) {
      ioInstance.emit('event_status_changed', { eventStatus: settings.eventStatus });
    }

    return res.json({ success: true, message: 'Event settings updated.', settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update event settings.' });
  }
};

// 7. ADMIN: Delete Single Auction History Round
export const deleteAuctionHistoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Delete connected bids and score transactions first
    await prisma.bid.deleteMany({ where: { auctionId: id } });
    await prisma.scoreTransaction.deleteMany({ where: { auctionId: id } });
    await prisma.auction.delete({ where: { id } });

    if (ioInstance) {
      ioInstance.emit('history_updated');
    }

    return res.json({ success: true, message: 'Auction round history entry deleted.' });
  } catch (error: any) {
    console.error('Delete auction history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete auction history item.' });
  }
};

// 8. ADMIN: Delete Single Bid Entry
export const deleteSingleBidItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.bid.delete({ where: { id } });

    if (ioInstance) {
      ioInstance.emit('history_updated');
    }

    return res.json({ success: true, message: 'Bid record deleted.' });
  } catch (error: any) {
    console.error('Delete bid entry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete bid entry.' });
  }
};

// 9. ADMIN: Delete Single Score Transaction Entry
export const deleteScoreTransactionItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.scoreTransaction.delete({ where: { id } });

    if (ioInstance) {
      ioInstance.emit('history_updated');
    }

    return res.json({ success: true, message: 'Score audit record deleted.' });
  } catch (error: any) {
    console.error('Delete score transaction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete score transaction.' });
  }
};

// 10. ADMIN: Clear All History Logs (Bulk Delete)
export const clearAllHistoryLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { target } = req.body; // 'ALL', 'BIDS', 'AUCTIONS', 'SCORE'

    if (target === 'BIDS') {
      await prisma.bid.deleteMany({});
    } else if (target === 'AUCTIONS') {
      await prisma.bid.deleteMany({});
      await prisma.scoreTransaction.deleteMany({});
      await prisma.auction.deleteMany({ where: { status: { in: ['COMPLETED', 'CANCELLED'] } } });
    } else if (target === 'SCORE') {
      await prisma.scoreTransaction.deleteMany({});
    } else {
      // ALL
      await prisma.bid.deleteMany({});
      await prisma.scoreTransaction.deleteMany({});
      await prisma.auction.deleteMany({ where: { status: { in: ['COMPLETED', 'CANCELLED'] } } });
    }

    if (ioInstance) {
      ioInstance.emit('history_updated');
      ioInstance.emit('leaderboard_updated');
    }

    return res.json({ success: true, message: 'History audit records cleared successfully.' });
  } catch (error: any) {
    console.error('Clear history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear history logs.' });
  }
};
