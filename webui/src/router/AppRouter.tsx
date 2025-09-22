import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import AdminPage from '../pages/Admin';

const Login = lazy(() => import('../components/Login'));

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Loading...' }) => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="60vh"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={48} />
    <Box component="span" sx={{ color: 'text.secondary' }}>
      {message}
    </Box>
  </Box>
);

// Simplified ProtectedRoute that always allows access (for localhost development)
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // For localhost development, always allow access
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/webui" replace />} />
          <Route path="/webui" element={<DashboardPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default AppRouter;
