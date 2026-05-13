import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { FinanceProvider } from './contexts/FinanceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './features/common/components/ErrorBoundary';
import { Toaster } from 'sonner';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './features/common/components/Layout';
import { analytics } from './services/analytics';

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
import { SavingsPage } from './pages/SavingsPage';
import { RecurringPage } from './pages/RecurringPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { AcademyPage } from './pages/AcademyPage';
import HelpPage from './pages/HelpPage';

// Layout wrapper for private routes – keeps Layout mounted across navigations
// so the sidebar scroll position is preserved
function PrivateLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <Layout>
      <Outlet />
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

                {/* Private routes – all share the same persistent Layout */}
                <Route element={<PrivateLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/budget" element={<BudgetPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                  <Route path="/recurring" element={<RecurringPage />} />
                  <Route path="/cards" element={<CardsPage />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  {/* Alias para el redirect de OAuth de Mercado Pago */}
                  <Route path="/integrations/mercadopago/callback" element={<IntegrationsPage />} />
                  <Route path="/academy" element={<AcademyPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                </Route>
              </Routes>
              <Toaster position="top-right" richColors />
            </FinanceProvider>
          </AuthProvider>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
