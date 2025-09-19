import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { selectHasPermission, selectIsAuthenticated } from '../store/slices/authSlice';

// Lazy load components for code splitting
const UnifiedDashboard = lazy(() =>
  import('../components/UnifiedDashboard').then(module => ({
    default: module.default
  }))
);

const Login = lazy(() => 
  import('../components/Login').then(module => ({ 
    default: module.default 
  }))
);

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
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission
}) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hasRequiredPermission = requiredPermission
    ? useAppSelector(selectHasPermission(requiredPermission))
    : true;
  const location = useLocation();

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permission if required
  if (!hasRequiredPermission) {
    return (
      <Box sx={{ p: 3 }}>
        <Box 
          sx={{ 
            bgcolor: 'error.light', 
            color: 'error.contrastText',
            p: 2, 
            borderRadius: 1,
            textAlign: 'center'
          }}
        >
          Insufficient permissions. Required: {requiredPermission}
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};

interface RouteConfig {
  path: string;
  element: React.ReactNode;
  protected?: boolean;
  requiredPermission?: string;
  title?: string;
  description?: string;
}

const routes: RouteConfig[] = [
  {
    path: '/',
    element: <UnifiedDashboard />,
    protected: true,
    title: 'Dashboard',
    description: 'Unified dashboard with bot status and system metrics',
  },
  {
    path: '/login',
    element: <Login />,
    title: 'Login',
    description: 'Authentication page',
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
    title: 'Redirect',
    description: 'Redirect to dashboard',
  },
];

const AppRouter: React.FC = () => {
  // App router component - no state needed for routing logic
  
  return (
    <Suspense fallback={<LoadingFallback message="Loading application..." />}>
      <Routes>
        {routes.map((route) => {
          const element = route.protected ? (
            <ProtectedRoute 
              requiredPermission={route.requiredPermission}
              fallback={route.path === '/' ? undefined : undefined}
            >
              {route.element}
            </ProtectedRoute>
          ) : route.element;

          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <Box
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    minHeight: '100vh',
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  {element}
                </Box>
              }
            />
          );
        })}
      </Routes>
    </Suspense>
  );
};

export default AppRouter;

// Export route configuration for navigation components
// Note: Exports moved to separate file to avoid Fast Refresh issues
