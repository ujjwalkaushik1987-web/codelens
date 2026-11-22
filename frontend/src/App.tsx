import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { Navbar } from './components/Navbar';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { ProjectOverviewPage } from './pages/ProjectOverviewPage';
import { RepositoryExplorerPage } from './pages/RepositoryExplorerPage';
import { ChatPage } from './pages/ChatPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ImpactAnalysisPage } from './pages/ImpactAnalysisPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { SecurityPage } from './pages/SecurityPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-xs text-gray-500 font-mono">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <Router>
            <div className="min-h-screen bg-[#080c14] text-[#c9d1d9] flex flex-col font-sans">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Protected User Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/create"
                    element={
                      <ProtectedRoute>
                        <CreateProjectPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id"
                    element={
                      <ProtectedRoute>
                        <ProjectOverviewPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/explorer"
                    element={
                      <ProtectedRoute>
                        <RepositoryExplorerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/chat"
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/architecture"
                    element={
                      <ProtectedRoute>
                        <ArchitecturePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/impact"
                    element={
                      <ProtectedRoute>
                        <ImpactAnalysisPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/documentation"
                    element={
                      <ProtectedRoute>
                        <DocumentationPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/security"
                    element={
                      <ProtectedRoute>
                        <SecurityPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/projects/:id/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </Router>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
