import React from 'react';
import { Box } from '@mui/material';
import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '../components/DaisyUI';
import { useSelector, useDispatch } from 'react-redux';
import { dismissAlert, selectAlerts } from '../store/slices/uiSlice';
import ResponsiveNavigation from '../components/DaisyUI/ResponsiveNavigation';
import { hivemindNavItems, filterNavItemsByRole } from '../config/navigation';

const UberLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const alerts = useSelector(selectAlerts);

  // Filter navigation items based on user role
  const filteredNavItems = filterNavItemsByRole(hivemindNavItems, user?.role);

  return (
    <ResponsiveNavigation navItems={filteredNavItems}>
      {/* Alerts */}
      <div className="space-y-2 mb-4">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            status={alert.status}
            message={alert.message}
            icon={alert.icon}
            onClose={() => dispatch(dismissAlert(alert.id))}
          />
        ))}
      </div>
      
      <Outlet />
    </ResponsiveNavigation>
  );
};

export default UberLayout;