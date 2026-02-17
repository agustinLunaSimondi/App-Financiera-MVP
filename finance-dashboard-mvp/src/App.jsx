import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from './contexts/FinanceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './features/common/components/ErrorBoundary';
import { Toaster } from 'sonner';

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

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <FinanceProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
              <Route path="/budget" element={<PrivateRoute><BudgetPage /></PrivateRoute>} />
              <Route path="/savings" element={<PrivateRoute><SavingsPage /></PrivateRoute>} />
              <Route path="/recurring" element={<PrivateRoute><RecurringPage /></PrivateRoute>} />
              <Route path="/cards" element={<PrivateRoute><CardsPage /></PrivateRoute>} />
              <Route path="/integrations" element={<PrivateRoute><IntegrationsPage /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
            </Routes>
            <Toaster position="top-right" richColors />
          </FinanceProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
