import React, { useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Button } from '../components/DaisyUI';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  SmartToy as BotIcon,
  Person as PersonaIcon,
  Build as MCPIcon,
  Security as GuardsIcon,
  Monitor as MonitorIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Map as SitemapIcon,
  Palette as ShowcaseIcon,
  Assessment as ActivityIcon,
} from '@mui/icons-material';
import { useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Menu } from '../components/DaisyUI';
import { useSelector, useDispatch } from 'react-redux';
import { dismissAlert, selectAlerts } from '../store/slices/uiSlice';

const drawerWidth = 240;

const UberLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      path: '/admin/overview',
      visible: true,
    },
    {
      text: 'Bots',
      icon: <BotIcon />,
      path: '/admin/bots',
      visible: true,
    },
    {
      text: 'Personas',
      icon: <PersonaIcon />,
      path: '/admin/personas',
      visible: true,
    },
    {
      text: 'MCP Servers',
      icon: <MCPIcon />,
      path: '/admin/mcp',
      visible: hasRole('owner'),
    },
    {
      text: 'Guards',
      icon: <GuardsIcon />,
      path: '/admin/guards',
      visible: hasRole('owner'),
    },
    {
      text: 'Monitoring',
      icon: <MonitorIcon />,
      path: '/admin/monitoring',
      visible: true,
    },
    {
      text: 'Activity',
      icon: <ActivityIcon />,
      path: '/admin/activity',
      visible: true,
    },
    {
      text: 'Export',
      icon: <ExportIcon />,
      path: '/admin/export',
      visible: true,
    },
    {
      text: 'Bot Configuration',
      icon: <TuneIcon />,
      path: '/admin/configuration',
      visible: hasRole('owner'),
    },
    {
      text: 'System Settings',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      visible: true,
    },
    {
      text: 'Static Pages',
      icon: <ShowcaseIcon />,
      path: '/admin/static',
      visible: true,
    },
    {
      text: 'Sitemap',
      icon: <SitemapIcon />,
      path: '/admin/sitemap',
      visible: true,
    },
    {
      text: 'DaisyUI Showcase',
      icon: <ShowcaseIcon />,
      path: '/admin/showcase',
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
    <Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          Open-Hivemind
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Uber Dashboard
        </Typography>
      </Box>
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
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar for mobile */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <Button
              variant="ghost"
              size="sm"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              className="mr-2 md:hidden text-white"
            >
              <MenuIcon />
            </Button>
            <Typography variant="h6" noWrap component="div">
              Uber Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation menu"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '64px', md: 0 }, // Account for AppBar on mobile
        }}
      >
        {/* Alerts */}
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            status={alert.status}
            message={alert.message}
            icon={alert.icon}
            onClose={() => dispatch(dismissAlert(alert.id))}
          />
        ))}
        
        <Outlet />
      </Box>
    </Box>
  );
};

export default UberLayout;