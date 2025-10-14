import React from 'react';
import { useLocation } from 'react-router-dom';
import ResponsiveNavigation from '../components/DaisyUI/ResponsiveNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Simple navigation items for main layout
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      visible: true,
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      icon: '⚙️',
      path: '/admin',
      visible: true,
    },
  ];

  return (
    <ResponsiveNavigation navItems={navItems}>
      {children}
    </ResponsiveNavigation>
  );
};

export default MainLayout;
