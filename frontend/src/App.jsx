// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Pages
import LandingPage      from './pages/LandingPage';
import ExplorePage      from './pages/ExplorePage';
import QuestionDetail   from './pages/QuestionDetail';
import AskQuestion      from './pages/AskQuestion';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import ProfilePage      from './pages/ProfilePage';
import LeaderboardPage  from './pages/LeaderboardPage';
import AdminDashboard   from './pages/AdminDashboard';
import AnalyticsPage    from './pages/AnalyticsPage';
import AIAssistantPage  from './pages/AIAssistantPage';
import ForgotPassword   from './pages/ForgotPassword';
import ResetPassword    from './pages/ResetPassword';
import VerifyEmail      from './pages/VerifyEmail';
import NotFoundPage     from './pages/NotFoundPage';
import SettingsPage     from './pages/SettingsPage';

// Layout
import MainLayout from './components/common/MainLayout';

// Auth guard components
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!['admin', 'superadmin'].includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/explore" replace /> : children;
};

export default function App() {
  const { user } = useAuthStore();

  // Apply theme preference
  useEffect(() => {
    const theme = user?.theme_preference || localStorage.getItem('theme') || 'dark';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.theme_preference]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e2a4a',
            color: '#f1f5f9',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />

      <Routes>
        {/* Public auth routes */}
        <Route path="/login"          element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register"       element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />

        {/* Main app with layout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="explore"         element={<ExplorePage />} />
          <Route path="questions/:id"   element={<QuestionDetail />} />
          <Route path="leaderboard"     element={<LeaderboardPage />} />
          <Route path="ai-assistant"    element={<AIAssistantPage />} />
          <Route path="analytics"       element={<AnalyticsPage />} />
          <Route path="users/:username" element={<ProfilePage />} />

          {/* Protected routes */}
          <Route path="ask"      element={<ProtectedRoute><AskQuestion /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
