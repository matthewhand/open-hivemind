import React, { useState } from 'react';
import { Button, AppBar, Toolbar, Typography } from '../components/DaisyUI';
import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Menu } from '../components/DaisyUI';
import { useSelector, useDispatch } from 'react-redux';
import { dismissAlert, selectAlerts } from '../store/slices/uiSlice';

// Inline SVG icons to replace MUI icons
const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18l-2 9H5l-2-9zM5 7V4a1 1 0 011-1h12a1 1 0 011 1v3" />
  </svg>
);

const BotIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PersonaIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MCPIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const GuardsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const MonitorIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ExportIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SitemapIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ShowcaseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z" />
  </svg>
);

const drawerWidth = 'w-60'; // Convert to Tailwind class

const UberLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const alerts = useSelector(selectAlerts);

  const hasRole = (role: string) => {
    return user?.role === role || user?.permissions?.includes(role);
  };

  const navigationItems = [
    {
      text: 'Overview',
      icon: <DashboardIcon />,
      path: '/dashboard/overview',
      visible: true,
    },
    {
      text: 'Bots',
      icon: <BotIcon />,
      path: '/dashboard/bots',
      visible: true,
    },
    {
      text: 'Personas',
      icon: <PersonaIcon />,
      path: '/dashboard/personas',
      visible: true,
    },
    {
      text: 'MCP Servers',
      icon: <MCPIcon />,
      path: '/dashboard/mcp',
      visible: hasRole('owner'),
    },
    {
      text: 'Guards',
      icon: <GuardsIcon />,
      path: '/dashboard/guards',
      visible: hasRole('owner'),
    },
    {
      text: 'Activity',
      icon: <MonitorIcon />,
      path: '/dashboard/activity',
      visible: true,
    },
    {
      text: 'Export',
      icon: <ExportIcon />,
      path: '/dashboard/export',
      visible: true,
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/dashboard/settings',
      visible: true,
    },
    {
      text: 'Static Pages',
      icon: <ShowcaseIcon />,
      path: '/dashboard/static',
      visible: true,
    },
    {
      text: 'Sitemap',
      icon: <SitemapIcon />,
      path: '/dashboard/sitemap',
      visible: true,
    },
    {
      text: 'DaisyUI Showcase',
      icon: <ShowcaseIcon />,
      path: '/dashboard/showcase',
      visible: true,
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Convert navigation items to Menu format
  const menuItems = navigationItems
    .filter(item => item.visible)
    .map(item => ({
      id: item.text.toLowerCase().replace(/\s+/g, '-'),
      label: item.text,
      icon: item.icon,
      href: item.path,
      active: location.pathname === item.path,
    }));

  const drawer = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Typography variant="h6" component="div">
          Open-Hivemind
        </Typography>
        <Typography variant="body2" color="inherit" className="opacity-70">
          Dashboard
        </Typography>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Menu
          items={menuItems}
          variant="sidebar"
          compact
          onItemClick={(item) => {
            // Handle navigation programmatically
            if (item.href) {
              window.location.href = item.href;
            }
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="uber-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={mobileOpen}
        onChange={(e) => setMobileOpen(e.target.checked)}
      />
      
      <div className="drawer-content flex flex-col">
        {/* App Bar for mobile */}
        <div className="lg:hidden">
          <AppBar position="static">
            <Toolbar>
              <label
                htmlFor="uber-drawer"
                className="btn btn-ghost btn-sm drawer-button lg:hidden mr-2 text-white"
              >
                <MenuIcon />
              </label>
              <Typography variant="h6" component="div" className="truncate">
                Uber Dashboard
              </Typography>
            </Toolbar>
          </AppBar>
        </div>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Alerts */}
          <div className="space-y-4 mb-6">
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
        </main>
      </div>
      
      {/* Sidebar */}
      <div className="drawer-side">
        <label
          htmlFor="uber-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <aside className={`${drawerWidth} min-h-screen bg-base-200 border-r`}>
          {drawer}
        </aside>
      </div>
    </div>
  );
};

export default UberLayout;