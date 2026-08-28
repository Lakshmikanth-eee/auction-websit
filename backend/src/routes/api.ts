import { Router } from 'express';
import { adminLogin, checkAdminAuth, adminLogout } from '../controllers/adminController';
import {
  registerTeam,
  teamLogin,
  getPublicTeams,
  getMyTeamProfile,
  getTeams,
  getTeamById,
  updateTeam,
  toggleTeamStatus,
  deleteTeam,
  bulkDeleteTeams,
  adjustTeamScore,
  bulkSetTeamPoints,
} from '../controllers/teamController';
import {
  getQuestions,
  addQuestion,
  updateQuestion,
  duplicateQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
  bulkUploadQuestions,
  getRandomQuestion,
} from '../controllers/questionController';
import {
  getCurrentAuction,
  startAuction,
  placeBid,
  controlTimer,
  confirmWinner,
  startAnswerPhase,
  submitAnswerOutcome,
  cancelAuction,
  resetAuction,
  applyNonBiddingPenalty,
} from '../controllers/auctionController';
import {
  getLeaderboard,
  getFinalResults,
  getScoreHistory,
  getAuctionHistory,
  getEventSettings,
  updateEventSettings,
  deleteAuctionHistoryItem,
  deleteSingleBidItem,
  deleteScoreTransactionItem,
  clearAllHistoryLogs,
} from '../controllers/leaderboardController';
import { authenticateAdmin, authenticateTeam } from '../middleware/auth';

const router = Router();

// --- PUBLIC ROUTES ---
router.post('/admin/login', adminLogin);
router.post('/teams/register', registerTeam);
router.post('/teams/login', teamLogin);
router.get('/teams/me', authenticateTeam as any, getMyTeamProfile as any);
router.get('/teams', getPublicTeams);
router.get('/leaderboard', getLeaderboard);
router.get('/final-results', getFinalResults);
router.get('/settings', getEventSettings);
router.get('/auction/current', getCurrentAuction);
router.post('/auction/bid', placeBid);

// --- ADMIN PROTECTED ROUTES ---
router.use('/admin', authenticateAdmin as any);

// Admin session check & logout
router.get('/admin/auth/check', checkAdminAuth as any);
router.post('/admin/logout', adminLogout);

// Admin Team Management
router.get('/admin/teams', getTeams as any);
router.get('/admin/teams/:id', getTeamById as any);
router.put('/admin/teams/:id', updateTeam as any);
router.patch('/admin/teams/:id/status', toggleTeamStatus as any);
router.delete('/admin/teams/:id', deleteTeam as any);
router.post('/admin/teams/bulk-delete', bulkDeleteTeams as any);
router.post('/admin/teams/bulk-points', bulkSetTeamPoints as any);
router.post('/admin/teams/:id/adjust-score', adjustTeamScore as any);

// Admin Question Management
router.get('/admin/questions', getQuestions as any);
router.post('/admin/questions', addQuestion as any);
router.put('/admin/questions/:id', updateQuestion as any);
router.post('/admin/questions/:id/duplicate', duplicateQuestion as any);
router.delete('/admin/questions/:id', deleteQuestion as any);
router.post('/admin/questions/bulk-delete', bulkDeleteQuestions as any);
router.post('/admin/questions/bulk-upload', bulkUploadQuestions as any);
router.get('/admin/questions/random', getRandomQuestion as any);

// Admin Auction System Controls
router.post('/admin/auction/start', startAuction as any);
router.post('/admin/auction/bid', placeBid as any);
router.post('/admin/auction/timer', controlTimer as any);
router.post('/admin/auction/confirm-winner', confirmWinner as any);
router.post('/admin/auction/start-answer', startAnswerPhase as any);
router.post('/admin/auction/submit-answer', submitAnswerOutcome as any);
router.post('/admin/auction/cancel', cancelAuction as any);
router.post('/admin/auction/reset', resetAuction as any);
router.post('/admin/auction/apply-penalty', applyNonBiddingPenalty as any);

// Admin History & Settings
router.get('/admin/score-history', getScoreHistory as any);
router.get('/admin/auction-history', getAuctionHistory as any);
router.delete('/admin/history/auction/:id', deleteAuctionHistoryItem as any);
router.delete('/admin/history/bids/:id', deleteSingleBidItem as any);
router.delete('/admin/history/score-transactions/:id', deleteScoreTransactionItem as any);
router.post('/admin/history/clear-all', clearAllHistoryLogs as any);
router.put('/admin/settings', updateEventSettings as any);

export default router;
