import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/db';
import { AuthRequest, TeamAuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;
export const setSocketIO = (io: Server) => {
  ioInstance = io;
};

// Helper to generate unique registration number
async function generateRegistrationNumber(): Promise<string> {
  const count = await prisma.team.count();
  const num = 1001 + count;
  let regNum = `EBID-${num}`;
  const existing = await prisma.team.findUnique({ where: { registrationNumber: regNum } });
  if (existing) {
    regNum = `EBID-${Date.now().toString().slice(-4)}`;
  }
  return regNum;
}

// 1. PUBLIC Team Registration (NO login account created)
export const registerTeam = async (req: Request, res: Response) => {
  try {
    const { teamName, participant1Name, participant2Name, collegeName, department, phone, email } = req.body;

    if (!teamName || !participant1Name || !participant2Name || !collegeName || !department) {
      return res.status(400).json({
        success: false,
        message: 'All required fields (Team Name, Participant Names, College, Department) must be filled.',
      });
    }

    const trimmedTeamName = teamName.trim();

    // Check if team name already registered
    const existingTeam = await prisma.team.findFirst({
      where: { teamName: { equals: trimmedTeamName } },
    }).catch(() => null);

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'A team with this Team Name has already registered.',
      });
    }

    const registrationNumber = await generateRegistrationNumber();

    const team = await prisma.team.create({
      data: {
        registrationNumber,
        teamName: trimmedTeamName,
        participant1Name: participant1Name.trim(),
        participant2Name: participant2Name.trim(),
        collegeName: collegeName.trim(),
        department: department.trim(),
        phone: phone ? phone.trim() : '',
        email: email && email.trim() ? email.trim() : `${trimmedTeamName.toLowerCase().replace(/\s+/g, '')}@ELECTROBID.com`,
        points: 10000,
        status: 'ACTIVE',
      },
    });

    // Broadcast team list & leaderboard update to admin and live screens
    if (ioInstance) {
      ioInstance.emit('team_registered', team);
      ioInstance.emit('leaderboard_updated');
    }

    const secret = process.env.JWT_SECRET || 'ELECTROBID_super_secure_jwt_secret_2026_key';
    const token = jwt.sign(
      { teamId: team.id, registrationNumber: team.registrationNumber, teamName: team.teamName },
      secret,
      { expiresIn: '7d' }
    );

    res.cookie('team_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration Successful!',
      token,
      team: {
        id: team.id,
        registrationNumber: team.registrationNumber,
        teamName: team.teamName,
        participant1Name: team.participant1Name,
        participant2Name: team.participant2Name,
        collegeName: team.collegeName,
        department: team.department,
        points: team.points,
        status: team.status,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error during team registration.' });
  }
};

// 2. ADMIN: List all teams with search/filter
export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status } = req.query;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status as string;
    }
    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { teamName: { contains: q } },
        { registrationNumber: { contains: q } },
        { participant1Name: { contains: q } },
        { participant2Name: { contains: q } },
        { collegeName: { contains: q } },
      ];
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      orderBy: [
        { correctAnswers: 'desc' },
        { points: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: {
          select: { bids: true, scoreTransactions: true },
        },
      },
    });

    return res.json({ success: true, teams });
  } catch (error: any) {
    console.error('Get teams error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch teams.' });
  }
};

// 3. ADMIN: Get single team details
export const getTeamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        bids: {
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: { auction: { include: { question: true } } },
        },
        scoreTransactions: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    return res.json({ success: true, team });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error fetching team details.' });
  }
};

// 4. ADMIN: Update team details
export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { teamName, participant1Name, participant2Name, collegeName, department, phone, email } = req.body;

    const updated = await prisma.team.update({
      where: { id },
      data: {
        teamName,
        participant1Name,
        participant2Name,
        collegeName,
        department,
        phone,
        email,
      },
    });

    return res.json({ success: true, message: 'Team updated successfully.', team: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update team.' });
  }
};

// 5. ADMIN: Toggle status (ACTIVE / DISABLED)
export const toggleTeamStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const team = await prisma.team.update({
      where: { id },
      data: { status },
    });

    return res.json({ success: true, message: `Team ${team.teamName} is now ${status}.`, team });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to toggle status.' });
  }
};

// 6. ADMIN: Delete Single Team
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found.' });

    await prisma.team.delete({ where: { id } });

    if (ioInstance) {
      ioInstance.emit('leaderboard_updated');
    }

    return res.json({ success: true, message: `Team ${team.teamName} deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete team.' });
  }
};

// 7. ADMIN: Bulk Delete Teams
export const bulkDeleteTeams = async (req: AuthRequest, res: Response) => {
  try {
    const { teamIds } = req.body;
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide an array of team IDs to delete.' });
    }

    await prisma.team.deleteMany({
      where: { id: { in: teamIds } },
    });

    if (ioInstance) {
      ioInstance.emit('leaderboard_updated');
    }

    return res.json({ success: true, message: `${teamIds.length} teams deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to bulk delete teams.' });
  }
};

// 8. ADMIN: Manual Score Control (+Points, -Points, Reset)
export const adjustTeamScore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, actionType, reason } = req.body; // actionType: 'ADD', 'SUBTRACT', 'RESET'

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason for score adjustment is required.' });
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found.' });

    const previousPoints = team.points;
    let newPoints = previousPoints;
    let transactionType = 'ADMIN_ADD';

    if (actionType === 'SET') {
      newPoints = Math.max(0, Number(amount));
      transactionType = 'ADMIN_SET';
    } else if (actionType === 'ADD') {
      newPoints = previousPoints + Math.abs(Number(amount));
      transactionType = 'ADMIN_ADD';
    } else if (actionType === 'SUBTRACT') {
      newPoints = Math.max(0, previousPoints - Math.abs(Number(amount)));
      transactionType = 'ADMIN_SUBTRACT';
    } else if (actionType === 'RESET') {
      newPoints = 10000; // Reset starting balance to 10,000 points
      transactionType = 'RESET';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action type.' });
    }

    // Atomic transaction for score update and audit record creation
    const [updatedTeam, transaction] = await prisma.$transaction([
      prisma.team.update({
        where: { id },
        data: { points: newPoints },
      }),
      prisma.scoreTransaction.create({
        data: {
          teamId: id,
          amount: newPoints - previousPoints,
          type: transactionType,
          previousPoints,
          newPoints,
          reason: reason.trim(),
          adminUsername: req.admin?.username || 'admin',
        },
      }),
    ]);

    if (ioInstance) {
      ioInstance.emit('score_updated', { teamId: id, newPoints });
      ioInstance.emit('leaderboard_updated');
    }

    return res.json({
      success: true,
      message: `Score for ${team.teamName} adjusted to ${newPoints}.`,
      team: updatedTeam,
      transaction,
    });
  } catch (error: any) {
    console.error('Adjust score error:', error);
    return res.status(500).json({ success: false, message: 'Failed to adjust score.' });
  }
};

// 9. ADMIN: Bulk Set/Change Points for Selected or All Teams
export const bulkSetTeamPoints = async (req: AuthRequest, res: Response) => {
  try {
    const { teamIds, newPoints, applyToAll, reason } = req.body;

    if (newPoints === undefined || isNaN(Number(newPoints))) {
      return res.status(400).json({ success: false, message: 'Provide a valid numeric points value.' });
    }

    const pointsValue = Math.max(0, Number(newPoints));
    const reasonText = reason || `Admin bulk set points to ${pointsValue} PTS`;

    const whereClause = applyToAll ? {} : { id: { in: teamIds || [] } };

    const targetTeams = await prisma.team.findMany({ where: whereClause });
    if (targetTeams.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching teams found to update points.' });
    }

    const updateResult = await prisma.team.updateMany({
      where: whereClause,
      data: { points: pointsValue },
    });

    // Create score transactions for audit trail
    await prisma.scoreTransaction.createMany({
      data: targetTeams.map((t) => ({
        teamId: t.id,
        amount: pointsValue - t.points,
        type: 'ADMIN_SET',
        previousPoints: t.points,
        newPoints: pointsValue,
        reason: reasonText,
        adminUsername: req.admin?.username || 'admin',
      })),
    });

    if (ioInstance) {
      ioInstance.emit('leaderboard_updated');
    }

    return res.json({
      success: true,
      message: `Points updated to ${pointsValue} PTS for ${updateResult.count} registered team(s).`,
      count: updateResult.count,
    });
  } catch (error: any) {
    console.error('Bulk set points error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update team points.' });
  }
};

// 9. PUBLIC: Team Login via Team Name or Registration Number
export const teamLogin = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your Team Name or Registration Number.',
      });
    }

    const query = identifier.trim();

    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { teamName: { equals: query } },
          { registrationNumber: { equals: query } },
        ],
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found. Please check your Team Name or Registration Number.',
      });
    }

    if (team.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'This team is currently disabled by the event administrator.',
      });
    }

    const secret = process.env.JWT_SECRET || 'ELECTROBID_super_secure_jwt_secret_2026_key';
    const token = jwt.sign(
      { teamId: team.id, registrationNumber: team.registrationNumber, teamName: team.teamName },
      secret,
      { expiresIn: '7d' }
    );

    res.cookie('team_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: `Welcome ${team.teamName}! Entering live auction...`,
      token,
      team: {
        id: team.id,
        registrationNumber: team.registrationNumber,
        teamName: team.teamName,
        participant1Name: team.participant1Name,
        participant2Name: team.participant2Name,
        collegeName: team.collegeName,
        department: team.department,
        points: team.points,
      },
    });
  } catch (error: any) {
    console.error('Team login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during team login.' });
  }
};

// 10. PROTECTED: Get currently authenticated team profile via JWT
export const getMyTeamProfile = async (req: TeamAuthRequest, res: Response) => {
  try {
    if (!req.team || !req.team.teamId) {
      return res.status(401).json({ success: false, message: 'Not authenticated as team.' });
    }
    const team = await prisma.team.findUnique({
      where: { id: req.team.teamId },
    });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team profile not found.' });
    }
    return res.json({ success: true, team });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error fetching team profile.' });
  }
};

// 10. PUBLIC: Get list of active registered teams for login dropdown
export const getPublicTeams = async (_req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        teamName: true,
        registrationNumber: true,
        collegeName: true,
      },
      orderBy: { teamName: 'asc' },
    });
    return res.json({ success: true, teams });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch teams.' });
  }
};
