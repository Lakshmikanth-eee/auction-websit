import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public Pages
import { HomePage } from './pages/HomePage';
import { RegisterPage } from './pages/RegisterPage';
import { TeamLoginPage } from './pages/TeamLoginPage';
import { RulesPage } from './pages/RulesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LivePage } from './pages/LivePage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { AdminAuctionPage } from './pages/admin/AdminAuctionPage';
import { AdminHistoryPage } from './pages/admin/AdminHistoryPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Protected Route Component for Admin
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-cyan-400 font-bold">
        Authenticating Admin...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<TeamLoginPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/live" element={<LivePage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboardPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/teams"
            element={
              <ProtectedAdminRoute>
                <AdminTeamsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedAdminRoute>
                <AdminQuestionsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/auction"
            element={
              <ProtectedAdminRoute>
                <AdminAuctionPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/history"
            element={
              <ProtectedAdminRoute>
                <AdminHistoryPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedAdminRoute>
                <AdminSettingsPage />
              </ProtectedAdminRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
