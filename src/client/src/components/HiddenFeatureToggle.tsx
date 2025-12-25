import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HiddenFeatureToggleProps {
  children: React.ReactNode;
  fallback?: 'hide' | 'redirect';
  redirectTo?: string;
}

const HiddenFeatureToggle: React.FC<HiddenFeatureToggleProps> = ({
  children,
  fallback = 'hide',
  redirectTo = '/uber/overview',
}) => {
  const { user } = useAuth();

  const hasRole = (role: string) => {
    return user?.role === role || user?.permissions?.includes(role);
  };

  if (!hasRole('owner')) {
    if (fallback === 'redirect') {
      return <Navigate to={redirectTo} replace />;
    }
    return null;
  }

  return <>{children}</>;
};

export default HiddenFeatureToggle;