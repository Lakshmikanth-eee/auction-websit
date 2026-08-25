import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { setSocketIO as setTeamSocketIO } from './controllers/teamController';
import { setAuctionSocketIO, broadcastAuctionState } from './controllers/auctionController';
import { setLeaderboardSocketIO } from './controllers/leaderboardController';
import { prisma } from './prisma/db';

dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.IO Setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Pass Socket.IO instance to controllers
setTeamSocketIO(io);
setAuctionSocketIO(io);
setLeaderboardSocketIO(io);

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
app.use((req, _res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${req.method}] ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api', apiRouter);

// Serve Static Frontend Production Build
import path from 'path';
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback SPA Routing for Frontend
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    application: '⚡ ELECTROBIT - THE EEE AUCTION CHALLENGE API',
    timestamp: new Date().toISOString(),
  });
});

// Track connected teams in auction room
interface ConnectedTeam {
  socketId: string;
  teamId: string;
  teamName: string;
  registrationNumber: string;
}

const connectedTeamsMap = new Map<string, ConnectedTeam>();

const broadcastPresentTeams = () => {
  const presentTeams = Array.from(connectedTeamsMap.values());
  io.emit('present_teams_update', {
    count: presentTeams.length,
    teams: presentTeams,
  });
};

// Socket.IO Event Handlers
io.on('connection', async (socket) => {
  console.log(`⚡ WebSocket client connected: ${socket.id}`);

  // Send current state & present teams immediately
  socket.emit('present_teams_update', {
    count: connectedTeamsMap.size,
    teams: Array.from(connectedTeamsMap.values()),
  });

  try {
    const currentAuction = await prisma.auction.findFirst({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        question: true,
        bids: { orderBy: { timestamp: 'desc' }, take: 10, include: { team: true } },
      },
    });

    let highestBidderTeam = null;
    if (currentAuction?.highestBidderTeamId) {
      highestBidderTeam = await prisma.team.findUnique({
        where: { id: currentAuction.highestBidderTeamId },
      });
    }

    socket.emit('initial_state', {
      auction: currentAuction,
      highestBidderTeam,
    });
  } catch (err) {
    console.error('Error sending initial socket state:', err);
  }

  socket.on('join_auction_room', (teamData: { teamId: string; teamName: string; registrationNumber: string }) => {
    if (teamData?.teamId) {
      connectedTeamsMap.set(socket.id, {
        socketId: socket.id,
        teamId: teamData.teamId,
        teamName: teamData.teamName || 'Unknown Team',
        registrationNumber: teamData.registrationNumber || '',
      });
      console.log(`🙋 Team entered live auction room: ${teamData.teamName} (${socket.id})`);
      broadcastPresentTeams();
    }
  });

  socket.on('request_state', async () => {
    await broadcastAuctionState();
  });

  socket.on('disconnect', () => {
    if (connectedTeamsMap.has(socket.id)) {
      const team = connectedTeamsMap.get(socket.id);
      console.log(`👋 Team left live auction room: ${team?.teamName}`);
      connectedTeamsMap.delete(socket.id);
      broadcastPresentTeams();
    }
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

// Auto-initialize DB schema and Seed data if DB tables/records are missing
async function ensureDatabaseInitialized() {
  try {
    console.log('⚡ Ensuring SQLite database schema is synced...');
    const { execSync } = require('child_process');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ SQLite database schema synced.');
    } catch (e) {
      console.error('Prisma db push note:', e);
    }

    // Ensure Default Settings exist
    let settings = await prisma.eventSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    if (!settings) {
      await prisma.eventSettings.create({
        data: {
          id: 'default',
          eventName: 'ELECTROBIT',
          eventSubtitle: 'THE EEE AUCTION CHALLENGE',
          eventStatus: 'NOT_STARTED',
          startingPoints: 10000,
          minBidIncrement: 100,
          biddingTimerDefault: 30,
          answerTimerDefault: 30,
        },
      }).catch(() => null);
      console.log('✅ Default Event Settings initialized.');
    }

    // Ensure Admin Account exists
    const adminUser = await prisma.admin.findFirst().catch(() => null);
    if (!adminUser) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('electrobit2026', 10);
      await prisma.admin.create({
        data: { username: 'admin', password: hashedPassword },
      }).catch(() => null);
      console.log('✅ Default Admin created (admin / electrobit2026).');
    }
  } catch (err) {
    console.error('Error auto-initializing database:', err);
  }
}

// Start Server
ensureDatabaseInitialized().then(() => {
  server.listen(PORT, () => {
    console.log(`
==================================================
⚡ ELECTROBIT - THE EEE AUCTION CHALLENGE SERVER
==================================================
🚀 Server running on port: ${PORT}
🌐 API Base URL: http://localhost:${PORT}/api
🔌 WebSocket Server Active
==================================================
    `);
  });
});
