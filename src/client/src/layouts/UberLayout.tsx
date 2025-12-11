import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ResponsiveNavigation from '../components/DaisyUI/ResponsiveNavigation';
import { hivemindNavItems } from '../config/navigation';

const UberLayout: React.FC = () => {
  const location = useLocation();

  return (
    <ResponsiveNavigation navItems={hivemindNavItems}>
      <div key={location.pathname}>
        <Outlet />
      </div>
    </ResponsiveNavigation>
  );
};

export default UberLayout;