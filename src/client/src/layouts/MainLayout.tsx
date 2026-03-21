/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import { Outlet } from 'react-router-dom';
import ResponsiveNavigation from '../components/DaisyUI/ResponsiveNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // Simple navigation items for main layout
  const navItems = [
    {
      id: 'dashboard',
      label: 'User Dashboard',
      icon: '🏠',
      path: '/dashboard',
      visible: true,
    },
    {
      id: 'admin-overview',
      label: 'Administration',
      icon: '📊',
      path: '/admin/overview',
      visible: true,
    },
    {
      id: 'admin-bots',
      label: 'Bot Management',
      icon: '🤖',
      path: '/admin/bots',
      visible: true,
    },
    {
      id: 'admin-panel',
      label: 'All Admin Tools',
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
