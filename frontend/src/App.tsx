import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { DashboardView } from './pages/DashboardView';
import { ChatbotView } from './pages/ChatbotView';
import { AgentView } from './pages/AgentView';
import { DocumentView } from './pages/DocumentView';
import { InterviewCoachView } from './pages/InterviewCoachView';
import { AdminDashboardView } from './pages/AdminDashboardView';

import { Sidebar } from './components/layout/Sidebar';
import { TopNavigation } from './components/layout/TopNavigation';
import { GlobalSearchModal } from './components/dashboard/GlobalSearchModal';

// Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, token, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      checkAuth();
    } else if (!token) {
      useAuthStore.setState({ loading: false });
    }
  }, [token, user, checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main Layout Wrapper
const AppLayout: React.FC = () => {
  const { user, checkAuth } = useAuthStore();
  const [searchOpen, setSearchOpen] = React.useState<boolean>(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full overflow-hidden bg-[#070b13] text-slate-100">
      {user && !user.onboarded && (
        <OnboardingWizard onComplete={() => checkAuth()} />
      )}
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopNavigation onSearchClick={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/chatbot" element={<ChatbotView />} />
            <Route path="/agent" element={<AgentView />} />
            <Route path="/document" element={<DocumentView />} />
            <Route path="/coach" element={<InterviewCoachView />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboardView /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
