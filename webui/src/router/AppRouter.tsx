import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import { selectHasPermission, selectIsAuthenticated } from '../store/slices/authSlice';

// Lazy load components for code splitting
const AdvancedDashboard = lazy(() => 
  import('../components/AdvancedDashboard').then(module => ({ 
    default: module.default 
  }))
);
const BotManager = lazy(() => 
  import('../components/BotManager').then(module => ({ 
    default: module.default 
  }))
);
const ConfigManager = lazy(() =>
  import('../components/ConfigManager').then(module => ({
    default: module.default
  }))
);
const ConfigurationWizard = lazy(() =>
  import('../components/ConfigurationWizard').then(module => ({
    default: module.default
  }))
);
const PerformanceMonitor = lazy(() => 
  import('../components/PerformanceMonitor').then(module => ({ 
    default: module.default 
  }))
);
const Settings = lazy(() =>
  import('../components/Settings').then(module => ({
    default: module.default
  }))
);
const MonitoringDashboard = lazy(() =>
  import('../components/MonitoringDashboard').then(module => ({
    default: module.default
  }))
);
const SystemInfo = lazy(() =>
  import('../components/SystemInfo').then(module => ({
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
    element: <Navigate to="/dashboard" replace />,
    title: 'Home',
    description: 'Redirect to dashboard',
  },
  {
    path: '/dashboard',
    element: <AdvancedDashboard />,
    protected: true,
    title: 'Dashboard',
    description: 'Main dashboard with real-time metrics',
  },
  {
    path: '/bots',
    element: <BotManager />,
    protected: true,
    requiredPermission: 'manage_bots',
    title: 'Bot Manager',
    description: 'Manage Discord bot instances',
  },
  {
    path: '/config',
    element: <ConfigManager />,
    protected: true,
    requiredPermission: 'manage_config',
    title: 'Configuration',
    description: 'System configuration management',
  },
  {
    path: '/config-wizard',
    element: <ConfigurationWizard />,
    protected: true,
    requiredPermission: 'manage_config',
    title: 'Configuration Wizard',
    description: 'Step-by-step configuration setup',
  },
  {
    path: '/performance',
    element: <PerformanceMonitor />,
    protected: true,
    requiredPermission: 'view_performance',
    title: 'Performance Monitor',
    description: 'Real-time performance metrics',
  },
  {
    path: '/settings',
    element: <Settings />,
    protected: true,
    title: 'Settings',
    description: 'Application settings and preferences',
  },
  {
    path: '/monitoring',
    element: <MonitoringDashboard />,
    protected: true,
    requiredPermission: 'view_monitoring',
    title: 'Real-Time Dashboard',
    description: 'Real-time monitoring dashboard with live metrics',
  },
  {
    path: '/system',
    element: <SystemInfo />,
    protected: true,
    requiredPermission: 'view_system_info',
    title: 'System Info',
    description: 'System information and controls',
  },
  {
    path: '/login',
    element: <Login />,
    title: 'Login',
    description: 'Authentication page',
  },
  {
    path: '*',
    element: (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          404 - Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The page you're looking for doesn't exist.
        </Typography>
      </Box>
    ),
    title: 'Not Found',
    description: '404 error page',
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
