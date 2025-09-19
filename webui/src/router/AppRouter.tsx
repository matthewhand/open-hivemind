import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { selectHasPermission, selectIsAuthenticated } from '../store/slices/authSlice';

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

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
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
