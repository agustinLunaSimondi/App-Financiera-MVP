import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { FinanceProvider } from './contexts/FinanceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './features/common/components/ErrorBoundary';
import { Toaster } from 'sonner';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './features/common/components/Layout';
import { PWAUpdatePrompt } from './features/common/components/PWAUpdatePrompt';
import { analytics } from './services/analytics';
import { setCompactMode } from './utils/formatters';

const MOBILE_QUERY = '(max-width: 767px)';

// K/M (formatCompactCurrency) solo en mobile — en desktop hay espacio para el número
// completo. `key` en el Outlet fuerza un remount de la página activa al cruzar el
// breakpoint, así los montos ya renderizados se recalculan (compactModeEnabled es
// una variable de módulo, no estado de React — sin remount quedarían stale).
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE_QUERY);
    if (!mq) return;
    setCompactMode(mq.matches);
    const handler = (e) => {
      setCompactMode(e.matches);
      setIsMobile(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

// Trackea page_viewed en PostHog en cada cambio de ruta
function PageTracker() {
    const location = useLocation();
    useEffect(() => {
        const name = location.pathname === '/' ? 'dashboard' : location.pathname.replace('/', '');
        analytics.pageViewed(name);
    }, [location.pathname]);
    return null;
}

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { BudgetPage } from './pages/BudgetPage';
import { CardsPage } from './pages/CardsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SavingsPage } from './pages/SavingsPage';
import { RecurringPage } from './pages/RecurringPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { AcademyPage } from './pages/AcademyPage';
import HelpPage from './pages/HelpPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ChatPage } from './pages/ChatPage';
import { WidgetEmbedPage } from './pages/WidgetEmbedPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';

// Guard for unauthenticated users — redirects to /login
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Layout wrapper for private routes — also redirects new users to onboarding.
// Special case: at "/" (root), unauthenticated users see the public LandingPage
// instead of being redirected to /login, since the root acts as both marketing
// surface (for visitors) and dashboard (for users).
function PrivateLayout() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isAuthenticated && location.pathname === '/') {
    return <LandingPage />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user && user.onboardingCompleted === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Layout>
      <Outlet key={isMobile ? 'mobile' : 'desktop'} />
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <PageTracker />
          <AuthProvider>
            <FinanceProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                {/* Widget embebible público (#64) — sin auth, sin layout */}
                <Route path="/widget/:token" element={<WidgetEmbedPage />} />

                {/* Onboarding — auth required, no sidebar */}
                <Route element={<RequireAuth />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                </Route>

                {/* Private routes – all share the same persistent Layout */}
                <Route element={<PrivateLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/budget" element={<BudgetPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                  <Route path="/recurring" element={<RecurringPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/events/:eventId" element={<EventDetailPage />} />
                  <Route path="/cards" element={<CardsPage />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  {/* Alias para el redirect de OAuth de Mercado Pago */}
                  <Route path="/integrations/mercadopago/callback" element={<IntegrationsPage />} />
                  <Route path="/academy" element={<AcademyPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                </Route>
              </Routes>
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                    ariaProps: { role: 'alert', 'aria-live': 'polite' },
                }}
              />
              <PWAUpdatePrompt />
            </FinanceProvider>
          </AuthProvider>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
